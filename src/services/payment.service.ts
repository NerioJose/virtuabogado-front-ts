'use server';

import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';

/**
 * Payment and Order Database Service (Server-side Only)
 * Blindaje arquitectónico para evitar fugas de Prisma al frontend.
 */
export async function createOrderInDB(data: {
    userId: string;
    serviceId: string;
    paymentId: string;
    total: number;
    lawyerId?: string;
    status?: OrderStatus;
}) {
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

        // Retornamos data serializada (Segura para el cliente)
        return serializeFinance(order);
    } catch (error) {
        console.error('❌ [PaymentService] Error al crear orden:', error);
        throw new Error('Error de base de datos al procesar la orden.');
    }
}

export async function updateOrderPaymentStatus(orderId: string, status: OrderStatus, paymentId?: string) {
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
