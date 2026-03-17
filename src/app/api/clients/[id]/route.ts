import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
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
            if (devBypass) {
                user = { id: 'dev-bypass-admin', email: 'admin@dev.test' } as any;
                console.log('🚧 Clients [ID] API: Auth bypass via Dev Cookie (PUT)');
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

            if (userData?.rol !== 'ADMIN' && userData?.rol !== 'ABOGADO') {
                return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
            }
        }

        const id = params.id;
        const body = await request.json();
        const { nombre, email, telefono, direccion, dni } = body;

        const updatedClient = await prisma.user.update({
            where: { id },
            data: {
                ...(nombre !== undefined && { nombre }),
                ...(email !== undefined && { email }),
                ...(telefono !== undefined && { telefono: telefono === '' ? null : telefono }),
                ...(direccion !== undefined && { direccion: direccion === '' ? null : direccion }),
                ...(dni !== undefined && { dni: dni === '' ? null : dni }),
            },
        });

        // Formatear respuesta para que coincida con la interfaz Client
        const formattedClient = {
            id: updatedClient.id,
            nombre: updatedClient.nombre,
            email: updatedClient.email,
            telefono: updatedClient.telefono || undefined,
            direccion: updatedClient.direccion || undefined,
            dni: updatedClient.dni || undefined,
            status: updatedClient.activo ? 'active' : 'inactive',
            createdAt: updatedClient.createdAt,
            updatedAt: updatedClient.updatedAt,
            // Mantener valores originales o calcularlos si fuera necesario (aquí no cambian por un update simple)
            serviciosContratados: 0, // El store mantendrá el valor original al hacer merge
            totalGastado: 0,         // El store mantendrá el valor original al hacer merge
        };

        return NextResponse.json(formattedClient);
    } catch (error) {
        console.error('❌ API Error updating client:', error);
        return NextResponse.json(
            { error: 'Error al actualizar el cliente' },
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

        return NextResponse.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('❌ API Error deleting client:', error);
        return NextResponse.json(
            { error: 'Error al eliminar el cliente' },
            { status: 500 }
        );
    }
}
