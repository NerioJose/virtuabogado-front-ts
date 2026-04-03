'use client';

import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Verificar estado actual al montar el hook
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
          setIsLoading(false);
        });
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  /**
   * Suscribir dispositivo a notificaciones Push 📡
   */
  const subscribe = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('❌ Este navegador no soporta Notificaciones Push.');
        return false;
      }

      setIsLoading(true);

      // 1. Solicitar permiso al sistema operativo/navegador
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        console.warn('⚠️ El usuario rechazó el permiso de notificaciones.');
        setIsLoading(false);
        return false;
      }

      // 2. Obtener/Registrar el Service Worker
      const registration = await navigator.serviceWorker.ready;

      // 3. Crear suscripción push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY
      });

      // 4. Enviar suscripción al backend de VirtuAbogado
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error('Error al guardar suscripción en el servidor');
      }

      setIsSubscribed(true);
      console.log('✅ [Push] Dispositivo registrado exitosamente.');
      return true;
    } catch (error) {
      console.error('❌ [Push] Error en el proceso de suscripción:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Desuscribir (Opcional, para limpieza)
   */
  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        // Podríamos llamar a un endpoint para borrar de la DB también
      }
    } catch (error) {
      console.error('❌ [Push] Error al desuscribir:', error);
    }
  }, []);

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  };
}
