// ===================================================================
// VirtuAbogado — Service Worker v3.0.0 — Battle-Hardened ⚔️
// Funciona en segundo plano, con el navegador cerrado y sin sesión.
// ===================================================================

const SW_VERSION = 'v3.0.0';

// ─── PUSH: Escucha eventos del servidor VAPID ─────────────────────
self.addEventListener('push', function (event) {
  console.log(`📡 [SW ${SW_VERSION}] Evento Push recibido.`);

  let data = {
    title: 'VirtuAbogado ⚖️',
    body: 'Tienes una actualización importante.',
    icon: self.location.origin + '/logo/logo_sf_1.png',
    badge: self.location.origin + '/logo/logo_sf_1.png',
    url: '/',
    tag: 'general-' + Date.now(),
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      console.log('📦 [SW] Payload decodificado:', data);
    } catch (e) {
      console.warn('⚠️ [SW] JSON inválido, usando texto plano.');
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || self.location.origin + '/logo/logo_sf_1.png',
    badge: self.location.origin + '/logo/logo_sf_1.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag,
    renotify: true,         // Siempre vibrar/sonar aunque tenga el mismo tag
    requireInteraction: true, // Mantener visible hasta que el usuario la cierre
    silent: false,
    data: {
      url: data.url || '/',
      openedAt: Date.now(),
    },
    actions: [
      { action: 'open', title: '📂 Ver Detalles' },
      { action: 'dismiss', title: '✖ Cerrar' },
    ],
  };

  // Mostrar notificación y actualizar badge en el icono del Home Screen
  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );

  // Badge: poner un indicador en el icono de la app (Home Screen)
  if (self.navigator && 'setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(1).catch(() => {});
  }
});

// ─── NOTIFICATIONCLICK: Acción inteligente al tocar la notificación ──
self.addEventListener('notificationclick', function (event) {
  console.log(`🖱️ [SW ${SW_VERSION}] Clic en notificación. Acción: "${event.action}"`);

  // Cerrar la notificación siempre primero
  event.notification.close();

  // Si el usuario pulsó "Cerrar", no abrimos nada (pero limpiamos badge)
  if (event.action === 'dismiss') {
    if (self.navigator && 'clearAppBadge' in self.navigator) {
      self.navigator.clearAppBadge().catch(() => {});
    }
    return;
  }

  // Limpiar badge al hacer clic en la notificación
  if (self.navigator && 'clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  const targetUrl = event.notification.data?.url || '/';
  const origin = self.location.origin;
  const absoluteUrl = targetUrl.startsWith('http')
    ? targetUrl
    : `${origin}${targetUrl}`;

  // event.waitUntil garantiza que el SW no muera antes de abrir/navegar
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // 1. Buscar una pestaña ya abierta de VirtuAbogado
        for (const client of clientList) {
          if (client.url.startsWith(origin) && 'focus' in client) {
            // Navegar la pestaña existente a la URL específica
            client.focus();
            if ('navigate' in client) {
              return client.navigate(absoluteUrl);
            }
            return client;
          }
        }
        // 2. Si no hay pestaña abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(absoluteUrl);
        }
      })
  );
});

// ─── NOTIFICATIONCLOSE: Tracking de notificaciones descartadas ───────
self.addEventListener('notificationclose', function (event) {
  const url = event.notification.data?.url || 'unknown';
  const tag = event.notification.tag || 'unknown';
  console.log(`📊 [SW ${SW_VERSION}] Notificación descartada. Tag: ${tag} | URL: ${url}`);
  // Aquí se puede integrar analytics en el futuro (ej. Amplitude, Sentry)
});

// ─── INSTALL: Activación inmediata sin esperar a cerrar pestañas ─────
self.addEventListener('install', function (event) {
  console.log(`📥 [SW ${SW_VERSION}] Instalando nueva versión...`);
  // Activar inmediatamente sin esperar que las pestañas existentes cierren
  event.waitUntil(self.skipWaiting());
});

// ─── ACTIVATE: Toma el control de todos los clientes al instante ─────
self.addEventListener('activate', function (event) {
  console.log(`🚀 [SW ${SW_VERSION}] Activo y en control total.`);
  // clients.claim(): El SW controla inmediatamente sin necesidad de recarga
  event.waitUntil(clients.claim());
});
