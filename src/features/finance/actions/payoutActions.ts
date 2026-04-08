'use server';

import { prisma } from '@/lib/prisma';
import { PayoutStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { notifyPayoutCompleted } from '@/lib/push-notifications';
import { formatUSD, serializeFinance } from '@/lib/finance';

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

        return serializeFinance(Object.values(summaryMap));
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
            // 1. Create the Payout record - COMPLETADO directly (single-step flow)
            const newPayout = await (tx as any).lawyerPayout.create({
                data: {
                    lawyerId: data.lawyerId,
                    amount: data.amount,
                    status: 'COMPLETADO',
                    method: data.method || 'Transferencia Bancaria',
                    notes: data.notes,
                    paidAt: new Date()
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

        // 3. Push notification to lawyer immediately
        await notifyPayoutCompleted(
            data.lawyerId,
            payout.id,
            formatUSD(data.amount)
        ).catch(err => console.error('Error enviando push de liquidación:', err));

        revalidatePath('/admin/finanzas');
        revalidatePath('/abogado/finanzas');
        return serializeFinance({ success: true, payout });
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
            },
            include: {
                lawyer: {
                    select: {
                        id: true,
                        nombre: true
                    }
                },
                orders: true
            }
        });

        // Notificar al abogado
        if (updatedPayout.lawyerId) {
            await notifyPayoutCompleted(
                updatedPayout.lawyerId, 
                updatedPayout.id, 
                formatUSD(Number(updatedPayout.amount))
            ).catch(err => console.error('Error enviando push de liquidación:', err));
        }

        revalidatePath('/admin/finanzas');
        revalidatePath('/abogado/finanzas');
        revalidatePath('/api/orders', 'page');
        
        return serializeFinance({ success: true, payout: updatedPayout });
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

        const history = await (prisma as any).lawyerPayout.findMany({
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
                },
                orders: {
                    select: {
                        id: true,
                        total: true,
                        commissionAmount: true,
                        service: {
                            select: { titulo: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        return serializeFinance(history);
    } catch (error) {
        console.error('Error fetching payout history:', error);
        throw new Error('No se pudo obtener el historial de liquidaciones.');
    }
}
