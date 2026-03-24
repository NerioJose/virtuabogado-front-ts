'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCheckout } from '../hooks/useCheckout';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Componente interno que maneja la lógica de sincronización.
 * Separado para poder usar useSearchParams dentro de un Suspense.
 */
function StateSyncHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { openCheckout, setUserData, isExistingUser, isOpen } = useCheckout();
    const { isAuthenticated, user } = useAuthStore();

    useEffect(() => {
        const authSuccess = searchParams.get('auth_success') === '1';
        
        if (authSuccess) {
            console.log('🔄 Detectado auth_success=1. Intentando recuperar estado de compra...');
            
            // 1. Recuperar el estado de localStorage
            const pendingDataRaw = localStorage.getItem('checkout_pending');
            if (pendingDataRaw) {
                try {
                    const pendingData = JSON.parse(pendingDataRaw);
                    const now = Date.now();
                    const oneHour = 60 * 60 * 1000;

                    // Verificar que no sea muy antiguo (1 hora)
                    if (now - pendingData.timestamp < oneHour) {
                        console.log('🛒 Recuperando checkout para:', pendingData.service?.nombre);
                        
                        // Si ya está abierto, no hacer nada
                        if (isOpen) return;

                        // Re-abrir el checkout
                        if (pendingData.service) {
                            openCheckout(pendingData.service);
                            
                            // Pre-rellenar los datos del usuario si están disponibles
                            if (pendingData.email) {
                                setUserData({
                                    email: pendingData.email,
                                    name: user?.nombre || '',
                                    nombre: user?.nombre || '',
                                    phone: user?.telefono || '',
                                    createAccount: false
                                });
                            }
                        }
                    } else {
                        console.warn('⚠️ El pedido pendiente es demasiado antiguo.');
                        localStorage.removeItem('checkout_pending');
                    }
                } catch (e) {
                    console.error('❌ Error al parsear checkout_pending:', e);
                }
            }

            // Limpiar el parámetro de la URL sin recargar la página
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('auth_success');
            const cleanUrl = `${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`;
            router.replace(cleanUrl, { scroll: false });
        }
    }, [searchParams, isAuthenticated, user, openCheckout, setUserData, isOpen, pathname, router]);

    return null;
}

/**
 * Componente que sincroniza el estado del checkout después de una redirección de auth.
 * Envuelto en Suspense por requerimiento de Next.js para useSearchParams.
 */
export const CheckoutStateSync = () => {
    return (
        <Suspense fallback={null}>
            <StateSyncHandler />
        </Suspense>
    );
};
