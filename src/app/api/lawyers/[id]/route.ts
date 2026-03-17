import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
        const supabase = await createClient();
        // Verificar autenticación
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // 1. Fallback: Header
        if (!user) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { data: { user: headerUser } } = await supabase.auth.getUser(token);
                if (headerUser) user = headerUser;
            }
        }

        // 2. Fallback: Dev Bypass
        if (!user) {
            const devBypass = request.headers.get('cookie')?.includes('virtuabogado-dev-bypass=true');
            if (devBypass) {
                user = { id: 'dev-bypass-admin', email: 'admin@dev.test' } as any;
                console.log('🚧 Lawyers [ID] API: Auth bypass via Dev Cookie (PUT)');
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Verificar rol (Saltar si es bypass)
        if (user.id !== 'dev-bypass-admin') {
            const { data: userData } = await supabase
                .from('User')
                .select('rol')
                .eq('id', user.id)
                .single();

            if (userData?.rol !== 'ADMIN') {
                return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
            }
        }

        const id = params.id;
        const body = await request.json();
        const { nombre, email, telefono, especialidad, matricula, experiencia } = body;

        const updatedLawyer = await prisma.user.update({
            where: { id },
            data: {
                ...(nombre !== undefined && { nombre }),
                ...(email !== undefined && { email }),
                ...(telefono !== undefined && { telefono: telefono === '' ? null : telefono }),
                ...(especialidad !== undefined && { especialidad: especialidad === '' ? null : especialidad }),
                ...(matricula !== undefined && { matricula: matricula === '' ? null : matricula }),
                ...(experiencia !== undefined && { experiencia: experiencia === '' ? null : Number(experiencia) }),
            },
            include: {
                orders: true
            }
        });

        // Formatear respuesta para que coincida con la interfaz Lawyer
        const formattedLawyer = {
            id: updatedLawyer.id,
            nombre: updatedLawyer.nombre,
            email: updatedLawyer.email,
            telefono: updatedLawyer.telefono || undefined,
            especialidad: updatedLawyer.especialidad || 'civil',
            status: updatedLawyer.activo ? 'ACTIVO' : 'INACTIVO',
            matricula: updatedLawyer.matricula || undefined,
            experiencia: updatedLawyer.experiencia || undefined,
            casosActivos: updatedLawyer.orders.filter(o => o.status === 'PENDIENTE').length,
            casosCompletados: updatedLawyer.orders.filter(o => o.status === 'COMPLETADO').length,
            rating: 5, // Mock por ahora
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
            const devBypass = request.headers.get('cookie')?.includes('virtuabogado-dev-bypass=true');
            if (devBypass) user = { id: 'dev-bypass-admin', email: 'admin@dev.test' } as any;
        }

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Solo ADMIN puede borrar
        let isAdmin = false;
        if (user.id === 'dev-bypass-admin') {
            isAdmin = true;
        } else {
            const { data: userData } = await supabase.from('User').select('rol').eq('id', user.id).single();
            isAdmin = userData?.rol === 'ADMIN';
        }

        if (!isAdmin) {
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
