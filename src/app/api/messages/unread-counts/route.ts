import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getChatAuth } from '@/services/chat.service';

/**
 * GET /api/messages/unread-counts
 * Devuelve { [orderId]: cantidad } de mensajes sin leer para el usuario actual
 * (cliente/abogado: solo sus órdenes; admin: todas).
 */
export async function GET() {
    try {
        const auth = await getChatAuth();
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const userId = auth.user.id;

        const where: Prisma.MessageWhereInput = {
            senderId: { not: userId },
            NOT: { readBy: { has: userId } },
        };

        if (auth.role !== 'ADMIN') {
            where.order = { OR: [{ userId }, { lawyerId: userId }] };
        }

        const grouped = await prisma.message.groupBy({
            by: ['orderId'],
            where,
            _count: { _all: true },
        });

        const counts: Record<string, number> = {};
        for (const g of grouped) {
            counts[g.orderId] = g._count._all;
        }

        return NextResponse.json({ counts });
    } catch (error) {
        console.error('[Messages Unread Counts] Error:', error);
        const message = error instanceof Error ? error.message : 'Error interno';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
