import { NextResponse } from 'next/server'
import { getFailedEvents } from '@/events/EventLog'

export async function GET() {
  try {
    const failed = await getFailedEvents()
    return NextResponse.json({ data: failed })
  } catch (error) {
    console.error('[Events API] Error fetching failed events:', error)
    return NextResponse.json({ error: 'Error al obtener eventos fallidos' }, { status: 500 })
  }
}
