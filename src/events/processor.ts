import { prisma } from '@/lib/prisma'
import { BusinessEventType } from './definitions'
import { getHandlers, hasHandlers } from './registry'
import { markCompleted, markFailed } from './EventLog'
import { EVENT_LEASE_MS, isProcessingInWorker, setProcessingInWorker } from './dispatch'
import './handlers'

export const DEFAULT_BATCH_SIZE = 20

// Presupuesto de tiempo y tope de iteraciones para el drenaje oportunista que
// corre dentro de `after()` tras responder la request. Acotado para no exceder
// el `maxDuration` de la función serverless.
export const DRAIN_TIME_BUDGET_MS = 30_000
export const DRAIN_MAX_ITERATIONS = 10

export type ProcessResult =
  | { status: 'completed' }
  | { status: 'no-handlers' }
  | { status: 'failed'; errors: string[] }
  | null

export async function claimEvent(eventLogId: string): Promise<boolean> {
  const now = new Date()
  const leaseUntil = new Date(Date.now() + EVENT_LEASE_MS)

  const claimed = await prisma.eventLog.updateMany({
    where: { id: eventLogId, status: { in: ['pending', 'failed'] } },
    data: { status: 'processing', leaseUntil, error: null },
  })
  if (claimed.count > 0) return true

  const reclaimed = await prisma.eventLog.updateMany({
    where: {
      id: eventLogId,
      status: 'processing',
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
    },
    data: { leaseUntil },
  })
  return reclaimed.count > 0
}

export async function runEvent(eventLogId: string): Promise<ProcessResult> {
  const eventLog = await prisma.eventLog.findUnique({ where: { id: eventLogId } })
  if (!eventLog) return null

  if (!hasHandlers(eventLog.type as BusinessEventType)) {
    await markCompleted(eventLog.id)
    return { status: 'no-handlers' }
  }

  const handlers = getHandlers(eventLog.type as BusinessEventType)
  const previousWorkerFlag = isProcessingInWorker()
  setProcessingInWorker(true)

  try {
    const results = await Promise.allSettled(
      handlers.map((h) =>
        h({ type: eventLog.type as BusinessEventType, data: eventLog.payload as Record<string, unknown> })
      )
    )

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message || String(r.reason))

    if (errors.length === 0) {
      await markCompleted(eventLog.id)
      return { status: 'completed' }
    }

    await markFailed(eventLog.id, errors.join('; '))
    return { status: 'failed', errors }
  } finally {
    setProcessingInWorker(previousWorkerFlag)
  }
}

export async function processEvent(eventLogId: string): Promise<ProcessResult> {
  if (!(await claimEvent(eventLogId))) return null
  return runEvent(eventLogId)
}

export async function claimAndProcessBatch(limit = DEFAULT_BATCH_SIZE) {
  const now = new Date()
  const candidates = await prisma.eventLog.findMany({
    where: {
      OR: [
        { status: 'pending', OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
        { status: 'processing', OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
        {
          status: 'failed',
          retries: { lt: prisma.eventLog.fields.maxRetries },
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  })

  let processed = 0
  let completed = 0
  let failed = 0

  for (const candidate of candidates) {
    const result = await processEvent(candidate.id)
    if (!result) continue
    processed++
    if (result.status === 'failed') failed++
    else completed++
  }

  const remaining = await prisma.eventLog.count({ where: { status: 'pending' } })
  return { processed, completed, failed, remaining }
}

/**
 * Drenaje oportunista (sin costo, sin cron): procesa el evento recién emitido y,
 * a continuación, barre los eventos vencidos (retries con backoff, huérfanos de
 * lease y pendientes) hasta agotar el presupuesto de tiempo o dejar de encontrar
 * trabajo. Se ejecuta dentro de `after()` para que los retries no dependan de la
 * frecuencia del cron.
 *
 * Concurrencia segura: `claimEvent` usa UPDATE atómico (CAS por lease), por lo que
 * varios drenajes en paralelo no duplican trabajo.
 */
export async function drainDue(
  triggerEventLogId: string,
  options: { timeBudgetMs?: number; maxIterations?: number } = {}
) {
  const timeBudgetMs = options.timeBudgetMs ?? DRAIN_TIME_BUDGET_MS
  const maxIterations = options.maxIterations ?? DRAIN_MAX_ITERATIONS
  const startedAt = Date.now()

  let processed = 0
  let completed = 0
  let failed = 0
  let remaining = 0

  // 1. Procesar el evento que originó el ciclo (si sigue reclamable).
  const triggerResult = await processEvent(triggerEventLogId)
  if (triggerResult) {
    processed++
    if (triggerResult.status === 'failed') failed++
    else completed++
  }

  // 2. Barrer eventos vencidos hasta agotar tiempo/iteraciones o no hallar trabajo.
  let iterations = 0
  while (iterations < maxIterations && Date.now() - startedAt < timeBudgetMs) {
    const summary = await claimAndProcessBatch()
    processed += summary.processed
    completed += summary.completed
    failed += summary.failed
    remaining = summary.remaining
    iterations++
    if (summary.processed === 0) break
  }

  return { processed, completed, failed, remaining }
}