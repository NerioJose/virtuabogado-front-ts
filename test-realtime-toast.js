const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Faltan variables de entorno (URL o SERVICE_ROLE_KEY)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testToast() {
    console.log('🚀 [Test] Simulando Nueva Venta...');
    
    const orderId = 'test-' + Math.random().toString(36).substring(7);
    const payload = {
        orderId: orderId,
        eventType: 'created',
        status: 'PAID',
        timestamp: new Date().toISOString(),
    };

    // 1. Enviar al canal global (Escuchado por Admins en GlobalChatListener y todos en useRealtimeSubscription)
    const { data: globalData, error: globalError } = await supabase
        .channel('app-updates')
        .send({
            type: 'broadcast',
            event: 'order-updated',
            payload: payload
        });

    if (globalError) console.error('❌ Error enviando broadcast global:', globalError);
    else console.log('✅ Broadcast global enviado (para Admins)');

    // 2. Enviar a un usuario específico (Opcional: cambia el ID si quieres probar un abogado específico)
    // const userId = 'TU_USER_ID_AQUI';
    // await supabase.channel(`global_${userId}`).send({ type: 'broadcast', event: 'order-updated', payload });

    console.log('🔔 Revisa tu navegador. Si eres ADMIN, deberías haber visto el toast "💰 Nueva Venta".');
    process.exit(0);
}

testToast();
