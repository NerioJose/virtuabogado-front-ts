import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
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

        const id = params.id;
        
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
        const { nombre, especialidad, experiencia, picture, telefono } = body;

        // Solo el administrador puede cambiar nombre/experiencia (opcional, pero para seguridad mejor así)
        // Para este proyecto, permitiremos a ambos por ahora si el usuario solicita "real"
        
        const dataToUpdate: any = {};
        if (nombre !== undefined) dataToUpdate.nombre = nombre;
        if (especialidad !== undefined) dataToUpdate.especialidad = especialidad === '' ? null : especialidad;
        if (experiencia !== undefined) dataToUpdate.experiencia = experiencia === '' ? null : Number(experiencia);
        if (picture !== undefined) dataToUpdate.picture = picture;
        if (telefono !== undefined) dataToUpdate.telefono = telefono;

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
    { params }: { params: { id: string } }
) {
    try {
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

        const id = params.id;

        // Borrado lógico
        await prisma.user.update({
            where: { id },
            data: { activo: false },
        });

        return NextResponse.json({ message: 'Abogado eliminado correctamente' });
    } catch (error) {
        console.error('❌ API Error deleting lawyer:', error);
        return NextResponse.json(
            { error: 'Error al eliminar el abogado' },
            { status: 500 }
        );
    }
}
