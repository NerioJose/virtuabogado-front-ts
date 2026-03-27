'use server';

import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

/**
 * Centralized Financial Calculation Engine (Server-Side).
 * Formula: Neto_Plataforma = Total - (Comisión_Abogado + Gastos_Operativos + Impuestos).
 * 
 * CRITICAL: This function must rely on database-provided percentages.
 * If 0% is provided, the deduction MUST be 0.
 */
export async function calculateOrderFinances(total: number | string | Decimal, settings: {
    lawyer_commission_percentage: number | string | Decimal;
    operational_costs_percentage: number | string | Decimal;
    tax_percentage: number | string | Decimal;
    platform_fee_percentage?: number | string | Decimal;
}) {
    const t = new Decimal(total);
    // Ensure we treat percentages as decimals (e.g. 70 -> 0.70)
    const pLawyer = new Decimal(settings.lawyer_commission_percentage || 0).div(100);
    const pOps = new Decimal(settings.operational_costs_percentage || 0).div(100);
    const pTax = new Decimal(settings.tax_percentage || 0).div(100);
    const pPlatform = new Decimal(settings.platform_fee_percentage || 0).div(100);

    // Precise deductions
    const comisionAbogado = t.mul(pLawyer).toDecimalPlaces(2);
    const gastosOperativos = t.mul(pOps).toDecimalPlaces(2);
    const impuestos = t.mul(pTax).toDecimalPlaces(2);
    const platformFee = t.mul(pPlatform).toDecimalPlaces(2);
    
    // Neto_Plataforma = Total - (Comisión_Abogado + Gastos_Operativos + Impuestos + PlatformFee)
    const netoPlataforma = t.minus(comisionAbogado).minus(gastosOperativos).minus(impuestos).minus(platformFee);

    return {
        total: t.toNumber(),
        comisionAbogado: comisionAbogado.toNumber(),
        gastosOperativos: gastosOperativos.toNumber(),
        impuestos: impuestos.toNumber(),
        platformFee: platformFee.toNumber(),
        netoPlataforma: netoPlataforma.toNumber()
    };
}

/**
 * Aggregates financials for a collection of orders based on strict DB settings.
 * Designed for use in Server Components and Server Actions.
 */
export async function aggregateFinancials(orders: any[], settings: any) {
    let totals = {
        gross: new Decimal(0),
        commissions: new Decimal(0),
        ops: new Decimal(0),
        taxes: new Decimal(0),
        net: new Decimal(0)
    };

    for (const order of orders) {
        if (!order.total) continue;
        const split = await calculateOrderFinances(order.total, settings);
        totals.gross = totals.gross.plus(split.total);
        totals.commissions = totals.commissions.plus(split.comisionAbogado);
        totals.ops = totals.ops.plus(split.gastosOperativos);
        totals.taxes = totals.taxes.plus(split.impuestos).plus(split.platformFee);
        totals.net = totals.net.plus(split.netoPlataforma);
    }

    return {
        totalIncome: totals.gross.toNumber(),
        totalCommissions: totals.commissions.toNumber(),
        totalExpenses: totals.ops.plus(totals.taxes).toNumber(),
        realProfit: totals.net.toNumber(),
        count: orders.length
    };
}
