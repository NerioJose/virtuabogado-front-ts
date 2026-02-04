import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const FIXED_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

/**
 * GET /api/settings/financial
 * Obtener la configuración financiera actual
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verificar autenticación
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Verificar que es admin
        const { data: userData, error: userError } = await supabase
            .from('User')
            .select('rol')
            .eq('id', user.id)
            .single();

        if (userError || userData?.rol !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Obtener configuración
        const { data: settings, error } = await supabase
            .from('FinancialSettings')
            .select('*')
            .eq('id', FIXED_SETTINGS_ID)
            .single();

        if (error) {
            console.error('Error fetching financial settings:', error);
            return NextResponse.json(
                { error: 'Error al obtener configuración' },
                { status: 500 }
            );
        }

        // Mapear nombres de columnas snake_case a camelCase
        const response = {
            id: settings.id,
            lawyerCommissionPercentage: parseFloat(settings.lawyer_commission_percentage),
            operationalCostsPercentage: parseFloat(settings.operational_costs_percentage),
            taxPercentage: parseFloat(settings.tax_percentage),
            platformFeePercentage: parseFloat(settings.platform_fee_percentage),
            createdAt: settings.created_at,
            updatedAt: settings.updated_at,
            updatedBy: settings.updated_by,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Unexpected error in GET /api/settings/financial:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

/**
 * PATCH /api/settings/financial
 * Actualizar la configuración financiera
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verificar autenticación
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Verificar que es admin
        const { data: userData, error: userError } = await supabase
            .from('User')
            .select('rol')
            .eq('id', user.id)
            .single();

        if (userError || userData?.rol !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Obtener body
        const body = await request.json();

        // Validaciones
        const updates: any = { updated_by: user.id };

        if (body.lawyerCommissionPercentage !== undefined) {
            const value = parseFloat(body.lawyerCommissionPercentage);
            if (isNaN(value) || value < 0 || value > 100) {
                return NextResponse.json(
                    { error: 'Comisión de abogados debe estar entre 0 y 100' },
                    { status: 400 }
                );
            }
            updates.lawyer_commission_percentage = value;
        }

        if (body.operationalCostsPercentage !== undefined) {
            const value = parseFloat(body.operationalCostsPercentage);
            if (isNaN(value) || value < 0 || value > 100) {
                return NextResponse.json(
                    { error: 'Gastos operativos deben estar entre 0 y 100' },
                    { status: 400 }
                );
            }
            updates.operational_costs_percentage = value;
        }

        if (body.taxPercentage !== undefined) {
            const value = parseFloat(body.taxPercentage);
            if (isNaN(value) || value < 0 || value > 100) {
                return NextResponse.json(
                    { error: 'Impuestos deben estar entre 0 y 100' },
                    { status: 400 }
                );
            }
            updates.tax_percentage = value;
        }

        if (body.platformFeePercentage !== undefined) {
            const value = parseFloat(body.platformFeePercentage);
            if (isNaN(value) || value < 0 || value > 100) {
                return NextResponse.json(
                    { error: 'Fee de plataforma debe estar entre 0 y 100' },
                    { status: 400 }
                );
            }
            updates.platform_fee_percentage = value;
        }

        // Actualizar
        const { data: updatedSettings, error: updateError } = await supabase
            .from('FinancialSettings')
            .update(updates)
            .eq('id', FIXED_SETTINGS_ID)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating financial settings:', updateError);
            return NextResponse.json(
                { error: 'Error al actualizar configuración' },
                { status: 500 }
            );
        }

        // Mapear respuesta
        const response = {
            id: updatedSettings.id,
            lawyerCommissionPercentage: parseFloat(
                updatedSettings.lawyer_commission_percentage
            ),
            operationalCostsPercentage: parseFloat(
                updatedSettings.operational_costs_percentage
            ),
            taxPercentage: parseFloat(updatedSettings.tax_percentage),
            platformFeePercentage: parseFloat(updatedSettings.platform_fee_percentage),
            createdAt: updatedSettings.created_at,
            updatedAt: updatedSettings.updated_at,
            updatedBy: updatedSettings.updated_by,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Unexpected error in PATCH /api/settings/financial:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
