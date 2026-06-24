import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { notifyNewMessage } from '@/lib/push-notifications';
import { getChatAuth, checkChatAccess } from '@/services/chat.service';

async function sendBroadcast(supabaseAdmin: any, channelName: string, payload: any) {
    const channel = supabaseAdmin.channel(channelName);
    return new Promise((resolve) => {
        let isDone = false;
        const timeout = setTimeout(() => {
            if (!isDone) {
                supabaseAdmin.removeChannel(channel);
                resolve(false);
            }
        }, 2500);

        channel.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                isDone = true;
                clearTimeout(timeout);
                await channel.send({ type: 'broadcast', event: 'new_message', payload });
                supabaseAdmin.removeChannel(channel);
                resolve(true);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                isDone = true;
                clearTimeout(timeout);
                supabaseAdmin.removeChannel(channel);
                resolve(false);
            }
        });
    });
}

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

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const broadcastPromises: Promise<any>[] = [];
        if (order.userId && order.userId !== senderId) {
            broadcastPromises.push(sendBroadcast(supabaseAdmin, `global_${order.userId}`, { new: newMessage }));
        }
        if (order.lawyerId && order.lawyerId !== senderId) {
            broadcastPromises.push(sendBroadcast(supabaseAdmin, `global_${order.lawyerId}`, { new: newMessage }));
        }
        broadcastPromises.push(sendBroadcast(supabaseAdmin, `chat_${orderId}`, { new: newMessage }));

        const pushPromises: Promise<any>[] = [];
        const senderName = newMessage.sender?.nombre || 'Alguien';
        if (order.userId && order.userId !== senderId) {
            pushPromises.push(notifyNewMessage(order.userId, senderName, content, orderId));
        }
        if (order.lawyerId && order.lawyerId !== senderId) {
            pushPromises.push(notifyNewMessage(order.lawyerId, senderName, content, orderId));
        }

        await Promise.all([...broadcastPromises, ...pushPromises]);

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

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true, lawyerId: true }
        });

        if (order) {
            const broadcastPromises: Promise<any>[] = [];
            if (order.userId) broadcastPromises.push(sendBroadcast(supabaseAdmin, `global_${order.userId}`, { deleted: { id: messageId, orderId } }));
            if (order.lawyerId) broadcastPromises.push(sendBroadcast(supabaseAdmin, `global_${order.lawyerId}`, { deleted: { id: messageId, orderId } }));
            broadcastPromises.push(sendBroadcast(supabaseAdmin, `chat_${orderId}`, { deleted: { id: messageId, orderId } }));
            await Promise.all(broadcastPromises);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
