'use client';

/**
 * Hook personalizado para autenticación
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import { LoginCredentials, RegisterData } from '../types/auth.types';
import { ROUTES } from '@/shared/constants/routes';
import { UserRole } from '@/shared/types/entities.types';

export function useAuth() {
    const router = useRouter();
    const { user, isAuthenticated, login: setLogin, logout: setLogout } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Iniciar sesión
     */
    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        setError(null);

        try {
            const user = await authService.login(credentials);
            setLogin(user);

            // Redirigir según el rol
            const redirectPath =
                user.rol === UserRole.ADMIN
                    ? ROUTES.ADMIN
                    : user.rol === UserRole.ABOGADO
                        ? ROUTES.ABOGADO
                        : ROUTES.HOME;

            router.push(redirectPath);
            router.refresh();

            return user;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Error al iniciar sesión';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Registrar nuevo usuario
     */
    const register = async (data: RegisterData) => {
        setIsLoading(true);
        setError(null);

        try {
            const user = await authService.register(data);
            setLogin(user);

            // Redirigir según el rol
            const redirectPath =
                user.rol === UserRole.ABOGADO ? ROUTES.ABOGADO : ROUTES.HOME;

            router.push(redirectPath);
            router.refresh();

            return user;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Error al registrar usuario';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Cerrar sesión
     */
    const logout = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await authService.logout();
            setLogout();
            router.push(ROUTES.LOGIN);
            router.refresh();
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Error al cerrar sesión';
            setError(errorMessage);
            console.error('Error during logout:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
    };
}
