'use server';

import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { broadcastPaymentMethodUpdate } from '@/lib/broadcast';

async function requireAdmin(): Promise<boolean> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const role = ((user.user_metadata?.rol as string) || '').toUpperCase();
        return role === 'ADMIN';
    } catch {
        return false;
    }
}

export async function getPaymentMethodsAction(adminView: boolean = false) {
    if (adminView && !(await requireAdmin())) {
        return [];
    }
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
    if (!(await requireAdmin())) {
        return { success: false, message: 'No autorizado' };
    }
    try {
        await prisma.paymentMethod.update({
            where: { id },
            data: { isActive }
        });
        revalidatePath('/servicios');
        await broadcastPaymentMethodUpdate({ methodId: id, eventType: 'updated' });
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
    if (!(await requireAdmin())) {
        return { success: false, message: 'No autorizado' };
    }
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
        await broadcastPaymentMethodUpdate({ methodId: method.id, identifier: method.identifier, eventType: 'created' });
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
    if (!(await requireAdmin())) {
        return { success: false, message: 'No autorizado' };
    }
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
        await broadcastPaymentMethodUpdate({ methodId: id, identifier: method.identifier, eventType: 'updated' });
        return { success: true, method };
    } catch (error) {
        console.error('❌ Error updating payment method:', error);
        return { success: false, message: 'Error al actualizar la configuración de la pasarela.' };
    }
}

export async function deletePaymentMethodAction(id: string) {
    if (!(await requireAdmin())) {
        return { success: false, message: 'No autorizado' };
    }
    try {
        await prisma.paymentMethod.delete({
            where: { id }
        });
        revalidatePath('/servicios');
        await broadcastPaymentMethodUpdate({ methodId: id, eventType: 'deleted' });
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting payment method:', error);
        return { success: false, message: 'No se puede eliminar la pasarela porque tiene transacciones históricas asociadas. Considere desactivarla.' };
    }
}
