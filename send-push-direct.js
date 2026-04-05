const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL || 'mailto:virtuabogado.legal@gmail.com';

if (!publicKey || !privateKey) {
  console.error('🚨 Faltan llaves VAPID en .env');
  process.exit(1);
}

webpush.setVapidDetails(email, publicKey, privateKey);

const prisma = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPush() {
    console.log('🚀 [Direct Test] Iniciando envío directo...');
    
    // 1. Obtener el usuario Admin (virtuabogado.legal@gmail.com)
    const user = await prisma.user.findFirst({
        where: { email: 'virtuabogado.legal@gmail.com' }
    });

    if (!user) {
        console.error('❌ Usuario no encontrado');
        process.exit(1);
    }

    // 2. Obtener sus suscripciones
    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: user.id }
    });

    console.log(`📡 Encontradas ${subscriptions.length} suscripciones para ${user.email}`);

    const payload = JSON.stringify({
        title: '💰 ¡PRUEBA CA-CHING! 💰',
        body: 'Si ves esto, las notificaciones Push en tu Android funcionan al 100%.',
        url: '/admin',
        icon: '/logo/logo_sf_1.png',
        tag: 'test-' + Date.now()
    });

    // 3. Enviar a cada dispositivo
    const promises = subscriptions.map(sub => {
        return webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, payload).then(() => console.log('✅ Notificación enviada a un dispositivo.'))
        .catch(err => console.error('❌ Error enviando a un dispositivo:', err.statusCode));
    });

    // 4. Enviar Toast via Broadcast Supabase
    console.log('📡 Enviando Toast visual via Realtime...');
    await supabase.channel(`global_${user.id}`).send({
        type: 'broadcast',
        event: 'order-updated',
        payload: {
            orderId: 'TEST-123',
            status: 'PAGADO',
            eventType: 'created'
        }
    });

    await Promise.all(promises);
    console.log('🏁 Fin del test.');
    process.exit(0);
}

testPush().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
