import { on } from '@/events/registry'
import { prisma } from '@/lib/prisma'
import {
  notifyNewSale,
  notifyNewCase,
  notifyOrderStatusUpdate,
  notifyCaseCompleted,
  notifyPayoutCompleted,
  notifyNewMessage,
} from '@/lib/push-notifications'

on('order.payment_received', async (event) => {
  const data = event.data as { orderId: string; paymentId: string }

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: { total: true, user: { select: { nombre: true } }, service: { select: { titulo: true } } },
  })

  if (!order) return

  const clientName = order.user?.nombre || 'Cliente'
  const serviceName = order.service?.titulo || 'Servicio Legal'

  notifyNewSale(data.orderId, order.total.toString(), true, clientName, serviceName)
    .catch((e) => console.error('[Event] Error push venta:', e))
})

on('order.assigned', async (event) => {
  const data = event.data as { orderId: string; lawyerId: string; userId: string; serviceName?: string }

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: {
      status: true,
      total: true,
      lawyer: { select: { nombre: true } },
      user: { select: { nombre: true } },
      service: { select: { titulo: true } },
    },
  })

  if (!order) return

  const serviceName = data.serviceName || order.service?.titulo || 'Servicio Legal'

  notifyNewCase(data.lawyerId, data.orderId, serviceName)
    .catch((e) => console.error('[Event] Error push asignación:', e))

  notifyOrderStatusUpdate(data.userId, data.orderId, 'EN_PROGRESO', serviceName)
    .catch((e) => console.error('[Event] Error push cliente:', e))

  notifyNewSale(data.orderId, order.total.toString(), false, order.user?.nombre, serviceName)
    .catch((e) => console.error('[Event] Error push venta:', e))
})

on('order.status_changed', async (event) => {
  const data = event.data as { orderId: string; to: string }

  if (data.to === 'PAGO_RECHAZADO' || data.to === 'CANCELADO') return

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: { userId: true, service: { select: { titulo: true } } },
  })

  if (!order) return

  notifyOrderStatusUpdate(order.userId, data.orderId, data.to, order.service?.titulo)
    .catch((e) => console.error('[Event] Error push estado:', e))
})

on('order.completed', async (event) => {
  const data = event.data as {
    orderId: string
    lawyerId?: string | null
    commissionAmount: number
    serviceName?: string
    lawyerName?: string
  }

  const amount = data.commissionAmount > 0 ? data.commissionAmount.toString() : undefined
  notifyCaseCompleted(data.orderId, data.lawyerName, data.serviceName, amount)
    .catch((e) => console.error('[Event] Error push completado:', e))
})

on('payout.finalized', async (event) => {
  const data = event.data as { payoutId: string; lawyerId: string; amount: number }

  notifyPayoutCompleted(data.lawyerId, data.payoutId, data.amount.toString())
    .catch((e) => console.error('[Event] Error push payout:', e))
})

on('message.sent', async (event) => {
  const data = event.data as {
    messageId: string
    orderId: string
    senderId: string
    content: string
    senderName?: string
  }

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: { userId: true, lawyerId: true },
  })

  if (!order) return

  const senderName = data.senderName || 'Alguien'
  const promises: Promise<unknown>[] = []

  if (order.userId && order.userId !== data.senderId) {
    promises.push(
      notifyNewMessage(order.userId, senderName, data.content, data.orderId)
    )
  }
  if (order.lawyerId && order.lawyerId !== data.senderId) {
    promises.push(
      notifyNewMessage(order.lawyerId, senderName, data.content, data.orderId)
    )
  }

  await Promise.allSettled(promises)
})
