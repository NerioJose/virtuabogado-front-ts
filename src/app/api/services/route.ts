import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastServiceUpdate } from '@/lib/broadcast';
import { serializeFinance } from '@/lib/finance';
import { getCached, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const showAll = searchParams.get('all') === 'true';
        const cacheKey = showAll ? 'services-all' : 'services-active';

        const cached = getCached<any[]>(cacheKey);
        if (cached) {
            return NextResponse.json(cached, {
                headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' }
            });
        }

        const services = await prisma.service.findMany({
            where: showAll ? {} : { activo: true },
            orderBy: { createdAt: 'desc' } as any
        });

        const result = serializeFinance(services);
        setCache(cacheKey, result, 10_000);
        return NextResponse.json(result, {
            headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' }
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        return NextResponse.json({ error: 'Error fetching services' }, { status: 500 });
    }
}

// Para administración (todos los servicios)
export async function POST(req: Request) {
    try {
        const headerRole = req.headers.get('x-user-role');
        if (headerRole !== 'ADMIN') {
            const supabase = await (await import('@/utils/supabase/server')).createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || ((user.user_metadata?.rol as string) || '').toUpperCase() !== 'ADMIN') {
                return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
            }
        }

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

        // 📡 Broadcast a todos los usuarios (await = bloqueante, garantiza envío)
        await broadcastServiceUpdate({
            serviceId: service.id,
            eventType: 'created',
        }).catch((e: unknown) => console.error('Broadcast error:', e));

        return NextResponse.json(serializeFinance(service));
    } catch (error) {
        console.error('Error creating service:', error);
        return NextResponse.json({ error: 'Error creating service' }, { status: 500 });
    }
}
