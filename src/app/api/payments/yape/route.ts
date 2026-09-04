import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { createClient } from '@/utils/supabase/server';
import { MercadoPagoService } from '@/features/checkout/services/mercadopago.service';
import { convertUsdToPen } from '@/lib/exchangeRate';
import { emit } from '@/events/eventBus';
import { serializeFinance } from '@/lib/finance';

/**
 * POST /api/payments/yape
 * Procesa un pago con Yape (Checkout API): recibe el token Yape generado en el
 * cliente (celular + OTP) y crea el pago con payment_method_id "yape".
 *
 * Flujo pesimista: solo tras la respuesta de MP se emite 'order.payment_received'
 * (aprobado) o se marca PAGO_RECHAZADO, igual que con tarjeta.
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Debe iniciar sesión' }, { status: 401 });
        }

        const body = await req.json();
        const { orderId, yapeToken, deviceId } = body;

        if (!orderId || !yapeToken) {
            return NextResponse.json({ error: 'Datos de pago incompletos' }, { status: 400 });
        }

        // 1. Validar que la orden pertenezca al usuario autenticado y esté en PAGO_PENDIENTE
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }
        if (order.userId !== user.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        if (order.status === 'PAID' || order.status === 'EN_PROGRESO') {
            return NextResponse.json({ received: true, status: 'already_processed', orderId: order.id });
        }
        if (order.status !== 'PAGO_PENDIENTE') {
            return NextResponse.json({ error: 'La orden no está en estado de pago pendiente' }, { status: 409 });
        }

        // 2. Convertir el total (USD, guardado en la order) a PEN server-side
        const amountPen = await convertUsdToPen(Number(order.total));

        // 3. Conocer el servicio para la descripción
        const service = await prisma.service.findUnique({ where: { id: order.serviceId } });

        // 4. Datos enriquecidos del payer
        const metadata = (user as any)?.user_metadata || {};
        const nombreCompleto = String(metadata?.nombre || '');
        const [primerNombre = '', ...resto] = nombreCompleto.trim().split(/\s+/);
        const apellido = resto.join(' ');

        // 5. Crear el pago Yape en MercadoPago
        const payment = await MercadoPagoService.createYapePayment({
            orderId: order.id,
            amountPen,
            paymentToken: yapeToken,
            description: service ? `Pago por servicio: ${service.titulo}` : `Pago por servicio`,
            payerEmail: user.email || '',
            payerFirstName: primerNombre || undefined,
            payerLastName: apellido || undefined,
            payerPhone: metadata?.telefono || undefined,
            itemTitle: service?.titulo || undefined,
            itemDescription: service?.descripcion || undefined,
            deviceId: typeof deviceId === 'string' ? deviceId : undefined,
        });

        // 6. Actualizar la orden con el paymentId de MercadoPago
        await prisma.order.update({
            where: { id: order.id },
            data: { paymentId: String(payment.id) },
        });

        // 7. Validación anti-manipulación: monto en PEN y mismo monto server-side
        const paymentAmount = Number(payment.transaction_amount ?? 0);
        const montoValido =
            payment.currency_id === 'PEN'
            && Math.abs(paymentAmount - amountPen) <= 0.01;

        if (!montoValido && payment.status === 'approved') {
            console.error('🚨 [MercadoPago/Yape] Monto/currency no coincide con el servidor:', {
                paymentId: payment.id,
                currency: payment.currency_id,
                paymentAmount,
                expected: amountPen,
            });
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'PAGO_RECHAZADO' },
            });
            await emit({
                type: 'order.status_changed',
                data: { orderId: order.id, from: 'PAGO_PENDIENTE', to: 'PAGO_RECHAZADO', changedBy: 'mercadopago-yape' },
            });
            return NextResponse.json(
                serializeFinance({ success: false, error: 'El monto del pago no coincide con el servidor.', orderId: order.id }),
                { status: 409 }
            );
        }

        console.log('🟢 [MercadoPago/Yape] createPayment result status:', payment.status, '| detail:', payment.status_detail, '| id:', payment.id, '| amount:', payment.transaction_amount);

        // 8. Según el estado devuelto, emitir el evento correspondiente.
        if (payment.status === 'approved') {
            await emit({
                type: 'order.payment_received',
                data: { orderId: order.id, paymentId: String(payment.id), amount: paymentAmount },
                metadata: { idempotencyKey: `mercadopago-yape-sync-${payment.id}` },
            });
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'PAGO_RECHAZADO' },
            });
            await emit({
                type: 'order.status_changed',
                data: { orderId: order.id, from: 'PAGO_PENDIENTE', to: 'PAGO_RECHAZADO', changedBy: 'mercadopago-yape' },
            });
        }

        return NextResponse.json(serializeFinance({
            success: true,
            paymentId: String(payment.id),
            paymentStatus: payment.status,
            statusDetail: payment.status_detail,
            orderId: order.id,
        }));
    } catch (error: any) {
        console.error('🛑 [MercadoPago/Yape] Error procesando pago:', error);
        return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
    }
}
