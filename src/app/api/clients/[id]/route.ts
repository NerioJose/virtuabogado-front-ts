import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
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
