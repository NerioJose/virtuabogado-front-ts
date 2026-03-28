import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { OrderStatus } from '@/shared/types/entities.types';
import { broadcastOrderUpdate } from '@/lib/broadcast';
import { Webhook } from 'svix';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');
    
    if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: 'Missing Svix headers' }, { status: 401 });
    }

    const secret = process.env.ZENOBANK_WEBHOOK_SECRET;
    if (!secret) {
        console.error('❌ [Webhook] ZENOBANK_WEBHOOK_SECRET no configurado');
        return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    const payload = await req.text();
    const headers = {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
    };

    const wh = new Webhook(secret);
    let evt: any;

    try {
        evt = wh.verify(payload, headers);
    } catch (err) {
        console.error('🚨 [Webhook] Firma SVIX inválida:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { type, data } = evt; 
    const orderId = data?.orderId || evt.orderId;
    const paymentId = data?.id || evt.id;

    console.log(`✅ [Webhook SVIX] Evento verificado: ${type} para orden ${orderId}`);

    try {
        const currentOrder = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!currentOrder) {
            console.warn(`⚠️ [Webhook] Orden ${orderId} no encontrada.`);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Si ya está pagada o completada, ignoramos para evitar loops
        if (currentOrder.status === OrderStatus.PAID || currentOrder.status === OrderStatus.COMPLETADO) {
            console.log(`⏭️ [Webhook] Orden ${orderId} ya procesada. Ignorando.`);
            return NextResponse.json({ received: true, status: 'already_processed' });
        }

        if (type === 'checkout.completed' || type === 'payment.succeeded') {
            // 👨‍⚖️ AUTO-ASSIGNMENT (Post-Pago): Solo asignar casos que ya están pagos
            const activeLawyers = await prisma.user.findMany({
                where: { rol: 'ABOGADO', activo: true },
                select: { id: true }
            });

            // Si la orden ya venía con un abogado pre-asignado lo respetamos, si no y solo hay 1 abogado, se lo damos.
            let targetLawyerId = currentOrder.lawyerId;
            let assignedAt = currentOrder.assignedAt;

            if (!targetLawyerId && activeLawyers.length === 1) {
                targetLawyerId = activeLawyers[0].id;
                assignedAt = new Date();
                console.log(`⚖️ [Webhook] Auto-asignando orden ${orderId} al abogado único:`, targetLawyerId);
            }

            // Lógica de Negocio: Si hay abogado (manual o auto), empezamos a trabajar. Si no, queda PENDIENTE de que el Admin asigne.
            const resolvedStatus = targetLawyerId ? OrderStatus.EN_PROGRESO : OrderStatus.PENDIENTE; 

            await prisma.order.update({
                where: { id: orderId },
                data: { 
                    status: resolvedStatus, 
                    paymentId: paymentId,
                    lawyerId: targetLawyerId,
                    assignedAt: assignedAt
                }
            });

            // 📡 Notificamos al sistema reactivo con el abogado ya asignado
            broadcastOrderUpdate({
                orderId: orderId,
                userId: currentOrder.userId,
                lawyerId: targetLawyerId,
                status: resolvedStatus,
                eventType: 'created' // Enviamos 'created' para que al abogado le suene como nuevo caso pagado!
            });

            // 🚀 LIMPIEZA DE CACHÉ NEXT.JS (Requisito Lead Architect)
            revalidatePath('/', 'layout');

            console.log(`💰 [Webhook] Orden ${orderId} marcada como PENDIENTE y caché revalidada.`);
        } else if (['payment.failed', 'checkout.expired', 'checkout.canceled'].includes(type)) {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.PAGO_RECHAZADO }
            });
            console.warn(`❌ [Webhook] Orden ${orderId} rechazada.`);
        }

        return NextResponse.json({ received: true, status: 'processed' });
    } catch (error) {
        console.error('❌ [Webhook] Error interno:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
