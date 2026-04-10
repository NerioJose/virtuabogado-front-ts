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
- **Broadcast Remoto**: El servidor emite señales (ej. `ORDER_UPDATED`) que los clientes escuchan para invalidar su caché local de TanStack Query inmediatamente.
- **Postgres Changes**: Suscripción directa a tablas (Order, Message) para detectar inserts/updates.
- **Sincronización Proactiva (Push)**: Al cargar el panel, el sistema detecta si el navegador tiene un token de suscripciones que no existe en la DB e intenta re-sincronizarlo automáticamente, asegurando que las notificaciones funcionen incluso tras limpiezas de base de datos.

### 3. Ajustes Financieros y Simulador de Pagos
El sistema de repartición de ingresos es totalmente configurable desde el panel de administración.

- **Componente**: `ConfiguracionPanel.tsx` (Sección `FinancialSettingsSection`).
- **Servicio de Cálculo**: `financial-settings.service.ts`.
- **Lógica de Simulación**: 
    - No se basa en el histórico, sino en **precios actuales**.
    - El simulador toma automáticamente la suma de 1 venta de cada servicio activo como base inicial.
    - Permite al administrador cambiar el monto base para ver proyecciones en tiempo real.
    - **Moneda**: Todos los cálculos y visualizaciones se manejan estrictamente en **USD**.
    - **Desglose**: Separa de forma transparente:
        - Pasarela de Pagos / Fee Plataforma.
        - Impuestos configurados.
        - Gastos Operativos.
        - Pago neto al Abogado.
        - Ganancia Neta de la Empresa (Margen).

### 4. Notificaciones Push (Efecto Shopify)
- Implementado con la **Web Push API** y el estándar VAPID.
- **Ciclo Completo**: Se notifica al Administrador (venta), al Abogado (asignación) y al Cliente (confirmación de caso).
- **Auto-reparación**: El componente `PushNotificationToggle.tsx` y el hook `usePushNotifications.ts` gestionan la coherencia entre el navegador y el servidor sin requerir clics repetitivos del usuario.

### 5. Sistema de Priorización Inteligente
Para evitar que cases antiguos o completados entierren los casos urgentes:
- **Lógica de Ordenamiento**: Cada Dashboard (Admin, Abogado, Cliente) aplica una función `getStatusPriority`.
- **Top Priority**: Casos `PAID`, `PENDIENTE` o con mensajes nuevos (`isUnread`).
- **Secondary**: Casos `EN_PROGRESO` o `REVISION`.
- **Low Priority**: Casos completados o cancelados.

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
