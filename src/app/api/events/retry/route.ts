import { NextResponse } from 'next/server'
import { retryEvent } from '@/events/eventBus'
import { isCronAuthorized } from '@/lib/cronAuth'

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await retryEvent(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Events API] Error retrying event:', error)
    const message = error instanceof Error ? error.message : 'Error al reintentar evento'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
