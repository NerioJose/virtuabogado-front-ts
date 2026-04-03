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
        const { nombre, especialidad, experiencia, picture, telefono, matricula } = body;
        
        const dataToUpdate: any = {};
        if (nombre !== undefined) dataToUpdate.nombre = nombre;
        if (especialidad !== undefined) dataToUpdate.especialidad = especialidad === '' ? null : especialidad;
        if (experiencia !== undefined) dataToUpdate.experiencia = experiencia === '' ? null : Number(experiencia);
        if (picture !== undefined) dataToUpdate.picture = picture;
        if (telefono !== undefined) dataToUpdate.telefono = telefono;
        if (matricula !== undefined) dataToUpdate.matricula = matricula;

        const updatedLawyer = await prisma.user.update({
            where: { id },
            data: dataToUpdate,
        });

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

        // 1. Archivado Lógico (Soft Delete)
        // Mantenemos Órdenes, Mensajes, Documentos y Pagos intactos para preservar el historial de la plataforma
        console.log(`🏛️ API: Archivado lógico del abogado ID: ${id}`);
        const result = await prisma.user.update({
            where: { id },
            data: { activo: false },
        });

        // 2. Bloqueo de acceso en Supabase Auth (Opcional pero recomendado para ex-colaboradores)
        try {
            const { createAdminClient } = await import('@/utils/supabase/admin');
            const adminClient = createAdminClient();
            // Eliminamos de Auth para impedir el login, pero el registro en la DB (User table) permanece para trazabilidad
            await adminClient.auth.admin.deleteUser(id);
            console.log(`✅ API: Usuario ${id} eliminado de Supabase Auth para bloquear acceso.`);
        } catch (authError) {
            console.warn(`⚠️ API: No se pudo eliminar de Auth, pero el registro en DB fue archivado correctamente.`, authError);
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
