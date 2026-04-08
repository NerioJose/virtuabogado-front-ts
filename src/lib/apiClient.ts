export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

import { createClient } from '@/utils/supabase/client';

export const apiClient = {
    async get<T>(url: string, options?: RequestInit): Promise<T> {
        const supabase = createClient();
        let { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            console.log('🔄 apiClient: No hay sesión activa, intentando refrescar...');
            const { data: refreshData } = await supabase.auth.refreshSession();
            session = refreshData.session;
        }

        if (!session) {
            console.warn(`🕵️ apiClient: Persiste falta de sesión al llamar a ${url}`);
        } else {
            console.log(`🔑 apiClient: Sesión activa/recuperada para ${url}`);
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
                ...(options?.headers || {}),
            },
            credentials: 'include',
            cache: 'no-store',
        });
        return handleResponse<T>(response);
    },

    async post<T>(url: string, body: any): Promise<T> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) console.log(`🔑 apiClient POST: Enviando Bearer Token a ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify(body),
            credentials: 'include',
            cache: 'no-store',
        });
        return handleResponse<T>(response);
    },

    async put<T>(url: string, body: any): Promise<T> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) console.log(`🔑 apiClient PUT: Enviando Bearer Token a ${url}`);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify(body),
            credentials: 'include',
            cache: 'no-store',
        });
        return handleResponse<T>(response);
    },

    async patch<T>(url: string, body: any): Promise<T> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) console.log(`🔑 apiClient PATCH: Enviando Bearer Token a ${url}`);

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify(body),
            credentials: 'include',
            cache: 'no-store',
        });
        return handleResponse<T>(response);
    },

    async delete<T>(url: string): Promise<T> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) console.log(`🔑 apiClient DELETE: Enviando Bearer Token a ${url}`);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
            },
            credentials: 'include',
        });
        return handleResponse<T>(response);
    },
};

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorMessage = 'Error en la petición';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            if (errorData.details) {
                console.error('🔍 API Detail Error:', errorData.details); // Log detail for debugging
                errorMessage += ` - ${errorData.details}`;
            }
        } catch (e) {
            // Si no es JSON, usar el status text
            errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new ApiError(response.status, errorMessage);
    }

    // Algunas respuestas pueden no tener cuerpo (ej. 204 No Content)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
