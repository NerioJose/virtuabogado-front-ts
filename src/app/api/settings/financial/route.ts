import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';
import { getCached, setCache, clearCache } from '@/lib/cache';

export const revalidate = 3600;

/**
 * GET /api/settings/financial
 * Obtener la configuración financiera actual usando el ID unificado.
 */
export async function GET(request: NextRequest) {
    try {
        // Caché en memoria de 30s para evitar queries repetidas en ráfagas
        const cached = getCached<any>('financial-settings-ui');
        if (cached) {
            return NextResponse.json(cached, {
                headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=3600' }
            });
        }

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
            whatsappPhone: (settings as any).whatsappPhone || (settings as any).whatsapp_phone || null,
            updatedAt: settings.updated_at || settings.updatedAt || new Date(),
            updatedBy: isAdmin ? settings.updated_by : undefined,
        };

        setCache('financial-settings-ui', response, 30_000);
        return NextResponse.json(response, {
            headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=3600' }
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
                whatsappPhone: updates.whatsappPhone ?? null,
                updated_by: user.id,
                updated_at: new Date()
            },
            update: {
                ...updates,
                updated_at: new Date()
            },
        }) : prisma.$executeRaw`
            INSERT INTO "FinancialSettings" (id, lawyer_commission_percentage, operational_costs_percentage, tax_percentage, platform_fee_percentage, simulation_base, whatsapp_phone, updated_by, updated_at)
            VALUES (${FINANCIAL_SETTINGS_ID}, ${updates.lawyer_commission_percentage ?? 0}, ${updates.operational_costs_percentage ?? 0}, ${updates.tax_percentage ?? 0}, ${updates.platform_fee_percentage ?? 0}, ${updates.simulation_base ?? 0}, ${updates.whatsappPhone ?? null}, ${user.id}, ${new Date()})
            ON CONFLICT (id) DO UPDATE SET
                lawyer_commission_percentage = EXCLUDED.lawyer_commission_percentage,
                operational_costs_percentage = EXCLUDED.operational_costs_percentage,
                tax_percentage = EXCLUDED.tax_percentage,
                platform_fee_percentage = EXCLUDED.platform_fee_percentage,
                simulation_base = EXCLUDED.simulation_base,
                whatsapp_phone = EXCLUDED.whatsapp_phone,
                updated_by = EXCLUDED.updated_by,
                updated_at = NOW()
        `);

        // Invalidar caché
        revalidatePath('/');
        clearCache('financial-settings-ui');
        clearCache('financial-settings');

        return NextResponse.json({ success: true, message: 'Configuración actualizada' });
    } catch (error: any) {
        console.error('❌ [PATCH] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
