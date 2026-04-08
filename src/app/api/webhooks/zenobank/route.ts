import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { OrderStatus } from '@/shared/types/entities.types';
import { broadcastOrderUpdate } from '@/lib/broadcast';
import { Webhook } from 'svix';
import { revalidatePath } from 'next/cache';
import { notifyNewSale, notifyNewCase } from '@/lib/push-notifications';

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
            where: { id: orderId },
            include: {
                user: { select: { nombre: true } },
                service: { select: { titulo: true } },
            }
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
            // ⚛️ TRANSACCIÓN ATÓMICA DE APROBACIÓN
            const result = await (prisma as any).$transaction(async (tx: any) => {
                // 1. Buscar abogados activos
                const activeLawyers = await tx.user.findMany({
                    where: { rol: 'ABOGADO' as any, activo: true },
                    select: { id: true }
                });

                // 2. Determinar asignación (Si hay 1 solo abogado, es el elegido)
                let targetLawyerId = currentOrder.lawyerId;
                let assignedAt = currentOrder.assignedAt;
                let isAutoAssigned = false;

                if (!targetLawyerId && activeLawyers.length === 1) {
                    targetLawyerId = activeLawyers[0].id;
                    assignedAt = new Date();
                    isAutoAssigned = true;
                }

                // 3. Resolver estado: Si hay abogado (auto o manual), EN_PROGRESO. Si no, PAID.
                const resolvedStatus = targetLawyerId ? OrderStatus.EN_PROGRESO : OrderStatus.PAID;

                const updatedOrder = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: resolvedStatus,
                        paymentId: paymentId,
                        lawyerId: targetLawyerId,
                        assignedAt: assignedAt
                    }
                });

                if (isAutoAssigned) {
                    console.log(`[CheckoutFlow] Pago aprobado y Abogado Único asignado: ${orderId}`);
                }

                return { updatedOrder, targetLawyerId, resolvedStatus };
            });

            const { updatedOrder, targetLawyerId, resolvedStatus } = result;

            // 📡 Notificamos al sistema reactivo de forma FORZADA
            broadcastOrderUpdate({
                orderId: orderId,
                userId: currentOrder.userId,
                lawyerId: targetLawyerId,
                status: resolvedStatus,
                eventType: 'updated' 
            });

            // Extraer datos contextuales para notificaciones enriquecidas
            const clientName = (currentOrder as any).user?.nombre;
            const serviceName = (currentOrder as any).service?.titulo;

            console.log(`💰 [Webhook Push] Notificando venta de Orden #${orderId} a Admins...`);
            await notifyNewSale(orderId, currentOrder.total.toString(), !targetLawyerId, clientName, serviceName).catch(err =>
                console.error('❌ Error enviando push de venta:', err)
            );

            // 2. Alerta de Asignación si hay abogado
            if (targetLawyerId) {
                console.log(`⚖️ [Webhook Push] Notificando asignación al abogado: ${targetLawyerId}`);
                await notifyNewCase(targetLawyerId, orderId, serviceName).catch(err =>
                    console.error('❌ Error enviando push de asignación:', err)
                );
            }

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
