import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

/**
 * Endpoint de diagnóstico: /api/notifications/debug-status
 * Verifica el estado de las suscripciones push del usuario actual.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Buscar suscripciones en la DB
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Verificar configuración VAPID (sin mostrar la privada)
    const hasVapidPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const hasVapidPrivate = !!process.env.VAPID_PRIVATE_KEY;
    const vapidStart = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 10) + '...';

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        rol: user.user_metadata?.rol || 'unknown'
      },
      diagnostics: {
        activeSubscriptionsCount: subscriptions.length,
        hasVapidPublic,
        hasVapidPrivate, // IMPORTANTE: Solo confirmamos que existe, no la mostramos
        vapidPublicKeyPreview: vapidStart,
        lastSubscriptionDate: subscriptions[0]?.createdAt || null,
        endpoints: subscriptions.map(s => s.endpoint.substring(0, 30) + '...')
      },
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        endpointPrefix: s.endpoint.substring(0, 50) + '...'
      }))
    });
  } catch (error: any) {
    console.error('❌ Error en debug-status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
