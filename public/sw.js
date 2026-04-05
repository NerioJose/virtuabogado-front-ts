// Service Worker para VirtuAbogado - Manejo de Notificaciones Push 📱⚖️
// v2.1.0 - Reinforce Visual Toasts & Auto-Update

self.addEventListener('push', function(event) {
  console.log('📡 [SW] Evento Push recibido:', event);
  
  let data = {
    title: 'Nueva Alerta ⚖️',
    body: 'Tienes una actualización en VirtuAbogado.',
    icon: '/logo/logo_sf_1.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
      console.log('📦 [SW] Payload decodificado:', data);
    } catch (e) {
      console.warn('⚠️ [SW] No se pudo decodificar el JSON del push. Usando texto plano.');
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Tienes una nueva actualización en VirtuAbogado.',
    icon: data.icon || '/logo/logo_sf_1.png',
    badge: '/logo/logo_sf_1.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'general-alert-' + Date.now(), // Tag dinámico evita colapsar notificaciones
    renotify: true,
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ver Detalles 📂' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'VirtuAbogado Alerta', options)
  );
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

// Forzar actualización inmediata al detectar nueva versión del SW
self.addEventListener('install', (event) => {
  console.log('📥 [SW] Instalando nueva versión...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🚀 [SW] Activando nueva versión...');
  event.waitUntil(clients.claim());
});
