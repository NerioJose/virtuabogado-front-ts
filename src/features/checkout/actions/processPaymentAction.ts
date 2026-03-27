'use server';

import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { createClient } from '@/utils/supabase/server';
import { ZenobankService } from '../services/zenobank.service';
import { serializeFinance } from '@/lib/finance';
import { OrderStatus } from '@prisma/client';

interface ProcessPaymentParams {
    serviceId: number;
    paymentMethodId: string;
}

export async function processPaymentAction({ serviceId, paymentMethodId }: ProcessPaymentParams) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Debe iniciar sesión para realizar la compra.');
    }

    // 1. VALIDACIÓN ZERO-TRUST: Buscamos el precio real en la base de datos
    const service = await prisma.service.findUnique({
        where: { id: serviceId }
    });

    if (!service || !service.activo) {
        throw new Error('El servicio seleccionado no está disponible.');
    }

    if (Number(service.precio) <= 0) {
        throw new Error('🚨 Error de Seguridad: El servicio no tiene un precio válido configurado.');
    }

    // 2. BUSCAR MÉTODO DE PAGO
    const paymentMethod = await prisma.paymentMethod.findUnique({
        where: { id: paymentMethodId }
    });

    if (!paymentMethod || !paymentMethod.activo) {
        throw new Error('El método de pago seleccionado no está disponible.');
    }

    // 3. OBTENER CONFIGURACIÓN FINANCIERA PARA DESGLOSE
    const settings = await prisma.financialSettings.findFirst();
    const total = Number(service.precio);

    const commission = (total * Number(settings?.lawyer_commission_percentage ?? 70)) / 100;
    const taxes = (total * Number(settings?.tax_percentage ?? 15)) / 100;
    const platformFee = (total * Number(settings?.platform_fee_percentage ?? 5)) / 100;

    // 4. CREAR ORDEN EN ESTADO PENDIENTE
    const order = await prisma.order.create({
        data: {
            userId: user.id,
            serviceId: service.id,
            paymentMethodId: paymentMethod.id,
            total: total,
            status: OrderStatus.PENDIENTE,
            commissionAmount: commission,
            taxAmount: taxes,
            platformFeeAmount: platformFee,
            netProfitAmount: platformFee // Simplificado para este ejemplo
        }
    });

    // 5. LÓGICA POR PASARELA
    if (paymentMethod.name === 'zenobank') {
        const session = await ZenobankService.createCheckoutSession({
            orderId: order.id,
            amount: total,
            currency: 'USD',
            description: `Pago por servicio: ${service.titulo}`,
            customer: {
                email: user.email!,
                name: user.user_metadata?.nombre || user.email!
            },
            redirectUrls: {
                success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?orderId=${order.id}`,
                error: `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?orderId=${order.id}`
            }
        });

        // Actualizamos la orden con el ID de sesión de la pasarela
        await prisma.order.update({
            where: { id: order.id },
            data: { paymentId: session.id }
        });

        return { 
            success: true, 
            redirectUrl: session.url,
            order: serializeFinance(order)
        };
    }

    // LÓGICA MOCK y STRIPE (Simulada por ahora)
    if (paymentMethod.name === 'mock' || paymentMethod.name === 'stripe' || paymentMethod.name === 'tarjeta') {
         await prisma.order.update({
            where: { id: order.id },
            data: { 
                status: OrderStatus.COMPLETADO,
                paymentId: `MOCK-${Date.now()}`
            }
        });

        return { 
            success: true, 
            message: 'Pago completado con éxito.',
            order: serializeFinance(order)
        };
    }

    throw new Error('Pasarela de pago no soportada.');
}
