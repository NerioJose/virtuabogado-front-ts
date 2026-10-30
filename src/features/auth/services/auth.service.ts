/**
 * Servicio de autenticación con Supabase
 */

import { createClient } from '@/utils/supabase/client';
import { apiFetch, readJson } from '@/lib/api';
import { disconnectSocket, refreshSocketAuth } from '@/lib/socket';
import { User, UserRole } from '@/shared/types/entities.types';
import {
    AuthApiResponse,
    LoginCredentials,
    RegisterData,
    SupabaseUserLike,
} from '../types/auth.types';

export class AuthService {
    /**
     * Iniciar sesión con Supabase
     */
    async login(credentials: LoginCredentials): Promise<User> {
        const response = await apiFetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                turnstileToken: credentials.turnstileToken || ''
            })
        });

        const payload = await readJson<AuthApiResponse>(response).catch(
            (): AuthApiResponse => ({}),
        );

        if (!response.ok) {
            throw new Error(payload.error || 'Error al iniciar sesión');
        }

        if (!payload.user) {
            throw new Error('No se pudo obtener el usuario');
        }

        // El backend devuelve los tokens de Supabase; fijamos la sesión en el
        // cliente para que las cookies SSR queden sincronizadas.
        const supabase = createClient();
        if (payload.session?.access_token && payload.session?.refresh_token) {
            await supabase.auth.setSession({
                access_token: payload.session.access_token,
                refresh_token: payload.session.refresh_token,
            });
        } else {
            await supabase.auth
                .signInWithPassword({
                    email: credentials.email,
                    password: credentials.password,
                })
                .catch(() => undefined);
        }
        await refreshSocketAuth();

        return this.mapSupabaseUserToEntity(payload.user);
    }

    /**
     * Registrar nuevo usuario vía el API server-side.
     * Para clientes devuelve requiresEmailConfirmation=true; el correo se envía desde el servidor.
     */
    async register(data: RegisterData): Promise<{ user: User; requiresEmailConfirmation: boolean }> {
        const response = await apiFetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: data.email,
                password: data.password,
                nombre: data.nombre,
                telefono: data.telefono || '',
                rol: data.rol,
                turnstileToken: data.turnstileToken || ''
            })
        });

        const payload = await readJson<AuthApiResponse>(response).catch(
            (): AuthApiResponse => ({}),
        );

        if (!response.ok) {
            throw new Error(payload.error || 'Error al registrar usuario');
        }

        if (!payload.user) {
            throw new Error('Error al crear usuario');
        }

        // Si no requiere confirmación (p. ej. ABOGADO), iniciamos sesión en el
        // cliente para dejar cookies válidas y conectar Socket.IO autenticado.
        if (!payload.requiresEmailConfirmation) {
            const supabase = createClient();
            await supabase.auth
                .signInWithPassword({
                    email: data.email,
                    password: data.password,
                })
                .catch(() => undefined);
            await refreshSocketAuth();
        }

        return {
            user: this.mapSupabaseUserToEntity(payload.user),
            requiresEmailConfirmation: !!payload.requiresEmailConfirmation
        };
    }

    /**
     * Cerrar sesión
     */
    async logout(): Promise<void> {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        disconnectSocket();
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
     * Verificar contraseña actual (Re-autenticación)
     */
    async verifyPassword(currentPassword: string): Promise<boolean> {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || !user.email) throw new Error("Usuario no autenticado");

        const { error } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (error) {
            console.error('Error al verificar contraseña:', error);
            return false;
        }

        return true;
    }

    /**
     * Actualizar contraseña del usuario actual
     */
    async updatePassword(newPassword: string): Promise<void> {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            console.error('Error al actualizar contraseña:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Helper para mapear usuario de Supabase a entidad User del dominio
     */
    public mapSupabaseUserToEntity(supabaseUser: SupabaseUserLike): User {
        const metadata = supabaseUser.user_metadata;
        const rawRole = metadata?.rol;
        const normalizedRole = typeof rawRole === 'string' ? rawRole.toUpperCase() : 'CLIENTE';
        const rol: UserRole =
            normalizedRole === 'ADMIN'
                ? UserRole.ADMIN
                : normalizedRole === 'ABOGADO'
                    ? UserRole.ABOGADO
                    : UserRole.CLIENTE;

        return {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            nombre: metadata?.nombre || '',
            rol,
            telefono: metadata?.telefono || undefined,
            especialidad: metadata?.especialidad || undefined,
            matricula: metadata?.numeroColegiado || metadata?.matricula || undefined,
            experiencia: metadata?.experienciaAnios || metadata?.experiencia || undefined,
            createdAt: supabaseUser.created_at ? new Date(supabaseUser.created_at) : new Date(),
            updatedAt: supabaseUser.updated_at
                ? new Date(supabaseUser.updated_at)
                : supabaseUser.created_at
                    ? new Date(supabaseUser.created_at)
                    : new Date(),
        };
    }
}

export const authService = new AuthService();
