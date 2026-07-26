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

    // 1. VALIDACIÓN DE PAYLOAD: Estructura de suscripción Web-Push
    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.warn('⚠️ [Push Subscribe] Estructura de suscripción inválida recibida.');
      return NextResponse.json({ error: 'Estructura de suscripción inválida' }, { status: 400 });
    }

    

    // 2. LÓGICA DE UPSERT: Vinculamos la suscripción al usuario y al endpoint único.
    // Usamos el id de Supabase (user.id) como userId en Prisma.
    // Si 'userId_endpoint' da error de lint (depende del prisma generate), 
    // usamos una transacción atómica para garantizar consistencia.
    try {
      await prisma.pushSubscription.upsert({
        where: {
          // @ts-ignore - Prisma genera este nombre para @@unique([userId, endpoint])
          userId_endpoint: {
            userId: user.id,
            endpoint: subscription.endpoint
          }
        },
        update: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        },
        create: {
          userId: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      });
    } catch (upsertError: any) {
      // Fallback si por alguna razón el upsert falla en el motor de prisma (ej. índices no sincronizados)
      console.warn('⚠️ [Push Subscribe] Upsert falló, intentando transacción atómica fallback.');
      await prisma.$transaction([
        prisma.pushSubscription.deleteMany({
          where: { userId: user.id, endpoint: subscription.endpoint }
        }),
        prisma.pushSubscription.create({
          data: {
            userId: user.id,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          }
        })
      ]);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Dispositivo vinculado correctamente. Recibirás alertas tácticas en este terminal.' 
    });
  } catch (error: any) {
    console.error('❌ Error crítico en el registro de suscripción push:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Devolvemos un mensaje descriptivo si es un error conocido de Prisma
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Error de integridad: El usuario no pudo ser sincronizado correctamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
        { error: 'Error interno del servidor al procesar la suscripción' }, 
        { status: 500 }
    );
  }
}
