import { prisma } from '@/lib/prisma'
import { BusinessEventType } from './definitions'
import { getHandlers, hasHandlers } from './registry'
import { markCompleted, markFailed } from './EventLog'
import { EVENT_LEASE_MS, isProcessingInWorker, setProcessingInWorker } from './dispatch'
import './handlers'

export const DEFAULT_BATCH_SIZE = 20

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