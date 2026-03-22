import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        
        // Verificar autenticación
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as string;
        const path = formData.get('path') as string;

        if (!file || !bucket || !path) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
        }

        // Usar Service Role para evadir el Loop de Recursión Infinita RLS en Postgres (42P17)
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const int8Array = new Uint8Array(await file.arrayBuffer());

        const { error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(path, int8Array, {
                contentType: file.type,
                upsert: true
            });

        if (error) {
            console.error('Storage Upload Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(path);

        return NextResponse.json({ publicUrl: publicUrlData.publicUrl });
    } catch (e: any) {
        console.error('Upload Route Error:', e);
        return NextResponse.json({ error: e.message || 'Error del servidor' }, { status: 500 });
    }
}
