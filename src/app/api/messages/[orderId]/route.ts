import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { notifyNewMessage } from '@/lib/push-notifications';


// Utilidad para asegurar el envío del broadcast en un entorno Serverless iterativo
async function sendBroadcast(supabaseAdmin: any, channelName: string, payload: any) {
    const channel = supabaseAdmin.channel(channelName);
    return new Promise((resolve) => {
        let isDone = false;
        const timeout = setTimeout(() => {
            if (!isDone) {
                supabaseAdmin.removeChannel(channel);
                resolve(false);
            }
        }, 2500); // Dar suficiente tiempo para la conexión websocket

        channel.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                isDone = true;
                clearTimeout(timeout);
                await channel.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: payload
                });
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

export async function GET(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params;
        const supabase = await createClient();
        
        // Verificar autenticación
        let { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener rol del usuario
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol || 'CLIENTE';
        }

        // Verificar si el usuario tiene acceso a esta orden/chat
        // El ADMIN tiene acceso a todo. Otros deben ser participantes.
        if (userRole !== 'ADMIN') {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                select: { userId: true, lawyerId: true }
            });

            if (!order || (order.userId !== user.id && order.lawyerId !== user.id)) {
                return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
            }
        }

        // Obtener mensajes usando Prisma (Bypass RLS)
        const messages = await prisma.message.findMany({
            where: { orderId },
            include: {
                sender: {
                    select: {
                        nombre: true,
                        picture: true,
                        rol: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return NextResponse.json(messages);
    } catch (error: any) {
        console.error('❌ [Messages API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params;
        const supabase = await createClient();
        
        // Verificar autenticación
        let { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { content, senderId } = body;

        // Obtener rol del usuario
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol || 'CLIENTE';
        }

        // Obtener información de la orden para seguridad y notificaciones
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true, lawyerId: true }
        });

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        // Verificar si el usuario tiene acceso a esta orden/chat
        if (userRole !== 'ADMIN') {
            if (order.userId !== user.id && order.lawyerId !== user.id) {
                return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
            }
        }

        // Obtener mensajes usando Prisma (Bypass RLS para evitar errores PostgREST de relaciones)
        const newMessage = await prisma.message.create({
            data: {
                orderId,
                content,
                senderId,
                read: false,
                isSystem: false
            },
            include: {
                sender: {
                    select: {
                        nombre: true,
                        picture: true,
                        rol: true
                    }
                }
            }
        });

        // ======= SUPERCHARGE REALTIME WITH BROADCAST =======
        // Usamos Service Role para emitir directo asegurando la conexión websocket
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Al usar 'global_{id}', centralizamos todos los WebSockets en uno solo por usuario 
        // y eliminamos el exceso de sockets. 
        const broadcastPromises = [];

        // Notificar al cliente (únicamente si no fue él quien envió)
        if (order.userId && order.userId !== senderId) {
            broadcastPromises.push(sendBroadcast(supabaseAdmin, `global_${order.userId}`, { new: newMessage }));
        }
        
        // Notificar al abogado (únicamente si no fue él quien envió)
        if (order.lawyerId && order.lawyerId !== senderId) {
            broadcastPromises.push(sendBroadcast(supabaseAdmin, `global_${order.lawyerId}`, { new: newMessage }));
        }

        // Notificar a la "SALA DE CHAT" (para todos los que están viendo este caso, incluyendo ADMINS)
        broadcastPromises.push(sendBroadcast(supabaseAdmin, `chat_${orderId}`, { new: newMessage }));

        // ======= PUSH NOTIFICATIONS =======
        const pushPromises = [];
        const senderName = newMessage.sender?.nombre || 'Alguien';
        
        if (order.userId && order.userId !== senderId) {
            pushPromises.push(notifyNewMessage(order.userId, senderName, content, orderId));
        }
        
        if (order.lawyerId && order.lawyerId !== senderId) {
            pushPromises.push(notifyNewMessage(order.lawyerId, senderName, content, orderId));
        }

        // Emitimos todos en paralelo para no bloquear (el utility garantiza que todos lleguen)
        await Promise.all([...broadcastPromises, ...pushPromises]);

        return NextResponse.json(newMessage);
    } catch (error: any) {
        console.error('❌ [Messages API POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params;
        const { messageId } = await request.json();
        
        if (!messageId) {
            return NextResponse.json({ error: 'ID de mensaje requerido' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener el mensaje para verificar propiedad
        const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: { senderId: true, orderId: true }
        });

        if (!message) {
            return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
        }

        // Obtener rol del usuario para permitir borrar si es ADMIN
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol || 'CLIENTE';
        }

        // Seguridad: Solo el emisor o el ADMIN pueden borrar
        if (message.senderId !== user.id && userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        // Eliminar el mensaje
        await prisma.message.delete({
            where: { id: messageId }
        });

        // ======= BROADCAST DELETION =======
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Obtener participantes de la orden para notificar
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true, lawyerId: true }
        });

        if (order) {
            const broadcastPromises = [];
            if (order.userId) broadcastPromises.push(sendBroadcast(supabaseAdmin, `global_${order.userId}`, { deleted: { id: messageId, orderId } }));
            if (order.lawyerId) broadcastPromises.push(sendBroadcast(supabaseAdmin, `global_${order.lawyerId}`, { deleted: { id: messageId, orderId } }));
            
            // Notificar a la "SALA DE CHAT" (Borrado en tiempo real)
            broadcastPromises.push(sendBroadcast(supabaseAdmin, `chat_${orderId}`, { deleted: { id: messageId, orderId } }));
            
            await Promise.all(broadcastPromises);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('❌ [Messages API DELETE] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
