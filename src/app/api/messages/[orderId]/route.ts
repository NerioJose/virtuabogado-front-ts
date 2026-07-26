import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emit } from '@/events/eventBus';
import { getChatAuth, checkChatAccess } from '@/services/chat.service';

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
    try {
        const { orderId } = await params;
        const auth = await getChatAuth();
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const hasAccess = await checkChatAccess(orderId, auth.user.id, auth.role);
        if (!hasAccess) return NextResponse.json({ error: 'Prohibido' }, { status: 403 });

        const messages = await prisma.message.findMany({
            where: { orderId },
            include: { sender: { select: { nombre: true, picture: true, rol: true } } },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json(messages);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
    try {
        const { orderId } = await params;
        const auth = await getChatAuth();
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        const { content, senderId } = body;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true, lawyerId: true }
        });
        if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });

        const hasAccess = await checkChatAccess(orderId, auth.user.id, auth.role);
        if (!hasAccess) return NextResponse.json({ error: 'Prohibido' }, { status: 403 });

        const newMessage = await prisma.message.create({
            data: { orderId, content, senderId, read: false, isSystem: false },
            include: { sender: { select: { nombre: true, picture: true, rol: true } } }
        });

        const senderName = newMessage.sender?.nombre || 'Alguien';

        await emit({
            type: 'message.sent',
            data: { messageId: newMessage.id, orderId, senderId, content, senderName },
        });

        return NextResponse.json(newMessage);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
    try {
        const { orderId } = await params;
        const { messageId } = await request.json();
        if (!messageId) return NextResponse.json({ error: 'ID de mensaje requerido' }, { status: 400 });

        const auth = await getChatAuth();
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: { senderId: true, orderId: true }
        });
        if (!message) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });

        if (message.senderId !== auth.user.id && auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        await prisma.message.delete({ where: { id: messageId } });

        await emit({
            type: 'message.deleted',
            data: { messageId, orderId },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
