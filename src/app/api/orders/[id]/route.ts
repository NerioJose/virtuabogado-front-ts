import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    // Verificar autenticación
    let { data: { user } } = await supabase.auth.getUser();

    // Fallbacks
    if (!user) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user: headerUser } } = await supabase.auth.getUser(token);
            if (headerUser) user = headerUser;
        }
    }

    if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Usar Prisma para bypass de RLS
    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            service: true, // Incluir servicio para formatear items
            user: {
                select: {
                    nombre: true,
                    email: true
                }
            }
        }
    });
    
    if (!order) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Formatear para que el frontend reciba lo que espera (con items)
    const formattedOrder = {
        ...order,
        userName: order.user.nombre,
        userEmail: order.user.email,
        items: [{
            id: order.service.id,
            serviceId: order.service.id,
            serviceName: order.service.titulo,
            price: Number(order.service.precio),
            quantity: 1,
        }],
        total: Number(order.total),
    };

    return NextResponse.json(formattedOrder);
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // Verificar autenticación
    let { data: { user } } = await supabase.auth.getUser();

    // Fallbacks
    if (!user) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user: headerUser } } = await supabase.auth.getUser(token);
            if (headerUser) user = headerUser;
        }
    }

    if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        const order = await prisma.order.update({
            where: { id },
            data: body,
            include: {
                service: true,
                user: {
                    select: {
                        nombre: true,
                        email: true
                    }
                }
            }
        });
        
        // Formatear igual que el GET
        const formattedOrder = {
            ...order,
            userName: order.user.nombre,
            userEmail: order.user.email,
            items: [{
                id: order.service.id,
                serviceId: order.service.id,
                serviceName: order.service.titulo,
                price: Number(order.service.precio),
                quantity: 1,
            }],
            total: Number(order.total),
        };

        return NextResponse.json(formattedOrder);
    } catch (error: any) {
        console.error('❌ [Order PATCH API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    // Verificar autenticación
    let { data: { user } } = await supabase.auth.getUser();

    // Fallbacks
    if (!user) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user: headerUser } } = await supabase.auth.getUser(token);
            if (headerUser) user = headerUser;
        }
    }

    if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    try {
        await prisma.order.delete({
            where: { id }
        });
        return NextResponse.json({ message: 'Order deleted successfully' });
    } catch (error: any) {
        console.error('❌ [Order DELETE API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
