'use server';

import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;

export async function getPaymentMethodsAction(adminView: boolean = false) {
    try {
        const methods = await prisma.paymentMethod.findMany({
            where: adminView ? {} : { activo: true },
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
        return { success: false, message: 'No se pudo actualizar el estado de la pasarela.' };
    }
}

export async function createPaymentMethodAction(data: {
    name: string;
    titulo: string;
    activo: boolean;
    config?: any;
}) {
    try {
        // Validación básica
        if (!data.name || !data.titulo) {
            return { success: false, message: 'El nombre técnico y el título comercial son requeridos.' };
        }

        const method = await prisma.paymentMethod.create({
            data: {
                name: data.name,
                titulo: data.titulo,
                activo: data.activo,
                config: data.config || {}
            }
        });
        return { success: true, method };
    } catch (error: any) {
        console.error('❌ Error creating payment method:', error);
        // Manejar duplicados
        if (error.code === 'P2002') return { success: false, message: 'Ya existe una pasarela con este identificador comercial directo.' };
        return { success: false, message: 'Error interno al registrar la pasarela.' };
    }
}

export async function updatePaymentMethodAction(id: string, data: {
    titulo?: string;
    activo?: boolean;
    config?: any;
}) {
    try {
        const method = await prisma.paymentMethod.update({
            where: { id },
            data: {
                ...(data.titulo && { titulo: data.titulo }),
                ...(data.activo !== undefined && { activo: data.activo }),
                ...(data.config && { config: data.config })
            }
        });
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
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting payment method:', error);
        // Si hay órdenes atadas, Prisma lanzará error de Foreign Key
        return { success: false, message: 'No se puede eliminar la pasarela porque tiene transacciones históricas asociadas. Considere desactivarla.' };
    }
}
