'use client';

/**
 * Hook para proteger rutas y verificar autenticación
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '@/shared/types/entities.types';
import { ROUTES } from '@/shared/constants/routes';

interface UseAuthGuardOptions {
    requiredRole?: UserRole | UserRole[];
    redirectTo?: string;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const { requiredRole, redirectTo = ROUTES.LOGIN } = options;

    useEffect(() => {
        // Si no está autenticado, redirigir a login
        if (!isAuthenticated) {
            router.push(redirectTo);
            return;
        }

        // Si requiere un rol específico, verificar
        if (requiredRole && user) {
            const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
            const hasRequiredRole = roles.includes(user.rol);

            if (!hasRequiredRole) {
                // Redirigir a la página correspondiente al rol del usuario
                const userRedirect =
                    user.rol === UserRole.ADMIN
                        ? ROUTES.ADMIN
                        : user.rol === UserRole.ABOGADO
                            ? ROUTES.ABOGADO
                            : ROUTES.HOME;

                router.push(userRedirect);
            }
        }
    }, [isAuthenticated, user, requiredRole, router, redirectTo]);

    return {
        user,
        isAuthenticated,
        isLoading: !isAuthenticated && typeof window !== 'undefined',
    };
}
