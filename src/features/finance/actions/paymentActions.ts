'use server';

import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';
import { createClient } from '@/utils/supabase/server';

async function getAuthUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Payment and Order Database Service (Server-side Only)
 */
export async function createOrderInDB(data: {
    userId: string;
    serviceId: number;
    paymentId: string;
    total: number;
    lawyerId?: string;
    status?: OrderStatus;
}) {
    const user = await getAuthUser();
    if (!user) throw new Error('No autorizado');

    try {
        const order = await prisma.order.create({
            data: {
                userId: data.userId,
                serviceId: data.serviceId,
                paymentId: data.paymentId,
                total: data.total,
                status: data.status || OrderStatus.PENDIENTE,
                lawyerId: data.lawyerId,
                activo: true,
            },
            include: {
                service: true,
                user: true
            }
        });

        return serializeFinance(order);
    } catch (error) {
        console.error('❌ [PaymentService] Error al crear orden:', error);
        throw new Error('Error de base de datos al procesar la orden.');
    }
}

export async function updateOrderPaymentStatus(orderId: string, status: OrderStatus, paymentId?: string) {
    const user = await getAuthUser();
    if (!user) throw new Error('No autorizado');

    try {
        const order = await prisma.order.update({
            where: { id: orderId },
            data: { 
                status,
                paymentId: paymentId || undefined,
                updatedAt: new Date()
            }
        });
        return serializeFinance(order);
    } catch (error) {
        console.error('❌ [PaymentService] Error al actualizar estado:', error);
        throw new Error('Error de base de datos al actualizar pago.');
    }
}
