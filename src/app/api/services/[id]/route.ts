import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emit } from '@/events/eventBus';
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

        return NextResponse.json(serializeFinance(service));
    } catch (error) {
        console.error('Error fetching service:', error);
        return NextResponse.json({ error: 'Error fetching service' }, { status: 500 });
    }
}

async function requireAdmin(req: Request): Promise<boolean> {
    const headerRole = req.headers.get('x-user-role');
    if (headerRole === 'ADMIN') return true;
    const supabase = await (await import('@/utils/supabase/server')).createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!(user && ((user.user_metadata?.rol as string) || '').toUpperCase() === 'ADMIN');
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!(await requireAdmin(req))) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        const { id } = await params;
        const body = await req.json();
        
        // --- DATA DINÁMICA: Solo enviamos a Prisma lo que realmente viene en el body ---
        // Esto evita errores de validación (como "precio must not be null") al hacer updates parciales
        const updateData: any = {};
        if (body.titulo !== undefined) updateData.titulo = body.titulo;
        if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
        if (body.precio !== undefined) updateData.precio = body.precio;
        if (body.imagenUrl !== undefined) updateData.imagenUrl = body.imagenUrl;
        if (body.activo !== undefined) updateData.activo = body.activo;

        const service = await prisma.service.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        await emit({
            type: 'service.updated',
            data: { serviceId: service.id, eventType: 'updated' },
        });

        return NextResponse.json(serializeFinance(service));
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
        if (!(await requireAdmin(req))) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        const { id } = await params;
        // Soft delete: just set activo to false
        const service = await prisma.service.update({
            where: { id: parseInt(id) },
            data: { activo: false }
        });

        await emit({
            type: 'service.deleted',
            data: { serviceId: service.id, eventType: 'deleted' },
        });

        return NextResponse.json(serializeFinance({ message: 'Service deactivated successfully', service }));
    } catch (error) {
        console.error('Error deleting service:', error);
        return NextResponse.json({ error: 'Error deleting service' }, { status: 500 });
    }
}
