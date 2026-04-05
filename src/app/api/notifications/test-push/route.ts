import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendPushNotification } from '@/lib/push-notifications';

/**
 * API: /api/notifications/test-push
 * Envía una notificación de prueba al usuario actualmente logueado.
 * Útil para diagnosticar problemas de entrega entre el servidor y el navegador.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log(`🧪 [Push Test] Iniciando envío de prueba para: ${user.email} (${user.id})`);

    const result = await sendPushNotification(user.id, {
      title: '🔔 Prueba de VirtuAbogado',
      body: 'Si ves esto, las notificaciones Push están configuradas correctamente. ¡Ca-Ching! 💰',
      url: '/',
      tag: 'test-' + Date.now()
    });

    if (result.success && result.sent > 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Prueba enviada a ${result.sent} dispositivo(s). Revisa tu teléfono/PC ahora.` 
      });
    } else if (result.success && result.sent === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No tienes dispositivos registrados. Activa las notificaciones primero.' 
      }, { status: 400 });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Error al enviar la notificación. Revisa los logs del servidor.',
        error: result.error
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ Error en Test Push:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor en la prueba de push' }, 
      { status: 500 }
    );
  }
}
