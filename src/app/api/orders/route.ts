import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { UserRole } from '@/shared/types/entities.types';
import { broadcastOrderUpdate } from '@/lib/broadcast';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';
import { serializeFinance } from '@/lib/finance';
import { calculateOrderFinances } from '@/services/finance.service';

import { capitalizeName, formatLawyerName } from '@/utils/formatters';
import { notifyNewSale, notifyNewCase } from '@/lib/push-notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        
        // 🚀 OPTIMIZACIÓN SISTÉMICA: Usar headers inyectados por el middleware
        const headerId = request.headers.get('x-user-id');
        const headerEmail = request.headers.get('x-user-email');
        const headerRole = request.headers.get('x-user-role');

        let user: any = null;
        let userRole: string | undefined = headerRole || undefined;

        if (headerId) {
            user = { id: headerId, email: headerEmail };
            console.log('⚡ [API Orders] Fast-auth via middleware headers');
        } else {
            // Fallback (solo si falla el middleware o en ciertos entornos de test)
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            user = supabaseUser;
            console.log('🐢 [API Orders] Slow-auth via getUser() fallback');
        }

        if (!user) {
            console.warn('⚠️ API GET /orders: User not found in session');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener rol (Priorizar metadata de Supabase Auth, fallback a DB)
        if (!userRole && user.user_metadata?.rol) {
            userRole = (user.user_metadata.rol as string).toUpperCase();
        }
        
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
        
        // Paginación
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where: any = {};
        const isAdmin = role === 'ADMIN';

        // Seguridad: Restringir filtros según rol si no es ADMIN
        if (!isAdmin) {
            if (role === 'ABOGADO') {
                where.lawyerId = user.id;
                console.log(`[LawyerDashboard] Buscando casos para ID: ${user.id}`);
            } else {
                where.userId = user.id;
            }
        } else {
            if (lawyerId) where.lawyerId = lawyerId;
            if (userId) where.userId = userId;
        }

        // 🛡️ REGLA DE VISIBILIDAD: El ADMIN y el ABOGADO ven todo lo que les corresponde sin filtros restrictivos de pago.
        // Solo el CLIENTE tiene el filtro restrictivo por defecto.
        if (!requestedStatus) {
            if (!isAdmin) {
                // 🛡️ REGLA ESTRICTA DE PRIVACIDAD Y VISIBILIDAD PARA ABOGADOS
                if (role === 'ABOGADO') {
                    // Un abogado SOLO puede ver órdenes explícitamente asignadas a su ID exacto
                    where.lawyerId = user.id;
                    // No debe ver carritos abandonados o pagos fallidos
                    where.status = { notIn: ['PAGO_PENDIENTE', 'PAGO_RECHAZADO'] };
                } else {
                    where.status = {
                        notIn: ['PAGO_PENDIENTE', 'PAGO_RECHAZADO']
                    };
                }
            }
        } else {
            where.status = requestedStatus; // Filtro exacto por Prisma
        }

        // OPTIMIZACIÓN CRÍTICA: Fetch auth, total count, data and settings in parallel
        // Reducimos la latencia de 3 llamadas secuenciales a 1 llamada paralela.
        const [totalCount, orders, settings] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    numericId: true,
                    userId: true,
                    lawyerId: true,
                    total: true,
                    status: true,
                    paymentId: true,
                    createdAt: true,
                    updatedAt: true,
                    service: {
                        select: {
                            id: true,
                            titulo: true,
                            precio: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            nombre: true,
                            email: true,
                        }
                    },
                    lawyer: {
                        select: {
                            nombre: true
                        }
                    },
                    paymentMethod: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.financialSettings.findUnique({
                where: { id: FINANCIAL_SETTINGS_ID }
            }).then((s: any) => s || {
                lawyer_commission_percentage: 0,
                operational_costs_percentage: 0,
                tax_percentage: 0,
                platform_fee_percentage: 0
            })
        ]);

        // Mapear al formato que espera el frontend con desglose financiero dinámico
        const formattedOrders = (orders as any[]).map((order: any) => {
            // Calcular desgloses usando el motor centralizado para máxima precisión
            const split = calculateOrderFinances(order.total, settings);

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
                subtotal: split.total,
                tax: split.impuestos,
                total: split.total,
                status: order.status,
                paymentMethod: (order.paymentMethod?.name || 'Tarjeta de Crédito') as any,
                transactionId: order.paymentId,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                // Inyectar datos financieros precisos
                commissionAmount: split.comisionAbogado,
                netProfitAmount: split.netoPlataforma, 
            };
        });

        if (role === 'ABOGADO') {
            console.log(`[LawyerDashboard] ID: ${user.id} | Casos para este ID: ${formattedOrders.length}`);
        } else {
            console.log(`📊 [API Orders] Backend returning ${formattedOrders.length} orders of ${totalCount} total.`);
        }

        return NextResponse.json(serializeFinance({
            data: formattedOrders,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        }));
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
        const headerId = request.headers.get('x-user-id');
        const headerEmail = request.headers.get('x-user-email');
        const headerRole = request.headers.get('x-user-role');

        let user: any = null;
        let userRole: string | undefined = headerRole || undefined;

        if (headerId) {
            user = { id: headerId, email: headerEmail };
        } else {
            const supabase = await createClient();
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            user = supabaseUser;
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

        // 🧮 CALCULATIONS: Perform the breakdown using the central Fintech engine
        // Using non-null assertion as we handle the fallback above
        const split = calculateOrderFinances(currentPrice, settings!);

        const commissionAmount = split.comisionAbogado;
        const operationalCostAmount = split.gastosOperativos;
        const taxAmount = split.impuestos;
        const platformFeeAmount = split.platformFee;
        const netProfitAmount = split.netoPlataforma;

        // Obtener rol (Priorizar metadata de Supabase Auth, fallback a DB)
        if (!userRole && user.user_metadata?.rol) {
            userRole = (user.user_metadata.rol as string).toUpperCase();
        }
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

        console.log('📦 API: Syncing user and creating order for user:', finalUserId);

        // 0. SINCRONIZACIÓN DE USUARIO (Identity Merge Strategy - No Deletion)
        // Buscamos si el email ya existe con otro ID (Conflicto de Identidad Local)
        try {
            const existingUserByEmail = await prisma.user.findUnique({
                where: { email: user.email! }
            });
            let finalName = user.user_metadata?.nombre || user.user_metadata?.name || user.user_metadata?.full_name;
            const updateData: any = { email: user.email!, activo: true };

            if (existingUserByEmail && existingUserByEmail.id !== finalUserId) {
                console.log(`🔗 [API] Email colisiona (Local: ${existingUserByEmail.id} -> Supabase: ${finalUserId}). Recableando...`);
                
                // 1. Rescate de Identidad: heredar el nombre si era válido
                if (!finalName && existingUserByEmail.nombre && !existingUserByEmail.nombre.includes('@')) {
                    finalName = existingUserByEmail.nombre;
                    console.log(`🦸 [Identity Rescue Orders] Nombre recuperado del historial: ${finalName}`);
                }
                
                // 2. Liberar el email
                await prisma.user.update({
                    where: { id: existingUserByEmail.id },
                    data: { email: `legacy_${existingUserByEmail.id}_${existingUserByEmail.email}` }
                });

                // 3. Upsert definitivo por ID estable
                if (finalName) updateData.nombre = finalName;
                await prisma.user.upsert({
                    where: { id: finalUserId },
                    update: updateData,
                    create: {
                        id: finalUserId,
                        email: user.email || 'correo@pendiente.com',
                        nombre: finalName || 'Cliente Nuevo',
                        rol: isAdmin ? 'CLIENTE' : (userRole as UserRole),
                    }
                });

                // 4. Migrar relaciones
                await prisma.$transaction([
                    prisma.order.updateMany({ where: { userId: existingUserByEmail.id }, data: { userId: finalUserId } }),
                    prisma.order.updateMany({ where: { lawyerId: existingUserByEmail.id }, data: { lawyerId: finalUserId } }),
                    prisma.message.updateMany({ where: { senderId: existingUserByEmail.id }, data: { senderId: finalUserId } }),
                    prisma.document.updateMany({ where: { uploaderId: existingUserByEmail.id }, data: { uploaderId: finalUserId } })
                ]);
            } else {
                if (finalName) updateData.nombre = finalName;
                try {
                    await prisma.user.upsert({
                        where: { id: finalUserId },
                        update: updateData,
                        create: {
                            id: finalUserId,
                            email: user.email || 'correo@pendiente.com',
                            nombre: finalName || 'Cliente Nuevo',
                            rol: isAdmin ? 'CLIENTE' : (userRole as UserRole),
                        }
                    });
                } catch (error: any) {
                    if (error.code !== 'P2002') throw error;
                }
            }
        } catch (error: any) {
            console.error('❌ [API Sync Error]:', error);
            // No bloqueamos el flujo si no es crítico, pero para órdenes queremos integridad
            throw error;
        }

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
        const headerId = request.headers.get('x-user-id');
        const headerEmail = request.headers.get('x-user-email');
        const headerRole = request.headers.get('x-user-role');

        let user: any = null;
        let userRoleHeader: string | undefined = headerRole || undefined;

        if (headerId) {
            user = { id: headerId, email: headerEmail, user_metadata: { rol: headerRole } };
        } else {
            const supabase = await createClient();
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            user = supabaseUser;
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
        let userRole: string | undefined = (user.user_metadata?.rol as string)?.toUpperCase() || (headerRole as string)?.toUpperCase();
        
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
            eventType: 'updated'
        });

        // 🔔 NOTIFICACIONES PUSH TÁCTICAS 
        // 1. Si el estado cambia a PAID -> Notificar a los ADMINS de la nueva venta (Efecto Shopify)
        const isMewSale = status === 'PAID' && existingOrder.status !== 'PAID';
        if (isMewSale) {
            console.log(`💰 [Push] Disparando alerta de venta para Orden #${updatedOrder.id} a Admins...`);
            await notifyNewSale(updatedOrder.id, updatedOrder.total.toString()).catch(err => 
                console.error('❌ Error disparando push de venta:', err)
            );

            // Si el sistema había auto-asignado al único abogado disponible, le avisamos AHORA que el pago se completó
            if (updatedOrder.lawyerId) {
                console.log(`⚖️ [Push] Orden pagada. Alertando de auto-asignación al Abogado: ${updatedOrder.lawyerId}`);
                await notifyNewCase(updatedOrder.lawyerId, updatedOrder.id).catch(err => 
                    console.error('❌ Error disparando push de auto-asignación:', err)
                );
            }
        }
 
        // 2. Si se asigna un Abogado manualmente desde el panel de admin (Cambio explícito de lawyerId)
        const isLawyerManuallyAssigned = lawyerId && lawyerId !== existingOrder.lawyerId;
        // Evitamos mandar doble push si justo acaba de pagarse (lo maneja el bloque de arriba)
        if (isLawyerManuallyAssigned && !isMewSale) {
            console.log(`⚖️ [Push] Disparando alerta de asignación manual para Abogado: ${lawyerId}`);
            await notifyNewCase(lawyerId, updatedOrder.id).catch(err => 
                console.error('❌ Error disparando push de asignación manual:', err)
            );
        }

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('❌ API Error updating order:', error);
        return NextResponse.json({ error: 'Error al actualizar la orden' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const headerId = request.headers.get('x-user-id');
        const headerRole = request.headers.get('x-user-role');

        let user: any = null;
        if (headerId) {
            user = { id: headerId, user_metadata: { rol: headerRole } };
        } else {
            const supabase = await createClient();
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            user = supabaseUser;
        }

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Solo ADMIN puede borrar
        let userRole: string | undefined = (user.user_metadata?.rol as string)?.toUpperCase() || (headerRole as string)?.toUpperCase();
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
