import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';
import { getCached, setCache } from '@/lib/cache';
import { serializeFinance } from '@/lib/finance';
import { capitalizeName, formatLawyerName } from '@/utils/formatters';

export interface AuthUser {
    id: string;
    email: string;
}

export async function getAuthUser(request: Request): Promise<{ user: AuthUser; role: string } | { error: NextResponse }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
    }
    const role = ((user.user_metadata?.rol as string) || 'CLIENTE').toUpperCase();
    return { user: { id: user.id, email: user.email || '' }, role };
}

export function getCachedFinancialSettings(): Promise<any> {
    return (async () => {
        const cached = getCached<any>('financial-settings');
        if (cached) return cached;
        const settings = await prisma.financialSettings.findUnique({
            where: { id: FINANCIAL_SETTINGS_ID }
        });
        const result = settings || {
            lawyer_commission_percentage: 0,
            operational_costs_percentage: 0,
            tax_percentage: 0,
            platform_fee_percentage: 0
        };
        setCache('financial-settings', result, 30_000);
        return result;
    })();
}

export function formatOrderResponse(order: any) {
    return {
        ...order,
        id: order.id,
        numericId: order.numericId,
        uuid: order.id,
        userId: order.userId,
        lawyerId: order.lawyerId,
        lawyerName: order.lawyer?.nombre
            ? formatLawyerName(order.lawyer.nombre)
            : 'Pendiente',
        userName: order.user?.nombre
            ? capitalizeName(order.user.nombre)
            : 'Usuario Técnico',
        userEmail: order.user?.email || 'N/A',
        items: [{
            id: order.service?.id || 0,
            serviceId: order.service?.id || 0,
            serviceName: order.service?.titulo || 'Servicio Eliminado',
            price: Number(order.service?.precio || 0),
            quantity: 1,
        }],
        subtotal: Number(order.total) || 0,
        tax: Number(order.taxAmount) || 0,
        total: Number(order.total) || 0,
        status: order.status,
        paymentMethod: order.paymentMethod?.name || 'Tarjeta de Crédito',
        transactionId: order.paymentId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        commissionAmount: Number(order.commissionAmount) || 0,
        netProfitAmount: Number(order.netProfitAmount) || 0,
        payoutStatus: order.payout?.status || null,
    };
}
