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

    // Auto-redirección solo si la sesión de Supabase es válida
    useEffect(() => {
        if (!isAuthenticated || !user) return;
        
        const checkAndRedirect = async () => {
            const supabase = await import('@/utils/supabase/client').then(m => m.createClient());
            const { data } = await supabase.auth.getSession();
            if (!data.session) return;
            
            const redirectPath =
                user.rol === UserRole.ADMIN
                    ? ROUTES.ADMIN
                    : user.rol === UserRole.ABOGADO
                        ? ROUTES.ABOGADO
                        : ROUTES.MIS_SERVICIOS;
            
            window.location.href = redirectPath;
        };
        
        checkAndRedirect();
    }, [isAuthenticated, user]);

    return <LoginForm />;
}
