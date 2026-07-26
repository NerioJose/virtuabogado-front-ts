import { on } from '@/events/registry'
import { broadcastOrderUpdate, broadcastPayoutUpdate, broadcastServiceUpdate } from '@/lib/broadcast'
import { prisma } from '@/lib/prisma'

on('order.created', async (event) => {
  const data = event.data as { orderId: string; userId: string; status: string }

  await broadcastOrderUpdate({
    orderId: data.orderId,
    userId: data.userId,
    status: data.status,
    eventType: 'created',
  })
})

on('order.assigned', async (event) => {
  const data = event.data as { orderId: string; lawyerId: string; userId: string }

  await broadcastOrderUpdate({
    orderId: data.orderId,
    userId: data.userId,
    lawyerId: data.lawyerId,
    status: 'EN_PROGRESO',
    eventType: 'updated',
    isNewAssignment: true,
  })
})

on('order.status_changed', async (event) => {
  const data = event.data as { orderId: string; to: string }

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: { userId: true, lawyerId: true, status: true },
  })

  if (!order) return

  await broadcastOrderUpdate({
    orderId: data.orderId,
    userId: order.userId,
    lawyerId: order.lawyerId,
    status: data.to,
    eventType: 'updated',
  })
})

on('payout.created', async (event) => {
  const data = event.data as { payoutId: string; lawyerId: string; amount: number }

  await broadcastPayoutUpdate({
    payoutId: data.payoutId,
    lawyerId: data.lawyerId,
    eventType: 'created',
  })
})

on('payout.finalized', async (event) => {
  const data = event.data as { payoutId: string; lawyerId: string; reference: string; amount: number }

  await broadcastPayoutUpdate({
    payoutId: data.payoutId,
    lawyerId: data.lawyerId,
    eventType: 'finalized',
  })
})

on('service.updated', async (event) => {
  const data = event.data as { serviceId: number; eventType: 'updated' | 'deleted' }

  await broadcastServiceUpdate({
    serviceId: data.serviceId,
    eventType: data.eventType,
  })
})

on('service.deleted', async (event) => {
  const data = event.data as { serviceId: number }

  await broadcastServiceUpdate({
    serviceId: data.serviceId,
    eventType: 'deleted',
  })
})
