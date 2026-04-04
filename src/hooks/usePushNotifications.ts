'use client';

import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const isVapidSet = !!VAPID_PUBLIC_KEY;

// Convert VAPID public key from Base64 string to Uint8Array (Standard for Web Push)
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
      
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        setIsLoading(false);

        // 🔄 AUTO-REPAIR (Self-Healing): 
        // 1. Si ya tiene suscripción, re-sincronizar con el server.
        // 2. Si tiene PERMISO pero NO suscripción (se perdió), re-suscribir silenciosamente.
        if (Notification.permission === 'granted') {
          if (subscription) {
            console.log('📡 [Push] Sincronización automática de suscripción detectada...');
            try {
              await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
              });
              console.log('✅ [Push] Suscripción sincronizada con éxito.');
            } catch (err) {
              console.error('⚠️ [Push] Falló el auto-sync de suscripción:', err);
            }
          } else {
            console.log('📡 [Push] Permiso concedido pero sin suscripción. Re-suscribiendo automáticamente...');
            // Llamamos a la lógica interna de subscribe sin el alert (silencioso)
            try {
              const newSub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC_KEY ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY) : undefined
              });
              await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSub)
              });
              setIsSubscribed(true);
              console.log('✅ [Push] Re-suscripción automática completada.');
            } catch (err) {
              console.error('❌ [Push] Error en re-suscripción automática:', err);
            }
          }
        }
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
      if (!VAPID_PUBLIC_KEY) {
        const errorMsg = '❌ No se encontró la llave pública VAPID en las variables de entorno.';
        console.error(errorMsg);
        alert(errorMsg);
        return false;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        const errorMsg = '❌ Este navegador no soporta Notificaciones Push.';
        console.error(errorMsg);
        alert(errorMsg);
        return false;
      }

      setIsLoading(true);
      console.log('📡 [Push] Iniciando proceso de solicitud de permisos...');

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
        applicationServerKey: VAPID_PUBLIC_KEY ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY) : undefined
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
