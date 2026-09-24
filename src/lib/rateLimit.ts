/**
 * Rate limiting global (Fase 2) — Edge-safe, SIN SDK.
 *
 * IMPORTANTE: este módulo se importa desde `middleware.ts` (Edge Runtime).
 * Por eso NO debe importar `@upstash/ratelimit` ni `@upstash/redis`: su
 * inicialización en Edge colgaba el middleware (504 MIDDLEWARE_INVOCATION_TIMEOUT).
 * En su lugar usamos `fetch` directo a la API REST de Upstash (igual que
 * `src/lib/cache.ts`), con timeout duro y fail-open.
 *
 * Estrategia: ventana fija (INCR + EXPIRE) compartida entre instancias.
 * Si no hay Redis configurado o falla, se usa un contador en memoria local.
 */

const PREFIX = 'vb:ratelimit:';
const MAX_REQUESTS = 10;
const WINDOW_SECONDS = 60;
const WINDOW_MS = WINDOW_SECONDS * 1000;
const REDIS_TIMEOUT_MS = 800;

interface RedisConfig {
  url: string;
  token: string;
}

function resolveConfig(): RedisConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

async function redisCommand(
  config: RedisConfig,
  path: string
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
  try {
    const res = await fetch(`${config.url}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Timeout / red / DNS: señalamos fallo para hacer fail-open.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface WindowResult {
  success: boolean;
  remaining: number;
}

async function redisFixedWindow(key: string): Promise<WindowResult | null> {
  const config = resolveConfig();
  if (!config) return null;

  const redisKey = PREFIX + key;
  const incr = (await redisCommand(config, `/incr/${encodeURIComponent(redisKey)}`)) as {
    result?: unknown;
  } | null;
  const count = Number(incr?.result);
  if (!Number.isFinite(count)) return null; // fail-open

  if (count === 1) {
    // Primer request de la ventana: fijar TTL (best-effort).
    await redisCommand(config, `/expire/${encodeURIComponent(redisKey)}?seconds=${WINDOW_SECONDS}`);
  }

  return { success: count <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - count) };
}

// --- Fallback en memoria (por instancia, solo si no hay Redis o falla) ---
const memoryMap = new Map<string, { count: number; resetAt: number }>();

function memoryFixedWindow(key: string): WindowResult {
  const now = Date.now();
  let entry = memoryMap.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    memoryMap.set(key, entry);
  }
  entry.count++;

  if (memoryMap.size > 1000) {
    for (const [k, v] of memoryMap) {
      if (now >= v.resetAt) memoryMap.delete(k);
    }
  }

  return { success: entry.count <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - entry.count) };
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Verifica el límite para la clave dada (típicamente la IP del cliente).
 * Nunca lanza ni cuelga: ante error/timeout de Redis, fail-open con fallback.
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const result = (await redisFixedWindow(key)) ?? memoryFixedWindow(key);
  return {
    success: result.success,
    limit: MAX_REQUESTS,
    remaining: result.remaining,
    reset: Date.now() + WINDOW_MS,
  };
}

/**
 * Extrae la IP real del cliente priorizando cabeceras de proxy/CDN.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-vercel-forwarded-for') ||
    'anonymous'
  );
}
