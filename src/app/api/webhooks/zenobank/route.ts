import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { ZenobankService } from '@/features/checkout/services/zenobank.service';
import { OrderStatus } from '@/shared/types/entities.types';
import { broadcastOrderUpdate } from '@/lib/broadcast';

export async function POST(req: NextRequest) {
    // REQUERIMIENTO: svix-id, svix-timestamp, svix-signature
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');
    
    if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: 'Missing Svix headers' }, { status: 401 });
    }

    const body = await req.text();
    
    // VALIDACIÓN DE FIRMA SVIX (Cybersecurity requirement)
    // Se usa el Raw Body tal como exige la regla de oro de seguridad
    const isValid = ZenobankService.verifyWebhookSignature(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature
    });

    if (!isValid) {
        console.error('🚨 [Webhook] Firma SVIX inválida detectada! Acceso denegado.');
        return NextResponse.json({ error: 'Invalid signature signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const { type, data } = payload; 
    
    // Zenobank v1: data contiene la información del checkout
    const orderId = data?.orderId || payload.orderId;
    const paymentId = data?.id || payload.id;

    console.log(`✅ [Webhook] Evento verificado: ${type} para orden ${orderId}`);

    try {
        // IDEMPOTENCIA: Verificar si la orden ya fue procesada
        const currentOrder = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!currentOrder) {
            console.warn(`⚠️ [Webhook] Orden ${orderId} no encontrada.`);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (currentOrder.status === OrderStatus.COMPLETADO) {
            console.log(`⏭️ [Webhook] Orden ${orderId} ya estaba COMPLETADA. Ignorando duplicado.`);
            return NextResponse.json({ received: true, status: 'already_processed' });
        }

        // REGLA DE NEGOCIO: Transiciones de estado basadas en el resultado del pago
        if (type === 'checkout.completed' || type === 'payment.succeeded') {
            await prisma.order.update({
                where: { id: orderId },
                data: { 
                    status: OrderStatus.PENDIENTE, // Listo para asignación
                    paymentId: paymentId
                }
            });

            // 📡 ACTIVACIÓN: Ahora que el pago es real, notificamos al Dashboard
            broadcastOrderUpdate({
                orderId: orderId,
                userId: currentOrder.userId,
                lawyerId: currentOrder.lawyerId,
                status: OrderStatus.PENDIENTE,
                eventType: 'updated'
            });

            console.log(`💰 [Webhook] Orden ${orderId} marcada como PAGADA con éxito y notificada al Dashboard.`);
        } else if (type === 'payment.failed' || type === 'checkout.expired' || type === 'checkout.canceled') {
            await prisma.order.update({
                where: { id: orderId },
                data: { 
                    status: OrderStatus.PAGO_RECHAZADO,
                    paymentId: paymentId || currentOrder.paymentId
                }
            });
            console.warn(`❌ [Webhook] Orden ${orderId} marcada como RECHAZADA/FALLIDA (Evento: ${type}).`);
        }

        return NextResponse.json({ received: true, status: 'processed' });
    } catch (error) {
        console.error('❌ [Webhook] Error procesando evento de Zenobank:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
