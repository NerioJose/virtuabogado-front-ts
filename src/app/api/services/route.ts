import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const showAll = searchParams.get('all') === 'true';

        const services = await prisma.service.findMany({
            where: showAll ? {} : { activo: true },
            orderBy: { id: 'asc' }
        });
        return NextResponse.json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json({ error: 'Error fetching services' }, { status: 500 });
    }
}

// Para administración (todos los servicios)
export async function POST(req: Request) {
    try {
        // TODO: Validar sesión de admin aquí en el futuro real
        const body = await req.json();
        const { titulo, descripcion, precio, imagenUrl, activo } = body;

        const service = await prisma.service.create({
            data: {
                titulo,
                descripcion,
                precio,
                imagenUrl,
                activo: activo ?? true
            }
        });

        return NextResponse.json(service);
    } catch (error) {
        console.error('Error creating service:', error);
        return NextResponse.json({ error: 'Error creating service' }, { status: 500 });
    }
}
