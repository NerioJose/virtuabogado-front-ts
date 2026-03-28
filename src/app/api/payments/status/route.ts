import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { OrderStatus } from '@/shared/types/entities.types';

/**
 * GET /api/payments/status?orderId=[ID]
 * Endpoint diseñado para el polling de reconciliación en tiempo real.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

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

        return NextResponse.json({ 
            status: statusResponse,
            orderId 
        });
    } catch (error) {
        console.error('❌ [Payment Status API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
