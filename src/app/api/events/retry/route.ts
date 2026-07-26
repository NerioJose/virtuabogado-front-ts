import { NextResponse } from 'next/server'
import { retryEvent } from '@/events/eventBus'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await retryEvent(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Events API] Error retrying event:', error)
    return NextResponse.json({ error: error.message || 'Error al reintentar evento' }, { status: 500 })
  }
}
