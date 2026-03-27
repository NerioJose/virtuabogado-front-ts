'use server';

import { prisma } from '@/lib/prisma';
import { OrderStatus, UserRole } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';
import { calculateOrderFinances } from '@/services/finance.service';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';

export interface GetOrdersFilters {
    status?: OrderStatus;
    lawyerId?: string;
    clientId?: string;
    dateRange?: 'today' | 'week' | 'month' | 'year' | 'custom';
    from?: string; // ISO string
    to?: string;   // ISO string
    search?: string;
    page: number;
    limit: number;
}

/**
 * Professionalized Case History Server Action.
 * Fetches paginated orders and attaches high-precision financial splits (Net/Commission) 
 * using the centralized fintech engine.
 */
export async function getOrdersHistory(filters: GetOrdersFilters, user: { id: string, rol: UserRole }) {
    const { status, lawyerId, clientId, dateRange, from, to, search, page, limit } = filters;
    const skip = (page - 1) * limit;

    // 1. Role-based Security
    const roleWhere: any = {};
    if (user.rol === 'ABOGADO') {
        roleWhere.lawyerId = user.id;
    } else if (user.rol === 'ADMIN' && lawyerId) {
        roleWhere.lawyerId = lawyerId;
    }
    if (clientId) roleWhere.userId = clientId;

    // 2. Date Filtering
    let dateFilter: any = undefined;
    const now = new Date();
    if (dateRange === 'today') {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        dateFilter = { gte: start };
    } else if (dateRange === 'week') {
        const start = new Date(now); start.setDate(now.getDate() - 7);
        dateFilter = { gte: start };
    } else if (dateRange === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { gte: start };
    } else if (dateRange === 'year') {
        const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        dateFilter = { gte: start };
    } else if (dateRange === 'custom' && from) {
        const start = new Date(from);
        const end = to ? new Date(to) : new Date(from);
        end.setHours(23, 59, 59, 999);
        dateFilter = { gte: start, lte: end };
    }

    // 3. Search Logic & Status Filtering
    const where: any = {
        ...roleWhere,
        createdAt: dateFilter,
        OR: search ? [
            { id: { contains: search, mode: 'insensitive' } },
            { service: { titulo: { contains: search, mode: 'insensitive' } } },
            { user: { nombre: { contains: search, mode: 'insensitive' } } }
        ] : undefined
    };

    // Si se pide un estado específico, se usa. Si no, excluimos el "ruido" de pagos no realizados para el Admin/Abogado.
    if (status) {
        where.status = status;
    } else {
        where.status = {
            notIn: [OrderStatus.PAGO_PENDIENTE, OrderStatus.PAGO_RECHAZADO]
        };
    }

    try {
        // 4. Fetch Results & Settings
        const [total, orders, settings] = await Promise.all([
            prisma.order.count({ where }),
            prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    service: { select: { titulo: true, precio: true } },
                    user: { select: { nombre: true, email: true } },
                    lawyer: { select: { nombre: true } }
                }
            }),
            prisma.financialSettings.findUnique({
                where: { id: FINANCIAL_SETTINGS_ID }
            }) || {
                lawyer_commission_percentage: 0,
                operational_costs_percentage: 0,
                tax_percentage: 0,
                platform_fee_percentage: 0
            }
        ]);

        // 5. Enrich with Financial Splits (Calculated on the fly for stability)
        const enrichedData = await Promise.all(orders.map(async (order: any) => {
            const financials = await calculateOrderFinances(order.total || 0, settings as any);
            return {
                ...order,
                financials: {
                    bruto: financials.total,
                    comisionLawyer: financials.comisionAbogado,
                    netoPlataforma: financials.netoPlataforma
                }
            };
        }));

        // 6. Professional Serialization for Next.js 15
        return serializeFinance({
            data: enrichedData,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('❌ [DATABASE_REPAIR] Error en getOrdersHistory:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            context: {
                userId: user.id,
                filters,
                where
            }
        });
        throw new Error('No se pudo recuperar el historial financiero: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
}
