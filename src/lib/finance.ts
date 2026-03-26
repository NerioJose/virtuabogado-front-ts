import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

/**
 * Profesional USD Formatter using Intl.NumberFormat.
 * Ensures 100% consistency in currency display across the platform ($ USD).
 */
export function formatUSD(amount: number | string | null | undefined): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericAmount);
}

/**
 * Fintech-grade Serialization Utility.
 * Recursively converts Prisma Decimal objects to native numbers and Dates to ISO strings.
 * Solves the Next.js 15 error: "Only plain objects can be passed to Client Components".
 */
export function serializeFinance<T>(data: T): T {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
        return data.map(item => serializeFinance(item)) as any;
    }

    if (data instanceof Date) {
        return data.toISOString() as any;
    }

    if (typeof data === 'object') {
        if ((data as any).toNumber && typeof (data as any).toNumber === 'function') {
            return (data as any).toNumber();
        }

        const Entries = Object.entries(data).map(([key, value]) => [
            key,
            serializeFinance(value)
        ]);
        
        return Object.fromEntries(Entries) as any;
    }

    return data;
}

/**
 * Centralized Financial Calculation Engine (Senior Fintech Architect Version).
 * Formula: Neto_Plataforma = Total - (Comisión_Abogado + Gastos_Operativos + Impuestos).
 * 
 * CRITICAL: This function must rely on database-provided percentages.
 * If 0% is provided, the deduction MUST be 0.
 */
export function calculateOrderFinances(total: number | string | Decimal, settings: {
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
 */
export function aggregateFinancials(orders: any[], settings: any) {
    let totals = {
        gross: new Decimal(0),
        commissions: new Decimal(0),
        ops: new Decimal(0),
        taxes: new Decimal(0),
        net: new Decimal(0)
    };

    orders.forEach(order => {
        if (!order.total) return;
        const split = calculateOrderFinances(order.total, settings);
        totals.gross = totals.gross.plus(split.total);
        totals.commissions = totals.commissions.plus(split.comisionAbogado);
        totals.ops = totals.ops.plus(split.gastosOperativos);
        totals.taxes = totals.taxes.plus(split.impuestos).plus(split.platformFee);
        totals.net = totals.net.plus(split.netoPlataforma);
    });

    return {
        totalIncome: totals.gross.toNumber(),
        totalCommissions: totals.commissions.toNumber(),
        totalExpenses: totals.ops.plus(totals.taxes).toNumber(),
        realProfit: totals.net.toNumber(),
        count: orders.length
    };
}
