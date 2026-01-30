export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

export const apiClient = {
    async get<T>(url: string): Promise<T> {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return handleResponse<T>(response);
    },

    async post<T>(url: string, body: any): Promise<T> {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        return handleResponse<T>(response);
    },

    async put<T>(url: string, body: any): Promise<T> {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        return handleResponse<T>(response);
    },

    async patch<T>(url: string, body: any): Promise<T> {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        return handleResponse<T>(response);
    },

    async delete<T>(url: string): Promise<T> {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
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
