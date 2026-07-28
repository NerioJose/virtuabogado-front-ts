import { prisma } from '@/lib/prisma'
import { on } from '@/events/registry'
import { broadcastOrderUpdate } from '@/lib/broadcast'
import { OrderStatus, UserRole } from '@/shared/types/entities.types'
import type { OrderReassigned } from '@/events/definitions'

on('order.payment_received', async (event) => {
  const { orderId, paymentId } = event.data as { orderId: string; paymentId: string }

  const currentOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { nombre: true } },
      service: { select: { titulo: true } },
    },
  })

  if (!currentOrder) {
    console.warn(`[Event] order.payment_received: order ${orderId} not found`)
    return
  }

  if (currentOrder.status === 'PAID' || currentOrder.status === 'EN_PROGRESO') {
    return
  }

  const activeLawyers = await prisma.user.findMany({
    where: { rol: UserRole.ABOGADO, activo: true },
    select: { id: true, nombre: true },
  })

  const isAutoAssign = activeLawyers.length === 1
  const targetLawyerId = isAutoAssign ? activeLawyers[0].id : currentOrder.lawyerId
  const finalStatus = targetLawyerId ? OrderStatus.EN_PROGRESO : OrderStatus.PENDIENTE

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: finalStatus,
      paymentId,
      lawyerId: targetLawyerId,
      assignedAt: isAutoAssign ? new Date() : currentOrder.assignedAt,
    },
  })

  const serviceName = currentOrder.service?.titulo || 'Servicio Legal'

  await broadcastOrderUpdate({
    orderId,
    userId: currentOrder.userId,
    lawyerId: targetLawyerId,
    status: finalStatus,
    eventType: 'updated',
  })

  const { emit } = await import('@/events/eventBus')
  if (targetLawyerId) {
    await emit({
      type: 'order.assigned',
      data: { orderId, lawyerId: targetLawyerId, userId: currentOrder.userId, serviceName },
    })
  }
})

on('order.assigned', async (event) => {
  const { orderId, lawyerId, serviceName } = event.data as { orderId: string; lawyerId: string; userId: string; serviceName?: string }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, total: true, user: { select: { nombre: true } } },
  })

  if (!order) return

  await broadcastOrderUpdate({
    orderId,
    userId: order.userId,
    lawyerId,
    status: OrderStatus.EN_PROGRESO,
    eventType: 'updated',
    isNewAssignment: true,
  })
})

on('order.reassigned', async (event) => {
  const data = event.data as OrderReassigned

  const [toLawyer, fromLawyer] = await Promise.all([
    prisma.user.findUnique({ where: { id: data.toLawyerId }, select: { nombre: true } }),
    data.fromLawyerId ? prisma.user.findUnique({ where: { id: data.fromLawyerId }, select: { nombre: true } }) : null,
  ])

  const toName = toLawyer?.nombre || 'Nuevo abogado'
  const fromName = fromLawyer?.nombre || 'Abogado anterior'

  // Mensaje de sistema en el chat informando la reasignación
  await prisma.message.create({
    data: {
      orderId: data.orderId,
      senderId: data.reassignedBy,
      content: `Caso reasignado de ${fromName} a ${toName}`,
      isSystem: true,
    },
  })
})

on('order.status_changed', async (event) => {
  const { orderId, to } = event.data as { orderId: string; from: string; to: string }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, lawyerId: true, status: true },
  })

  if (!order) return

  await broadcastOrderUpdate({
    orderId,
    userId: order.userId,
    lawyerId: order.lawyerId,
    status: to,
    eventType: 'updated',
  })
})

on('order.completed', async (event) => {
  const data = event.data as { orderId: string; lawyerId?: string | null; commissionAmount: number }
  const { orderId, lawyerId, commissionAmount } = data

  if (commissionAmount > 0 && lawyerId) {
    try {
      await prisma.lawyerPayout.create({
        data: {
          lawyerId,
          amount: commissionAmount,
          status: 'PENDIENTE',
          method: 'Transferencia Bancaria',
        },
      })
    } catch (e: any) {
      if (e.code !== 'P2002' && !e.message?.includes('Unique constraint')) {
        console.error('[Event] Error auto-creando liquidación:', e)
      }
    }
  }
})
