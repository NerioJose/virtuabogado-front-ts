import { NextResponse } from 'next/server'
import { claimAndProcessBatch } from '@/events/processor'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

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

    return NextResponse.json({
      ok: true,
      ...summary,
      pendingRemaining: summary.remaining,
    })
  } catch (error) {
    console.error('[Events Process] Error:', error)
    return NextResponse.json({ error: 'Error al procesar eventos' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true })
}