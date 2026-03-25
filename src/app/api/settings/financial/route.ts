import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const FIXED_SETTINGS_ID = '11111111-1111-1111-1111-111111111111';

/**
 * GET /api/settings/financial
 * Obtener la configuración financiera actual
 */
export async function GET(request: NextRequest) {
    try {
        console.log(`🔍 [GET] /api/settings/financial - Buscando ID: ${FIXED_SETTINGS_ID}`);
        const supabase = await createClient();

        // Verificar autenticación
        let {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (!user) {
            console.warn('⚠️ [GET] No autorizado');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const getSettingsModel = () => {
             const p = prisma as any;
             return p.financialSettings || p.FinancialSettings || p['FinancialSettings'];
        };

        const model = getSettingsModel();
        console.log(`📂 [GET] Model encontrado: ${!!model}`);

        if (!model) {
            console.log('⚠️ [GET] Fallback raw query...');
            const rawResult = await prisma.$queryRaw<any[]>`SELECT * FROM "FinancialSettings" WHERE id = ${FIXED_SETTINGS_ID} LIMIT 1`;
            
            if (rawResult && rawResult.length > 0) {
                console.log('✅ [GET] Resultado raw:', rawResult[0]);
                return NextResponse.json({
                    lawyerCommissionPercentage: Number(rawResult[0].lawyer_commission_percentage),
                    operationalCostsPercentage: Number(rawResult[0].operational_costs_percentage),
                    taxPercentage: Number(rawResult[0].tax_percentage),
                    platformFeePercentage: Number(rawResult[0].platform_fee_percentage),
                });
            }
        }

        let settings = await model?.findUnique({
            where: { id: FIXED_SETTINGS_ID }
        });

        if (!settings) {
            console.log('💡 [GET] Settings no encontrados, usando defaults');
            settings = {
                id: FIXED_SETTINGS_ID,
                lawyer_commission_percentage: (70 as any),
                operational_costs_percentage: (10 as any),
                tax_percentage: (15 as any),
                platform_fee_percentage: (5 as any),
                updated_at: new Date(),
                updated_by: 'system'
            } as any;
        }

        console.log('✅ [GET] Response:', settings);

        const response = {
            id: settings!.id,
            lawyerCommissionPercentage: Number(settings!.lawyer_commission_percentage),
            operationalCostsPercentage: Number(settings!.operational_costs_percentage),
            taxPercentage: Number(settings!.tax_percentage),
            platformFeePercentage: Number(settings!.platform_fee_percentage),
            updatedAt: settings!.updated_at,
            updatedBy: settings!.updated_by,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('❌ [GET] Error inesperado:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        console.log(`✍️ [PATCH] /api/settings/financial - Actualizando ID: ${FIXED_SETTINGS_ID}`);
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
        console.log('📦 [PATCH] Body:', body);

        const updates: any = { 
            updated_by: user.id,
            updated_at: new Date()
        };

        if (body.lawyerCommissionPercentage !== undefined) updates.lawyer_commission_percentage = parseFloat(body.lawyerCommissionPercentage);
        if (body.operationalCostsPercentage !== undefined) updates.operational_costs_percentage = parseFloat(body.operationalCostsPercentage);
        if (body.taxPercentage !== undefined) updates.tax_percentage = parseFloat(body.taxPercentage);
        if (body.platformFeePercentage !== undefined) updates.platform_fee_percentage = parseFloat(body.platformFeePercentage);

        const getSettingsModel = () => {
             const p = prisma as any;
             return p.financialSettings || p.FinancialSettings || p['FinancialSettings'];
        };

        const model = getSettingsModel();
        
        // Operación atómica de UPSERT (Prisma se encarga de todo)
        const result = await (model ? model.upsert({
            where: { id: FIXED_SETTINGS_ID },
            create: {
                id: FIXED_SETTINGS_ID,
                lawyer_commission_percentage: updates.lawyer_commission_percentage ?? 70,
                operational_costs_percentage: updates.operational_costs_percentage ?? 10,
                tax_percentage: updates.tax_percentage ?? 15,
                platform_fee_percentage: updates.platform_fee_percentage ?? 5,
                updated_by: user.id,
                updated_at: new Date()
            },
            update: {
                ...updates,
                updated_at: new Date()
            },
        }) : prisma.$executeRaw`
            INSERT INTO "FinancialSettings" (id, lawyer_commission_percentage, operational_costs_percentage, tax_percentage, platform_fee_percentage, updated_by, updated_at)
            VALUES (${FIXED_SETTINGS_ID}, ${updates.lawyer_commission_percentage ?? 70}, ${updates.operational_costs_percentage ?? 10}, ${updates.tax_percentage ?? 15}, ${updates.platform_fee_percentage ?? 5}, ${user.id}, ${new Date()})
            ON CONFLICT (id) DO UPDATE SET
                lawyer_commission_percentage = EXCLUDED.lawyer_commission_percentage,
                operational_costs_percentage = EXCLUDED.operational_costs_percentage,
                tax_percentage = EXCLUDED.tax_percentage,
                platform_fee_percentage = EXCLUDED.platform_fee_percentage,
                updated_by = EXCLUDED.updated_by,
                updated_at = NOW()
        `);

        return NextResponse.json({ success: true, message: 'Configuración actualizada' });
    } catch (error: any) {
        console.error('❌ [PATCH] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
