import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getChatAuth, checkChatAccess } from '@/services/chat.service';

/**
 * POST /api/messages/[orderId]/read
 * Marca como leídos (para el usuario actual) todos los mensajes de la orden que
 * no fueron enviados por él, agregando su id a `readBy`.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
    try {
        const { orderId } = await params;
        const auth = await getChatAuth();
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const hasAccess = await checkChatAccess(orderId, auth.user.id, auth.role);
        if (!hasAccess) return NextResponse.json({ error: 'Prohibido' }, { status: 403 });

        await prisma.message.updateMany({
            where: {
                orderId,
                senderId: { not: auth.user.id },
                NOT: { readBy: { has: auth.user.id } },
            },
            data: { readBy: { push: auth.user.id } },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Messages Read] Error:', error);
        const message = error instanceof Error ? error.message : 'Error interno';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
