import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastServiceUpdate } from '@/lib/broadcast';
import { serializeFinance } from '@/lib/finance';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const showAll = searchParams.get('all') === 'true';

        const services = await prisma.service.findMany({
            where: showAll ? {} : { activo: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(serializeFinance(services));
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

        // 📡 Broadcast a todos los usuarios
        broadcastServiceUpdate({
            serviceId: service.id,
            eventType: 'created',
        });

        return NextResponse.json(serializeFinance(service));
    } catch (error) {
        console.error('Error creating service:', error);
        return NextResponse.json({ error: 'Error creating service' }, { status: 500 });
    }
}
