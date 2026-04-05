import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

/**
 * API: /api/notifications/subscribe
 * Registra un token de suscripción Push vinculado a un usuario (Admin/Abogado/Cliente).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('⚠️ [Push Subscribe] Intento de suscripción sin usuario logueado.');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const subscription = await request.json();

    // Validar estructura de la suscripción Web-Push
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'Estructura de suscripción inválida' }, { status: 400 });
    }

    console.log(`📡 [Push Subscribe] Registrando dispositivo para usuario: ${user.email}`);

    // Limpiar dispositivos anteriores con el mismo endpoint para este usuario (evita basura)
    // Usamos deleteMany + create como alternativa segura al upsert con índices compuestos.
    await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        endpoint: subscription.endpoint
      }
    });

    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Dispositivo vinculado correctamente. Recibirás alertas tácticas en este terminal.' 
    });
  } catch (error: any) {
    console.error('❌ Error en el registro de suscripción push:', error);
    return NextResponse.json(
        { error: 'Error interno del servidor al procesar la suscripción' }, 
        { status: 500 }
    );
  }
}
