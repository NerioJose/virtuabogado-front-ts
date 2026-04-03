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

        // 1. Archivado Lógico y Depuración de Datos Sensibles
        // Mantenemos las Órdenes para preservar el historial de la plataforma, pero limpiamos datos personales
        console.log(`🏛️ API: Archivado y depuración de datos para el cliente ID: ${id}`);
        
        // Primero, eliminar los documentos físicos/registros de archivos (solicitado: "no los documentos")
        await prisma.document.deleteMany({
            where: { 
                OR: [
                    { uploaderId: id },
                    { order: { userId: id } }
                ]
            }
        });

        // Segundo, actualizar el usuario para inactivarlo y vaciar PII (solicitado: "no los datos")
        await prisma.user.update({
            where: { id },
            data: { 
                activo: false,
                dni: null,
                direccion: null,
                telefono: null
                // Mantenemos nombre y email para trazabilidad básica en las órdenes antiguas
            },
        });

        // 2. Bloqueo de acceso en Supabase Auth
        try {
            const { createAdminClient } = await import('@/utils/supabase/admin');
            const adminClient = createAdminClient();
            // Eliminamos de Auth para impedir el login, pero el registro en DB permanece para trazabilidad financiera
            await adminClient.auth.admin.deleteUser(id);
            console.log(`✅ API: Acceso bloqueado para el cliente ${id} en Supabase Auth.`);
        } catch (authError) {
            console.warn(`⚠️ API: No se pudo eliminar de Auth, pero el cliente fue depurado en DB.`, authError);
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
