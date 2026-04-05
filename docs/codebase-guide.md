# Guía del Código - VirtuAbogado (Deep-Dive)

Esta guía está diseñada para que cualquier desarrollador pueda entender la lógica profunda y los flujos críticos del proyecto sin tener que navegar por cada archivo.

---

## 🚀 Flujos Lógicos Críticos

### 1. Sistema de Pagos y Reconciliación (Zenobank)
El flujo de compra es el corazón del sistema:
1. **Frontend**: El componente `CheckoutModal` (`src/features/checkout`) recolecta datos y llama a `processPaymentAction.ts`.
2. **Zenobank Integration**: Se genera un link de pago o sesión de checkout. El usuario es redirigido.
3. **Webhook (`api/webhooks/zenobank`)**: 
   - Cuando el pago es exitoso, Zenobank envía un evento firmado via Svix.
   - El webhook **verifica la firma**, actualiza el estado de la orden en la DB a `PAID` o `EN_PROGRESO`.
   - **Auto-asignación**: Si solo hay un abogado activo en el sistema, la orden se le asigna automáticamente.
   - **Broadcast**: Se envía una señal en tiempo real a través de Supabase para que el frontend del cliente sepa que el pago fue procesado.
4. **Reactividad**: El hook `useRealtimeSubscription` escucha el broadcast y **redirige automáticamente** al cliente a su dashboard sin que este tenga que refrescar.

### 2. Reactividad y Tiempo Real (Capa Híbrida)
VirtuAbogado usa una estrategia triple para garantizar datos siempre frescos:
- **Broadcast Manual**: Como las mutaciones via Prisma no disparan eventos de Supabase automáticamente, la API emite un "broadcast" manual tras cada cambio importante.
- **Postgres Changes**: Suscripción directa a tablas (Order, Message) para detectar inserts/updates.
- **Polling Fallback**: Un "latido" cada 30 segundos que refresca las queries activas de TanStack Query como red de seguridad.

### 3. Sistema de Mensajería (Chat)
- Cada orden tiene un chat asociado.
- Los mensajes se guardan en la tabla `Message` vinculada a un `orderId`.
- El componente `ChatWindow` usa `useRealtimeSubscription` para recibir mensajes nuevos instantáneamente y actualizar el scroll de forma suave.

### 4. Notificaciones Push (Efecto Shopify)
- Implementado con la **Web Push API**.
- Cuando entra una venta, el webhook dispara `notifyNewSale`.
- Los administradores reciben una notificación tipo "Venta nueva" (con sonido configurado en el service worker).
- Los abogados reciben una notificación de "Nuevo caso asignado".

---

## 🛠️ Patrones y Estándares

### Gestión de Estado
- **Zustand**: Usado para estado global ligero que no viene de la DB (ej. datos temporales de checkout, sidebar abierta, estado del usuario autenticado).
- **TanStack Query (React Query)**: Toda la data que viene del backend se maneja aquí. **Regla de oro**: Siempre usar `ORDER_KEYS` o similares para invalidar queries y mantener la consistencia.

### Acceso a Datos (Services & Actions)
- **API Routes**: Actúan como nuestro backend. Usan Prisma para interactuar con Postgres.
- **Features Services**: Funciones puras en `src/features/[feature]/services` que encapsulan los `fetch` a nuestra propia API. Nunca llames a `fetch` directamente en un componente; usa el servicio.

### Autenticación (Supabase SSR)
- Usamos `@supabase/ssr` para manejar sesiones tanto en el servidor (Middleware, Server Components) como en el cliente.
- El `middleware.ts` protege las rutas `/admin`, `/abogado` y `/mis-servicios`, redirigiendo al login si no hay sesión válida.

---

## 📁 Directorio de "Magia" (Donde buscar cosas)

- **`src/lib/broadcast.ts`**: El motor que envía señales de tiempo real a todos los usuarios.
- **`src/hooks/useRealtimeSubscription.ts`**: El cerebro que recibe esas señales y actualiza la UI.
- **`src/lib/push-notifications.ts`**: Lógica de envío de notificaciones Web Push.
- **`public/sw.js`**: El Service Worker que maneja las notificaciones en segundo plano y el sonido.

---

## 💡 Consejos para el Futuro
1. **¿Nuevo estado en la orden?**: Si añades un nuevo `OrderStatus`, recuerda actualizarlo en `src/shared/types/entities.types.ts` y Prisma.
2. **¿Página rota en producción?**: Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `ZENOBANK_WEBHOOK_SECRET` estén configurados.
3. **¿No suena el chat?**: Revisa la lógica del Service Worker en `public/sw.js`.
