/**
 * Cliente HTTP para comunicación con la API
 */

import { ApiResponse, ErrorResponse } from '@/shared/types/common.types';

export interface HttpClient {
    get<T>(url: string, config?: RequestInit): Promise<T>;
    post<T>(url: string, data?: unknown, config?: RequestInit): Promise<T>;
    put<T>(url: string, data?: unknown, config?: RequestInit): Promise<T>;
    delete<T>(url: string, config?: RequestInit): Promise<T>;
}

export class ApiClient implements HttpClient {
    private baseURL: string;
    private defaultHeaders: HeadersInit;

    constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    /**
     * Interceptor para agregar headers de autenticación
     */
    private getHeaders(customHeaders?: HeadersInit): HeadersInit {
        // Aquí se pueden agregar tokens de autenticación
        const headers = { ...this.defaultHeaders, ...customHeaders };

        // Ejemplo: agregar token si existe
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.token) {
                        (headers as Record<string, string>)['Authorization'] =
                            `Bearer ${user.token}`;
                    }
                } catch (error) {
                    console.error('Error parsing user from localStorage:', error);
                }
            }
        }

        return headers;
    }

    /**
     * Manejo de errores centralizados
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            let errorMessage = 'Error en la solicitud';

            try {
                const errorData: ApiResponse<unknown> = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch {
                // Si no se puede parsear el error, usar mensaje genérico
            }

            const error: ErrorResponse = {
                message: errorMessage,
                code: response.status.toString(),
            };

            throw error;
        }

        // Si la respuesta está vacía (204 No Content)
        if (response.status === 204) {
            return {} as T;
        }

        const data: ApiResponse<T> = await response.json();
        return data.data || (data as unknown as T);
    }

    async get<T>(url: string, config?: RequestInit): Promise<T> {
        const response = await fetch(`${this.baseURL}${url}`, {
            method: 'GET',
            headers: this.getHeaders(config?.headers),
            ...config,
        });

        return this.handleResponse<T>(response);
    }

    async post<T>(url: string, data?: unknown, config?: RequestInit): Promise<T> {
        const response = await fetch(`${this.baseURL}${url}`, {
            method: 'POST',
            headers: this.getHeaders(config?.headers),
            body: data ? JSON.stringify(data) : undefined,
            ...config,
        });

        return this.handleResponse<T>(response);
    }

    async put<T>(url: string, data?: unknown, config?: RequestInit): Promise<T> {
        const response = await fetch(`${this.baseURL}${url}`, {
            method: 'PUT',
            headers: this.getHeaders(config?.headers),
            body: data ? JSON.stringify(data) : undefined,
            ...config,
        });

        return this.handleResponse<T>(response);
    }

    async delete<T>(url: string, config?: RequestInit): Promise<T> {
        const response = await fetch(`${this.baseURL}${url}`, {
            method: 'DELETE',
            headers: this.getHeaders(config?.headers),
            ...config,
        });

        return this.handleResponse<T>(response);
    }
}

// Exportar instancia singleton
export const apiClient = new ApiClient();
