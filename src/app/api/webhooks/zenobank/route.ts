import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { Webhook } from 'svix';
import { emit } from '@/events/eventBus';

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

    const orderId = data?.orderId || data?.order_id || evt.orderId || evt.order_id || data?.metadata?.orderId;
    const paymentId = data?.id || evt.id;

    try {
        if (type === 'checkout.completed' || type === 'payment.succeeded') {
            const currentOrder = await prisma.order.findUnique({
                where: { id: orderId },
                select: { status: true },
            });

            if (!currentOrder) {
                console.warn(`⚠️ [Webhook] Orden ${orderId} no encontrada.`);
                return NextResponse.json({ error: 'Order not found' }, { status: 404 });
            }

            if (currentOrder.status === 'PAID' || currentOrder.status === 'EN_PROGRESO') {
                return NextResponse.json({ received: true, status: 'already_processed' });
            }

            await emit({
                type: 'order.payment_received',
                data: { orderId, paymentId, amount: data.amount || 0 },
                metadata: { idempotencyKey: `${type}-${paymentId}` },
            });

        } else if (['payment.failed', 'checkout.expired', 'checkout.canceled'].includes(type)) {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'PAGO_RECHAZADO' }
            });

            await emit({
                type: 'order.status_changed',
                data: { orderId, from: 'PAGO_PENDIENTE', to: 'PAGO_RECHAZADO', changedBy: 'zenobank' },
            });
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('❌ [Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
