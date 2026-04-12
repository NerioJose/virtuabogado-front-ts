import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        // Verificar autenticación
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // Fallbacks
        if (!user) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { data: { user: headerUser } } = await supabase.auth.getUser(token);
                if (headerUser) user = headerUser;
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        
        // Determinar si el usuario es el dueño del perfil o un ADMIN
        const isOwner = user.id === id;
        
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }
        const isAdmin = userRole === 'ADMIN';

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        const body = await request.json();
        const { nombre, especialidad, experiencia, picture, telefono, matricula, activo } = body;
        
        const dataToUpdate: any = {};
        if (nombre !== undefined) dataToUpdate.nombre = nombre;
        if (especialidad !== undefined) dataToUpdate.especialidad = especialidad === '' ? null : especialidad;
        if (experiencia !== undefined) dataToUpdate.experiencia = experiencia === '' ? null : Number(experiencia);
        if (picture !== undefined) dataToUpdate.picture = picture;
        if (telefono !== undefined) dataToUpdate.telefono = telefono;
        if (matricula !== undefined) dataToUpdate.matricula = matricula;
        if (activo !== undefined) dataToUpdate.activo = activo;

        const updatedLawyer = await prisma.user.update({
            where: { id },
            data: dataToUpdate,
        });

        // Si se cambió el estado de activo, sincronizar con Supabase Auth Metadata para el Middleware
        if (activo !== undefined && isAdmin) {
            try {
                const { createAdminClient } = await import('@/utils/supabase/admin');
                const adminClient = createAdminClient();
                await adminClient.auth.admin.updateUserById(id, {
                    user_metadata: { activo: activo }
                });
                
            } catch (authError) {
                console.warn('⚠️ API: No se pudo sincronizar metadata en Auth:', authError);
            }
        }

        // Formatear para coincidir con el estado del frontend
        const formattedLawyer = {
            id: updatedLawyer.id,
            nombre: updatedLawyer.nombre,
            email: updatedLawyer.email,
            especialidad: updatedLawyer.especialidad || undefined,
            experiencia: updatedLawyer.experiencia || undefined,
            casosAsignados: typeof body.casosAsignados !== 'undefined' ? body.casosAsignados : 0,
            casosCompletados: 0,
            rating: typeof body.rating !== 'undefined' ? body.rating : 5,
            status: updatedLawyer.activo ? 'active' : 'inactive',
            createdAt: updatedLawyer.createdAt,
            updatedAt: updatedLawyer.updatedAt,
        };

        return NextResponse.json(formattedLawyer);
    } catch (error) {
        console.error('❌ API Error updating lawyer:', error);
        return NextResponse.json(
            { error: 'Error al actualizar el abogado' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        // Verificar autenticación
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // Fallbacks
        if (!user) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { data: { user: headerUser } } = await supabase.auth.getUser(token);
                if (headerUser) user = headerUser;
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Solo ADMIN puede borrar
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }

        if (userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        // 1. Archivado Lógico (Soft Delete) en DB
        
        const result = await prisma.user.update({
            where: { id },
            data: { activo: false },
        });

        // 2. Bloqueo de acceso en Supabase Auth vía Metadata (no eliminamos la cuenta)
        try {
            const { createAdminClient } = await import('@/utils/supabase/admin');
            const adminClient = createAdminClient();
            // Marcamos como inactivo en metadata. El middleware revisará esto.
            await adminClient.auth.admin.updateUserById(id, {
                user_metadata: { activo: false }
            });
            
        } catch (authError) {
            console.warn(`⚠️ API: No se pudo actualizar metadata en Auth, pero el registro en DB fue archivado.`, authError);
        }

        return NextResponse.json({ 
            success: true,
            message: 'Abogado archivado correctamente. Toda su información histórica ha sido preservada.',
            id: result.id
        });
    } catch (error) {
        console.error('❌ API Error deleting lawyer:', error);
        return NextResponse.json(
            { error: 'Error al eliminar el abogado: ' + (error instanceof Error ? error.message : 'Error desconocido') },
            { status: 500 }
        );
    }
}
