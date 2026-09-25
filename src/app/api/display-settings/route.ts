import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { DISPLAY_SETTINGS_ID } from '@/lib/constants';
import { sendBroadcast } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';

const getDisplaySettingsModel = () => {
    const p = prisma as any;
    return p.displaySettings || p.DisplaySettings || p['DisplaySettings'];
};

/**
 * GET /api/display-settings
 * Configuración pública de visualización de precios.
 * Público (anon + autenticados). Sin caché: los clientes la refrescan
 * al instante cuando el WAL de Supabase invalida la query.
 */
export async function GET(request: NextRequest) {
    try {
        const model = getDisplaySettingsModel();

        let settings: any = null;

        if (model) {
            settings = await model.findUnique({ where: { id: DISPLAY_SETTINGS_ID } });
        }

        if (!settings) {
            const rawResult = await prisma.$queryRaw<any[]>`SELECT * FROM "DisplaySettings" WHERE id = ${DISPLAY_SETTINGS_ID} LIMIT 1`;
            if (rawResult && rawResult.length > 0) {
                settings = rawResult[0];
            }
        }

        const showUsd = settings ? settings.show_usd_prices !== false : true;

        return NextResponse.json(
            { showUsd },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    } catch (error) {
        console.error('❌ [GET /api/display-settings] Error:', error);
        return NextResponse.json({ showUsd: true });
    }
}

/**
 * PATCH /api/display-settings
 * Solo ADMIN actualiza el flag global de visualización (auto-guardado).
 * El WAL de Supabase "DisplaySettings" propaga el cambio a todos los
 * clientes conectados en tiempo real, sin polling ni recarga.
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { rol: true }
        });

        if (dbUser?.rol !== 'ADMIN') {
            return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
        }

        const body = await request.json();
        if (typeof body.showUsd !== 'boolean') {
            return NextResponse.json({ error: 'showUsd (boolean) es requerido' }, { status: 400 });
        }

        const model = getDisplaySettingsModel();

        if (model) {
            await model.upsert({
                where: { id: DISPLAY_SETTINGS_ID },
                create: {
                    id: DISPLAY_SETTINGS_ID,
                    show_usd_prices: body.showUsd,
                    updated_by: user.id,
                    updated_at: new Date(),
                },
                update: {
                    show_usd_prices: body.showUsd,
                    updated_by: user.id,
                    updated_at: new Date(),
                },
            });
        } else {
            await prisma.$executeRaw`
                INSERT INTO "DisplaySettings" (id, show_usd_prices, updated_by, updated_at)
                VALUES (${DISPLAY_SETTINGS_ID}, ${body.showUsd}, ${user.id}, ${new Date()})
                ON CONFLICT (id) DO UPDATE SET
                    show_usd_prices = EXCLUDED.show_usd_prices,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = NOW()
            `;
        }

        // Propagar el cambio a TODOS los clientes conectados (incluidos anónimos)
        // sin depender del WAL de Supabase (que no siempre dispara para escrituras
        // vía Prisma). El listener global en useRealtimeSubscription refresca la query.
        await sendBroadcast('app-updates', 'display-settings-updated', {
            showUsd: body.showUsd,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({ showUsd: body.showUsd });
    } catch (error: any) {
        console.error('❌ [PATCH /api/display-settings] Error:', error?.message || error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}