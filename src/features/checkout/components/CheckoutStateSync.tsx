'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCheckout } from '../hooks/useCheckout';
import { useCheckoutStore } from '../store/checkoutStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Loader } from '@/shared/components/feedback/Loader';
import type { Servicio } from '@/shared/types/entities.types';

const PENDING_KEY = 'checkout_pending';
const STORAGE_KEY = 'virtuabogado_checkout';
const PENDING_MAX_AGE = 60 * 60 * 1000; // 1 hora

/**
 * Componente interno que maneja la lógica de sincronización tras una
 * redirección de auth (auth_success=1). Separado para poder usar
 * useSearchParams dentro de un Suspense.
 *
 * Propósito: tras confirmar el email, llevar al usuario DIRECTO al paso 2
 * (pago) de la compra en curso, sin pasar por el paso 1 ni por la pantalla
 * de confirmación de correo.
 */
function StateSyncHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { openCheckout } = useCheckout();
    const { isAuthenticated, user, checkAuth } = useAuthStore();

    // Datos de la compra pendiente, retirados una sola vez de localStorage
    const pendingServiceRef = useRef<Servicio | null>(null);
    const hasOpenedRef = useRef(false);
    const hasCheckedAuthRef = useRef(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const authSuccess = searchParams.get('auth_success') === '1';
        if (!authSuccess) return;

        setLoading(true);

        // 1. Retirar DE INMEDIATO el estado restaurable para que
        //    useCheckoutStorage (montado después en CheckoutLayoutWrapper)
        //    no reabra el checkout en el paso 1 con datos obsoletos.
        if (typeof window !== 'undefined') {
            const raw = localStorage.getItem(PENDING_KEY);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    const now = Date.now();
                    if (
                        now - parsed.timestamp < PENDING_MAX_AGE &&
                        parsed.service
                    ) {
                        pendingServiceRef.current = parsed.service;
                    }
                } catch (e) {
                    console.error('❌ Error al parsear checkout_pending:', e);
                }
                localStorage.removeItem(PENDING_KEY);
            }
            localStorage.removeItem(STORAGE_KEY);
        }

        // 2. Asegurar que el store tenga la sesión REAL desde cookies.
        //    El usuario acaba de confirmar su correo: debe quedar logueado.
        //    Forzamos checkAuth() aunque haya un usuario persistido (podría
        //    ser uno viejo/distinto) para prefillar el paso 2 con el usuario
        //    correcto.
        if (!hasCheckedAuthRef.current) {
            hasCheckedAuthRef.current = true;
            checkAuth();
            return; // esperar a que checkAuth resuelva
        }

        if (!isAuthenticated) {
            // Sin sesión: no hay nada que reabrir. Limpiamos la URL y
            // quitamos el loader para no dejarlo en loop.
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('auth_success');
            const cleanUrl = `${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`;
            router.replace(cleanUrl, { scroll: false });
            setLoading(false);
            return;
        }

        // 3. Autenticado con la sesión real: abrir el checkout en el paso 2
        if (!hasOpenedRef.current) {
            hasOpenedRef.current = true;
            const store = useCheckoutStore.getState();

            if (pendingServiceRef.current) {
                store.openCheckout(pendingServiceRef.current);
            }

            if (user) {
                // Forzar paso 2 y rellenar con el usuario confirmado/logueado
                store.setUserData({
                    email: user.email,
                    name: user.nombre || '',
                    nombre: user.nombre || '',
                    phone: user.telefono || '',
                    createAccount: false,
                });
                store.setStep(2);
            }
        }

        // 4. Limpiar el parámetro de la URL sin recargar la página
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('auth_success');
        const cleanUrl = `${pathname}${newParams.toString() ? `?${newParams.toString()}` : ''}`;
        router.replace(cleanUrl, { scroll: false });
        setLoading(false);
    }, [searchParams, isAuthenticated, user, openCheckout, pathname, router, checkAuth]);

    if (!loading) return null;

    return (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-white/90 backdrop-blur-sm">
            <Loader size="lg" text="Confirmando tu correo y preparando tu pago…" />
        </div>
    );
}

/**
 * Componente que sincroniza el estado del checkout después de una
 * redirección de auth. Envuelto en Suspense por requerimiento de Next.js
 * para useSearchParams.
 */
export const CheckoutStateSync = () => {
    return (
        <Suspense fallback={null}>
            <StateSyncHandler />
        </Suspense>
    );
};
