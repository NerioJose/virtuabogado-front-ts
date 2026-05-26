# Guía del Código - VirtuAbogado (Deep-Dive)

Esta guía está diseñada para que cualquier desarrollador pueda entender la lógica profunda y los flujos críticos del proyecto sin tener que navegar por cada archivo.

---

## Flujos Lógicos Críticos

### 1. Sistema de Pagos y Asignación (Zenobank)

1. **Frontend**: `CheckoutModal` llama a `processPaymentAction.ts`.
2. **Zenobank**: Se genera link de pago. Usuario redirigido.
3. **Webhook (`api/webhooks/zenobank`)**:
   - Verifica firma Svix, actualiza orden a estado correspondiente.
   - **Auto-asignación**: Si hay 1 abogado activo, se asigna automáticamente. Si hay varios, queda PENDIENTE para asignación manual del Admin.
   - **Broadcast**: Emite `order-updated` para que el frontend invalide caché.
4. **Reactividad**: `useRealtimeSubscription` escucha broadcast y refresca UI automáticamente.

### 2. Liquidaciones Automáticas

Cuando una orden pasa a estado `COMPLETADO`, el sistema **auto-crea un `LawyerPayout`** con el monto pendiente del abogado. El flujo es:
- Webhook o acción Admin cambia orden a COMPLETADO.
- `src/lib/payout.ts` detecta el cambio y agrupa órdenes completadas del mismo abogado.
- Se crea/actualiza un `LawyerPayout` en estado `PENDING`.
- El Admin revisa y marca como `PAID` desde el panel de finanzas.

### 3. Tiempo Real (3 Niveles)

| Nivel | Tecnología | Latencia | Propósito |
|-------|-----------|----------|-----------|
| 1 | Supabase Broadcast | < 100ms | Invalidación remota de TanStack Query |
| 2 | Postgres Changes | < 500ms | Sincronización de mensajes y estados |
| 3 | TanStack Query refetchInterval | 30s | Fallback offline |

### 4. Notificaciones Push

| Evento | Destinatarios | Canal |
|--------|--------------|-------|
| Nueva orden pagada | Admin | VAPID + Sonner toast |
| Asignación de caso | Abogado | VAPID + Sonner toast |
| Mensaje nuevo | Abogado / Cliente | VAPID + Sonner toast |
| Pago confirmado | Cliente | Sonner toast + redirección |
| Payout disponible | Abogado | VAPID + Sonner toast |

### 5. IDs de Expediente Legibles

El sistema genera IDs legibles como `EXP-2026-05-00042` usando `formatOrderId` en `src/lib/order-utils.ts`. El formato es `EXP-{Año}-{Mes}-{NúmeroSecuencial}`.

### 6. Priorización Inteligente

- **Top Priority**: Casos `PAID`, `PENDIENTE` o con mensajes nuevos no leídos.
- **Secondary**: Casos `EN_PROGRESO` o `REVISION`.
- **Low Priority**: Casos completados o cancelados.

### 7. Navegación (NavBar)

Los botones del NavBar se muestran según el rol del usuario autenticado:
- **Admin**: Dashboard, Finanzas, Órdenes, Clientes, Abogados, Configuración.
- **Abogado**: Dashboard, Mis Casos, Facturación, Historial.
- **Cliente**: Mis Servicios, Chat.

---

## Patrones y Estándares

### Gestión de Estado
- **Zustand (Feature Level)**: Estado global del dominio (chatStore, checkoutStore).
- **TanStack Query**: Data persistente. Queries definidas en `hooks/`, keys centralizadas para invalidación precisa.

### Acceso a Datos (MVVM)
- **API Routes (Backend)**: Controladores que usan Prisma.
- **Model Services (Frontend)**: Funciones en `src/features/[feature]/services`. Componentes nunca llaman a la API directamente.

### Autenticación (Supabase SSR)
- `@supabase/ssr` para manejar sesiones en servidor y cliente.
- `middleware.ts` protege rutas `/admin`, `/abogado`, `/mis-servicios`.

---

## Directorio de "Magia" (Donde buscar cosas)

- **`src/lib/broadcast.ts`**: Motor de señales de tiempo real.
- **`src/hooks/useRealtimeSubscription.ts`**: Cerebro que recibe señales y actualiza UI.
- **`src/lib/push-notifications.ts`**: Envío de notificaciones Web Push.
- **`src/lib/payout.ts`**: Lógica de liquidaciones automáticas.
- **`src/lib/order-utils.ts`**: Generación de IDs legibles (formatOrderId).
- **`public/sw.js`**: Service Worker para notificaciones y sonido.

---

## Consejos para el Futuro

1. **¿Nuevo estado en la orden?**: Actualizar `OrderStatus` en `entities.types.ts` y Prisma schema.
2. **¿Página rota en producción?**: Revisar `NEXT_PUBLIC_SUPABASE_URL` y `ZENOBANK_WEBHOOK_SECRET`.
3. **¿No suena el chat?**: Revisar lógica del Service Worker en `public/sw.js`.
