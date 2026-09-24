import { NextResponse } from 'next/server'
import { claimAndProcessBatch } from '@/events/processor'
import { cleanupOldEvents, cleanupAllFailed } from '@/events/EventLog'
import { isCronAuthorized } from '@/lib/cronAuth'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}

async function handle(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await claimAndProcessBatch()

    // Limpieza oportunista del EventLog: evita que la tabla crezca sin control
    // y agote el storage del plan gratuito de Supabase.
    const [deletedCompleted, deletedFailed] = await Promise.all([
      cleanupOldEvents(7),
      cleanupAllFailed(),
    ])

    return NextResponse.json({
      ok: true,
      ...summary,
      pendingRemaining: summary.remaining,
      cleanup: { deletedCompleted, deletedFailed },
    })
  } catch (error) {
    console.error('[Events Process] Error:', error)
    return NextResponse.json({ error: 'Error al procesar eventos' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true })
}
