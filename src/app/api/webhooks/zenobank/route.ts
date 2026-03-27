import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { ZenobankService } from '@/features/checkout/services/zenobank.service';
import { OrderStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
    const signature = req.headers.get('x-zenobank-signature');
    
    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await req.text();
    
    // VALIDACIÓN DE FIRMA HMAC (Cybersecurity requirement)
    // Lee directamente de process.env.ZENOBANK_WEBHOOK_SECRET dentro del servicio
    const isValid = ZenobankService.verifyWebhookSignature(body, signature);

    if (!isValid) {
        console.error('🚨 [Webhook] Firma inválida detectada!');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const { orderId, status, paymentId } = payload;

    console.log(`✅ [Webhook] Procesando pago ${status} para orden ${orderId}`);

    try {
        if (status === 'completed' || status === 'approved') {
            await prisma.order.update({
                where: { id: orderId },
                data: { 
                    status: OrderStatus.COMPLETADO,
                    paymentId: paymentId
                }
            });
        } else if (status === 'failed') {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.FALLIDO }
            });
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('❌ [Webhook] Error actualizando orden:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
