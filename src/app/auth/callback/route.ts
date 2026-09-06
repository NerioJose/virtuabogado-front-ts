import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Maneja el callback de Supabase Auth (Magic Links, OAuth, etc.)
 * Supabase redirige aquí después de clicar un magic link.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    // Confirmación de email (token propio enviado por nuestra plantilla de correo)
    const type = searchParams.get('type');
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (type === 'signup' && token && email) {
        const supabase = await createClient();
        const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'signup'
        });

        if (!error) {
            // La sesión ya quedó establecida vía cookies; el frontend restaura el checkout
            const redirectUrl = new URL(next, origin);
            redirectUrl.searchParams.set('auth_success', '1');
            return NextResponse.redirect(redirectUrl.toString());
        }

        // Token inválido/expirado → error claro
        const errorUrl = new URL('/', origin);
        errorUrl.searchParams.set('auth_error', 'confirm_invalid');
        errorUrl.searchParams.set('auth_success', '0');
        return NextResponse.redirect(errorUrl.toString());
    }

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const type = searchParams.get('type') ?? '';
            
            // Si es un flujo de recuperación, forzar redirección a la página de cambio de clave
            if (type === 'recovery') {
                return NextResponse.redirect(`${origin}/auth/reset-password`);
            }

            // Redirigir con parámetro para que el frontend sepa que el login fue exitoso
            // y pueda reabrir el checkout si estaba pendiente
            const redirectUrl = new URL(next, origin);
            redirectUrl.searchParams.set('auth_success', '1');
            return NextResponse.redirect(redirectUrl.toString());
        }
    }

    // Si algo falla, redirigir con error
    const errorUrl = new URL('/', origin);
    errorUrl.searchParams.set('auth_error', '1');
    return NextResponse.redirect(errorUrl.toString());
}
