import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { OrderStatus } from '@/shared/types/entities.types';

/**
 * GET /api/payments/status?orderId=[ID]
 * Endpoint diseñado para el polling de reconciliación en tiempo real.
 * IMPORTANTE: Forzar no-cache para garantizar datos frescos en cada ciclo de polling.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const orderId = req.nextUrl.searchParams.get('orderId') || new URL(req.url).searchParams.get('orderId');

    if (!orderId) {
        return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    try {
        // Consultamos solo el campo necesario para máxima velocidad
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { status: true }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Mapeo Fintech: Transformamos estados internos a estados de UX
        let statusResponse: 'PENDING' | 'PAID' | 'ERROR' = 'PENDING';

        // PENDIENTE, EN_PROGRESO y COMPLETADO también se consideran "Pagados" para el cliente
        // si el proceso ya avanzó pero por algún motivo el polling sigue activo.
        if (order.status === 'PAID' || 
            order.status === 'PENDIENTE' || 
            order.status === 'EN_PROGRESO' ||
            order.status === 'COMPLETADO') {
            statusResponse = 'PAID';
        } else if (order.status === 'PAGO_RECHAZADO' || 
                   order.status === 'FALLIDO' || 
                   order.status === 'CANCELADO') {
            statusResponse = 'ERROR';
        }

        const NO_CACHE_HEADERS = {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
        };

        console.log(`[Status API] Orden ${orderId}: rawStatus=${order.status}, mappedStatus=${statusResponse}`);

        return NextResponse.json({ 
            status: statusResponse,
            rawStatus: order.status, // Útil para debugging en el navegador
            orderId 
        }, { headers: NO_CACHE_HEADERS });
    } catch (error) {
        console.error('❌ [Payment Status API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
