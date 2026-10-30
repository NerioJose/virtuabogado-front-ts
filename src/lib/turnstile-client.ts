const configuredSiteKey = (
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
).trim();

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * En desarrollo usamos la site key de prueba oficial de Cloudflare
 * (`1x…AA`), que funciona en localhost y siempre genera token. En producción
 * se usa la key real configurada.
 */
export const TURNSTILE_SITE_KEY =
  isDevelopment && configuredSiteKey.startsWith('0x')
    ? '1x00000000000000000000AA'
    : configuredSiteKey;

/**
 * Solo bloqueamos el submit si estamos en producción y hay una site key.
 * En desarrollo el captcha no debe impedir probar el flujo.
 */
export const isTurnstileRequired =
  !isDevelopment && configuredSiteKey.length > 0;
