import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Contar Admins
    const admins = await prisma.user.findMany({
      where: { rol: 'ADMIN' },
      select: { id: true, email: true, rol: true, activo: true }
    });

    // 2. Contar Suscripciones
    const pushCount = await prisma.pushSubscription.count();
    
    // 3. Ver quién tiene suscripciones
    const subsWithUsers = await prisma.pushSubscription.findMany({
      include: {
        user: {
          select: { email: true, rol: true }
        }
      }
    });

    return NextResponse.json({
      status: '✅ Sistema de Notificaciones Conectado',
      diagnostics: {
        totalAdmins: admins.length,
        adminsList: admins.map(a => ({ email: a.email, rol: a.rol, activo: a.activo })),
        totalPushSubscriptions: pushCount,
        activeSubscriptions: subsWithUsers.map(s => ({ 
          user: s.user.email, 
          rol: s.user.rol,
          endpointSnippet: s.endpoint.substring(0, 30) + '...'
        }))
      },
      envVarsCheck: {
        vapidPublic: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        vapidPrivate: !!process.env.VAPID_PRIVATE_KEY,
        vapidEmail: !!process.env.VAPID_EMAIL
      },
      instruction: "Si 'totalPushSubscriptions' es 0, o si tu email de Admin no aparece en 'activeSubscriptions', debes volver a presionar el botón de 'Activar Notificaciones' en el Sidebar del Admin."
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
