import { on } from '@/events/registry'
import { sendBroadcast } from '@/lib/broadcast'
import { prisma } from '@/lib/prisma'

on('message.sent', async (event) => {
  const data = event.data as {
    messageId: string
    orderId: string
    senderId: string
  }

  const message = await prisma.message.findUnique({
    where: { id: data.messageId },
    include: { sender: { select: { nombre: true, picture: true, rol: true } } },
  })

  if (!message) return

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: { userId: true, lawyerId: true },
  })

  if (!order) return

  const broadcastPromises: Promise<boolean>[] = []
  const newMessage: Record<string, unknown> = {
    id: message.id,
    orderId: message.orderId,
    senderId: message.senderId,
    content: message.content,
    isSystem: message.isSystem,
    read: message.read,
    createdAt: message.createdAt.toISOString(),
    sender: message.sender,
  }

  if (order.userId && order.userId !== data.senderId) {
    broadcastPromises.push(sendBroadcast(`global_${order.userId}`, 'new_message', { new: newMessage }))
  }
  if (order.lawyerId && order.lawyerId !== data.senderId) {
    broadcastPromises.push(sendBroadcast(`global_${order.lawyerId}`, 'new_message', { new: newMessage }))
  }
  broadcastPromises.push(sendBroadcast(`chat_${data.orderId}`, 'new_message', { new: newMessage }))
  broadcastPromises.push(sendBroadcast('app-updates', 'new_message', { new: newMessage }))

  await Promise.allSettled(broadcastPromises)
})

on('message.deleted', async (event) => {
  const data = event.data as { messageId: string; orderId: string }

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: { userId: true, lawyerId: true },
  })

  if (!order) return

  const broadcastPromises: Promise<boolean>[] = []
  const payload = { deleted: { id: data.messageId, orderId: data.orderId } }

  if (order.userId) {
    broadcastPromises.push(sendBroadcast(`global_${order.userId}`, 'message_deleted', payload))
  }
  if (order.lawyerId) {
    broadcastPromises.push(sendBroadcast(`global_${order.lawyerId}`, 'message_deleted', payload))
  }
  broadcastPromises.push(sendBroadcast(`chat_${data.orderId}`, 'message_deleted', payload))

  await Promise.allSettled(broadcastPromises)
})
