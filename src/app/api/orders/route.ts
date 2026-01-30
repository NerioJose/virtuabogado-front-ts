import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const lawyerId = searchParams.get('lawyerId');
        const userId = searchParams.get('userId');

        const where: any = {
            activo: true
        };

        if (lawyerId) {
            where.lawyerId = lawyerId;
        }

        if (userId) {
            where.userId = userId;
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                service: true,
                user: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                        telefono: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Mapear al formato que espera el frontend si es necesario
        const formattedOrders = orders.map(order => ({
            id: order.id,
            numericId: order.numericId,
            uuid: order.id,
            userId: order.userId,
            userName: order.user.nombre,
            userEmail: order.user.email,
            items: [{
                id: order.service.id,
                serviceId: order.service.id,
                serviceName: order.service.titulo,
                price: Number(order.service.precio),
                quantity: 1,
            }],
            subtotal: Number(order.total),
            tax: 0,
            total: Number(order.total),
            status: order.status,
            paymentMethod: 'CREDIT_CARD', // Default for now
            transactionId: order.paymentId,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        }));

        return NextResponse.json(formattedOrders);
    } catch (error) {
        console.error('❌ API Error fetching orders:', error);
        return NextResponse.json(
            { error: 'Error al obtener las órdenes' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { serviceId, userId, total, paymentId, userEmail, userNombre } = body;

        console.log('📦 API: Creating order with data:', body);

        if (!serviceId || !total) {
            return NextResponse.json(
                { error: 'Faltan datos de la orden' },
                { status: 400 }
            );
        }

        // Determinar el ID del usuario final
        let finalUserId = (userId && userId !== 'undefined' && userId !== 'null') ? userId : null;

        // Si no viene userId, pero viene info de usuario, intentamos buscarlo
        if (!finalUserId && userEmail) {
            const user = await prisma.user.findUnique({
                where: { email: userEmail }
            });

            if (user) {
                finalUserId = user.id;
            } else if (userNombre) {
                return NextResponse.json(
                    { error: 'Usuario no encontrado. Por favor regístrate primero.' },
                    { status: 400 }
                );
            }
        }

        if (!finalUserId) {
            return NextResponse.json(
                { error: 'Usuario no identificado' },
                { status: 400 }
            );
        }

        // Validar tipos
        const numericServiceId = Number(serviceId);
        const numericTotal = Number(total);

        if (isNaN(numericServiceId) || isNaN(numericTotal)) {
            console.error('❌ API: Invalid numeric values:', { serviceId, total });
            return NextResponse.json(
                { error: 'Valores numéricos inválidos' },
                { status: 400 }
            );
        }

        console.log('📦 API: Final data for Prisma:', {
            finalUserId,
            numericServiceId,
            numericTotal,
            paymentId
        });

        // Crear la orden en base de datos
        const newOrder = await prisma.order.create({
            data: {
                userId: finalUserId,
                serviceId: numericServiceId,
                total: numericTotal,
                status: 'PENDIENTE',
                paymentId: paymentId || `PAY-MOCK-${Date.now()}`,
            },
            include: {
                service: true,
                user: true
            }
        });

        console.log('✅ API: Order created successfully:', newOrder.id);

        return NextResponse.json({
            id: newOrder.numericId,
            uuid: newOrder.id,
            status: 'success',
            message: 'Orden creada exitosamente'
        }, { status: 201 });

    } catch (error) {
        console.error('❌ API Error creating order:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Stack:', error.stack);
        }
        return NextResponse.json(
            { error: 'Error al procesar la orden', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, status, total, paymentId, lawyerId } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 });
        }

        const dataToUpdate: any = {
            status: status || undefined,
            total: total ? Number(total) : undefined,
            paymentId: paymentId || undefined,
        };

        // Si se envía lawyerId, actualizamos asignación
        if (lawyerId) {
            dataToUpdate.lawyerId = lawyerId;
            dataToUpdate.assignedAt = new Date();
            // Opcional: Cambiar estado a EN_PROGRESO automáticamente si estaba PENDIENTE
            // dataToUpdate.status = 'EN_PROGRESO'; 
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: dataToUpdate,
        });

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('❌ API Error updating order:', error);
        return NextResponse.json({ error: 'Error al actualizar la orden' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 });
        }

        // Borrado lógico
        await prisma.order.update({
            where: { id },
            data: { activo: false },
        });

        return NextResponse.json({ message: 'Orden eliminada correctamente' });
    } catch (error) {
        console.error('❌ API Error deleting order:', error);
        return NextResponse.json({ error: 'Error al eliminar la orden' }, { status: 500 });
    }
}
