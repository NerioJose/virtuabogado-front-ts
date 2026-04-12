import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';

// Crear cliente con service role para operaciones administrativas (bypass RLS)
function createServiceClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

/**
 * POST /api/settings/financial/seed
 * Crea la configuracion financiera por defecto si no existe
 * Solo disponible en desarrollo
 */
export async function POST(request: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
    }

    try {
        const supabase = createServiceClient();

        // Check if it exists
        const { data: existing } = await supabase
            .from('FinancialSettings')
            .select('id')
            .eq('id', FINANCIAL_SETTINGS_ID)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ message: 'Financial settings already exist', id: existing.id });
        }

        // Create default settings (Blindaje: Iniciar en 0 para evitar errores matemáticos iniciales)
        const { data, error } = await supabase
            .from('FinancialSettings')
            .insert({
                id: FINANCIAL_SETTINGS_ID,
                lawyer_commission_percentage: 0,
                operational_costs_percentage: 0,
                tax_percentage: 0,
                platform_fee_percentage: 0,
            })
            .select()
            .single();

        if (error) {
            console.error('Error seeding financial settings:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        
        return NextResponse.json({ message: 'Financial settings created with 0% defaults', data }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error seeding financial settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
