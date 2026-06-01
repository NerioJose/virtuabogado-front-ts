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
    const { user, isAuthenticated, login: setLogin, logout: setLogout, checkAuth } = useAuthStore();
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
                        : ROUTES.MIS_SERVICIOS;

            // Hard redirect: window.location garantiza que el middleware se ejecute
            // y que las cookies de sesión estén disponibles para el servidor.
            // router.replace() no ejecuta el middleware en Next.js 15.
            window.location.href = redirectPath;
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
                user.rol === UserRole.ABOGADO ? ROUTES.ABOGADO : ROUTES.MIS_SERVICIOS;

            router.refresh();
            router.push(redirectPath);
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
            // El store ya maneja la llamada a authService.logout
            await setLogout();
            router.push(ROUTES.LOGIN);
            // Removed router.refresh() - not needed for logout redirect
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Error al cerrar sesión';
            setError(errorMessage);
            console.error('Error during logout:', err);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Cambiar la contraseña del usuario actual
     */
    const changePassword = async (currentPassword: string, newPassword: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Verificar la contraseña actual
            const isValid = await authService.verifyPassword(currentPassword);
            if (!isValid) {
                throw new Error('La contraseña actual es incorrecta');
            }

            // 2. Actualizar a la nueva contraseña
            await authService.updatePassword(newPassword);
            
            return true;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Error al cambiar la contraseña';
            setError(errorMessage);
            throw err;
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
        changePassword,
        checkAuth,
    };
}
