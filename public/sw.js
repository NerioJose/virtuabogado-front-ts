// Service Worker para VirtuAbogado - Manejo de Notificaciones Push 📱⚖️

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    console.log('📦 Push recibido:', data);

    const options = {
      body: data.body || 'Nuevo evento en VirtuAbogado',
      icon: data.icon || '/logo/logo_sf_1.png',
      badge: '/logo/logo_resized.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/'
      },
      // Sonido (en algunos navegadores compatibles)
      sound: '/virtuabogado-chat.mp3',
      actions: [
        { action: 'view', title: 'Ver Detalles' },
        { action: 'close', title: 'Cerrar' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'VirtuAbogado Alerta', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Forzar activación inmediata
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
