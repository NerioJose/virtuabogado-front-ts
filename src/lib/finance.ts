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

    if (Array.isArray(data)) {
        return data.map(item => serializeFinance(item)) as any;
    }

    if (data instanceof Date) {
        return data.toISOString() as any;
    }

    if (typeof data === 'object') {
        // Handle Prisma Decimal or any object with .toNumber()
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
