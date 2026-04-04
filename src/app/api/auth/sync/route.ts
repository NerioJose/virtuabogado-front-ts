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

        // SINCRONIZACIÓN DE IDENTIDAD (Merge Strategy - No Deletion)
        // Paso 0: Detectar si el email ya está reclamado por otro ID (ej. Seeders o manuales)
        const existingByEmail = await prisma.user.findUnique({
            where: { email: user.email! }
        });

        if (existingByEmail && existingByEmail.id !== user.id) {
            console.log(`🔗 [Sync Merge] Unificando email ${user.email} (Local: ${existingByEmail.id} -> Supabase: ${user.id})`);
            
            // Migrar relaciones activas al nuevo ID maestro de Supabase
            await prisma.$transaction([
                prisma.order.updateMany({ where: { userId: existingByEmail.id }, data: { userId: user.id } }),
                prisma.order.updateMany({ where: { lawyerId: existingByEmail.id }, data: { lawyerId: user.id } }),
                prisma.message.updateMany({ where: { senderId: existingByEmail.id }, data: { senderId: user.id } }),
                prisma.document.updateMany({ where: { uploaderId: existingByEmail.id }, data: { uploaderId: user.id } }),
                // Renombrar email antiguo para liberar el slot único sin borrar el registro
                prisma.user.update({
                    where: { id: existingByEmail.id },
                    data: { email: `legacy_${existingByEmail.id}_${existingByEmail.email}` }
                })
            ]);
            console.log('✅ [Sync Merge] Migración de relaciones completada.');
        }

        // Paso 1: Upsert estable por ID oficial de Supabase
        const updatedUser = await prisma.user.upsert({
            where: { id: user.id },
            update: {
                email: user.email!,
                nombre: nombre || 'Usuario Nuevo',
                rol: (rol as any)?.toUpperCase() || 'CLIENTE',
                telefono: telefono || undefined,
                updatedAt: new Date(),
            },
            create: {
                id: user.id,
                email: user.email!,
                nombre: nombre || 'Usuario Nuevo',
                rol: (rol as any)?.toUpperCase() || 'CLIENTE',
                telefono: telefono || undefined,
                activo: true,
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
