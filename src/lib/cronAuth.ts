import crypto from 'crypto';

/**
 * Autoriza invocaciones de cron / endpoints internos.
 *
 * - Si `CRON_SECRET` está configurado, exige `Authorization: Bearer <secret>`
 *   (Vercel añade automáticamente ese header a los crons cuando la env existe).
 * - Si NO está configurado, solo se permite en desarrollo; en producción se
 *   rechaza (fail-closed) para no dejar endpoints internos abiertos.
 *
 * Comparación en tiempo constante para evitar timing attacks.
 */
export function isCronAuthorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    const auth = request.headers.get('authorization') || '';

    if (secret) {
        const expected = `Bearer ${secret}`;
        const a = Buffer.from(auth);
        const b = Buffer.from(expected);
        if (a.length !== b.length) return false;
        try {
            return crypto.timingSafeEqual(a, b);
        } catch {
            return false;
        }
    }

    return process.env.NODE_ENV !== 'production';
}
