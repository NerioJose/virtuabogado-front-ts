import { NextResponse } from 'next/server'
import { cleanupOldEvents, cleanupAllFailed } from '@/events/EventLog'

export async function POST() {
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
