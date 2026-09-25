import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeFinance } from '@/lib/finance';
import { calculateOrderFinances } from '@/services/finance.service';
import { syncUserIdentity } from '@/services/identity.service';
import { emit } from '@/events/eventBus';
import { UserRole } from '@/shared/types/entities.types';
import { getAuthUser, getCachedFinancialSettings, formatOrderResponse } from './orders.helpers';
import { getUsdPenRate } from '@/lib/exchangeRate';
import { usdToPen, penToUsd, roundMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
    try {
        const auth = await getAuthUser(request);
        if ('error' in auth) return auth.error;
        const { user, role } = auth;

        const { searchParams } = new URL(request.url);
        const lawyerId = searchParams.get('lawyerId');
        const requestedUserId = searchParams.get('userId');
        const requestedStatus = searchParams.get('status');
        const search = searchParams.get('search')?.trim();
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const skip = (page - 1) * limit;
        const hidePendingPayment = searchParams.get('hidePendingPayment') === 'true';

        const where: any = { activo: { not: false } };
        const isAdmin = role === 'ADMIN';

        if (!isAdmin) {
            if (role === 'ABOGADO') {
                where.lawyerId = user.id;
            } else {
                where.userId = user.id;
            }
        } else {
            if (lawyerId) where.lawyerId = lawyerId;
            if (requestedUserId) where.userId = requestedUserId;
        }

        if (!requestedStatus) {
            if (!isAdmin) {
                if (role === 'ABOGADO') {
                    where.lawyerId = user.id;
                    where.status = { notIn: ['PAGO_PENDIENTE', 'PAGO_RECHAZADO'] };
                } else {
                    where.status = { notIn: ['PAGO_PENDIENTE', 'PAGO_RECHAZADO'] };
                }
            } else if (hidePendingPayment) {
                // El panel "Casos y Expedientes" filtra estos estados en el cliente por página;
                // al excluirlos en el servidor se evitan páginas vacías cuando los más
                // recientes son pagos pendientes/rechazados. Default (RecentOrders/Dashboard)
                // sigue incluyéndolos.
                where.status = { notIn: ['PAGO_PENDIENTE', 'PAGO_RECHAZADO'] };
            }
        } else {
            where.status = requestedStatus;
        }

        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { service: { titulo: { contains: search, mode: 'insensitive' } } },
                { user: { nombre: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
            const numericPart = parseInt(search, 10);
            if (!Number.isNaN(numericPart)) {
                where.OR.push({ numericId: numericPart });
            }
        }

        // Desglose de contadores siempre GLOBAL (sin status/search/scop del listado),
        // para que los chips conserven su identidad sin importar la pestaña activa.
        const countWhere: any = { activo: { not: false } };
        if (isAdmin && hidePendingPayment) {
            countWhere.status = { notIn: ['PAGO_PENDIENTE', 'PAGO_RECHAZADO'] };
        }

        const [totalCount, orders, settings, countsByStatus] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where, skip, take: limit,
                select: {
                    id: true, numericId: true, userId: true, lawyerId: true,
                    total: true, status: true, paymentId: true, createdAt: true, updatedAt: true,
                    commissionAmount: true, operationalCostAmount: true, taxAmount: true,
                    platformFeeAmount: true, netProfitAmount: true,
                    service: { select: { id: true, titulo: true, precio: true } },
                    user: { select: { id: true, nombre: true, email: true } },
                    lawyer: { select: { nombre: true } },
                    paymentMethod: { select: { name: true } },
                    payout: { select: { status: true } },
                },
                orderBy: { createdAt: 'desc' }
            }),
            getCachedFinancialSettings(),
            isAdmin
                ? prisma.order.groupBy({ by: ['status'], where: countWhere, _count: { _all: true } })
                : Promise.resolve([]),
        ]);

        const formattedOrders = orders.map(order => {
            const split = calculateOrderFinances(order.total, settings);
            return {
                ...formatOrderResponse(order),
                ...split,
            };
        });

        const statusCounts: Record<string, number> = {};
        countsByStatus.forEach((group) => {
            statusCounts[group.status] = group._count._all;
        });

        return NextResponse.json(serializeFinance({
            data: formattedOrders,
            pagination: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
            countsByStatus: isAdmin ? statusCounts : undefined,
        }));
    } catch (error) {
        console.error('❌ API Error fetching orders:', error);
        return NextResponse.json({ error: 'Error al obtener las órdenes' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await getAuthUser(request);
        if ('error' in auth) return auth.error;
        const { user, role } = auth;

        const body = await request.json();
        const { serviceId, userId: targetUserId } = body;
        const isAdmin = role === 'ADMIN';

        const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
        if (!service || !service.activo) {
            return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
        }

        // Precio canónico coherente: si el servicio es canónico en soles, el USD se
        // deriva con la tasa vigente; el S/ se congela exacto.
        const freshRate = await getUsdPenRate();
        const servicePen =
            service.precio_pen != null && Number(service.precio_pen) > 0
                ? Number(service.precio_pen)
                : null;
        const currentPrice = servicePen ? penToUsd(servicePen, freshRate) : roundMoney(Number(service.precio));
        const totalPen = servicePen ? servicePen : usdToPen(currentPrice, freshRate);
        let settings = await getCachedFinancialSettings();
        if (!settings) {
            settings = { lawyer_commission_percentage: 0, operational_costs_percentage: 0, tax_percentage: 0, platform_fee_percentage: 0 };
        }

        const split = calculateOrderFinances(currentPrice, settings);
        let finalUserId = user.id;
        if (isAdmin && targetUserId) {
            finalUserId = targetUserId;
        }

        // Identity sync
        await syncUserIdentity({ id: user.id, email: user.email, user_metadata: { rol: role, nombre: null } } as any, {}, {
            masterAdminEmail: process.env.EMAIL_MASTER_ADMIN,
            defaultName: 'Cliente Nuevo',
            skipMetadataSync: true,
        });

        const order = await prisma.order.create({
            data: {
                userId: finalUserId,
                serviceId: Number(serviceId),
                total: currentPrice,
                totalPen: totalPen,
                exchangeRateUsed: freshRate,
                status: 'PAGO_PENDIENTE',
                paymentId: `PAY-${Date.now()}`,
                commissionAmount: split.comisionAbogado,
                taxAmount: split.impuestos,
                platformFeeAmount: split.platformFee,
                netProfitAmount: split.netoPlataforma,
            },
            include: { user: { select: { nombre: true } }, service: { select: { titulo: true } } },
        });

        emit({
            type: 'order.created',
            data: { orderId: order.id, userId: finalUserId, serviceId: Number(serviceId), total: currentPrice, status: 'PAGO_PENDIENTE' },
        }).catch(() => {});

        return NextResponse.json(serializeFinance({ success: true, order }));
    } catch (error) {
        console.error('❌ API Error creating order:', error);
        return NextResponse.json({ error: 'Error al crear la orden' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const auth = await getAuthUser(request);
        if ('error' in auth) return auth.error;
        const { user, role } = auth;

        const body = await request.json();
        const { id: orderId, status, lawyerId } = body;

        if (!orderId) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
        if (!existingOrder) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        const isAdmin = role === 'ADMIN';
        const isOwner = existingOrder.userId === user.id;
        const isAssignedLawyer = existingOrder.lawyerId === user.id;
        if (!isAdmin && !isOwner && !isAssignedLawyer) {
            return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 });
        }

        const dataToUpdate: any = {};
        if (status !== undefined) dataToUpdate.status = status;
        if (lawyerId) dataToUpdate.lawyerId = lawyerId;
        if (lawyerId) dataToUpdate.assignedAt = new Date();

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: dataToUpdate,
            include: {
                user: { select: { nombre: true } },
                service: { select: { titulo: true } },
            },
        });

        const events: Promise<void>[] = [
            emit({
                type: 'order.status_changed',
                data: { orderId: updatedOrder.id, from: existingOrder.status, to: updatedOrder.status, changedBy: user.id },
            }),
        ];

        if (body.lawyerId) {
            events.push(emit({
                type: 'order.assigned',
                data: { orderId: updatedOrder.id, lawyerId: body.lawyerId, userId: updatedOrder.userId },
            }));
        }

        await Promise.all(events);

        return NextResponse.json(serializeFinance(updatedOrder));
    } catch (error) {
        console.error('❌ API Error updating order:', error);
        return NextResponse.json({ error: 'Error al actualizar la orden' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await getAuthUser(request);
        if ('error' in auth) return auth.error;
        const { role } = auth;

        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'No tienes permiso para eliminar órdenes' }, { status: 403 });
        }

        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        await prisma.order.update({
            where: { id },
            data: { activo: false, deletedAt: new Date() }
        });

        return NextResponse.json({ success: true, message: 'Caso archivado correctamente.' });
    } catch (error) {
        console.error('❌ API Error deleting order:', error);
        return NextResponse.json({ error: 'Error al eliminar la orden' }, { status: 500 });
    }
}
