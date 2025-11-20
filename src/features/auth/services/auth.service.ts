/**
 * Servicio de autenticación
 */

import { apiClient } from '@/infrastructure/api/client';
import { localStorageAdapter } from '@/infrastructure/storage/localStorage.adapter';
import { User, UserRole } from '@/shared/types/entities.types';
import {
    LoginCredentials,
    RegisterData,
    AuthResponse,
} from '../types/auth.types';

export class AuthService {
    private readonly STORAGE_KEY = 'auth-storage';

    /**
     * Iniciar sesión
     * TODO: Reemplazar con llamada real a la API cuando esté disponible
     */
    async login(credentials: LoginCredentials): Promise<User> {
        try {
            // MOCK: Simular respuesta de la API
            // En producción, descomente la siguiente línea:
            // const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

            // Simulación para desarrollo
            await new Promise((resolve) => setTimeout(resolve, 800));

            const mockUser: User = {
                id: credentials.rol === UserRole.ADMIN ? 1 : 2,
                email: credentials.email || 'usuario@ejemplo.com',
                nombre:
                    credentials.rol === UserRole.ADMIN
                        ? 'Administrador'
                        : 'Abogado Demo',
                rol: credentials.rol || UserRole.ABOGADO,
                picture: '/user.png',
            };

            return mockUser;
        } catch (error) {
            console.error('Error en login:', error);
            throw new Error('Error al iniciar sesión. Por favor intenta de nuevo.');
        }
    }

    /**
     * Registrar nuevo usuario
     * TODO: Reemplazar con llamada real a la API cuando esté disponible
     */
    async register(data: RegisterData): Promise<User> {
        try {
            // MOCK: Simular respuesta de la API
            // En producción:
            // const response = await apiClient.post<AuthResponse>('/auth/register', data);

            // Simulación para desarrollo
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const mockUser: User = {
                id: Math.floor(Math.random() * 10000),
                email: data.email,
                nombre: data.nombre,
                rol: data.rol,
                telefono: data.telefono,
            };

            return mockUser;
        } catch (error) {
            console.error('Error en registro:', error);
            throw new Error('Error al registrar usuario. Por favor intenta de nuevo.');
        }
    }

    /**
     * Cerrar sesión
     */
    async logout(): Promise<void> {
        try {
            // TODO: Llamar a la API para invalidar el token
            // await apiClient.post('/auth/logout');

            // Limpiar storage
            localStorageAdapter.remove(this.STORAGE_KEY);
        } catch (error) {
            console.error('Error en logout:', error);
            throw new Error('Error al cerrar sesión.');
        }
    }

    /**
     * Verificar si el usuario está autenticado
     */
    isAuthenticated(): boolean {
        const authData = localStorageAdapter.get<{ state: { user: User } }>(
            this.STORAGE_KEY
        );
        return !!authData?.state?.user;
    }

    /**
     * Obtener usuario actual del storage
     */
    getCurrentUser(): User | null {
        const authData = localStorageAdapter.get<{ state: { user: User } }>(
            this.STORAGE_KEY
        );
        return authData?.state?.user || null;
    }

    /**
     * Verificar si el usuario tiene un rol específico
     */
    hasRole(role: UserRole): boolean {
        const user = this.getCurrentUser();
        return user?.rol === role;
    }

    /**
     * Verificar si el usuario tiene alguno de los roles especificados
     */
    hasAnyRole(roles: UserRole[]): boolean {
        const user = this.getCurrentUser();
        return roles.some((role) => user?.rol === role);
    }
}

// Exportar instancia singleton
export const authService = new AuthService();
