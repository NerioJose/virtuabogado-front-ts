import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
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
