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
        if (!user) return;
        try {
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription.toJSON()),
            });
            if (!response.ok) console.error('❌ [Push] Error sync:', await response.text());
        } catch (error) {
            console.error('❌ [Push] Error red sync:', error);
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
            
            console.log('📡 [Push Diag] Estado actual:', {
                subscribed: !!subscription,
                permission: Notification.permission,
                swReady: !!registration
            });

            setIsSubscribed(!!subscription);
            setPermission(Notification.permission);
        } catch (error) {
            console.warn('ℹ️ [Push] SW no listo aún:', error);
        }
    }, []);

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
            await syncSubscription(subscription);
            
            setIsSubscribed(true);
            setIsPending(false);
            return true;
        } catch (error: any) {
            console.error('❌ [Push Hook] Error fatal:', error);
            setLastError(error.message || String(error));
            setIsPending(false);
            return false;
        }
    };

    return {
        isSubscribed,
        permission,
        isPending,
        lastError,
        subscribe,
        checkSubscription
    };
}

