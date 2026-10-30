/**
 * Tipos específicos del feature de autenticación
 */

import { User, UserRole } from '@/shared/types/entities.types';

export interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean;
    rol?: UserRole; // Para desarrollo
    turnstileToken?: string;
}

export interface RegisterData {
    nombre: string;
    email: string;
    password: string;
    telefono?: string;
    rol: UserRole;
    remember?: boolean;
    turnstileToken?: string;
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

export interface SupabaseUserMetadata {
    nombre?: string;
    telefono?: string;
    especialidad?: string;
    numeroColegiado?: string;
    matricula?: string;
    experienciaAnios?: number;
    experiencia?: number;
    rol?: string;
    [key: string]: unknown;
}

export interface SupabaseUserLike {
    id: string;
    email?: string | null;
    user_metadata?: SupabaseUserMetadata | null;
    created_at?: string;
    updated_at?: string;
}

export interface AuthApiResponse {
    user?: SupabaseUserLike;
    session?: {
        access_token: string;
        refresh_token: string;
    };
    isNewUser?: boolean;
    requiresEmailConfirmation?: boolean;
    emailSent?: boolean;
    error?: string;
}
