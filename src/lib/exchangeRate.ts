/**
 * Utilidad de tipo de cambio USD -> PEN.
 *
 * Estrategia (server-side, nunca usada en el cliente):
 *  1. Si el admin configuró una tasa manual (FinancialSettings.usd_pen_fallback_rate),
 *     se usa ESA (tiene prioridad y se lee fresca de la BD).
 *  2. Si no hay tasa manual, intenta obtener el tipo de cambio del día desde una
 *     fuente automatizada (Frankfurter, sin API key), cacheada en memoria 1h.
 *  3. Si tampoco existe, lanza un error controlado para no procesar el pago con un monto incorrecto.
 *
 * El valor automático se cachea en memoria con TTL para evitar llamadas externas repetidas.
 */

import { prisma } from '@/lib/prisma';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';

const TTL_MS = 60 * 60 * 1000; // 1 hora

let cachedRate: number | null = null;
let cachedAt: number = 0;

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD&to=PEN';

async function fetchUsdPenRate(): Promise<number | null> {
    try {
        const res = await fetch(FRANKFURTER_URL, {
            // Revalidate a nivel HTTP para no cachear obsoleto
            next: { revalidate: 3600 },
        });
        if (!res.ok) return null;
        const data = await res.json();
        const rate = data?.rates?.PEN;
        return typeof rate === 'number' && rate > 0 ? rate : null;
    } catch (e) {
        console.warn('⚠️ [exchangeRate] Error consultando tipo de cambio automático:', e);
        return null;
    }
}

/**
 * Lee la tasa manual SIEMPRE de la fila maestra (única fuente de verdad),
 * la misma que lee/escribe el panel admin y el PATCH. Si la maestra no
 * existe aún, cae (defensivo) a la primera fila disponible.
 */
async function getManualFallbackRate(): Promise<number | null> {
    try {
        const model = (prisma as any).financialSettings || (prisma as any).FinancialSettings || (prisma as any)['FinancialSettings'];
        let settings = await model?.findUnique?.({ where: { id: FINANCIAL_SETTINGS_ID } });
        if (!settings) {
            settings = await model?.findFirst?.();
        }
        const raw = settings?.usd_pen_fallback_rate;
        const rate = raw == null ? NaN : Number(raw);
        return Number.isFinite(rate) && rate > 0 ? rate : null;
    } catch (e) {
        console.warn('⚠️ [exchangeRate] Error leyendo tipo de cambio de respaldo:', e);
        return null;
    }
}

/**
 * Obtiene el tipo de cambio USD -> PEN.
 *  - La tasa MANUAL configurada por el admin (FinancialSettings.usd_pen_fallback_rate)
 *    tiene PRIORIDAD y se lee fresca de la BD para reflejar cambios inmediatos.
 *  - Si no hay tasa manual, usa la automática (Frankfurter), cacheada en memoria 1h.
 * Lanza un error si no es posible determinar un tipo de cambio válido.
 */
export async function getUsdPenRate(): Promise<number> {
    // 1. Tasa manual (prioridad). Se lee fresca para reflejar cambios del admin.
    const manual = await getManualFallbackRate();
    if (manual !== null) {
        return manual;
    }

    // 2. Tasa automática, cacheada en memoria por 1h.
    const now = Date.now();
    if (cachedRate !== null && now - cachedAt < TTL_MS) {
        return cachedRate;
    }

    const rate = await fetchUsdPenRate();

    if (rate === null) {
        throw new Error('No se pudo determinar el tipo de cambio USD/PEN. Verifique el tipo de cambio manual en la configuración financiera.');
    }

    cachedRate = rate;
    cachedAt = now;
    return rate;
}

/**
 * Convierte un monto en USD a PEN usando el tipo de cambio del día.
 * Server-side only.
 */
export async function convertUsdToPen(usdAmount: number): Promise<number> {
    const rate = await getUsdPenRate();
    return Math.round(usdAmount * rate * 100) / 100;
}

export function clearExchangeRateCache(): void {
    cachedRate = null;
    cachedAt = 0;
}