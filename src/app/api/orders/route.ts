import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { UserRole } from '@/shared/types/entities.types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        // Verificar autenticación
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // 1. Fallback: Check for Authorization header if cookies fail
        if (!user) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { data: { user: headerUser } } = await supabase.auth.getUser(token);
                if (headerUser) {
                    user = headerUser;
                    console.log('✅ Orders API: Auth success via Authorization header');
                }
            }
        }

        if (!user) {
            console.warn('⚠️ API GET /orders: User not found in session');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener rol (Priorizar metadata de Supabase Auth, fallback a DB)
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol || 'CLIENTE';
        }

        const { searchParams } = new URL(request.url);
        const lawyerId = searchParams.get('lawyerId');
        const userId = searchParams.get('userId');

        const where: any = {
            activo: true
        };

        // Seguridad: Restringir filtros según rol si no es ADMIN
        if (userRole !== 'ADMIN') {
            if (userRole === 'ABOGADO') {
                // Abogados solo ven lo asignado a ellos
                where.lawyerId = user.id;
            } else {
                // Clientes solo ven lo suyo
                where.userId = user.id;
            }
        } else {
            // Admin puede filtrar libremente
            if (lawyerId) where.lawyerId = lawyerId;
            if (userId) where.userId = userId;
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
        const supabase = await createClient();
        // Verificar autenticación
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // 1. Fallback: Check for Authorization header if cookies fail
        if (!user) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { data: { user: headerUser } } = await supabase.auth.getUser(token);
                if (headerUser) {
                    user = headerUser;
                }
            }
        }

        if (!user) {
            console.warn('⚠️ API POST /orders: User not found in session');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { serviceId, userId, total, paymentId, userEmail, userNombre } = body;

        // Seguridad: Determinar el ID del usuario final
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol || 'CLIENTE';
        }
        
        const isAdmin = userRole === 'ADMIN';
        
        // Un usuario no-admin solo puede crear órdenes para sí mismo o para un email que ya posee
        let finalUserId = user.id; 
        
        if (isAdmin && userId) {
            finalUserId = userId; // Admin puede especificar un userId diferente
        } else if (userId && userId !== user.id) {
             return NextResponse.json({ error: 'No tienes permiso para crear órdenes para otro usuario' }, { status: 403 });
        }

        console.log('📦 API: Creating order for user:', finalUserId);

        if (!serviceId || !total) {
            return NextResponse.json(
                { error: 'Faltan datos de la orden' },
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
        return NextResponse.json(
            { error: 'Error al procesar la orden', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        // Verificar autenticación
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // 1. Fallback: Header
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

        const body = await request.json();
        const { id, status, total, paymentId, lawyerId } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 });
        }

        // Verificar propiedad o rol
        const existingOrder = await prisma.order.findUnique({ where: { id } });
        if (!existingOrder) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol || 'CLIENTE';
        }

        const isAdmin = userRole === 'ADMIN';
        const isLawyer = userRole === 'ABOGADO';
        const isOwner = existingOrder.userId === user.id;
        const isAssignedLawyer = existingOrder.lawyerId === user.id;

        if (!isAdmin && !isOwner && !isAssignedLawyer) {
            return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 });
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
        const supabase = await createClient();
        // Verificar autenticación
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // Auth fallbacks
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

        // Solo ADMIN puede borrar
        let isAdmin = false;
        
        let userRole = user.user_metadata?.rol;
        
        if (userRole === 'ADMIN') {
            isAdmin = true;
        } else if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            isAdmin = userData?.rol === 'ADMIN';
        }

        if (!isAdmin) {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

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
