import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { emit } from '@/events/eventBus';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const headerId = request.headers.get('x-user-id');

        if (!headerId) {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
            }
        }

        const isNumeric = /^\d+$/.test(id);
        
        const includeConfig = {
            service: true, 
            user: {
                select: {
                    nombre: true,
                    email: true
                }
            },
            paymentMethod: {
                select: {
                    identifier: true,
                    name: true
                }
            }
        } as const;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = isNumeric ? { numericId: parseInt(id) } : { id };
        const order = await prisma.order.findUnique({ where: whereClause, include: includeConfig });
        
        if (!order) {
            console.warn(`⚠️ [Orders API] Order not found: ${id}`);
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        const formattedOrder = {
            ...order,
            userName: order.user?.nombre || 'Usuario',
            userEmail: order.user?.email || '',
            paymentMethodIdentifier: order.paymentMethod?.identifier || null,
            paymentMethodName: order.paymentMethod?.name || null,
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
    const [{ id }, body] = await Promise.all([
        params,
        request.json()
    ]);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const allowedFields = ['status', 'lawyerId', 'assignedAt', 'description'];
    const dataToUpdate: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
        if (allowedFields.includes(key)) {
            dataToUpdate[key] = body[key];
        }
    }

    try {
        // Capturar estado anterior antes del update
        const orderBefore = await prisma.order.findUnique({
            where: { id },
            select: { status: true, lawyerId: true, commissionAmount: true },
        });

        const order = await prisma.order.update({
            where: { id },
            data: dataToUpdate,
            include: {
                service: true,
                user: {
                    select: {
                        nombre: true,
                        email: true
                    }
                },
                lawyer: {
                    select: {
                        nombre: true
                    }
                }
            }
        });

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

        const events: Promise<void>[] = [];

        // Asignación de abogado
        if (body.lawyerId && order.lawyerId && (!orderBefore?.lawyerId || orderBefore.lawyerId !== order.lawyerId)) {
            events.push(emit({
                type: 'order.assigned',
                data: { orderId: order.id, lawyerId: order.lawyerId, userId: order.userId, serviceName: order.service.titulo },
            }));
        }

        // Cambio de estado
        if (body.status && orderBefore?.status !== body.status) {
            events.push(emit({
                type: 'order.status_changed',
                data: { orderId: order.id, from: orderBefore?.status || 'unknown', to: body.status, changedBy: user.id },
            }));

            if (body.status === 'COMPLETADO') {
                events.push(emit({
                    type: 'order.completed',
                    data: {
                        orderId: order.id,
                        lawyerId: order.lawyerId,
                        commissionAmount: Number(order.commissionAmount || 0),
                        serviceName: order.service.titulo,
                        lawyerName: order.lawyer?.nombre,
                    },
                }));
            }
        }

        await Promise.all(events);

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
    const { id } = await params;

    const headerId = request.headers.get('x-user-id');

    if (!headerId) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
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
