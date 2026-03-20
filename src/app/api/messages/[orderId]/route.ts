import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: { orderId: string } }
) {
    try {
        const orderId = params.orderId;
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
                        picture: true
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
