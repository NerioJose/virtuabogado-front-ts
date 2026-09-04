import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { createClient } from '@/utils/supabase/server';
import { MercadoPagoService } from '@/features/checkout/services/mercadopago.service';
import { convertUsdToPen } from '@/lib/exchangeRate';
import { emit } from '@/events/eventBus';
import { serializeFinance } from '@/lib/finance';

/**
 * GET /api/payments/mercadopago?orderId=...
 * Devuelve los montos (USD original y PEN convertido) para mostrar en el
 * Card Payment Brick. SOLO para el dueño de la order.
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Debe iniciar sesión' }, { status: 401 });
        }

        const orderId = req.nextUrl.searchParams.get('orderId');
        if (!orderId) {
            return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }
        if (order.userId !== user.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const amountUsd = Number(order.total);
        const amountPen = await convertUsdToPen(amountUsd);

        return NextResponse.json(
            serializeFinance({
                orderId: order.id,
                amountUsd,
                amountPen,
                currency: 'PEN',
                payerEmail: user.email || '',
            })
        );
    } catch (error: any) {
        console.error('🛑 [MercadoPago] Error obteniendo monto:', error);
        return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
    }
}

/**
 * POST /api/payments/mercadopago
 * Procesa un pago con tarjeta (Checkout Bricks) recibiendo el payment_token
 * generado en el cliente. El monto (PEN) se calcula SIEMPRE server-side.
 *
 * Asignación de casos: al quedar "approved", emite 'order.payment_received',
 * que pasa por el MISMO handler que Zenobank (orderHandlers.ts), garantizando
 * asignación idéntica.
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Debe iniciar sesión' }, { status: 401 });
        }

        const body = await req.json();
        const {
            orderId,
            paymentToken,
            paymentMethodId,
            paymentTypeId,
            issuerId,
            deviceId,
            bin,
        } = body;

        if (!orderId || !paymentToken) {
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

        // 4. Crear el pago en MercadoPago (body enriquecido para aprobación/seguridad)
        const metadata = (user as any)?.user_metadata || {};
        const nombreCompleto = String(metadata?.nombre || '');
        const [primerNombre = '', ...resto] = nombreCompleto.trim().split(/\s+/);
        const apellido = resto.join(' ');

        const payment = await MercadoPagoService.createPayment({
            orderId: order.id,
            amountPen,
            paymentToken,
            paymentMethodId,
            paymentTypeId,
            issuerId,
            description: service ? `Pago por servicio: ${service.titulo}` : `Pago por servicio`,
            payerEmail: user.email || '',
            payerFirstName: primerNombre || undefined,
            payerLastName: apellido || undefined,
            payerPhone: metadata?.telefono || undefined,
            itemTitle: service?.titulo || undefined,
            itemDescription: service?.descripcion || undefined,
            deviceId: typeof deviceId === 'string' ? deviceId : undefined,
            bin: typeof bin === 'string' ? bin : undefined,
        });

        // 5. Actualizar la orden con el paymentId de MercadoPago
        await prisma.order.update({
            where: { id: order.id },
            data: { paymentId: String(payment.id) },
        });

        // 6. Validación anti-manipulación basada en la respuesta real de MP:
        //    comprobar que el pago se cobró en PEN y por el mismo monto server-side.
        const paymentAmount = Number(payment.transaction_amount ?? 0);
        const montoVálido =
            payment.currency_id === 'PEN'
            && Math.abs(paymentAmount - amountPen) <= 0.01;

        if (!montoVálido && (payment.status === 'approved')) {
            console.error('🚨 [MercadoPago] Monto/currency no coincide con el servidor:', {
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
                data: { orderId: order.id, from: 'PAGO_PENDIENTE', to: 'PAGO_RECHAZADO', changedBy: 'mercadopago' },
            });
            return NextResponse.json(
                serializeFinance({ success: false, error: 'El monto del pago no coincide con el servidor.', orderId: order.id }),
                { status: 409 }
            );
        }

        // 7. Según el estado devuelto, emitir el evento correspondiente.
        console.log('🟢 [MercadoPago] createPayment result status:', payment.status, '| detail:', payment.status_detail, '| id:', payment.id, '| currency:', payment.currency_id, '| amount:', payment.transaction_amount);
        // El webhook es la fuente de verdad para la asignación, pero si 'approved'
        // llega de forma síncrona aceleramos emitiendo 'order.payment_received' ya.
        // El handler orderHandlers tiene guard anti-duplicado (PAID/EN_PROGRESO).
        if (payment.status === 'approved') {
            await emit({
                type: 'order.payment_received',
                data: { orderId: order.id, paymentId: String(payment.id), amount: paymentAmount },
                metadata: { idempotencyKey: `mercadopago-sync-${payment.id}` },
            });
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'PAGO_RECHAZADO' },
            });
            await emit({
                type: 'order.status_changed',
                data: { orderId: order.id, from: 'PAGO_PENDIENTE', to: 'PAGO_RECHAZADO', changedBy: 'mercadopago' },
            });
        }
        // pending / in_process: el webhook decidirá.

        return NextResponse.json(serializeFinance({
            success: true,
            paymentId: String(payment.id),
            paymentStatus: payment.status,
            statusDetail: payment.status_detail,
            orderId: order.id,
        }));
    } catch (error: any) {
        console.error('🛑 [MercadoPago] Error procesando pago:', error);
        return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
    }
}