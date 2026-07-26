import { BusinessEvent, BusinessEventType } from './definitions'

export type EventHandler = (event: BusinessEvent) => Promise<void>

const handlers = new Map<BusinessEventType, EventHandler[]>()

export function on(eventType: BusinessEventType, handler: EventHandler): void {
  const existing = handlers.get(eventType) || []
  existing.push(handler)
  handlers.set(eventType, existing)
}

export function getHandlers(eventType: BusinessEventType): EventHandler[] {
  return handlers.get(eventType) || []
}

export function hasHandlers(eventType: BusinessEventType): boolean {
  return (handlers.get(eventType)?.length || 0) > 0
}
