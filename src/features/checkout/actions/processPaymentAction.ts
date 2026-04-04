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

    // 0. SINCRONIZACIÓN DE USUARIO (Identity Merge Strategy - No Deletion)
    // Buscamos si el usuario ya existe por su email (Source of Truth por Identidad Humana)
    try {
        const existingUserByEmail = await prisma.user.findUnique({
            where: { email: user.email! }
        });

        if (existingUserByEmail && existingUserByEmail.id !== user.id) {
            console.log(`🔗 [Identity Merge] Email ${user.email} colisiona (ID Local: ${existingUserByEmail.id} vs IDs Supabase: ${user.id}). Reconciliando...`);
            
            // Migración Quirúrgica: Actualizar todas las relaciones al nuevo ID de Supabase
            // Esto garantiza que el historial (Orders, Messages, Docs) se mantenga intacto y visible para la nueva sesión.
            await prisma.$transaction([
                prisma.order.updateMany({ where: { userId: existingUserByEmail.id }, data: { userId: user.id } }),
                prisma.order.updateMany({ where: { lawyerId: existingUserByEmail.id }, data: { lawyerId: user.id } }),
                prisma.message.updateMany({ where: { senderId: existingUserByEmail.id }, data: { senderId: user.id } }),
                prisma.document.updateMany({ where: { uploaderId: existingUserByEmail.id }, data: { uploaderId: user.id } }),
                // Cambiar el Email del registro antiguo para liberar el slot único y permitir la creación del nuevo ID
                prisma.user.update({
                    where: { id: existingUserByEmail.id },
                    data: { email: `legacy_${existingUserByEmail.id}_${existingUserByEmail.email}` }
                })
            ]);
            console.log('✅ [Identity Merge] Relaciones migradas y email liberado.');
        }

        // Ahora el upsert por ID funcionará sin errores de Unique Constraint 'email'
        try {
            await prisma.user.upsert({
                where: { id: user.id },
                update: {
                    email: user.email!,
                    nombre: user.user_metadata?.nombre || user.user_metadata?.name || user.email!.split('@')[0],
                },
                create: {
                    id: user.id,
                    email: user.email!,
                    nombre: user.user_metadata?.nombre || user.user_metadata?.name || user.email!.split('@')[0],
                    rol: 'CLIENTE',
                }
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                console.warn('⚠️ [Identity Sync] Conflicto P2002 evitado. Otra petición paralela ya reconcilió la identidad. Procediendo al pago...');
            } else {
                throw error;
            }
        }
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

    // LÓGICA MOCK y STRIPE (Simulada por ahora)
    if (paymentMethod.identifier === 'mock' || paymentMethod.identifier === 'stripe') {
         const finalOrder = await prisma.order.update({
            where: { id: order.id },
            data: { 
                status: 'COMPLETADO',
                paymentId: `MOCK-${Date.now()}`
            }
        });

        return { 
            success: true, 
            message: 'Pago completado con éxito.',
            order: { id: finalOrder.id, status: finalOrder.status }
        };
    }

    throw new Error('Pasarela de pago no soportada.');
}
