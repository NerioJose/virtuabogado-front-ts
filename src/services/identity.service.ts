import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

interface ExtraData {
  nombre?: string | null;
  rol?: string | null;
  telefono?: string | null;
}

interface SyncOptions {
  targetUserId?: string;
  masterAdminEmail?: string;
  skipMetadataSync?: boolean;
  skipRelationMigration?: boolean;
  defaultName?: string;
}

export async function syncUserIdentity(
  supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, any> | null },
  extraData: ExtraData = {},
  options: SyncOptions = {},
) {
  const email = supabaseUser.email;
  if (!email) throw new Error('User email is required for identity sync');

  const { nombre, rol, telefono } = extraData;
  const targetUserId = options.targetUserId || supabaseUser.id;

  let finalName = nombre || supabaseUser.user_metadata?.nombre || supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name;

  const updateData: any = {
    email,
    updatedAt: new Date(),
    activo: true,
  };
  if (rol) updateData.rol = (rol as string).toUpperCase();
  if (telefono) updateData.telefono = telefono;

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });

  let mergedUser: any;

  if (existingByEmail && existingByEmail.id !== targetUserId) {
    // 1. Rescate de Identidad
    if (!finalName && existingByEmail.nombre && !existingByEmail.nombre.includes('@')) {
      finalName = existingByEmail.nombre;
    }

    if (finalName) updateData.nombre = finalName;

    // 2. Liberar email del registro antiguo
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { email: `legacy_${existingByEmail.id}_${existingByEmail.email}` },
    });

    // 3. Protección de rol
    const masterAdminEmail = options.masterAdminEmail || process.env.EMAIL_MASTER_ADMIN;
    const isMasterAdmin = email === masterAdminEmail;
    const roleToPreserve = isMasterAdmin ? 'ADMIN' : (existingByEmail.rol || (rol?.toUpperCase()) || 'CLIENTE');

    // 4. Upsert por ID oficial
    mergedUser = await prisma.user.upsert({
      where: { id: targetUserId },
      update: { ...updateData, rol: roleToPreserve },
      create: {
        id: targetUserId,
        email,
        nombre: finalName || options.defaultName || 'Usuario Nuevo',
        rol: roleToPreserve,
        telefono: telefono || undefined,
        activo: true,
        createdAt: new Date(),
      },
    });

    // 5. Migrar relaciones
    if (!options.skipRelationMigration) {
      await prisma.$transaction([
        prisma.order.updateMany({ where: { userId: existingByEmail.id }, data: { userId: targetUserId } }),
        prisma.order.updateMany({ where: { lawyerId: existingByEmail.id }, data: { lawyerId: targetUserId } }),
        prisma.message.updateMany({ where: { senderId: existingByEmail.id }, data: { senderId: targetUserId } }),
        prisma.document.updateMany({ where: { uploaderId: existingByEmail.id }, data: { uploaderId: targetUserId } }),
        prisma.pushSubscription.updateMany({ where: { userId: existingByEmail.id }, data: { userId: targetUserId } }),
      ]);
    }

    // 6. Sincronizar metadatos con Supabase Auth
    if (!options.skipMetadataSync) {
      const currentRoleInMetadata = (supabaseUser.user_metadata?.rol || 'CLIENTE').toUpperCase();
      const needsMetadataSync = (finalName && supabaseUser.user_metadata?.nombre !== finalName) ||
        (roleToPreserve && currentRoleInMetadata !== roleToPreserve);

      if (needsMetadataSync) {
        try {
          const supabase = await createClient();
          await supabase.auth.updateUser({
            data: {
              ...(finalName && { nombre: finalName }),
              ...(roleToPreserve && { rol: roleToPreserve }),
            },
          });
        } catch (metaError) {
          console.warn('⚠️ [Identity Sync] Metadata sync no fatal:', metaError);
        }
      }
    }
  } else {
    // Sin colisión, upsert simple
    const masterAdminEmail = options.masterAdminEmail || process.env.EMAIL_MASTER_ADMIN;
    const isMasterAdmin = email === masterAdminEmail;
    const currentRole = isMasterAdmin ? 'ADMIN' : (updateData.rol || (rol?.toUpperCase()) || 'CLIENTE');

    if (finalName) updateData.nombre = finalName;

    if (!options.skipMetadataSync) {
      const currentRoleInMetadata = (supabaseUser.user_metadata?.rol || 'CLIENTE').toUpperCase();
      const needsMetadataSync = (finalName && supabaseUser.user_metadata?.nombre !== finalName) ||
        (currentRole && currentRoleInMetadata !== currentRole);

      if (needsMetadataSync) {
        try {
          const supabase = await createClient();
          await supabase.auth.updateUser({
            data: {
              ...(finalName && { nombre: finalName }),
              ...(currentRole && { rol: currentRole }),
            },
          });
        } catch (metaError) {
          console.warn('⚠️ [Identity Sync] Metadata sync no fatal:', metaError);
        }
      }
    }

    try {
      mergedUser = await prisma.user.upsert({
        where: { id: targetUserId },
        update: { ...updateData, rol: currentRole },
        create: {
          id: targetUserId,
          email,
          nombre: finalName || options.defaultName || 'Usuario Nuevo',
          rol: currentRole,
          telefono: telefono || undefined,
          activo: true,
          createdAt: new Date(),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.warn('⚠️ [Identity Sync] P2002 evitado. Reconciliación paralela.');
        mergedUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!mergedUser) throw error;
      } else {
        throw error;
      }
    }
  }

  return mergedUser;
}
