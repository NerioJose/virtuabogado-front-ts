import { NextResponse } from 'next/server';
import { getUsdPenRate } from '@/lib/exchangeRate';

export const revalidate = 300;

/**
 * GET /api/exchange-rate
 * Tasa de cambio USD -> PEN (misma que usa el checkout de MercadoPago/Yape).
 * Público y cacheado. Si no hay tasa disponible devuelve { rate: null }.
 */
export async function GET() {
    try {
        const rate = await getUsdPenRate();
        return NextResponse.json(
            { rate, currency: 'PEN', updatedAt: new Date().toISOString() },
            { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } }
        );
    } catch (error) {
        console.warn('[exchange-rate] No se pudo obtener la tasa USD/PEN:', error);
        return NextResponse.json(
            { rate: null, currency: 'PEN', updatedAt: new Date().toISOString() },
            { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } }
        );
    }
}
