/**
 * Tipos específicos del feature de autenticación
 */

import { User, UserRole } from '@/shared/types/entities.types';

export interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean;
    rol?: UserRole; // Para desarrollo
}

export interface RegisterData {
    nombre: string;
    email: string;
    password: string;
    telefono?: string;
    rol: UserRole;
    remember?: boolean;
    // Campos específicos para abogado
    especialidad?: string;
    numeroColegiado?: string;
    experienciaAnios?: number;
    // Campos específicos para cliente
    empresa?: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface AuthResponse {
    user: User;
    token?: string;
}
