import { createClient } from '@/utils/supabase/client';

/**
 * Base URL del backend NestJS. Si no está configurada, las rutas permanecen
 * relativas y siguen siendo atendidas por las API routes de Next (transición).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

/**
 * Rutas ya migradas al backend NestJS. Las que no están aquí siguen usando
 * Next hasta que su fase (F2/F3/F4) esté implementada. Así la migración es
 * incremental y ningún feature se rompe.
 */
const BACKEND_PREFIXES = [
  '/api/auth',
  '/api/users',
  '/api/clients',
  '/api/lawyers',
  '/api/services',
  '/api/settings/financial',
  '/api/settings/auth',
  '/api/display-settings',
  '/api/exchange-rate',
];

export function isBackendRoute(path: string): boolean {
  return BACKEND_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function apiUrl(path: string): string {
  if (!API_BASE || !isBackendRoute(path)) {
    return path;
  }
  return `${API_BASE}${path}`;
}

/**
 * fetch contra el backend con Bearer token de Supabase.
 * Para rutas no migradas, cae de forma transparente a la ruta relativa.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);

  const hasBody = init.body !== undefined && init.body !== null;
  const isFormData =
    typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Authorization')) {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      }
    } catch {
      // Sin sesión: se envía la petición sin Authorization.
    }
  }

  return fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
}

/** Lee y tipa el JSON de una respuesta sin tipado débil. */
export async function readJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json();
  return data as T;
}
