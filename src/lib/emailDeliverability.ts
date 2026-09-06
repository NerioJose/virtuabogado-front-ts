import { resolveMx } from 'node:dns/promises';
import { validateEmail } from './emailValidation';

const CACHE_TTL_MS = 5 * 60 * 1000;

const mxCache = new Map<string, { valid: boolean; expiresAt: number }>();

function getCached(domain: string): boolean | null {
    const entry = mxCache.get(domain);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        mxCache.delete(domain);
        return null;
    }
    return entry.valid;
}

function setCached(domain: string, valid: boolean) {
    mxCache.set(domain, { valid, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Comprueba si el dominio del correo puede recibir emails (registro MX vía DNS).
 * Rechaza dominios inventados/no existentes. Solo rechaza cuando DNS responde
 * con seguridad (ENODATA/ENOTFOUND); ante fallos transitorios permite la petición.
 */
export async function hasMxRecord(domain: string): Promise<boolean> {
    const normalized = domain.trim().toLowerCase().replace(/\.$/, '');

    if (!normalized || normalized.length > 253) return false;

    const cached = getCached(normalized);
    if (cached !== null) return cached;

    try {
        const mx = await resolveMx(normalized);
        const valid = Array.isArray(mx) && mx.length > 0;
        setCached(normalized, valid);
        return valid;
    } catch (err: any) {
        // ENOTFOUND = el dominio no existe; ENODATA/NODATA = sin registros MX.
        // Cualquier otro error (transitorio, red, etc.) se deja pasar para no bloquear legítimos.
        if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA' || err?.code === 'NODATA') {
            setCached(normalized, false);
            return false;
        }
        setCached(normalized, true);
        return true;
    }
}

/**
 * Validación completa de deliverabilidad: formato + dominios desechables + MX.
 */
export async function validateEmailDeliverability(email: string): Promise<{ ok: boolean; error?: string }> {
    const value = String(email || '').trim().toLowerCase();

    const formatCheck = validateEmail(value);
    if (!formatCheck.ok) {
        return { ok: false, error: formatCheck.error };
    }

    const domain = value.split('@')[1];
    const hasMx = await hasMxRecord(domain);
    if (!hasMx) {
        return { ok: false, error: 'El dominio del correo no existe o no puede recibir correos.' };
    }

    return { ok: true };
}