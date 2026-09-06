/**
 * Verificación server-side de Cloudflare Turnstile.
 * Si las claves no están configuradas, degrada a permitido para no romper el flujo.
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
        return !!data?.success;
    } catch (error) {
        console.error('❌ [Turnstile] Error de verificación:', error);
        return false;
    }
}