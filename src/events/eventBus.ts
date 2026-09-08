import { prisma } from '@/lib/prisma'
import { after } from 'next/server'
import type { Prisma } from '@prisma/client'
import { BusinessEvent, BusinessEventType } from './definitions'
import { hasHandlers } from './registry'
import { markCompleted } from './EventLog'
import { isProcessingInWorker } from './dispatch'
import './handlers'

export async function emit(event: BusinessEvent): Promise<void> {
  const eventLog = await prisma.eventLog.create({
    data: {
      type: event.type,
      payload: event.data as unknown as Prisma.InputJsonValue,
      status: 'pending',
    },
  })

  if (!hasHandlers(event.type)) {
    await markCompleted(eventLog.id)
    return
  }

  await schedule(eventLog.id)
}

async function schedule(eventLogId: string): Promise<void> {
  const { processEvent } = await import('./processor')

  // Eventos emitidos mientras el procesador corre se encolan directo (evita latencia de cron)
  if (isProcessingInWorker()) {
    await processEvent(eventLogId)
    return
  }

  const mode = process.env.EVENT_DISPATCH || (process.env.NODE_ENV === 'production' ? 'after' : 'inline')

  if (mode === 'none') return

  const run = () =>
    processEvent(eventLogId).catch((error) =>
      console.error('[Events] Error en dispatch de evento:', eventLogId, error)
    )

  if (mode === 'after') {
    try {
      after(run)
      return
    } catch {
      // Sin contexto de request (script, edge, after anidado): el cron lo recogerá.
      return
    }
  }

  // inline (dev por defecto): procesamiento síncrono igual que antes de la cola.
  await run()
}

export async function retryEvent(eventLogId: string): Promise<void> {
  const eventLog = await prisma.eventLog.findUnique({
    where: { id: eventLogId },
  })

  if (!eventLog) throw new Error(`EventLog ${eventLogId} not found`)
  if (eventLog.status !== 'failed') throw new Error(`EventLog ${eventLogId} is not failed`)

  await emit({
    type: eventLog.type as BusinessEventType,
    data: eventLog.payload as Record<string, unknown>,
  })
}