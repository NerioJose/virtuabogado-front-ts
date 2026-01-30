import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/shared/types/entities.types';

export async function GET() {
    try {
        const clients = await prisma.user.findMany({
            where: {
                rol: UserRole.CLIENTE,
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
        const formattedClients = clients.map(client => ({
            id: client.id,
            nombre: client.nombre,
            email: client.email,
            telefono: client.telefono || undefined,
            direccion: client.direccion || undefined,
            dni: client.dni || undefined,
            status: 'active', // Default
            createdAt: client.createdAt,
            updatedAt: client.updatedAt,
            serviciosContratados: client.orders.length,
            totalGastado: client.orders.reduce((sum, order) => sum + Number(order.total), 0),
        }));

        return NextResponse.json(formattedClients);
    } catch (error) {
        console.error('❌ API Error fetching clients:', error);
        return NextResponse.json(
            { error: 'Error al obtener los clientes' },
            { status: 500 }
        );
    }
}
