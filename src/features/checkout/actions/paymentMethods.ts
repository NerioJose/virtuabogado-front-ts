'use server';

import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;

export async function getPaymentMethodsAction() {
    try {
        const methods = await prisma.paymentMethod.findMany({
            where: { activo: true },
            orderBy: { name: 'asc' }
        });

        return methods;
    } catch (error) {
        console.error('❌ Error fetching payment methods:', error);
        return [];
    }
}

export async function togglePaymentMethodAction(id: string, activo: boolean) {
    try {
        await prisma.paymentMethod.update({
            where: { id },
            data: { activo }
        });
        return { success: true };
    } catch (error) {
        console.error('❌ Error toggling payment method:', error);
        return { success: false };
    }
}
