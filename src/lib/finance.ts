/**
 * Profesional USD Formatter using Intl.NumberFormat.
 * Ensures 100% consistency in currency display across the platform ($ USD).
 * [CLIENT-SAFE]
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
 * [CLIENT-SAFE] - No import de Prisma requerido.
 */
export function serializeFinance<T>(data: T): T {
    if (data === null || data === undefined) return data;
    
    // Fast-path for primitives
    const dataType = typeof data;
    if (dataType !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map(item => serializeFinance(item)) as any;
    }

    if (data instanceof Date) {
        return data.toISOString() as any;
    }

    // Handle Prisma Decimal or any object with .toNumber()
    if ((data as any).toNumber && typeof (data as any).toNumber === 'function') {
        return (data as any).toNumber();
    }

    // Batch process object entries
    const result: any = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            result[key] = serializeFinance((data as any)[key]);
        }
    }
    
    return result;
}
