// Service Worker para VirtuAbogado - Manejo de Notificaciones Push 📱⚖️

self.addEventListener('push', function(event) {
  console.log('📡 [SW] Evento Push recibido:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('📦 [SW] Payload decodificado:', data);

      const options = {
        body: data.body || 'Tienes una nueva actualización en VirtuAbogado.',
        icon: data.icon || '/logo/logo_sf_1.png',
        badge: '/logo/logo_sf_1.png',
        vibrate: [200, 100, 200, 100, 200, 100, 400],
        tag: data.tag || 'general-alert',
        renotify: true,
        data: {
          url: data.url || '/'
        },
        actions: [
          { action: 'open', title: 'Ver Detalles 📂' },
          { action: 'close', title: 'Cerrar' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'VirtuAbogado Alerta', options)
      );
    } catch (e) {
      console.error('❌ [SW] Error procesando Push Payload:', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('🖱️ [SW] Clic en notificación detectado:', event.notification);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
