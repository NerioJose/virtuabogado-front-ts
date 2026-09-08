'use server';

import { prisma } from '@/lib/prisma';
import { UserRole } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';
import { getFinancialSettingsCached } from '@/lib/getFinancialSettings';

export interface FinancialSummaryFilters {
    lawyerId?: string;
    dateRange?: 'today' | 'week' | 'month' | 'year' | 'all';
}

type IncomeRow = {
    totalIncome: number;
    totalCommissions: number;
    totalOps: number;
    totalTaxes: number;
    totalFees: number;
    count: number;
};

type PendingRow = { pending: number };

/**
 * Server Action to fetch financial KPIs for Admin and Lawyers.
 * Agrega en SQL (parámetros indexados) en lugar de cargar todas las órdenes:
 * misma fórmula que calculateOrderFinances pero ejecutada por PostgreSQL.
 */
export async function getFinancialSummary(filters: FinancialSummaryFilters, user: { id: string, rol: UserRole }) {
    const { lawyerId } = filters;
    
    // 1. Fetch Dynamic Platform Settings (con caché compartido)
    const settings = await getFinancialSettingsCached();
    const lp = Number(settings.lawyer_commission_percentage || 0);
    const op = Number(settings.operational_costs_percentage || 0);
    const tp = Number(settings.tax_percentage || 0);
    const pf = Number(settings.platform_fee_percentage || 0);

    // 2. Build Date Filter
    let dateFrom: Date | null = null;
    const now = new Date();
    
    if (filters.dateRange === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        dateFrom = start;
    } else if (filters.dateRange === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        dateFrom = start;
    } else if (filters.dateRange === 'month') {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        dateFrom = start;
    } else if (filters.dateRange === 'year') {
        const start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        dateFrom = start;
    }

    // Security & Filtering by User Role
    const role = (user.rol as string).toUpperCase();
    const effectiveLawyerId = role === 'ABOGADO' ? user.id : (role === 'ADMIN' ? (lawyerId || null) : null);

    try {
        // 3. Agregación en SQL de los ingresos del período (sin cargar filas)
        const [stats] = await prisma.$queryRaw<IncomeRow[]>`
            SELECT
                COALESCE(SUM("total"), 0)::float8 AS "totalIncome",
                COALESCE(SUM(ROUND("total" * ${lp} / 100.0, 2)), 0)::float8 AS "totalCommissions",
                COALESCE(SUM(ROUND("total" * ${op} / 100.0, 2)), 0)::float8 AS "totalOps",
                COALESCE(SUM(ROUND("total" * ${tp} / 100.0, 2)), 0)::float8 AS "totalTaxes",
                COALESCE(SUM(ROUND("total" * ${pf} / 100.0, 2)), 0)::float8 AS "totalFees",
                COUNT(*)::int AS "count"
            FROM "Order"
            WHERE "activo" = true
              AND "status" IN ('PENDIENTE', 'EN_PROGRESO', 'REVISION', 'COMPLETADO')
              AND (${dateFrom}::timestamptz IS NULL OR "createdAt" >= ${dateFrom})
              AND (${effectiveLawyerId}::text IS NULL OR "lawyerId" = ${effectiveLawyerId})
        `;

        // 4. Comisiones pendientes de pago al abogado (COMPLETADO sin liquidar)
        const [pendingStats] = await prisma.$queryRaw<PendingRow[]>`
            SELECT COALESCE(SUM(COALESCE(o."commissionAmount", 0)), 0)::float8 AS "pending"
            FROM "Order" o
            LEFT JOIN "LawyerPayouts" p ON p.id = o."payoutId"
            WHERE o."activo" = true
              AND o."status" = 'COMPLETADO'
              AND o."lawyerId" IS NOT NULL
              AND (o."payoutId" IS NULL OR p."status" IS DISTINCT FROM 'COMPLETADO')
              AND (${dateFrom}::timestamptz IS NULL OR o."createdAt" >= ${dateFrom})
              AND (${effectiveLawyerId}::text IS NULL OR o."lawyerId" = ${effectiveLawyerId})
        `;

        const totalIncome = Number(stats.totalIncome || 0);
        const totalCommissions = Number(stats.totalCommissions || 0);
        const totalExpenses = Number(stats.totalOps || 0) + Number(stats.totalTaxes || 0) + Number(stats.totalFees || 0);

        // 5. Estructurar KPIs finales
        const summary = {
            totalIncome,
            totalNetEarned: totalCommissions,
            pendingLawyerPayments: Number(pendingStats.pending || 0),
            realProfit: Number((totalIncome - totalCommissions - totalExpenses).toFixed(2)),
            operationalCostsAndTaxes: Number(totalExpenses.toFixed(2)),
            transactionCount: Number(stats.count || 0),
            lawyerPendingBalance: role === 'ABOGADO' ? Number(pendingStats.pending || 0) : undefined,
            lawyerTotalEarned: role === 'ABOGADO' ? totalCommissions : undefined,
            settings: {
                lawyerPercentage: lp,
                opsPercentage: op,
                taxPercentage: tp,
                platformFeePercentage: pf
            }
        };

        // 6. Serialize para Next.js 15 Client Components
        return serializeFinance(summary);
    } catch (error) {
        console.error('❌ [DATABASE_REPAIR] Error en getFinancialSummary:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            context: {
                userId: user.id,
                rol: role,
                dateRange: filters.dateRange,
                lawyerId: effectiveLawyerId
            }
        });
        throw new Error('Lo sentimos, hubo un error al calcular los datos financieros de la plataforma.');
    }
}