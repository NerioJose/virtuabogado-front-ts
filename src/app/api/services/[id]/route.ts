import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastServiceUpdate } from '@/lib/broadcast';
import { serializeFinance } from '@/lib/finance';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const service = await prisma.service.findUnique({
            where: { id: parseInt(id) }
        });

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        return NextResponse.json(service);
    } catch (error) {
        console.error('Error fetching service:', error);
        return NextResponse.json({ error: 'Error fetching service' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { titulo, descripcion, precio, imagenUrl, activo } = body;

        const service = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                titulo,
                descripcion,
                precio,
                imagenUrl,
                activo
            }
        });

        // 📡 Broadcast a todos los usuarios
        broadcastServiceUpdate({
            serviceId: service.id,
            eventType: 'updated',
        });

        return NextResponse.json(service);
    } catch (error) {
        console.error('Error updating service:', error);
        return NextResponse.json({ error: 'Error updating service' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Soft delete: just set activo to false
        const service = await prisma.service.update({
            where: { id: parseInt(id) },
            data: { activo: false }
        });

        // 📡 Broadcast a todos los usuarios
        broadcastServiceUpdate({
            serviceId: service.id,
            eventType: 'deleted',
        });

        return NextResponse.json(serializeFinance({ message: 'Service deactivated successfully', service }));
    } catch (error) {
        console.error('Error deleting service:', error);
        return NextResponse.json({ error: 'Error deleting service' }, { status: 500 });
    }
}
