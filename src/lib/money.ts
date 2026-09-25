/**
 * Operaciones monetarias exactas con decimal.js (el mismo motor que usa
 * Prisma para las columnas Decimal). Client-safe.
 *
 * Todas las conversiones usan ROUND_HALF_UP a 2 decimales, consistentes con
 * el almacenamiento DECIMAL(10,2). Evita artefactos de punto flotante.
 */
import Decimal from 'decimal.js';

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

const toNum = (value: unknown): Decimal => {
    if (value === null || value === undefined || value === '') return new Decimal(0);
    return new Decimal(value as string | number);
};

/**
 * Convierte un monto en USD a PEN usando la tasa dada.
 * Redondeado a 2 decimales (ROUND_HALF_UP).
 */
export function usdToPen(usd: number | string | null | undefined, rate: number): number {
    if (!rate || !Number.isFinite(rate)) return 0;
    return toNum(usd).mul(rate).toDecimalPlaces(2).toNumber();
}

/**
 * Convierte un monto en PEN a USD usando la tasa dada.
 * Redondeado a 2 decimales (ROUND_HALF_UP).
 */
export function penToUsd(pen: number | string | null | undefined, rate: number): number {
    if (!rate || !Number.isFinite(rate) || rate <= 0) return 0;
    return toNum(pen).div(rate).toDecimalPlaces(2).toNumber();
}

/**
 * Redondea un monto a "precision" decimales (ROUND_HALF_UP).
 */
export function roundMoney(value: number | string | null | undefined, precision: number = 2): number {
    return toNum(value).toDecimalPlaces(precision).toNumber();
}