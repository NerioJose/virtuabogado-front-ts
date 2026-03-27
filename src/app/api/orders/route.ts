import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { UserRole } from '@/shared/types/entities.types';
import { broadcastOrderUpdate } from '@/lib/broadcast';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';
import { serializeFinance } from '@/lib/finance';

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
        let userRole: string | undefined = (user.user_metadata?.rol as string)?.toUpperCase();
        
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }

        if (!userRole) {
            return NextResponse.json({ error: 'Rol no definido' }, { status: 403 });
        }
        
        // Final role normalization ensuring it's a string for comparisons
        const role: string = userRole;
        console.log(`🔍 [API Orders] Role identified: ${role} for user: ${user.id}`);

        const { searchParams } = new URL(request.url);
        const lawyerId = searchParams.get('lawyerId');
        const userId = searchParams.get('userId');
        const requestedStatus = searchParams.get('status');

        const where: any = {};

        // Seguridad: Restringir filtros según rol si no es ADMIN
        if (role !== 'ADMIN') {
            if (role === 'ABOGADO') {
                where.lawyerId = user.id;
            } else {
                where.userId = user.id;
            }
        } else {
            if (lawyerId) where.lawyerId = lawyerId;
            if (userId) where.userId = userId;
        }

        // 🛡️ REGLA: Filtro por defecto (Ocultar ruido de pagos pendientes para Admin/Abogado)
        if (!requestedStatus) {
            where.status = {
                notIn: ['PAGO_PENDIENTE', 'PAGO_RECHAZADO']
            };
        } else {
            where.status = requestedStatus; // Filtro exacto por Prisma
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
                },
                paymentMethod: true
            } as any,
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
        const formattedOrders = (orders as any[]).map(order => {
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
                userName: order.user?.nombre ? capitalizeName(order.user.nombre) : 'Usuario Técnico',
                userEmail: order.user?.email || 'N/A',
                items: [{
                    id: order.service?.id || 0,
                    serviceId: order.service?.id || 0,
                    serviceName: order.service?.titulo || 'Servicio Eliminado',
                    price: Number(order.service?.precio || 0),
                    quantity: 1,
                }],
                subtotal: total,
                tax: 0,
                total: total,
                status: order.status,
                paymentMethod: (order.paymentMethod?.name || 'Tarjeta de Crédito') as any,
                transactionId: order.paymentId,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                // Inyectar datos financieros calculados
                commissionAmount: comisionLawyer,
                netProfitAmount: total - comisionLawyer, // Lo que resta para la plataforma
            };
        });

        console.log(`📊 [API Orders] Backend returning ${formattedOrders.length} orders to client.`);

        return NextResponse.json(serializeFinance(formattedOrders));
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
        let userRole: string | undefined = (user.user_metadata?.rol as string)?.toUpperCase();
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }
        if (!userRole) {
            return NextResponse.json({ error: 'Rol no definido' }, { status: 403 });
        }
        
        const role: string = userRole;
        const isAdmin = role === 'ADMIN';
        
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
                status: 'PAGO_PENDIENTE',
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

        // Silenciamos el broadcast en la creación inicial (Firewalled en broadcast.ts)
        // Solo se activará cuando pase el flujo de pago real.

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
        // Obtener rol
        let userRole: string | undefined = (user.user_metadata?.rol as string)?.toUpperCase();
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }
        if (!userRole) {
            return NextResponse.json({ error: 'Rol no definido' }, { status: 403 });
        }

        const role: string = userRole;
        const isAdmin = role === 'ADMIN';
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
        let userRole: string | undefined = (user.user_metadata?.rol as string)?.toUpperCase();
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }
        
        const isAdmin = userRole === 'ADMIN';

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
