'use server';

import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { createClient } from '@/utils/supabase/server';
import { ZenobankService } from '../services/zenobank.service';
import { serializeFinance } from '@/lib/finance';
import { UserRole, OrderStatus } from '@/shared/types/entities.types';

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

    // --- FIX: Sincronización de Usuario ---
    await prisma.user.upsert({
        where: { id: user.id },
        update: {
            email: user.email!,
            nombre: user.user_metadata?.nombre || user.email!.split('@')[0],
        },
        create: {
            id: user.id,
            email: user.email!,
            nombre: user.user_metadata?.nombre || user.email!.split('@')[0],
            rol: 'CLIENTE',
        }
    });

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

    // 4. IDEMPOTENCIA: ¿Existe ya una orden PENDIENTE para este usuario y servicio?
    // Esto evita duplicados si el usuario hace doble clic o recarga.
    let order = await prisma.order.findFirst({
        where: {
            userId: user.id,
            serviceId: service.id,
            status: 'PAGO_PENDIENTE',
            // Opcional: Solo reusar si es reciente (ej. últimas 24h)
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        orderBy: { createdAt: 'desc' }
    });

    // 👨‍⚖️ AUTO-ASSIGNMENT: Si solo hay un abogado activo, asignar automáticamente
    const activeLawyers = await prisma.user.findMany({
        where: {
            rol: 'ABOGADO',
            activo: true
        },
        select: { id: true }
    });

    let autoAssignedLawyerId: string | null = null;
    let assignedAt: Date | null = null;

    if (activeLawyers.length === 1) {
        autoAssignedLawyerId = activeLawyers[0].id;
        assignedAt = new Date();
        console.log(`⚖️ [Auto-Assignment] Asignando automáticamente al único abogado activo: ${autoAssignedLawyerId}`);
    }

    if (order) {
        console.log(`♻️ [Idempotencia] Reutilizando orden PENDIENTE existente: ${order.id}`);
        // Actualizamos el método de pago por si el usuario cambió de opinión
        order = await prisma.order.update({
            where: { id: order.id },
            data: { 
                paymentMethodId: paymentMethod.id,
                lawyerId: autoAssignedLawyerId, 
                assignedAt
            }
        });
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
                lawyerId: autoAssignedLawyerId,
                assignedAt
            }
        });
        console.log(`🆕 [Idempotencia] Nueva orden creada: ${order.id}`);
    }

    // 5. LÓGICA POR PASARELA
    if (paymentMethod.identifier === 'zenobank') {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        console.log(`📡 [Zenobank] Generando sesión. Redirect Base: ${baseUrl}`);

        try {
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
                order: serializeFinance(updatedOrder)
            };
        } catch (error) {
            console.error('🛑 [Zenobank Action Error]:', error);
            throw error;
        }
    }

    // LÓGICA MOCK y STRIPE (Simulada por ahora)
    if (paymentMethod.identifier === 'mock' || paymentMethod.identifier === 'stripe') {
         await prisma.order.update({
            where: { id: order.id },
            data: { 
                status: 'COMPLETADO',
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
