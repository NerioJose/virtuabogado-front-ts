import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { syncUserIdentity } from '@/services/identity.service';

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

        const { nombre, rol, telefono } = user.user_metadata || {};

        const updatedUser = await syncUserIdentity(user, { nombre, rol, telefono });

        return NextResponse.json({
            success: true,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                nombre: updatedUser.nombre,
                rol: updatedUser.rol,
                activo: updatedUser.activo
            }
        });
    } catch (error) {
        console.error('❌ [Sync API] Error synchronizing user:', error);
        return NextResponse.json({ error: 'Error de sincronización' }, { status: 500 });
    }
}
