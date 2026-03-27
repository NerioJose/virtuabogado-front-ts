'use server';

import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { revalidatePath } from 'next/cache';

export async function getPaymentMethodsAction(adminView: boolean = false) {
    try {
        const methods = await prisma.paymentMethod.findMany({
            where: adminView ? {} : { isActive: true },
            orderBy: { name: 'asc' }
        });
        return methods;
    } catch (error) {
        console.error('❌ Error fetching payment methods:', error);
        return [];
    }
}

export async function togglePaymentMethodAction(id: string, isActive: boolean) {
    try {
        await prisma.paymentMethod.update({
            where: { id },
            data: { isActive }
        });
        revalidatePath('/servicios');
        return { success: true };
    } catch (error) {
        console.error('❌ Error toggling payment method:', error);
        return { success: false, message: 'No se pudo actualizar el estado de la pasarela.' };
    }
}

export async function createPaymentMethodAction(data: {
    identifier: string;
    name: string;
    isActive: boolean;
    icon?: string;
}) {
    try {
        if (!data.identifier || !data.name) {
            return { success: false, message: 'El identificador técnico y el nombre comercial son requeridos.' };
        }

        const method = await prisma.paymentMethod.create({
            data: {
                identifier: data.identifier,
                name: data.name,
                isActive: data.isActive,
                icon: data.icon
            }
        });
        revalidatePath('/servicios');
        return { success: true, method };
    } catch (error: any) {
        console.error('❌ Error creating payment method:', error);
        if (error.code === 'P2002') return { success: false, message: 'Ya existe una pasarela con este identificador técnico.' };
        return { success: false, message: 'Error interno al registrar la pasarela.' };
    }
}

export async function updatePaymentMethodAction(id: string, data: {
    name?: string;
    isActive?: boolean;
    icon?: string;
}) {
    try {
        const method = await prisma.paymentMethod.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.icon && { icon: data.icon })
            }
        });
        revalidatePath('/servicios');
        return { success: true, method };
    } catch (error) {
        console.error('❌ Error updating payment method:', error);
        return { success: false, message: 'Error al actualizar la configuración de la pasarela.' };
    }
}

export async function deletePaymentMethodAction(id: string) {
    try {
        await prisma.paymentMethod.delete({
            where: { id }
        });
        revalidatePath('/servicios');
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting payment method:', error);
        return { success: false, message: 'No se puede eliminar la pasarela porque tiene transacciones históricas asociadas. Considere desactivarla.' };
    }
}
