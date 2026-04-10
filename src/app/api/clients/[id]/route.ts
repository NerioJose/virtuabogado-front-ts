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

        // Obtener rol del usuario
        let userRole: string | undefined = (user.user_metadata?.rol as string)?.toUpperCase();
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }

        if (!userRole) {
            return NextResponse.json({ error: 'Rol no definido' }, { status: 403 });
        }

        const role: string = userRole;

        if (role !== 'ADMIN' && role !== 'ABOGADO') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        const body = await request.json();
        const { nombre, email, telefono, direccion, dni, activo } = body;
        const isAdmin = role === 'ADMIN';

        const updatedClient = await prisma.user.update({
            where: { id },
            data: {
                ...(nombre !== undefined && { nombre }),
                ...(email !== undefined && { email }),
                ...(telefono !== undefined && { telefono: telefono === '' ? null : telefono }),
                ...(direccion !== undefined && { direccion: direccion === '' ? null : direccion }),
                ...(dni !== undefined && { dni: dni === '' ? null : dni }),
                ...(activo !== undefined && { activo }),
            },
        });

        // Si se cambió el estado de activo, sincronizar con Supabase Auth Metadata para el Middleware
        if (activo !== undefined && isAdmin) {
            try {
                const { createAdminClient } = await import('@/utils/supabase/admin');
                const adminClient = createAdminClient();
                await adminClient.auth.admin.updateUserById(id, {
                    user_metadata: { activo: activo }
                });
                console.log(`✅ API: Sincronizado estado activo (${activo}) en Auth para cliente ${id}`);
            } catch (authError) {
                console.warn('⚠️ API: No se pudo sincronizar metadata en Auth para el cliente:', authError);
            }
        }

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
            // Mantener valores originales o calcularlos si fuera necesario
            serviciosContratados: 0,
            totalGastado: 0,
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
        let userRole: string | undefined = (user.user_metadata?.rol as string)?.toUpperCase();
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }

        if (!userRole) {
            return NextResponse.json({ error: 'Rol no definido' }, { status: 403 });
        }

        const role: string = userRole;

        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        // 1. Archivado Lógico en DB (Preservamos documentos y datos para el historial de casos)
        console.log(`🏛️ API: Archivado lógico para el cliente ID: ${id}`);
        
        // Mantenemos documentos y PII para que el historial de casos no se rompa
        await prisma.user.update({
            where: { id },
            data: { 
                activo: false,
            },
        });

        // 2. Bloqueo de acceso en Supabase Auth vía Metadata (no eliminamos la cuenta)
        try {
            const { createAdminClient } = await import('@/utils/supabase/admin');
            const adminClient = createAdminClient();
            // Marcamos como inactivo en metadata. El middleware revisará esto.
            await adminClient.auth.admin.updateUserById(id, {
                user_metadata: { activo: false }
            });
            console.log(`✅ API: Acceso bloqueado para el cliente ${id} en Supabase Auth vía metadata.`);
        } catch (authError) {
            console.warn(`⚠️ API: No se pudo actualizar metadata en Auth, pero el cliente fue archivado en DB.`, authError);
        }

        return NextResponse.json({ 
            success: true,
            message: 'Cliente archivado y datos sensibles depurados. Historial de casos preservado.' 
        });
    } catch (error) {
        console.error('❌ API Error deleting client:', error);
        return NextResponse.json(
            { error: 'Error al eliminar el cliente' },
            { status: 500 }
        );
    }
}
