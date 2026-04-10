'use client';

import { useEffect } from 'react';
import { useCheckoutStore } from '../store/checkoutStore';
import { useAuthStore } from '@/features/auth';
import type { CheckoutStorageData } from '../types/checkout.types';

const STORAGE_KEY = 'virtuabogado_checkout';
const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Hook para persistir el estado del checkout en localStorage
 * Auto-guarda cambios y recupera al volver
 */
export const useCheckoutStorage = () => {
    const { 
        service, 
        userData, 
        step, 
        isOpen, 
        orderId, 
        isWaitingForWebhook 
    } = useCheckoutStore();

    // Guardar en localStorage cada vez que cambia el estado
    useEffect(() => {
        if (service && isOpen) {
            // Excluir propiedades no serializables como icono (ReactNode)
            const serializableService = service ? {
                id: service.id,
                nombre: service.nombre,
                titulo: service.titulo,
                descripcion: service.descripcion,
                precio: service.precio,
                duracion: service.duracion,
                imagen: service.imagen,
                // icono se excluye porque es un ReactNode
            } : null;

            const data: CheckoutStorageData = {
                service: serializableService,
                userData,
                step,
                orderId,
                isWaitingForWebhook,
                timestamp: Date.now(),
            };

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
        }
    }, [service, userData, step, isOpen]);

    // Recuperar del localStorage al montar
    useEffect(() => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) return;

        // Si ya cerramos manualmente en esta sesión, no auto-abrir
        const wasClosed = sessionStorage.getItem('checkout_manually_closed');
        if (wasClosed) return;

        try {
            const data: CheckoutStorageData = JSON.parse(savedData);

            // Verificar si no ha expirado
            if (Date.now() - data.timestamp > EXPIRY_TIME) {
                localStorage.removeItem(STORAGE_KEY);
                return;
            }

            // Recuperar estado si hay datos válidos
            if (data.service) {
                const store = useCheckoutStore.getState();
                const isAuth = useAuthStore.getState().isAuthenticated;

                console.log('🔄 useCheckoutStorage: Re-opening checkout from storage', { 
                    step: data.step, 
                    isAuth 
                });

                store.openCheckout(data.service);

                if (data.userData) {
                    store.setUserData(data.userData);
                }

                if (data.orderId) {
                    store.setOrderId(data.orderId);
                }

                if (data.isWaitingForWebhook) {
                    store.setIsWaitingForWebhook(true);
                }

                // Si está autenticado, NUNCA forzar paso 1 si ya teníamos un paso superior
                // Si no está autenticado, siempre forzar paso 1 (Seguridad)
                if (isAuth) {
                    const targetStep = data.step ? Math.max(data.step, 2) : 2;
                    store.setStep(targetStep as any);
                } else {
                    store.setStep(1);
                }
            }
        } catch (error) {
            console.error('Error recovering checkout data:', error);
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    // Limpiar localStorage
    const clearStorage = () => {
        localStorage.removeItem(STORAGE_KEY);
    };

    return {
        clearStorage,
    };
};
