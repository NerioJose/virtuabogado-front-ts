/**
 * Tipos comunes compartidos en toda la aplicación
 */

export interface ApiResponse<T = any> {
    data: T;
    message?: string;
    success: boolean;
}

export interface PaginatedData<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ErrorResponse {
    message: string;
    code?: string;
    details?: Record<string, any>;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: ErrorResponse | null;
    status: LoadingState;
}
