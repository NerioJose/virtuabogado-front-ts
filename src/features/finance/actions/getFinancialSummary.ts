'use server';

import { prisma } from '@/lib/prisma';
import { UserRole, OrderStatus } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';
import { aggregateFinancials } from '@/services/finance.service';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';

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
    
    // 1. Fetch Dynamic Platform Settings (Blindaje: Default 0 if row missing)
    const settings = await prisma.financialSettings.findUnique({
        where: { id: FINANCIAL_SETTINGS_ID }
    }) || {
        lawyer_commission_percentage: 0,
        operational_costs_percentage: 0,
        tax_percentage: 0,
        platform_fee_percentage: 0
    };

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
        createdAt: dateFilter,
    };

    // Security & Filtering by User Role (In-case normalization fails elsewhere)
    const role = (user.rol as string).toUpperCase();
    console.log(`📊 [getFinancialSummary] User: ${user.id}, Normalized Role: ${role}`);

    if (role === 'ABOGADO') {
        where.lawyerId = user.id;
    } else if (role === 'ADMIN' && lawyerId) {
        where.lawyerId = lawyerId;
    }
    
    console.log(`📊 [getFinancialSummary] Where clause: ${JSON.stringify(where)}`);

    try {
        // 4. Fetch Order Data (Broad fetch, filtering status in JS)
        const allOrders = await prisma.order.findMany({
            where,
            select: {
                total: true,
                status: true,
                createdAt: true
            }
        });

        // 🏛️ RESCUE LOGIC: Filter out unpaid/pending/failed orders to report ONLY real income
        const orders = allOrders.filter((o: any) => {
            const s = (o.status || '').toUpperCase();
            // We only count orders that have been successfully paid or are in active processing
            return ['PAID', 'EN_PROGRESO', 'REVISION', 'COMPLETADO'].includes(s);
        });

        // 5. Calculate Metrics using the Fintech-grade engine (Strict DB settings)
        const stats = await aggregateFinancials(orders, settings);
        
        // 6. Structure Final KPIs based on Admin vs Lawyer needs
        const summary = {
            totalIncome: stats.totalIncome,
            pendingLawyerPayments: stats.totalCommissions, // Admin Liability
            realProfit: stats.realProfit, // Neto_Plataforma (Total - all deductions)
            operationalCostsAndTaxes: stats.totalExpenses,
            transactionCount: stats.count,
            lawyerPendingBalance: user.rol === 'ABOGADO' ? stats.totalCommissions : undefined,
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
