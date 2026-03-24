import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { broadcastOrderUpdate } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;
    console.log(`🔍 [Orders API] Fetching order: ${id}`);

    try {
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

        // Determinar si buscamos por UUID o por numericId
        const isNumeric = /^\d+$/.test(id);
        
        const includeConfig = {
            service: true, 
            user: {
                select: {
                    nombre: true,
                    email: true
                }
            }
        } as const;

        // Usar Prisma para bypass de RLS
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = isNumeric ? { numericId: parseInt(id) } : { id };
        const order = await prisma.order.findUnique({ where: whereClause, include: includeConfig });
        
        if (!order) {
            console.warn(`⚠️ [Orders API] Order not found: ${id}`);
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        // Formatear para que el frontend reciba lo que espera (con items)
        const formattedOrder = {
            ...order,
            userName: order.user?.nombre || 'Usuario',
            userEmail: order.user?.email || '',
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
        console.error(`❌ [Orders API] Error fetching order ${id}:`, error);
        return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
    }
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

        // 📡 Broadcast a todos los dashboards (admin, abogado, cliente)
        broadcastOrderUpdate({
            orderId: order.id,
            userId: order.userId,
            lawyerId: order.lawyerId,
            status: order.status,
            eventType: 'updated',
        });

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
