'use server';

import { prisma } from '@/lib/prisma';
import { UserRole, OrderStatus } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';
import { aggregateFinancials } from '@/services/finance.service';
import { getFinancialSettingsCached } from '@/lib/getFinancialSettings';

export interface FinancialSummaryFilters {
    lawyerId?: string;
    dateRange?: 'today' | 'week' | 'month' | 'year' | 'all';
}

/**
 * Server Action to fetch financial KPIs for Admin and Lawyers.
 * Uses the centralized src/services/finance.service.ts logic for absolute precision.
 */
export async function getFinancialSummary(filters: FinancialSummaryFilters, user: { id: string, rol: UserRole }) {
    const { lawyerId, dateRange } = filters;
    
    // 1. Fetch Dynamic Platform Settings (con caché compartido, evita N+1 en dashboard)
    const settings = await getFinancialSettingsCached();

    // 2. Build Date Filter
    let dateFilter: any = undefined;
    const now = new Date();
    
    if (dateRange === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        dateFilter = { gte: start };
    } else if (dateRange === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        dateFilter = { gte: start };
    } else if (dateRange === 'month') {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        dateFilter = { gte: start };
    } else if (dateRange === 'year') {
        const start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        dateFilter = { gte: start };
    }

    // 3. Base Query Filter (Removing status filter to handle legcay casing in-memory)
    const where: any = {
        activo: true,
        createdAt: dateFilter,
    };

    // Security & Filtering by User Role (In-case normalization fails elsewhere)
    const role = (user.rol as string).toUpperCase();
    

    if (role === 'ABOGADO') {
        where.lawyerId = user.id;
    } else if (role === 'ADMIN' && lawyerId) {
        where.lawyerId = lawyerId;
    }
    
    

    try {
        // 4. Fetch Order Data (Including payout status for balance calculation)
        const allOrders = await prisma.order.findMany({
            where,
            select: {
                total: true,
                status: true,
                createdAt: true,
                payout: {
                    select: {
                        status: true
                    }
                }
            }
        });

        // 🏛️ Filter orders for income reporting
        const orders = allOrders.filter((o: any) => {
            const s = (o.status || '').toUpperCase();
            return ['PENDIENTE', 'EN_PROGRESO', 'REVISION', 'COMPLETADO'].includes(s);
        });

        // Orders that are COMPLETED but NOT yet paid out to the lawyer
        const pendingPayoutOrders = orders.filter((o: any) => {
            return o.status === 'COMPLETADO' && o.payout?.status !== 'COMPLETADO';
        });

        // 5. Calculate Metrics using the Fintech-grade engine
        const stats = await aggregateFinancials(orders, settings);
        const pendingStats = await aggregateFinancials(pendingPayoutOrders, settings);
        
        // 6. Structure Final KPIs
        const summary = {
            totalIncome: stats.totalIncome,
            totalNetEarned: stats.totalCommissions, // Total historical net for the period
            pendingLawyerPayments: pendingStats.totalCommissions, // REAL Balance owed to lawyer
            realProfit: stats.realProfit,
            operationalCostsAndTaxes: stats.totalExpenses,
            transactionCount: stats.count,
            lawyerPendingBalance: role === 'ABOGADO' ? pendingStats.totalCommissions : undefined,
            lawyerTotalEarned: role === 'ABOGADO' ? stats.totalCommissions : undefined,
            settings: {
                lawyerPercentage: Number(settings.lawyer_commission_percentage || 0),
                opsPercentage: Number(settings.operational_costs_percentage || 0),
                taxPercentage: Number(settings.tax_percentage || 0),
                platformFeePercentage: Number(settings.platform_fee_percentage || 0)
            }
        };

        // 7. Serialize for Next.js 15 Client Components
        return serializeFinance(summary);
    } catch (error) {
        console.error('❌ [DATABASE_REPAIR] Error en getFinancialSummary:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            context: {
                userId: user.id,
                rol: role,
                where
            }
        });
        // We throw a generic error to the frontend but keep details in the server
        throw new Error('Lo sentimos, hubo un error al calcular los datos financieros de la plataforma.');
    }
}
