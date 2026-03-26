import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { UserRole } from '@/shared/types/entities.types';
import { broadcastOrderUpdate } from '@/lib/broadcast';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';

import { capitalizeName, formatLawyerName } from '@/utils/formatters';

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
                },
                lawyer: {
                    select: {
                        nombre: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // 🏛️ FINANCIAL SETTINGS: Fetch for splits
        const settings = await prisma.financialSettings.findUnique({
            where: { id: FINANCIAL_SETTINGS_ID }
        }) || {
            lawyer_commission_percentage: 0,
            operational_costs_percentage: 0,
            tax_percentage: 0,
            platform_fee_percentage: 0
        };

        // Mapear al formato que espera el frontend con desglose financiero dinámico
        const formattedOrders = orders.map(order => {
            // Calcular desgloses en tiempo real para máxima precisión
            const total = Number(order.total);
            const lawyerPct = Number(settings.lawyer_commission_percentage) / 100;
            const comisionLawyer = total * lawyerPct;

            return {
                id: order.id,
                numericId: order.numericId,
                uuid: order.id,
                userId: order.userId,
                lawyerId: order.lawyerId,
                lawyerName: order.lawyer?.nombre ? formatLawyerName(order.lawyer.nombre) : 'Pendiente',
                userName: capitalizeName(order.user.nombre),
                userEmail: order.user.email,
                items: [{
                    id: order.service.id,
                    serviceId: order.service.id,
                    serviceName: order.service.titulo,
                    price: Number(order.service.precio),
                    quantity: 1,
                }],
                subtotal: total,
                tax: 0,
                total: total,
                status: order.status,
                paymentMethod: 'CREDIT_CARD',
                transactionId: order.paymentId,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                // Inyectar datos financieros calculados
                commissionAmount: comisionLawyer,
                netProfitAmount: total - comisionLawyer, // Lo que resta para la plataforma
            };
        });

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
        console.log('📦 [Orders API POST] Body received:', body);
        const { serviceId, userId, paymentId } = body;

        // 🛡️ SECURITY: Fetch current service price and availability from DB
        // DO NOT trust the 'total' from the client-side!
        const service = await prisma.service.findUnique({
            where: { id: Number(serviceId) }
        });

        if (!service || !service.activo) {
            return NextResponse.json({ error: 'Servicio no encontrado o no disponible' }, { status: 404 });
        }

        const currentPrice = Number(service.precio);

        // 🏛️ FINANCIAL SETTINGS: Fetch current split percentages (Strict ID Synchronization)
        let settings = await prisma.financialSettings.findUnique({
            where: { id: FINANCIAL_SETTINGS_ID }
        });

        // Use defaults if settings don't exist yet (Absolute Zero Fallback)
        if (!settings) {
            settings = {
                id: FINANCIAL_SETTINGS_ID,
                lawyer_commission_percentage: 0 as any,
                operational_costs_percentage: 0 as any,
                tax_percentage: 0 as any,
                platform_fee_percentage: 0 as any,
                updated_at: new Date(),
                updated_by: 'system'
            } as any;
        }

        // 🧮 CALCULATIONS: Perform the breakdown
        const commissionPct = Number(settings!.lawyer_commission_percentage) / 100;
        const operationalPct = Number(settings!.operational_costs_percentage) / 100;
        const taxPct = Number(settings!.tax_percentage) / 100;
        const platformFeePct = Number(settings!.platform_fee_percentage) / 100;

        const commissionAmount = currentPrice * commissionPct;
        const operationalCostAmount = currentPrice * operationalPct;
        const taxAmount = currentPrice * taxPct;
        const platformFeeAmount = currentPrice * platformFeePct;
        const netProfitAmount = currentPrice - commissionAmount - operationalCostAmount - taxAmount - platformFeeAmount;

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
        
        let finalUserId = user.id; 
        if (isAdmin && userId) {
            finalUserId = userId;
        }

        console.log('📦 API: Creating order for user:', finalUserId);

        // 👨‍⚖️ AUTO-ASSIGNMENT: If only one lawyer is active, assign automatically
        const activeLawyers = await prisma.user.findMany({
            where: {
                rol: 'ABOGADO',
                activo: true
            },
            select: { id: true }
        });

        let autoAssignedLawyerId: string | null = null;
        let assignedAt: Date | null = null;

        if (activeLawyers.length === 1) {
            autoAssignedLawyerId = activeLawyers[0].id;
            assignedAt = new Date();
            console.log('⚖️ API: Auto-assigning order to single lawyer:', autoAssignedLawyerId);
        }

        // Crear la orden en base de datos con el desglose financiero
        const newOrder = await prisma.order.create({
            data: {
                userId: finalUserId,
                lawyerId: autoAssignedLawyerId, // Autocompletado si solo hay uno
                assignedAt,
                serviceId: service.id,
                total: currentPrice,
                status: 'PENDIENTE',
                paymentId: paymentId || `PAY-MOCK-${Date.now()}`,
                
                // Desglose financiero (Histórico)
                commissionAmount,
                operationalCostAmount,
                platformFeeAmount,
                taxAmount,
                netProfitAmount,
            },
            include: {
                service: true,
                user: true,
                lawyer: { // Incluimos para el broadcast
                    select: { nombre: true }
                }
            }
        });

        console.log('✅ API: Order created successfully:', newOrder.id);

        // 📡 Broadcast a todos los dashboards para reactividad instantánea
        broadcastOrderUpdate({
            orderId: newOrder.id,
            userId: newOrder.userId,
            lawyerId: newOrder.lawyerId,
            status: newOrder.status,
            eventType: 'created',
        });

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

        // 📡 Broadcast a todos los dashboards para reactividad instantánea
        broadcastOrderUpdate({
            orderId: updatedOrder.id,
            userId: updatedOrder.userId,
            lawyerId: updatedOrder.lawyerId,
            status: updatedOrder.status,
            eventType: 'updated',
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
