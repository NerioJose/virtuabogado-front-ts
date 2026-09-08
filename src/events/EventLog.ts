import { prisma } from '@/lib/prisma'
import { EVENT_LEASE_MS, nextBackoffMs } from './dispatch'

export async function markProcessing(id: string): Promise<void> {
  await prisma.eventLog.update({
    where: { id },
    data: { status: 'processing', leaseUntil: new Date(Date.now() + EVENT_LEASE_MS) },
  })
}

export async function markCompleted(id: string): Promise<void> {
  await prisma.eventLog.update({
    where: { id },
    data: { status: 'completed', processedAt: new Date(), leaseUntil: null, error: null },
  })
}

export async function markFailed(id: string, error: string): Promise<void> {
  const current = await prisma.eventLog.findUnique({
    where: { id },
    select: { retries: true },
  })
  const retries = (current?.retries || 0) + 1
  const scheduledAt = new Date(Date.now() + nextBackoffMs(retries))

  await prisma.eventLog.update({
    where: { id },
    data: {
      status: 'failed',
      error,
      retries,
      leaseUntil: null,
      scheduledAt,
      processedAt: new Date(),
    },
  })
}

export async function getFailedEvents(limit = 50) {
  return prisma.eventLog.findMany({
    where: { status: 'failed', retries: { lt: prisma.eventLog.fields.maxRetries } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function countPending(): Promise<number> {
  return prisma.eventLog.count({
    where: { status: 'pending' },
  })
}

export async function cleanupOldEvents(daysOld = 7): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysOld)

  const result = await prisma.eventLog.deleteMany({
    where: {
      status: 'completed',
      createdAt: { lt: cutoff },
    },
  })

  return result.count
}

export async function cleanupAllFailed(): Promise<number> {
  const result = await prisma.eventLog.deleteMany({
    where: {
      status: 'failed',
      retries: { gte: prisma.eventLog.fields.maxRetries },
    },
  })
  return result.count
}