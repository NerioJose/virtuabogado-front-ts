import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { MercadoPagoService } from '@/features/checkout/services/mercadopago.service';
import { convertUsdToPen } from '@/lib/exchangeRate';
import { emit } from '@/events/eventBus';

/**
 * POST /api/webhooks/mercadopago
 * Recibe notificaciones de MercadoPago. Es la FUENTE DE VERDAD para marcar la
 * orden como pagada y disparar la ASIGNACIÓN DE CASOS a través del evento
 * 'order.payment_received', exactamente igual que el webhook de Zenobank.
 */
export async function POST(req: NextRequest) {
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const signature = req.headers.get('x-signature') || '';
    const requestId = req.headers.get('x-request-id') || '';

    // Validación de firma (obligatoria). Si falla, rechazar.
    if (!MercadoPagoService.verifyWebhookSignature(query, { 'x-signature': signature })) {
        console.warn('🚨 [MercadoPago] Firma de webhook inválida.', { requestId, query });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        // Sin body JSON; se puede resolver por query
    }

    // El ID del pago viene en query (data.id o id) o en el body (data.id)
    const paymentId = query['data.id'] || query.id || body?.data?.id || body?.payment_id;

    if (!paymentId) {
        return NextResponse.json({ error: 'Missing payment id' }, { status: 400 });
    }

    try {
        // Consultar el detalle del pago a MercadoPago para conocer su estado real
        const payment = await MercadoPagoService.getPayment(String(paymentId));

        const orderId = payment.external_reference as string | undefined;
        if (!orderId) {
            console.warn(`⚠️ [MercadoPago] Pago ${paymentId} sin external_reference.`);
            return NextResponse.json({ received: true });
        }

        const currentOrder = await prisma.order.findUnique({
            where: { id: orderId },
            select: { status: true, total: true },
        });

        if (!currentOrder) {
            console.warn(`⚠️ [MercadoPago] Order ${orderId} no encontrada.`);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Guard anti-duplicado: si ya se procesó, no re-disparar
        if (currentOrder.status === 'PAID' || currentOrder.status === 'EN_PROGRESO') {
            return NextResponse.json({ received: true, status: 'already_processed' });
        }

        // Validación anti-manipulación basada en la respuesta real de MP:
        // comprobar que se cobró en PEN y el mismo monto calculado server-side.
        if (payment.status === 'approved') {
            const expectedPen = await convertUsdToPen(Number(currentOrder.total));
            const paymentAmount = Number(payment.transaction_amount ?? 0);
            const montoVálido =
                payment.currency_id === 'PEN'
                && Math.abs(paymentAmount - expectedPen) <= 0.01;

            if (!montoVálido) {
                console.error('🚨 [MercadoPago] Webhook: monto/currency no coincide con el servidor:', {
                    paymentId: payment.id,
                    currency: payment.currency_id,
                    paymentAmount,
                    expected: expectedPen,
                });
                await prisma.order.update({
                    where: { id: orderId },
                    data: { status: 'PAGO_RECHAZADO' },
                });
                await emit({
                    type: 'order.status_changed',
                    data: { orderId, from: 'PAGO_PENDIENTE', to: 'PAGO_RECHAZADO', changedBy: 'mercadopago' },
                });
                return NextResponse.json({ received: true, status: 'amount_mismatch' });
            }

            await emit({
                type: 'order.payment_received',
                data: {
                    orderId,
                    paymentId: String(payment.id),
                    amount: paymentAmount,
                },
                metadata: { idempotencyKey: `mercadopago-webhook-${payment.id}` },
            });
        } else if (payment.status && ['rejected', 'cancelled', 'charged_back'].includes(payment.status)) {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'PAGO_RECHAZADO' },
            });
            await emit({
                type: 'order.status_changed',
                data: { orderId, from: 'PAGO_PENDIENTE', to: 'PAGO_RECHAZADO', changedBy: 'mercadopago' },
            });
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('❌ [MercadoPago] Webhook error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}