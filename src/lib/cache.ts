/**
 * Caché en memoria con TTL para datos compartidos entre usuarios.
 * Reduce queries a la DB de N por usuario a 1 cada N segundos.
 * No requiere Redis ni infraestructura externa.
 */
const store = new Map<string, { data: unknown; expiry: number }>();

export function getCached<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
        store.delete(key);
        return null;
    }
    return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
    store.set(key, { data, expiry: Date.now() + ttlMs });
    // Auto-limpieza: si crece demasiado, elimina entradas vencidas
    if (store.size > 100) {
        const now = Date.now();
        for (const [k, v] of store) {
            if (now > v.expiry) store.delete(k);
        }
    }
}

export function clearCache(pattern?: string): void {
    if (!pattern) { store.clear(); return; }
    for (const key of store.keys()) {
        if (key.startsWith(pattern)) store.delete(key);
    }
}
