import { on } from '@/events/registry'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

let adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return adminClient
}

async function sendBroadcast(channelName: string, payload: Record<string, unknown>): Promise<boolean> {
  const supabaseAdmin = getAdminClient()
  const channel = supabaseAdmin.channel(channelName)

  return new Promise((resolve) => {
    let isDone = false
    const timeout = setTimeout(() => {
      if (!isDone) {
        isDone = true
        supabaseAdmin.removeChannel(channel)
        resolve(false)
      }
    }, 2500)

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        isDone = true
        clearTimeout(timeout)
        await channel.send({ type: 'broadcast', event: 'new_message', payload })
        supabaseAdmin.removeChannel(channel)
        resolve(true)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        isDone = true
        clearTimeout(timeout)
        supabaseAdmin.removeChannel(channel)
        resolve(false)
      }
    })
  })
}

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
    broadcastPromises.push(sendBroadcast(`global_${order.userId}`, { new: newMessage }))
  }
  if (order.lawyerId && order.lawyerId !== data.senderId) {
    broadcastPromises.push(sendBroadcast(`global_${order.lawyerId}`, { new: newMessage }))
  }
  broadcastPromises.push(sendBroadcast(`chat_${data.orderId}`, { new: newMessage }))

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
    broadcastPromises.push(sendBroadcast(`global_${order.userId}`, payload))
  }
  if (order.lawyerId) {
    broadcastPromises.push(sendBroadcast(`global_${order.lawyerId}`, payload))
  }
  broadcastPromises.push(sendBroadcast(`chat_${data.orderId}`, payload))

  await Promise.allSettled(broadcastPromises)
})
