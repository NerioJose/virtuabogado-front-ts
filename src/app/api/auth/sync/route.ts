import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sync
 * Sincroniza el usuario actual de Supabase Auth con la tabla User de Prisma.
 * Se llama automáticamente durante el checkAuth o login.
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Extraer metadatos
        const { nombre, rol, telefono } = user.user_metadata || {};

        // Sincronizar con Prisma (Upsert)
        const updatedUser = await prisma.user.upsert({
            where: { id: user.id },
            update: {
                email: user.email!,
                nombre: nombre || 'Usuario Nuevo',
                rol: (rol as any)?.toUpperCase() || 'CLIENTE',
                telefono: telefono || undefined,
                updatedAt: new Date(),
                // No tocamos el campo 'activo' aquí para no sobrescribir decisiones del Admin
            },
            create: {
                id: user.id,
                email: user.email!,
                nombre: nombre || 'Usuario Nuevo',
                rol: (rol as any)?.toUpperCase() || 'CLIENTE',
                telefono: telefono || undefined,
                activo: true, // Si es nuevo y se está logueando, lo marcamos activo por ahora
                createdAt: new Date(),
            }
        });

        console.log(`✅ [Sync API] User ${updatedUser.id} synchronized successfully.`);

        return NextResponse.json({
            success: true,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                rol: updatedUser.rol,
                activo: updatedUser.activo
            }
        });
    } catch (error) {
        console.error('❌ [Sync API] Error synchronizing user:', error);
        return NextResponse.json({ error: 'Error de sincronización' }, { status: 500 });
    }
}
