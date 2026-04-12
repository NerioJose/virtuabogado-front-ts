import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { broadcastOrderUpdate } from '@/lib/broadcast';
import { notifyNewCase, notifyOrderStatusUpdate } from '@/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    

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
        const isNewAssignment = body.lawyerId && !order.lawyerId; // Esto no funciona bien porque 'order' es el objeto YA actualizado

        // Necesitamos el estado anterior para saber si es nueva asignación. 
        // Pero el Administrador suele enviar lawyerId y status: 'EN_PROGRESO' juntos.
        // Si el body trae lawyerId, asumimos que es una intención de asignación.
        
        broadcastOrderUpdate({
            orderId: order.id,
            userId: order.userId,
            lawyerId: order.lawyerId,
            status: order.status,
            eventType: 'updated',
            isNewAssignment: !!body.lawyerId // Si el Admin mandó un lawyerId en este PATCH, es una asignación
        });

        // 🔔 Enviar Notificación Push VAPID al abogado asignado
        if (body.lawyerId && order.lawyerId) {
            notifyNewCase(order.lawyerId, order.id, order.service.titulo)
                .catch((e: Error | any) => console.error('Error enviando push de asignación:', e));
        }

        // 🔔 Enviar Notificación Push VAPID al cliente si cambia el estado a relevante (Asignado/Completado)
        if (body.status === 'EN_PROGRESO' || body.status === 'COMPLETADO' || body.lawyerId) {
            notifyOrderStatusUpdate(order.userId, order.id, order.status, order.service.titulo)
                .catch((e: Error | any) => console.error('Error enviando push al cliente:', e));
        }

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
        // Determinar si buscamos por UUID o por numericId
        const isNumeric = /^\d+$/.test(id);
        const orderWhere: any = isNumeric ? { numericId: parseInt(id) } : { id };

        // Si es numericId, necesitamos el id (UUID) para borrar las relaciones
        let uuid = id;
        if (isNumeric) {
            const order = await prisma.order.findUnique({
                where: orderWhere,
                select: { id: true }
            });
            if (!order) {
                return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
            }
            uuid = order.id;
        }

        // Eliminar en cascada manualmente para evitar errores de Foreign Key
        await prisma.$transaction([
            prisma.message.deleteMany({ where: { orderId: uuid } }),
            prisma.document.deleteMany({ where: { orderId: uuid } }),
            prisma.review.deleteMany({ where: { orderId: uuid } }),
            prisma.order.delete({ where: { id: uuid } })
        ]);
        
        
        return NextResponse.json({ 
            success: true,
            message: 'Caso y todo su historial de mensajes/documentos han sido eliminados correctamente.' 
        });
    } catch (error: any) {
        console.error(`❌ [Order DELETE API] Error deleting order ${id}:`, error);
        
        // Mensaje contextual para el administrador según el tipo de error
        let errorMessage = 'No se pudo eliminar el caso.';
        if (error.code === 'P2003') {
            errorMessage = 'Este caso tiene dependencias activas en otras tablas que impiden su eliminación directa. Por favor, asegúrate de que no haya pagos pendientes vinculados.';
        } else if (error.message?.includes('foreign key constraint')) {
            errorMessage = 'Error de integridad: El caso tiene registros vinculados que no pudieron ser eliminados en cascada.';
        } else {
            errorMessage = `Error interno: ${error.message || 'Consulte los logs del servidor'}`;
        }

        return NextResponse.json({ 
            error: errorMessage,
            details: error.code || 'UNKNOWN_ERROR'
        }, { status: 500 });
    }
}
