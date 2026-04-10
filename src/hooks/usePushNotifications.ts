'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const { user } = useAuthStore();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isPending, setIsPending] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const syncSubscription = useCallback(async (subscription: PushSubscription) => {
        if (!user) return false;
        try {
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription.toJSON()),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [Push] Error sync:', errorText);
                return false;
            }
            console.log('✅ [Push] Suscripción sincronizada con el servidor.');
            return true;
        } catch (error) {
            console.error('❌ [Push] Error red sync:', error);
            return false;
        }
    }, [user]);

    const checkSubscription = useCallback(async () => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('⚠️ [Push] Notificaciones no soportadas en este navegador.');
            return;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            const currentPermission = Notification.permission;

            console.log('📡 [Push Diag] Estado actual:', {
                subscribed: !!subscription,
                permission: currentPermission,
                swReady: !!registration,
            });

            setIsSubscribed(!!subscription);
            setPermission(currentPermission);

            // 🔁 SINCRONIZACIÓN Y RE-SUBSCRIPCIÓN PROACTIVA:
            // Escenario A: Existe suscripción en el navegador -> Sincronizar SIEMPRE con la DB para estar seguro.
            // Escenario B: Permiso concedido pero sin suscripción -> Re-registrar silenciosamente.
            
            if (subscription && user) {
                console.log('🔄 [Push] Suscripción encontrada en navegador. Sincronizando con DB por seguridad...');
                await syncSubscription(subscription);
            } else if (!subscription && currentPermission === 'granted' && user && VAPID_PUBLIC_KEY) {
                console.log('🔄 [Push] Permiso concedido pero sin suscripción activa. Re-registrando silenciosamente...');
                try {
                    const newSubscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                    });
                    const synced = await syncSubscription(newSubscription);
                    if (synced) {
                        setIsSubscribed(true);
                        console.log('✅ [Push] Re-suscripción silenciosa exitosa.');
                    }
                } catch (resubError) {
                    console.warn('⚠️ [Push] Re-suscripción silenciosa falló (permiso puede haber sido revocado):', resubError);
                }
            }
        } catch (error) {
            console.warn('ℹ️ [Push] SW no listo aún:', error);
        }
    }, [user, syncSubscription]);

    useEffect(() => {
        checkSubscription();
    }, [checkSubscription]);

    const subscribe = async (force: boolean = false) => {
        setLastError(null);
        if (!VAPID_PUBLIC_KEY) {
            setLastError('VAPID_PUBLIC_KEY no configurado');
            return false;
        }

        setIsPending(true);
        console.log(`🚀 [Push] Iniciando ${force ? 'reparación' : 'suscripción'}...`);

        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                setLastError('Permiso denegado. Por favor activa las notificaciones en los ajustes de Chrome.');
                setIsPending(false);
                return false;
            }

            const registration = await navigator.serviceWorker.ready;
            
            // Si es forzado, limpiamos TODO antes de volver a empezar
            if (force) {
                const existingSub = await registration.pushManager.getSubscription();
                if (existingSub) await existingSub.unsubscribe();
                console.log('🗑️ [Push] Suscripción anterior eliminada.');
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            console.log('✅ [Push] Nueva suscripción generada:', subscription.endpoint.substring(0, 30) + '...');
            const syncSuccess = await syncSubscription(subscription);
            
            if (syncSuccess) {
                setIsSubscribed(true);
            } else {
                setLastError('No se pudo sincronizar la suscripción con el servidor.');
                setIsSubscribed(false);
            }
            
            setIsPending(false);
            return syncSuccess;
        } catch (error: any) {
            console.error('❌ [Push Hook] Error fatal:', error);
            setLastError(error.message || String(error));
            setIsPending(false);
            return false;
        }
    };

    const unsubscribe = async () => {
        setIsPending(true);
        setLastError(null);
        try {
            const registration = await navigator.serviceWorker.ready;
            const existingSub = await registration.pushManager.getSubscription();
            if (existingSub) {
                await existingSub.unsubscribe();
                if (user) {
                   await fetch('/api/notifications/unsubscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint: existingSub.endpoint }),
                    });
                }
            }
            setIsSubscribed(false);
            console.log('🗑️ [Push] Notificaciones desactivadas.');
            return true;
        } catch (error: any) {
            console.error('❌ [Push] Error al desactivar:', error);
            setLastError(error.message || String(error));
            return false;
        } finally {
            setIsPending(false);
        }
    };

    return {
        isSubscribed,
        permission,
        isPending,
        lastError,
        subscribe,
        unsubscribe,
        checkSubscription
    };
}

