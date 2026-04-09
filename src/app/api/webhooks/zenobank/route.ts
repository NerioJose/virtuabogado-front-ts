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

        if (currentOrder.status === 'PAID' || currentOrder.status === 'EN_PROGRESO') {
            return NextResponse.json({ received: true, status: 'already_processed' });
        }

        if (type === 'checkout.completed' || type === 'payment.succeeded') {

            // ── PASO 1: Búsqueda de Abogado Único ANTES de la transacción ──
            const activeLawyers = await prisma.user.findMany({
                where: { rol: 'ABOGADO', activo: true },
                select: { id: true, nombre: true }
            });

            const isAutoAssign = activeLawyers.length === 1;
            const targetLawyerId = isAutoAssign ? activeLawyers[0].id : currentOrder.lawyerId;
            const finalStatus = targetLawyerId ? 'EN_PROGRESO' : 'PAID';

            console.log(`[CheckoutFlow] ⚖️ Abogados: ${activeLawyers.length}. Auto-asignar: ${isAutoAssign}`);

            // ── PASO 2: Transacción Atómica de Única Escritura ──
            await prisma.$transaction(async (tx: any) => {
                await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: finalStatus,
                        paymentId: paymentId,
                        lawyerId: targetLawyerId,
                        assignedAt: isAutoAssign ? new Date() : currentOrder.assignedAt
                    }
                });
            });

            // ── PASO 3: Reactividad y Notificaciones ──

            // Broadcast para mover al cliente de la pantalla de "Casi listo"
            await broadcastOrderUpdate({
                orderId: orderId,
                userId: currentOrder.userId,
                lawyerId: targetLawyerId,
                status: finalStatus,
                eventType: 'updated'
            });

            const clientName = currentOrder.user?.nombre || 'Cliente';
            const serviceName = currentOrder.service?.titulo || 'Servicio Legal';

            // Notificación al Admin
            notifyNewSale(orderId, currentOrder.total.toString(), !targetLawyerId, clientName, serviceName)
                .catch(e => console.error('Error push venta:', e));

            // Notificación al Abogado (si hay uno)
            if (targetLawyerId) {
                notifyNewCase(targetLawyerId, orderId, serviceName)
                    .catch(e => console.error('Error push asignación:', e));
            }

            revalidatePath('/', 'layout');
            console.log(`✅ [Webhook] Orden ${orderId} procesada como ${finalStatus}`);

        } else if (['payment.failed', 'checkout.expired', 'checkout.canceled'].includes(type)) {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'PAGO_RECHAZADO' }
            });
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('❌ [Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}