/**
 * Rate limiting global (Fase 2).
 *
 * - Si hay Redis de Upstash configurado, usa un sliding window COMPARTIDO entre
 *   todas las instancias serverless → el límite es global real (no por lambda).
 * - Si no hay Redis (p. ej. dev), cae a un token bucket en memoria local.
 * - Fail-open: si Redis falla, no se bloquean solicitudes legítimas.
 *
 * Compatible con Edge Runtime (middleware): usa el cliente REST de Upstash.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const MAX_REQUESTS = 10;
const WINDOW = '60 s';
const WINDOW_MS = 60_000;

function resolveRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

let globalLimiter: Ratelimit | null = null;
const redis = resolveRedis();
if (redis) {
  globalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
    prefix: 'vb:ratelimit',
    analytics: false,
  });
}

// --- Fallback en memoria (por instancia, solo si no hay Redis) ---
const memoryMap = new Map<string, { tokens: number; lastRefill: number }>();
const REFILL_INTERVAL_MS = 1000;

function memoryLimit(key: string): boolean {
  const now = Date.now();
  let entry = memoryMap.get(key);
  if (!entry) {
    entry = { tokens: MAX_REQUESTS, lastRefill: now };
    memoryMap.set(key, entry);
  }
  const refill = Math.floor((now - entry.lastRefill) / REFILL_INTERVAL_MS);
  if (refill > 0) {
    entry.tokens = Math.min(MAX_REQUESTS, entry.tokens + refill);
    entry.lastRefill = now;
  }
  if (memoryMap.size > 1000) {
    const cutoff = now - WINDOW_MS;
    for (const [k, v] of memoryMap) {
      if (v.lastRefill < cutoff) memoryMap.delete(k);
    }
  }
  if (entry.tokens <= 0) return false;
  entry.tokens--;
  return true;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Verifica el límite para la clave dada (típicamente la IP del cliente).
 * Nunca lanza: ante error de Redis, fail-open con fallback en memoria.
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  if (globalLimiter) {
    try {
      const res = await globalLimiter.limit(key);
      return { success: res.success, limit: res.limit, remaining: res.remaining, reset: res.reset };
    } catch (err) {
      console.warn('[rateLimit] Redis falló, usando fallback en memoria:', err);
    }
  }
  const success = memoryLimit(key);
  return { success, limit: MAX_REQUESTS, remaining: success ? 1 : 0, reset: Date.now() + WINDOW_MS };
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
