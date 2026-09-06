import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Crea un cliente de Supabase para route handlers que escribe las cookies
 * de sesión sobre la respuesta de redirección que vamos a devolver.
 * (Necesario para que la sesión quede persistida en el navegador.)
 */
function createCallbackClient(request: NextRequest, response: NextResponse) {
    return createServerClient(supabaseUrl(), supabaseAnonKey(), {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });
}

function redirectWith(origin: string, path: string, params: Record<string, string>): NextResponse {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url.toString());
}

/**
 * Maneja el callback de Supabase Auth (confirmación de email con token propio,
 * magic links, OAuth, etc.). Supabase redirige aquí después de clicar un enlace.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    // Confirmación de email (token propio enviado por nuestra plantilla de correo)
    const type = searchParams.get('type');
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    // Flujo de confirmación de cuenta: verifyOtp(confirmación) crea la sesión
    if (type === 'signup' && token && email) {
        const successUrl = new URL(next, origin);
        successUrl.searchParams.set('auth_success', '1');
        let response = NextResponse.redirect(successUrl.toString());

        const supabase = createCallbackClient(request, response);
        // `token` trae el token HASHED generado por admin.generateLink; verifyOtp
        // para signup lo espera en `token_hash`.
        const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
        });

        if (!error) {
            // La sesión quedó fijada en las cookies de `response`; el frontend
            // (CheckoutStateSync) detecta auth_success=1 y abre el checkout en el paso 2.
            return response;
        }

        // Token inválido/expirado → error claro
        return redirectWith(origin, '/', {
            auth_error: 'confirm_invalid',
            auth_success: '0',
        });
    }

    // Intercambio de código (magic link / OAuth / recovery)
    if (code) {
        const target = type === 'recovery' ? '/auth/reset-password' : next;
        const successUrl = new URL(target, origin);
        successUrl.searchParams.set('auth_success', '1');
        let response = NextResponse.redirect(successUrl.toString());

        const supabase = createCallbackClient(request, response);
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return response;
        }
    }

    // Si algo falla, redirigir con error
    return redirectWith(origin, '/', {
        auth_error: '1',
        auth_success: '0',
    });
}
