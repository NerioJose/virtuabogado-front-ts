/**
 * Script para enviar una notificación de prueba de "Nueva Venta"
 * Simula el flujo que ocurriría cuando Zenobank confirma un pago.
 */
const { notifyNewSale } = require('./src/lib/push-notifications');
const { broadcastOrderUpdate } = require('./src/lib/broadcast');
const { prisma } = require('./src/lib/prisma');

async function sendActualTest() {
    console.log('🚀 [Test] Iniciando Notificación de Venta Real...');
    
    // Datos de prueba
    const testOrderId = 'test-' + Math.random().toString(36).substring(7);
    const total = '99.00';
    const needsAssignment = true;

    try {
        // 1. Enviar Alerta Push (Web-Push a todos los dispositivos registrados)
        console.log('📡 Enviando Push VAPID a todos los dispositivos operativos...');
        await notifyNewSale(testOrderId, total, needsAssignment);

        // 2. Enviar Broadcast Realtime (Para el Toast visual en el Sidebar)
        console.log('📡 Enviando Broadcast Realtime para el Toast visual...');
        await broadcastOrderUpdate({
            orderId: testOrderId,
            status: 'PAGADO', // Esto disparará el toast en GlobalChatListener
            eventType: 'created'
        });

        console.log('✅ [Success] Señales de prueba enviadas exitosamente.');
        console.log('🔔 Revisa tu teléfono. Deberías recibir tanto el push de Android como el Toast 💰.');
    } catch (error) {
        console.error('❌ Error enviando señales de prueba:', error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

sendActualTest();
