import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BusinessEventType } from '@/events/definitions'
import { getHandlers, hasHandlers } from '@/events/registry'
import { markCompleted, markFailed, markProcessing } from '@/events/EventLog'
import '@/events/handlers'

export const maxDuration = 60

export async function GET() {
  try {
    const pending = await prisma.eventLog.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 5,
    })

    const results = await Promise.allSettled(
      pending.map(async (eventLog) => {
        await markProcessing(eventLog.id)

        if (!hasHandlers(eventLog.type as BusinessEventType)) {
          await markCompleted(eventLog.id)
          return { id: eventLog.id, status: 'completed (no handlers)' }
        }

        const handlers = getHandlers(eventLog.type as BusinessEventType)
        const handlerResults = await Promise.allSettled(
          handlers.map((h) => h({ type: eventLog.type as BusinessEventType, data: eventLog.payload as Record<string, unknown> }))
        )

        const errors = handlerResults
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map((r) => r.reason?.message || String(r.reason))

        if (errors.length === 0) {
          await markCompleted(eventLog.id)
          return { id: eventLog.id, status: 'completed' }
        } else {
          await markFailed(eventLog.id, errors.join('; '))
          return { id: eventLog.id, status: 'failed', errors }
        }
      })
    )

    const processed = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { status: 'error', error: r.reason?.message }
    )

    return NextResponse.json({ processed: processed.length, results: processed, pendingRemaining: await prisma.eventLog.count({ where: { status: 'pending' } }) })
  } catch (error) {
    console.error('[Events Process] Error:', error)
    return NextResponse.json({ error: 'Error al procesar eventos' }, { status: 500 })
  }
}
