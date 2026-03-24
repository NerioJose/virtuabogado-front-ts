import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // En Supabase, la forma más eficiente de chequear existencia sin listar todo es intentar un "get" 
        // pero listUsers con un filtro es mejor si se puede. 
        // Desafortunadamente, listUsers() no soporta filtros complejos en el SDK fácilmente sin paginar.
        // Pero podemos usar auth.admin.listUsers() y buscar.
        
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const exists = users.some(u => u.email?.toLowerCase() === email.toLowerCase());

        return NextResponse.json({ exists });

    } catch (error) {
        console.error('Error checking user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
