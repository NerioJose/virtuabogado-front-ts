import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateEmail } from '@/lib/emailValidation';
import { verifyTurnstile } from '@/lib/turnstile';

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { email, password, turnstileToken } = body || {};

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email y contraseña son requeridos' },
                { status: 400 }
            );
        }

        const normalizedEmail = String(email).toLowerCase().trim();

        const emailCheck = validateEmail(normalizedEmail);
        if (!emailCheck.ok) {
            return NextResponse.json(
                { error: emailCheck.error || 'Email inválido' },
                { status: 400 }
            );
        }

        // Verificación anti-bot de Cloudflare Turnstile
        const isHuman = await verifyTurnstile(turnstileToken);
        if (!isHuman) {
            return NextResponse.json(
                { error: 'No pudimos verificar que no eres un robot. Inténtalo de nuevo.' },
                { status: 400 }
            );
        }

        // Recolectamos las cookies de sesión para fijarlas en la respuesta final.
        const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];

        const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(list) {
                    list.forEach(({ name, value, options }) =>
                        cookiesToSet.push({ name, value, options: options as Record<string, unknown> })
                    );
                },
            },
        });

        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: String(password),
        });

        if (error) {
            // Email aún no confirmado → mensaje accionable
            if (error.code === 'email_not_confirmed' || String(error.message).toLowerCase().includes('not confirmed')) {
                return NextResponse.json(
                    { error: 'Tu correo aún no ha sido confirmado. Revisa tu bandeja y pulsa el enlace de confirmación. Si no lo encuentras, regístrate de nuevo para reenviarlo.' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: error.message || 'Credenciales incorrectas' },
                { status: 400 }
            );
        }

        if (!data.user) {
            return NextResponse.json(
                { error: 'No se pudo obtener el usuario' },
                { status: 400 }
            );
        }

        const response = NextResponse.json(
            {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    user_metadata: data.user.user_metadata,
                    created_at: data.user.created_at,
                },
            },
            { status: 200 }
        );

        // Fijar las cookies de sesión en la respuesta que devolvemos.
        cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as never)
        );

        return response;
    } catch (error) {
        console.error('❌ Error en /api/auth/login:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
