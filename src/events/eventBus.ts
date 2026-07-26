import { prisma } from '@/lib/prisma'
import { BusinessEvent, BusinessEventType } from './definitions'
import { getHandlers, hasHandlers } from './registry'
import { markCompleted, markFailed, markProcessing } from './EventLog'
import './handlers'

export async function emit(event: BusinessEvent): Promise<void> {
  const eventLog = await prisma.eventLog.create({
    data: {
      type: event.type,
      payload: event.data as any,
      status: 'pending',
    },
  })

  if (!hasHandlers(event.type)) {
    await markCompleted(eventLog.id)
    return
  }

  await markProcessing(eventLog.id)

  const handlers = getHandlers(event.type)
  const results = await Promise.allSettled(handlers.map((h) => h(event)))

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason?.message || String(r.reason))

  if (errors.length === 0) {
    await markCompleted(eventLog.id)
  } else {
    await markFailed(eventLog.id, errors.join('; '))
  }
}

export async function retryEvent(eventLogId: string): Promise<void> {
  const eventLog = await prisma.eventLog.findUnique({
    where: { id: eventLogId },
  })

  if (!eventLog) throw new Error(`EventLog ${eventLogId} not found`)
  if (eventLog.status !== 'failed') throw new Error(`EventLog ${eventLogId} is not failed`)

  await emit({
    type: eventLog.type as BusinessEventType,
    data: eventLog.payload as any,
  })
}
