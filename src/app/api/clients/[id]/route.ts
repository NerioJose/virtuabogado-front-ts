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

        // 1. Limpieza de relaciones en cascada
        console.log(`🧹 API: Limpiando órdenes y dependencias para el cliente ${id}...`);

        // Obtener IDs de las órdenes para limpieza manual si fuera necesario (aunque Prisma debería manejarlo)
        const userOrders = await prisma.order.findMany({
            where: { userId: id },
            select: { id: true }
        });
        const orderIds = userOrders.map(o => o.id);

        if (orderIds.length > 0) {
            // Borrar reseñas de sus órdenes
            await prisma.review.deleteMany({
                where: { orderId: { in: orderIds } }
            });

            // Borrar mensajes asociados a sus órdenes
            await prisma.message.deleteMany({
                where: { orderId: { in: orderIds } }
            });

            // Borrar documentos asociados a sus órdenes
            await prisma.document.deleteMany({
                where: { orderId: { in: orderIds } }
            });

            // Borrar las órdenes
            await prisma.order.deleteMany({
                where: { userId: id }
            });
        }

        // También borrar mensajes y documentos donde el usuario sea el remitente directo (fuera de órdenes si existen)
        await prisma.message.deleteMany({ where: { senderId: id } });
        await prisma.document.deleteMany({ where: { uploaderId: id } });

        // 2. Borrado Real en Prisma
        console.log(`🗑️ API: Ejecutando borrado real para el cliente ID: ${id}`);
        await prisma.user.delete({
            where: { id },
        });

        // 3. Borrado en Supabase Auth (Opcional)
        try {
            const { createAdminClient } = await import('@/utils/supabase/admin');
            const adminClient = createAdminClient();
            await adminClient.auth.admin.deleteUser(id);
            console.log(`✅ API: Usuario ${id} borrado de Supabase Auth.`);
        } catch (authError) {
            console.warn(`⚠️ API: No se pudo borrar de Auth, pero el registro en DB fue eliminado.`, authError);
        }

        return NextResponse.json({ 
            success: true,
            message: 'Cliente y todo su historial eliminados correctamente' 
        });
    } catch (error) {
        console.error('❌ API Error deleting client:', error);
        return NextResponse.json(
            { error: 'Error al eliminar el cliente' },
            { status: 500 }
        );
    }
}
