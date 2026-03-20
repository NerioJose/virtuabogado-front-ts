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

        // Obtener rol del usuario
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
        const body = await request.json();
        const { nombre, especialidad, experiencia } = body;

        const updatedLawyer = await prisma.user.update({
            where: { id },
            data: {
                ...(nombre !== undefined && { nombre }),
                ...(especialidad !== undefined && { especialidad: especialidad === '' ? null : especialidad }),
                ...(experiencia !== undefined && { experiencia: experiencia === '' ? null : experiencia }),
            },
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
