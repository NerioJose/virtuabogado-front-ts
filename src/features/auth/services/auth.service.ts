/**
 * Servicio de autenticación con Supabase
 */

import { createClient } from '@/utils/supabase/client';
import { User, UserRole } from '@/shared/types/entities.types';
import { LoginCredentials, RegisterData } from '../types/auth.types';

export class AuthService {
    /**
     * Iniciar sesión con Supabase
     */
    async login(credentials: LoginCredentials): Promise<User> {
        const supabase = createClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
        });

        if (error) {
            console.error('Error en Supabase login:', error);
            throw new Error(error.message);
        }

        if (!data.user) {
            throw new Error("No se pudo obtener el usuario");
        }

        // Mapear usuario de Supabase a nuestra entidad User
        return this.mapSupabaseUserToEntity(data.user);
    }

    /**
     * Registrar nuevo usuario en Supabase
     */
    async register(data: RegisterData): Promise<User> {
        const supabase = createClient();

        const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    nombre: data.nombre,
                    telefono: data.telefono,
                    rol: 'CLIENTE', // Rol por defecto
                }
            }
        });

        if (error) {
            console.error('Error en Supabase register:', error);
            throw new Error(error.message);
        }

        if (!authData.user) {
            throw new Error("Error al crear usuario");
        }

        return this.mapSupabaseUserToEntity(authData.user);
    }

    /**
     * Cerrar sesión
     */
    async logout(): Promise<void> {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error en logout:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Obtener usuario actual (Sincrónico - solo verifica sesión activa en cliente)
     * Nota: Para validación segura usar getUser() asíncrono
     */
    async getCurrentUser(): Promise<User | null> {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        return this.mapSupabaseUserToEntity(user);
    }

    /**
     * Helper para mapear usuario de Supabase a entidad User del dominio
     */
    private mapSupabaseUserToEntity(supabaseUser: any): User {
        return {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            nombre: supabaseUser.user_metadata?.nombre || '',
            rol: (supabaseUser.user_metadata?.rol as UserRole) || 'CLIENTE',
            telefono: supabaseUser.user_metadata?.telefono || undefined,
            especialidad: supabaseUser.user_metadata?.especialidad || undefined,
            matricula: supabaseUser.user_metadata?.numeroColegiado || supabaseUser.user_metadata?.matricula || undefined,
            experiencia: supabaseUser.user_metadata?.experienciaAnios || supabaseUser.user_metadata?.experiencia || undefined,
            createdAt: new Date(supabaseUser.created_at),
            updatedAt: new Date(supabaseUser.updated_at || supabaseUser.created_at),
        };
    }
}

export const authService = new AuthService();
