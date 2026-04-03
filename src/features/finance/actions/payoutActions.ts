'use server';

import { prisma } from '@/lib/prisma';
import { PayoutStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * Gets a summary of pending amounts to be paid to each lawyer.
 * Finds all orders that are COMPLETADO but haven't been linked to a payout yet.
 */
export async function getPendingPayoutsSummary() {
    try {
        const pendingOrders = await prisma.order.findMany({
            where: {
                status: 'COMPLETADO',
                payoutId: null,
                lawyerId: { not: null }
            },
            include: {
                lawyer: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                        especialidad: true
                    }
                }
            }
        });

        // Group by lawyer
        const summaryMap: Record<string, any> = {};

        pendingOrders.forEach((order: any) => {
            if (!order.lawyerId) return;
            
            if (!summaryMap[order.lawyerId]) {
                summaryMap[order.lawyerId] = {
                    lawyer: order.lawyer,
                    totalPending: 0,
                    orderCount: 0,
                    orderIds: []
                };
            }

            const amount = Number(order.commissionAmount || 0);
            summaryMap[order.lawyerId].totalPending += amount;
            summaryMap[order.lawyerId].orderCount += 1;
            summaryMap[order.lawyerId].orderIds.push(order.id);
        });

        return Object.values(summaryMap);
    } catch (error) {
        console.error('Error fetching pending payouts summary:', error);
        throw new Error('No se pudo obtener el resumen de pagos pendientes.');
    }
}

/**
 * Creates a payout batch for a lawyer.
 */
export async function createPayout(data: {
    lawyerId: string;
    orderIds: string[];
    amount: number;
    method?: string;
    notes?: string;
}) {
    try {
        const payout = await prisma.$transaction(async (tx) => {
            // 1. Create the Payout record
            const newPayout = await (tx as any).lawyerPayout.create({
                data: {
                    lawyerId: data.lawyerId,
                    amount: data.amount,
                    status: 'PENDIENTE',
                    method: data.method || 'Transferencia Bancaria',
                    notes: data.notes
                }
            });

            // 2. Link orders to this payout
            await (tx as any).order.updateMany({
                where: {
                    id: { in: data.orderIds },
                    lawyerId: data.lawyerId,
                    payoutId: null
                },
                data: {
                    payoutId: newPayout.id
                }
            });

            return newPayout;
        });

        revalidatePath('/admin/finanzas');
        return { success: true, payout };
    } catch (error) {
        console.error('Error creating payout:', error);
        return { success: false, error: 'Error al crear la liquidación.' };
    }
}

/**
 * Marks a payout as completed and records the payment reference.
 */
export async function finalizePayout(payoutId: string, reference: string) {
    try {
        const updatedPayout = await (prisma as any).lawyerPayout.update({
            where: { id: payoutId },
            data: {
                status: 'COMPLETADO',
                reference,
                paidAt: new Date()
            }
        });

        revalidatePath('/admin/finanzas');
        return { success: true, payout: updatedPayout };
    } catch (error) {
        console.error('Error finalizing payout:', error);
        return { success: false, error: 'Error al finalizar la liquidación.' };
    }
}

/**
 * Gets the payout history for a specific lawyer or all lawyers (if no ID provided).
 */
export async function getPayoutHistory(lawyerId?: string) {
    try {
        const where: any = {};
        if (lawyerId) where.lawyerId = lawyerId;

        return await (prisma as any).lawyerPayout.findMany({
            where,
            include: {
                lawyer: {
                    select: {
                        nombre: true,
                        email: true
                    }
                },
                _count: {
                    select: { orders: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error('Error fetching payout history:', error);
        throw new Error('No se pudo obtener el historial de liquidaciones.');
    }
}
