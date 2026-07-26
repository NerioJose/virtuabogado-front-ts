export type BusinessEventType =
  | 'order.created'
  | 'order.payment_received'
  | 'order.assigned'
  | 'order.status_changed'
  | 'order.completed'
  | 'payout.created'
  | 'payout.finalized'
  | 'message.sent'
  | 'message.deleted'
  | 'service.updated'
  | 'service.deleted'
  | 'user.registered'

export type BusinessEvent<T = Record<string, unknown>> = {
  type: BusinessEventType
  data: T
  metadata?: {
    userId?: string
    idempotencyKey?: string
  }
}

export type OrderCreated = {
  orderId: string
  userId: string
  serviceId: number
  total: number
  status: string
}

export type OrderPaymentReceived = {
  orderId: string
  paymentId: string
  amount: number
}

export type OrderAssigned = {
  orderId: string
  lawyerId: string
  userId: string
  serviceName?: string
}

export type OrderStatusChanged = {
  orderId: string
  from: string
  to: string
  changedBy: string
}

export type OrderCompleted = {
  orderId: string
  lawyerId?: string | null
  commissionAmount: number
  serviceName?: string
  lawyerName?: string
}

export type PayoutCreated = {
  payoutId: string
  lawyerId: string
  amount: number
}

export type PayoutFinalized = {
  payoutId: string
  lawyerId: string
  reference: string
  amount: number
}

export type MessageSent = {
  messageId: string
  orderId: string
  senderId: string
  content: string
  senderName?: string
}

export type MessageDeleted = {
  messageId: string
  orderId: string
}

export type ServiceUpdated = {
  serviceId: number
  eventType: 'updated' | 'deleted'
}
