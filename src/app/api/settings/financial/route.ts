import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';
import { getCached, setCache, clearCache } from '@/lib/cache';
import { clearExchangeRateCache } from '@/lib/exchangeRate';
import { broadcastExchangeRateUpdate } from '@/lib/broadcast';

export const revalidate = 3600;

/**
 * GET /api/settings/financial
 * Obtener la configuración financiera actual usando el ID unificado.
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        let isAdmin = false;
        if (user) {
            const dbUser = await prisma.user.findUnique({
                 where: { id: user.id },
                 select: { rol: true }
            });
            isAdmin = dbUser?.rol === 'ADMIN';
        }

        // Caché en memoria de 30s para públicos; los admins leen siempre fresco
        // para que el panel refleje de inmediato los cambios guardados (PATCH).
        if (!isAdmin) {
            const cached = await getCached<any>('financial-settings-ui');
            if (cached) {
                return NextResponse.json(cached, {
                    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=3600' }
                });
            }
        }

        const model = (prisma as any).financialSettings || (prisma as any).FinancialSettings || (prisma as any)['FinancialSettings'];

        let settings: any;

        if (model) {
            settings = await model.findUnique({ where: { id: FINANCIAL_SETTINGS_ID } });
        }

        if (!settings) {
            const rawResult = await prisma.$queryRaw<any[]>`SELECT * FROM "FinancialSettings" WHERE id = ${FINANCIAL_SETTINGS_ID} LIMIT 1`;
            if (rawResult && rawResult.length > 0) {
                settings = rawResult[0];
            }
        }

        if (!settings) {
            settings = {
                id: FINANCIAL_SETTINGS_ID,
                lawyer_commission_percentage: 0,
                operational_costs_percentage: 0,
                tax_percentage: 0,
                platform_fee_percentage: 0,
                simulation_base: 0,
                usd_pen_fallback_rate: null,
                whatsappPhone: null,
                updated_at: new Date(),
                updated_by: 'system'
            };
        }

        const response = {
            id: FINANCIAL_SETTINGS_ID,
            lawyerCommissionPercentage: isAdmin ? Number(settings.lawyer_commission_percentage) : 0,
            operationalCostsPercentage: isAdmin ? Number(settings.operational_costs_percentage) : 0,
            taxPercentage: Number(settings.tax_percentage),
            platformFeePercentage: isAdmin ? Number(settings.platform_fee_percentage) : 0,
            simulationBase: isAdmin ? Number(settings.simulation_base || 0) : 0,
            usdPenFallbackRate: isAdmin ? Number(settings.usd_pen_fallback_rate ?? null) : null,
            whatsappPhone: (settings as any).whatsappPhone || (settings as any).whatsapp_phone || null,
            updatedAt: settings.updated_at || settings.updatedAt || new Date(),
            updatedBy: isAdmin ? settings.updated_by : undefined,
        };

        if (!isAdmin) {
            await setCache('financial-settings-ui', response, 30_000);
        }
        return NextResponse.json(response, {
            headers: isAdmin
                ? { 'Cache-Control': 'no-store, max-age=0' }
                : { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=3600' }
        });
    } catch (error) {
        console.error('❌ [GET] Error inesperado:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        
        const supabase = await createClient();

        // Verificar autenticación
        let {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (!user) {
            console.warn('⚠️ [PATCH] No autorizado');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        

        const updates: any = { 
            updated_by: user.id,
            updated_at: new Date()
        };

        if (body.lawyerCommissionPercentage !== undefined) updates.lawyer_commission_percentage = parseFloat(body.lawyerCommissionPercentage);
        if (body.operationalCostsPercentage !== undefined) updates.operational_costs_percentage = parseFloat(body.operationalCostsPercentage);
        if (body.taxPercentage !== undefined) updates.tax_percentage = parseFloat(body.taxPercentage);
        if (body.platformFeePercentage !== undefined) updates.platform_fee_percentage = parseFloat(body.platformFeePercentage);
        if (body.simulationBase !== undefined) updates.simulation_base = parseFloat(body.simulationBase);
        if (body.usdPenFallbackRate !== undefined) updates.usd_pen_fallback_rate = body.usdPenFallbackRate === null ? null : parseFloat(body.usdPenFallbackRate);
        if (body.whatsappPhone !== undefined) updates.whatsappPhone = body.whatsappPhone;

        const getSettingsModel = () => {
             const p = prisma as any;
             return p.financialSettings || p.FinancialSettings || p['FinancialSettings'];
        };

        const model = getSettingsModel();
        
        // Operación atómica de UPSERT (Prisma se encarga de todo)
        const result = await (model ? model.upsert({
            where: { id: FINANCIAL_SETTINGS_ID },
            create: {
                id: FINANCIAL_SETTINGS_ID,
                lawyer_commission_percentage: updates.lawyer_commission_percentage ?? 0,
                operational_costs_percentage: updates.operational_costs_percentage ?? 0,
                tax_percentage: updates.tax_percentage ?? 0,
                platform_fee_percentage: updates.platform_fee_percentage ?? 0,
                simulation_base: updates.simulation_base ?? 0,
                usd_pen_fallback_rate: updates.usd_pen_fallback_rate ?? null,
                whatsappPhone: updates.whatsappPhone ?? null,
                updated_by: user.id,
                updated_at: new Date()
            },
            update: {
                ...updates,
                updated_at: new Date()
            },
        }) : prisma.$executeRaw`
            INSERT INTO "FinancialSettings" (id, lawyer_commission_percentage, operational_costs_percentage, tax_percentage, platform_fee_percentage, simulation_base, usd_pen_fallback_rate, whatsapp_phone, updated_by, updated_at)
            VALUES (${FINANCIAL_SETTINGS_ID}, ${updates.lawyer_commission_percentage ?? 0}, ${updates.operational_costs_percentage ?? 0}, ${updates.tax_percentage ?? 0}, ${updates.platform_fee_percentage ?? 0}, ${updates.simulation_base ?? 0}, ${updates.usd_pen_fallback_rate ?? null}, ${updates.whatsappPhone ?? null}, ${user.id}, ${new Date()})
            ON CONFLICT (id) DO UPDATE SET
                lawyer_commission_percentage = EXCLUDED.lawyer_commission_percentage,
                operational_costs_percentage = EXCLUDED.operational_costs_percentage,
                tax_percentage = EXCLUDED.tax_percentage,
                platform_fee_percentage = EXCLUDED.platform_fee_percentage,
                simulation_base = EXCLUDED.simulation_base,
                usd_pen_fallback_rate = EXCLUDED.usd_pen_fallback_rate,
                whatsapp_phone = EXCLUDED.whatsapp_phone,
                updated_by = EXCLUDED.updated_by,
                updated_at = NOW()
        `);

        // Invalidar caché
        revalidatePath('/');
        await clearCache('financial-settings-ui');
        await clearCache('financial-settings');
        clearExchangeRateCache();

        // Devolver la configuración actualizada (verdad del servidor) para que
        // el panel refleje el cambio al instante.
        const persisted = model ? await model.findUnique({ where: { id: FINANCIAL_SETTINGS_ID } }) : null;
        const response = {
            id: FINANCIAL_SETTINGS_ID,
            lawyerCommissionPercentage: Number(persisted?.lawyer_commission_percentage ?? updates.lawyer_commission_percentage ?? 0),
            operationalCostsPercentage: Number(persisted?.operational_costs_percentage ?? updates.operational_costs_percentage ?? 0),
            taxPercentage: Number(persisted?.tax_percentage ?? updates.tax_percentage ?? 0),
            platformFeePercentage: Number(persisted?.platform_fee_percentage ?? updates.platform_fee_percentage ?? 0),
            simulationBase: Number(persisted?.simulation_base ?? updates.simulation_base ?? 0),
            usdPenFallbackRate: persisted?.usd_pen_fallback_rate != null
                ? Number(persisted.usd_pen_fallback_rate)
                : updates.usd_pen_fallback_rate == null ? null : Number(updates.usd_pen_fallback_rate),
            whatsappPhone: persisted?.whatsappPhone ?? updates.whatsappPhone ?? null,
            updatedAt: new Date().toISOString(),
            updatedBy: user.id,
        };

        // Broadcast en tiempo real para que todos los clientes conectados (incluidos
        // anónimos) recalculen los precios en soles al instante, sin recargar.
        try {
            await broadcastExchangeRateUpdate({
                rate: response.usdPenFallbackRate ?? null,
                timestamp: response.updatedAt,
            });
        } catch (err) {
            console.warn('⚠️ [PATCH] Broadcast de tasa falló (no crítico):', err);
        }

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('❌ [PATCH] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
