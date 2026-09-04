'use server';

import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { createClient } from '@/utils/supabase/server';
import { ZenobankService } from '../services/zenobank.service';
import { serializeFinance } from '@/lib/finance';
import { syncUserIdentity } from '@/services/identity.service';

interface ProcessPaymentParams {
    serviceId: number;
    paymentMethodId: string; // Recibimos el IDENTIFIER (ej. 'zenobank', 'mock')
}

export async function processPaymentAction({ serviceId, paymentMethodId }: ProcessPaymentParams) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Debe iniciar sesión para realizar la compra.');
    }

    // SINCRONIZACIÓN DE IDENTIDAD (Identity Merge Strategy - No Deletion)
    try {
        await syncUserIdentity(user, {}, {
            defaultName: user.email?.split('@')[0] || undefined,
        });
    } catch (error: any) {
        console.error('❌ Error Grave en Sincronización de Identidad:', error);
        throw error;
    }

    // 1. VALIDACIÓN ZERO-TRUST
    const service = await prisma.service.findUnique({
        where: { id: serviceId }
    });

    if (!service || !service.activo) {
        throw new Error('El servicio seleccionado no está disponible.');
    }

    // 2. BUSCAR MÉTODO DE PAGO POR IDENTIFICADOR
    const paymentMethod = await prisma.paymentMethod.findUnique({
        where: { identifier: paymentMethodId }
    });

    if (!paymentMethod || !paymentMethod.isActive) {
        throw new Error('El método de pago seleccionado no está disponible.');
    }

    // 3. OBTENER CONFIGURACIÓN FINANCIERA PARA DESGLOSE
    const settings = await prisma.financialSettings.findFirst();
    const total = Number(service.precio);

    const commission = (total * Number(settings?.lawyer_commission_percentage ?? 70)) / 100;
    const taxes = (total * Number(settings?.tax_percentage ?? 15)) / 100;
    const platformFee = (total * Number(settings?.platform_fee_percentage ?? 5)) / 100;

    /* 
    // 4. IDEMPOTENCIA: Bloque desactivado para forzar registro visual de toda intención de pago
    let order = await prisma.order.findFirst({
        where: {
            userId: user.id,
            serviceId: service.id,
            status: 'PAGO_PENDIENTE',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        orderBy: { createdAt: 'desc' }
    });
    */
    let order: any = null;

    // NOTA PESIMISTA: NO se asigna abogado aquí. La asignación (auto o manual) solo
    // ocurre cuando la pasarela confirma el pago ('order.payment_received' → orderHandlers).
    // Así, una orden en PAGO_PENDIENTE/PAGO_RECHAZADO jamás tiene abogado/caso asociado.

    if (false) { // Bloque de reutilización deshabilitado (forzar nueva orden)
        // ... logic
    } else {
        // Crear nueva orden con tipos seguros
        order = await prisma.order.create({
            data: {
                userId: user.id,
                serviceId: service.id,
                paymentMethodId: paymentMethod.id,
                total: total,
                status: 'PAGO_PENDIENTE', // Inicialmente en espera de pago
                commissionAmount: commission,
                taxAmount: taxes,
                platformFeeAmount: platformFee,
                netProfitAmount: platformFee,
            }
        });
        
    }

    // 5. LÓGICA POR PASARELA
    if (paymentMethod.identifier === 'zenobank') {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
        
        

        try {
            const session = await ZenobankService.createCheckoutSession({
                orderId: order.id,
                amount: Number(total), // Garantía de tipo numérico
                currency: 'USD',
                description: `Pago por servicio: ${service.titulo}`,
                customer: {
                    email: user.email!,
                    name: user.user_metadata?.nombre || user.email!
                },
                redirectUrls: {
                    success: `${baseUrl}/payment/success?orderId=${order.id}`,
                    error: `${baseUrl}/payment/error?orderId=${order.id}`
                }
            });

            // Actualizamos la orden con el ID de sesión de la pasarela
            const updatedOrder = await prisma.order.update({
                where: { id: order.id },
                data: { paymentId: session.id }
            });

            return { 
                success: true, 
                redirectUrl: session.checkoutUrl || session.url,
                order: { id: updatedOrder.id, status: updatedOrder.status }
            };
        } catch (error) {
            console.error('🛑 [Zenobank Action Error]:', error);
            throw error;
        }
    }

    // LÓGICA MERCADOPAGO (Checkout Bricks — tarjeta embebida)
    // La orden ya quedó en PAGO_PENDIENTE. No redirigimos: el front muestra el
    // Brick de tarjeta y envía el payment_token a /api/payments/mercadopago.
    // La asignación de casos se dispara vía evento order.payment_received (igual que Zenobank).
    if (paymentMethod.identifier === 'mercadopago') {
        return {
            success: true,
            message: 'Complete el pago con su tarjeta.',
            order: { id: order.id, status: order.status },
            // sin redirectUrl: flujo inline
            mercadopago: true,
        };
    }

    throw new Error('Pasarela de pago no soportada.');
}
