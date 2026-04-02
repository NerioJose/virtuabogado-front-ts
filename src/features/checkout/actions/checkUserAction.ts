'use server';

import prisma from '@/lib/prisma';

/**
 * Verifica si un usuario existe en la base de datos por su email.
 * Esta acción se usa en el checkout para el flujo 'Identity-First'.
 */
export async function checkUserExistsAction(email: string): Promise<{ exists: boolean; nombre?: string }> {
    if (!email || !email.includes('@')) {
        return { exists: false };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, nombre: true }
        });

        return { 
            exists: !!user,
            nombre: user?.nombre || undefined
        };
    } catch (error) {
        console.error('❌ [checkUserExistsAction] Error:', error);
        return { exists: false };
    }
}
