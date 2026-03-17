import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const FIXED_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

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
            .eq('id', FIXED_SETTINGS_ID)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ message: 'Financial settings already exist', id: existing.id });
        }

        // Create default settings
        const { data, error } = await supabase
            .from('FinancialSettings')
            .insert({
                id: FIXED_SETTINGS_ID,
                lawyer_commission_percentage: 70,
                operational_costs_percentage: 10,
                tax_percentage: 15,
                platform_fee_percentage: 5,
            })
            .select()
            .single();

        if (error) {
            console.error('Error seeding financial settings:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('✅ Financial settings seeded successfully');
        return NextResponse.json({ message: 'Financial settings created', data }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error seeding financial settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
