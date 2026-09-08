/**
 * Caché distribuida con drivers intercambiables (F4).
 *
 * - `memory` (por defecto): Map con TTL en la instancia serverless local.
 *   No requiere infraestructura externa.
 * - `upstash`: habilita Redis gestionado si existen las variables
 *   KV_REST_API_URL y KV_REST_API_TOKEN (compartido entre instancias
 *   serverless y persistente entre re-deploys).
 *
 * Las funciones son async para que el driver sea transparente.
 */

export interface CacheDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttlMs: number): Promise<void>;
  clear(pattern?: string): Promise<void>;
}

const PREFIX = 'vb:';

let driverPromise: Promise<CacheDriver> | null = null;

function getDriver(): Promise<CacheDriver> {
  if (!driverPromise) {
    driverPromise = resolveDriver();
  }
  return driverPromise;
}

async function resolveDriver(): Promise<CacheDriver> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (url && token) {
    try {
      const driver = await createUpstashDriver(url, token);
      console.log('[cache] driver UPSTASH activo');
      return driver;
    } catch (err) {
      console.warn('[cache] fallback a MEMORY por error de Upstash:', err);
    }
  }
  console.log('[cache] driver MEMORY activo');
  return createMemoryDriver();
}

const UPSTASH_TIMEOUT_MS = 4000;

interface UpstashResponse {
  result: unknown;
}

async function upstashFetch(url: string, token: string, path: string, init?: RequestInit): Promise<UpstashResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTASH_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstash HTTP ${response.status}`);
    return (await response.json()) as UpstashResponse;
  } finally {
    clearTimeout(timer);
  }
}

function createUpstashDriver(url: string, token: string): CacheDriver {
  const baseUrl = url.replace(/\/$/, '');
  return {
    async get<T>(key: string): Promise<T | null> {
      const data = await upstashFetch(baseUrl, token, `/get/${encodeURIComponent(PREFIX + key)}`);
      if (data?.result === null || data?.result === undefined) return null;
      try {
        return JSON.parse(data.result as string) as T;
      } catch {
        return data.result as T;
      }
    },
    async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
      const ex = Math.max(1, Math.floor(ttlMs / 1000));
      await upstashFetch(baseUrl, token, `/set/${encodeURIComponent(PREFIX + key)}?EX=${ex}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    async clear(pattern?: string): Promise<void> {
      const needle = PREFIX + (pattern ?? '*');
      const data = await upstashFetch(baseUrl, token, `/keys/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([needle]),
      });
      const keys: string[] = Array.isArray(data?.result) ? data.result : [];
      await Promise.all(
        keys.map((redisKey) =>
          upstashFetch(baseUrl, token, `/del/${encodeURIComponent(redisKey)}`, { method: 'POST' })
        )
      );
    },
  };
}

function createMemoryDriver(): CacheDriver {
  const store = new Map<string, { data: unknown; expiry: number }>();
  return {
    async get<T>(key: string): Promise<T | null> {
      const fullKey = PREFIX + key;
      const entry = store.get(fullKey);
      if (!entry) return null;
      if (Date.now() > entry.expiry) {
        store.delete(fullKey);
        return null;
      }
      return entry.data as T;
    },
    async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
      const fullKey = PREFIX + key;
      store.set(fullKey, { data, expiry: Date.now() + ttlMs });
      // Auto-limpieza: si crece demasiado, elimina entradas vencidas
      if (store.size > 100) {
        const now = Date.now();
        for (const [k, v] of store) {
          if (now > v.expiry) store.delete(k);
        }
      }
    },
    async clear(pattern?: string): Promise<void> {
      if (!pattern) {
        store.clear();
        return;
      }
      const needle = PREFIX + pattern;
      for (const key of store.keys()) {
        if (key.startsWith(needle)) store.delete(key);
      }
    },
  };
}

export async function getCached<T>(key: string): Promise<T | null> {
  return (await getDriver()).get<T>(key);
}

export async function setCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
  await (await getDriver()).set<T>(key, data, ttlMs);
}

export async function clearCache(pattern?: string): Promise<void> {
  await (await getDriver()).clear(pattern);
}