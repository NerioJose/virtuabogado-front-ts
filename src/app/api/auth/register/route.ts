import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route para registro de usuarios usando Service Role Key
 * Esto BYPASEA los rate limits del cliente de Supabase Auth
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, nombre, telefono } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña son requeridos' },
                { status: 400 }
            );
        }

        // Usar Service Role Key - NO tiene rate limits
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!serviceRoleKey) {
            console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada');
            return NextResponse.json(
                { error: 'Configuración del servidor incompleta' },
                { status: 500 }
            );
        }

        // Cliente con Service Role bypasea rate limits
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('🔐 Intentando registro server-side para:', email);

        // 1. Intentar Login primero
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password
        });

        if (signInData.user && !signInError) {
            console.log('✅ Usuario ya existe, login exitoso:', signInData.user.id);
            return NextResponse.json({
                user: {
                    id: signInData.user.id,
                    email: signInData.user.email,
                    user_metadata: signInData.user.user_metadata
                },
                isNewUser: false
            });
        }

        // 2. Si login falla, crear usuario nuevo
        const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirmar email
            user_metadata: {
                nombre: nombre || 'Usuario',
                telefono: telefono || '',
                rol: 'CLIENTE'
            }
        });

        if (signUpError) {
            console.error('❌ Error en registro server-side:', signUpError);

            if (signUpError.message.includes('already registered')) {
                return NextResponse.json(
                    { error: 'Usuario ya existe pero la contraseña es incorrecta' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: signUpError.message || 'Error al crear la cuenta' },
                { status: 400 }
            );
        }

        if (!signUpData.user) {
            return NextResponse.json(
                { error: 'Error al crear usuario' },
                { status: 500 }
            );
        }

        console.log('✨ Usuario registrado exitosamente (server-side):', signUpData.user.id);

        return NextResponse.json({
            user: {
                id: signUpData.user.id,
                email: signUpData.user.email,
                user_metadata: signUpData.user.user_metadata
            },
            isNewUser: true
        });

    } catch (error) {
        console.error('❌ Error en /api/auth/register:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
