import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { notifyNewSale } from '@/lib/push-notifications';
import { broadcastOrderUpdate } from '@/lib/broadcast';

/**
 * Endpoint de prueba: /api/notifications/test-push
 * Lanza una notificación de "Nueva Venta" mock para verificar el sistema.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 🛡️ Solo permitir a Administradores
    if (!user || user.user_metadata?.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const testOrderId = 'TEST-' + Math.random().toString(36).substring(7).toUpperCase();
    const testTotal = '99.00';

    

    // 1. Notificación Push VAPID
    await notifyNewSale(testOrderId, testTotal, true);

    // 2. Broadcast Realtime (Para el Toast visual)
    await broadcastOrderUpdate({
      orderId: testOrderId,
      status: 'PAGADO',
      eventType: 'created'
    });

    return NextResponse.json({ 
      success: true, 
      message: '🚀 Señal de prueba enviada exitosamente. Deberías recibir una push y un toast en unos segundos.' 
    });
  } catch (error: any) {
    console.error('❌ Error en test-push route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
