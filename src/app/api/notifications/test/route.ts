import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendPushNotification } from '@/lib/push-notifications';

/**
 * API: /api/notifications/test
 * Permite al usuario logueado enviarse una notificación push de prueba
 * para verificar que su dispositivo está correctamente registrado.
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        console.log(`🧪 [Push Test] Enviando notificación de prueba a: ${user.email}`);

        const result = await sendPushNotification(user.id, {
            title: '🎉 Prueba de VirtuAbogado',
            body: '¡Excelente! Tu dispositivo está perfectamente sincronizado para recibir alertas en tiempo real.',
            url: '/',
            tag: 'test'
        });

        if (result.success) {
            return NextResponse.json({ 
                success: true, 
                sent: result.sent,
                message: `Notificación enviada a ${result.sent} dispositivo(s).`
            });
        } else {
            return NextResponse.json({ 
                success: false, 
                error: result.error 
            }, { status: 400 });
        }
    } catch (error: any) {
        console.error('❌ Error en test de notificación:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
