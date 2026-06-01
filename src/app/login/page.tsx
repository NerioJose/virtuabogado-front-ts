'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { ROUTES } from '@/shared/constants/routes';
import { UserRole } from '@/shared/types/entities.types';

export default function LoginPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();

    // Auto-redirección si ya está autenticado
    useEffect(() => {
        if (isAuthenticated && user) {
            const redirectPath =
                user.rol === UserRole.ADMIN
                    ? ROUTES.ADMIN
                    : user.rol === UserRole.ABOGADO
                        ? ROUTES.ABOGADO
                        : ROUTES.MIS_SERVICIOS;
            
            window.location.href = redirectPath;
        }
    }, [isAuthenticated, user, router]);

    return <LoginForm />;
}
