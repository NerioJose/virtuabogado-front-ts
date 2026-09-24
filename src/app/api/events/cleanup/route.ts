import { NextResponse } from 'next/server'
import { cleanupOldEvents, cleanupAllFailed } from '@/events/EventLog'
import { isCronAuthorized } from '@/lib/cronAuth'

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const deletedCompleted = await cleanupOldEvents(7)
    const deletedFailed = await cleanupAllFailed()

    return NextResponse.json({
      success: true,
      deletedCompleted,
      deletedFailed,
    })
  } catch (error) {
    console.error('[Events Cleanup] Error:', error)
    return NextResponse.json({ error: 'Error al limpiar eventos' }, { status: 500 })
  }
}
