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

        // Fallback: Dev Bypass Cookie
        if (!user) {
            const devBypass = request.headers.get('cookie')?.includes('virtuabogado-dev-bypass=true');
            if (devBypass) {
                user = { id: 'dev-bypass-admin', email: 'admin@dev.test' } as any;
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener rol del usuario
        let userRole = 'CLIENTE';
        if (user.id === 'dev-bypass-admin') {
            userRole = 'ADMIN';
        } else {
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
