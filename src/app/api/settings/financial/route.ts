import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/financial
 * Obtener la configuración financiera actual usando el ID unificado.
 */
export async function GET(request: NextRequest) {
    try {
        
        const supabase = await createClient();

        // Configuración financiera pública para lectura (permite a Contacto y Checkout acceder sin sesión)

        const getSettingsModel = () => {
             const p = prisma as any;
             return p.financialSettings || p.FinancialSettings || p['FinancialSettings'];
        };

        const model = getSettingsModel();

        if (!model) {
            
            const rawResult = await prisma.$queryRaw<any[]>`SELECT * FROM "FinancialSettings" WHERE id = ${FINANCIAL_SETTINGS_ID} LIMIT 1`;
            
            if (rawResult && rawResult.length > 0) {
                return NextResponse.json({
                    lawyerCommissionPercentage: Number(rawResult[0].lawyer_commission_percentage),
                    operationalCostsPercentage: Number(rawResult[0].operational_costs_percentage),
                    taxPercentage: Number(rawResult[0].tax_percentage),
                    platformFeePercentage: Number(rawResult[0].platform_fee_percentage),
                    simulationBase: Number(rawResult[0].simulation_base || 0),
                    whatsappPhone: rawResult[0].whatsapp_phone || null,
                });
            }
        }

        let settings = await model?.findUnique({
            where: { id: FINANCIAL_SETTINGS_ID }
        });

        if (!settings) {
            
            settings = {
                id: FINANCIAL_SETTINGS_ID,
                lawyer_commission_percentage: (0 as any),
                operational_costs_percentage: (0 as any),
                tax_percentage: (0 as any),
                platform_fee_percentage: (0 as any),
                simulation_base: (0 as any),
                whatsappPhone: null,
                updated_at: new Date(),
                updated_by: 'system'
            } as any;
        }

        const response = {
            id: settings!.id,
            lawyerCommissionPercentage: Number(settings!.lawyer_commission_percentage),
            operationalCostsPercentage: Number(settings!.operational_costs_percentage),
            taxPercentage: Number(settings!.tax_percentage),
            platformFeePercentage: Number(settings!.platform_fee_percentage),
            simulationBase: Number(settings!.simulation_base || 0),
            whatsappPhone: (settings as any).whatsappPhone || null,
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

        return NextResponse.json({ success: true, message: 'Configuración actualizada' });
    } catch (error: any) {
        console.error('❌ [PATCH] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
