/**
 * Verificación server-side de Cloudflare Turnstile.
 * - Si las claves no están configuradas, degrada a permitido.
 * - "timeout-or-duplicate" (token reutilizado/ya verificado en un intento previo
 *   exitoso) se tolera como humano para no romper reintentos legítimos.
 */
export async function verifyTurnstile(token?: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    if (!secret || !siteKey) {
        return true;
    }

    if (!token) {
        return false;
    }

    try {
        const form = new URLSearchParams();
        form.set('secret', secret);
        form.set('response', token);

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form,
        });

        const data = await response.json();

        if (data?.success) {
            return true;
        }

        const codes: string[] = Array.isArray(data?.['error-codes']) ? data['error-codes'] : [];
        if (codes.length > 0) {
            console.error('❌ [Turnstile] Verificación rechazada. error-codes:', codes.join(', '));
        }

        // Token ya consumido por una verificación exitosa previa (doble submit).
        if (codes.includes('timeout-or-duplicate')) {
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ [Turnstile] Error de verificación:', error);
        return false;
    }
}