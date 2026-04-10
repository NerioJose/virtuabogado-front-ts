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

        let finalName = user.user_metadata?.nombre || user.user_metadata?.name || user.user_metadata?.full_name;
        const updateData: any = { email: user.email!, activo: true };

        if (existingUserByEmail && existingUserByEmail.id !== user.id) {
            console.log(`🔗 [Identity Merge] Email ${user.email} colisiona (ID Local: ${existingUserByEmail.id} vs IDs Supabase: ${user.id}). Reconciliando...`);
            
            // 1. Rescate de Identidad
            if (!finalName && existingUserByEmail.nombre && !existingUserByEmail.nombre.includes('@')) {
                finalName = existingUserByEmail.nombre;
            }

            // 2. Liberar el email del registro antiguo para permitir crear el nuevo ID
            await prisma.user.update({
                where: { id: existingUserByEmail.id },
                data: { email: `legacy_${existingUserByEmail.id}_${existingUserByEmail.email}` }
            });

            // 3. Crear o actualizar el nuevo usuario AHORA para evitar el error de Foreign Key
            if (finalName) updateData.nombre = finalName;
            
            // 🛡️ PROTECCIÓN DE ROL: Mantener rol anterior si era ADMIN o ABOGADO
            // O forzar ADMIN si es el correo maestro
            const isMasterAdmin = user.email === 'virtuabogado.legal@gmail.com';
            const roleToPreserve = isMasterAdmin ? 'ADMIN' : (existingUserByEmail.rol || 'CLIENTE');

            await prisma.user.upsert({
                where: { id: user.id },
                update: { ...updateData, rol: roleToPreserve },
                create: {
                    id: user.id,
                    email: user.email!,
                    nombre: finalName || user.email!.split('@')[0],
                    rol: roleToPreserve,
                    activo: true,
                }
            });

            // 4. Migrar relaciones al nuevo ID, el cual YA EXISTE en la base de datos
            await prisma.$transaction([
                prisma.order.updateMany({ where: { userId: existingUserByEmail.id }, data: { userId: user.id } }),
                prisma.order.updateMany({ where: { lawyerId: existingUserByEmail.id }, data: { lawyerId: user.id } }),
                prisma.message.updateMany({ where: { senderId: existingUserByEmail.id }, data: { senderId: user.id } }),
                prisma.document.updateMany({ where: { uploaderId: existingUserByEmail.id }, data: { uploaderId: user.id } }),
                prisma.pushSubscription.updateMany({ where: { userId: existingUserByEmail.id }, data: { userId: user.id } }),
            ]);
            console.log('✅ [Identity Merge] Relaciones y Suscripciones Push migradas exitosamente.');

            // 5. Sincronizar metadatos con Supabase Auth para que el NavBar se actualice de inmediato
            if (finalName) {
                console.log(`📝 [Identity Merge] Sincronizando nombre "${finalName}" con Supabase Auth...`);
                await supabase.auth.updateUser({
                    data: { nombre: finalName }
                });
            }
        } else {
            // Si no hay colisión, simplemente hacemos el upsert regular
            if (finalName) {
                updateData.nombre = finalName;
                // Sincronizar también con Supabase Auth si el nombre local era vacío o genérico
                if (user.user_metadata?.nombre !== finalName) {
                    await supabase.auth.updateUser({
                        data: { nombre: finalName }
                    });
                }
            }
            try {
                // 🛡️ PROTECCIÓN DE ROL: Forzar ADMIN si es el correo maestro
                const isMasterAdmin = user.email === 'virtuabogado.legal@gmail.com';
                const currentRole = isMasterAdmin ? 'ADMIN' : (updateData.rol || 'CLIENTE');

                await prisma.user.upsert({
                    where: { id: user.id },
                    update: { ...updateData, rol: currentRole },
                    create: {
                        id: user.id,
                        email: user.email!,
                        nombre: finalName || user.email!.split('@')[0],
                        rol: currentRole,
                        activo: true,
                    }
                });
            } catch (error: any) {
                if (error.code === 'P2002') console.warn('⚠️ [Identity Sync] P2002 evitado. Otra petición paralela reconcilió.');
                else throw error;
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

    // 👨‍⚖️ AUTO-ASSIGNMENT: Si solo hay un abogado activo, asignar automáticamente
    const activeLawyers = await prisma.user.findMany({
        where: {
            rol: UserRole.ABOGADO,
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
