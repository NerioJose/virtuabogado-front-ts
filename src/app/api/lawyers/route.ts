import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/shared/types/entities.types';

export async function GET() {
    try {
        const lawyers = await prisma.user.findMany({
            where: {
                rol: UserRole.ABOGADO,
                activo: true
            },
            include: {
                orders: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Mapear al formato que espera el frontend
        const formattedLawyers = lawyers.map(lawyer => ({
            id: lawyer.id,
            nombre: lawyer.nombre,
            email: lawyer.email,
            telefono: lawyer.telefono || undefined,
            especialidad: lawyer.especialidad || 'civil',
            status: 'ACTIVO', // Default for active users
            matricula: lawyer.matricula || undefined,
            experiencia: lawyer.experiencia || undefined,
            casosActivos: lawyer.orders.filter(o => o.status === 'PENDIENTE').length,
            casosCompletados: lawyer.orders.filter(o => o.status === 'COMPLETADO').length,
            rating: 5, // Mock por ahora
            createdAt: lawyer.createdAt,
            updatedAt: lawyer.updatedAt,
        }));

        return NextResponse.json(formattedLawyers);
    } catch (error) {
        console.error('❌ API Error fetching lawyers:', error);
        return NextResponse.json(
            { error: 'Error al obtener los abogados' },
            { status: 500 }
        );
    }
}
