'use server';

import { prisma } from '@/lib/prisma';
import { UserRole, OrderStatus } from '@prisma/client';
import { serializeFinance, aggregateFinancials } from '@/lib/finance';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';

export interface FinancialSummaryFilters {
    lawyerId?: string;
    dateRange?: 'today' | 'week' | 'month' | 'year' | 'all';
}

/**
 * Server Action to fetch financial KPIs for Admin and Lawyers.
 * Uses the centralized src/lib/finance.ts logic for absolute precision.
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

    // 3. Base Query Filter (Excluding non-revenue orders)
    const where: any = {
        activo: true,
        createdAt: dateFilter,
        status: { 
            notIn: [OrderStatus.CANCELADO, OrderStatus.FALLIDO] 
        }
    };

    // Security & Filtering by User Role
    if (user.rol === 'ABOGADO') {
        where.lawyerId = user.id;
    } else if (user.rol === 'ADMIN' && lawyerId) {
        where.lawyerId = lawyerId;
    }

    try {
        // 4. Fetch Order Data
        const orders = await prisma.order.findMany({
            where,
            select: {
                total: true,
                status: true,
                createdAt: true
            }
        });

        // 5. Calculate Metrics using the Fintech-grade engine (Strict DB settings)
        const stats = aggregateFinancials(orders, settings);
        
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
        console.error('❌ Error en getFinancialSummary:', error);
        throw new Error('Lo sentimos, hubo un error al calcular los datos financieros.');
    }
}
