import { NextResponse } from 'next/server'
import { getFailedEvents } from '@/events/EventLog'
import { isCronAuthorized } from '@/lib/cronAuth'

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const failed = await getFailedEvents()
    return NextResponse.json({ data: failed })
  } catch (error) {
    console.error('[Events API] Error fetching failed events:', error)
    return NextResponse.json({ error: 'Error al obtener eventos fallidos' }, { status: 500 })
  }
}
