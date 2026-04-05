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

        let finalName = nombre || user.user_metadata?.name || user.user_metadata?.full_name;

        // Preparar datos de actualización condicionalmente
        const updateData: any = {
            email: user.email!,
            updatedAt: new Date(),
            activo: true // Asegurar reactivación
        };
        if (rol) updateData.rol = (rol as string).toUpperCase();
        if (telefono) updateData.telefono = telefono;

        let updatedUser: any;

        if (existingByEmail && existingByEmail.id !== user.id) {
            console.log(`🔗 [Sync Merge] Unificando email ${user.email} (Local: ${existingByEmail.id} -> Supabase: ${user.id})`);
            
            // 1. Rescate de Identidad: heredar el nombre si era válido
            if (!finalName && existingByEmail.nombre && !existingByEmail.nombre.includes('@')) {
                finalName = existingByEmail.nombre;
                console.log(`🦸 [Identity Rescue API] Nombre recuperado del historial: ${finalName}`);
            }

            // 2. Liberar el email del registro antiguo para permitir crear el nuevo ID
            await prisma.user.update({
                where: { id: existingByEmail.id },
                data: { email: `legacy_${existingByEmail.id}_${existingByEmail.email}` }
            });

            // 3. Upsert estable por ID oficial de Supabase AHORA
            if (finalName) updateData.nombre = finalName;

            // 🛡️ PROTECCIÓN DE ROL: Mantener rol anterior si era ADMIN o ABOGADO
            // O forzar ADMIN si es el correo maestro
            const isMasterAdmin = user.email === 'virtuabogado.legal@gmail.com';
            const roleToPreserve = isMasterAdmin ? 'ADMIN' : (existingByEmail.rol || 'CLIENTE');

            updatedUser = await prisma.user.upsert({
                where: { id: user.id },
                update: { ...updateData, rol: roleToPreserve },
                create: {
                    id: user.id,
                    email: user.email!,
                    nombre: finalName || 'Usuario Nuevo',
                    rol: roleToPreserve,
                    telefono: telefono || undefined,
                    activo: true,
                    createdAt: new Date(),
                }
            });

            // 4. Migrar relaciones activas al nuevo ID maestro, que YA EXISTE
            await prisma.$transaction([
                prisma.order.updateMany({ where: { userId: existingByEmail.id }, data: { userId: user.id } }),
                prisma.order.updateMany({ where: { lawyerId: existingByEmail.id }, data: { lawyerId: user.id } }),
                prisma.message.updateMany({ where: { senderId: existingByEmail.id }, data: { senderId: user.id } }),
                prisma.document.updateMany({ where: { uploaderId: existingByEmail.id }, data: { uploaderId: user.id } }),
                prisma.pushSubscription.updateMany({ where: { userId: existingByEmail.id }, data: { userId: user.id } }),
            ]);
            console.log('✅ [Sync Merge] Migración de relaciones y Suscripciones Push completada.');

            // 5. Sincronizar metadatos con Supabase Auth si se rescató un nombre o cambió el rol
            const currentRoleInMetadata = (user.user_metadata?.rol || 'CLIENTE').toUpperCase();
            const needsMetadataSync = (finalName && user.user_metadata?.nombre !== finalName) || 
                                     (roleToPreserve && currentRoleInMetadata !== roleToPreserve);

            if (needsMetadataSync) {
                console.log(`📝 [Sync Merge] Actualizando metadatos en Supabase Auth: ${finalName || 'Mismo nombre'}, Rol: ${roleToPreserve}`);
                await supabase.auth.updateUser({
                    data: { 
                        ...(finalName && { nombre: finalName }),
                        ...(roleToPreserve && { rol: roleToPreserve })
                    }
                });
            }
        } else {
            // Sin colisión, simplemente upsert
            // 🛡️ PROTECCIÓN DE ROL: Forzar ADMIN si es el correo maestro
            const isMasterAdmin = user.email === 'virtuabogado.legal@gmail.com';
            const currentRole = isMasterAdmin ? 'ADMIN' : ((rol as any)?.toUpperCase() || updateData.rol || 'CLIENTE');

            if (finalName || currentRole) {
                // Sincronizar metadatos si hay discrepancia
                const currentRoleInMetadata = (user.user_metadata?.rol || 'CLIENTE').toUpperCase();
                const needsMetadataSync = (finalName && user.user_metadata?.nombre !== finalName) || 
                                         (currentRole && currentRoleInMetadata !== currentRole);

                if (needsMetadataSync) {
                    await supabase.auth.updateUser({
                        data: { 
                            ...(finalName && { nombre: finalName }),
                            ...(currentRole && { rol: currentRole })
                        }
                    });
                }
            }

            try {
                updatedUser = await prisma.user.upsert({
                    where: { id: user.id },
                    update: { ...updateData, rol: currentRole },
                    create: {
                        id: user.id,
                        email: user.email!,
                        nombre: finalName || 'Usuario Nuevo',
                        rol: currentRole,
                        telefono: telefono || undefined,
                        activo: true,
                        createdAt: new Date(),
                    }
                });
            } catch (error: any) {
                if (error.code === 'P2002') {
                    console.warn('⚠️ [Sync API] Conflicto P2002 evitado. Otra petición paralela ya reconcilió la identidad. Consultando db...');
                    updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
                    if (!updatedUser) throw new Error('Usuario falló creación por P2002 pero no se encuentra referenciado.');
                } else {
                    throw error;
                }
            }
        }

        console.log(`✅ [Sync API] User ${updatedUser.id} synchronized successfully.`);

        return NextResponse.json({
            success: true,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                nombre: updatedUser.nombre, // AHORA DEVOLVEMOS EL NOMBRE DE LA DB
                rol: updatedUser.rol,
                activo: updatedUser.activo
            }
        });
    } catch (error) {
        console.error('❌ [Sync API] Error synchronizing user:', error);
        return NextResponse.json({ error: 'Error de sincronización' }, { status: 500 });
    }
}
