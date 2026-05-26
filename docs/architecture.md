# Arquitectura del Sistema - VirtuAbogado

Este documento describe la estructura técnica, el stack de tecnologías y los patrones de diseño utilizados en el proyecto VirtuAbogado.

## Stack Tecnológico

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos**: [PostgreSQL](https://www.postgresql.org/) con [Prisma ORM](https://www.prisma.io/)
- **Autenticación y Almacenamiento**: [Supabase](https://supabase.com/) (SSR, Auth, Storage)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Estado Global**: [Zustand](https://github.com/pmndrs/zustand)
- **Gestión de Datos (Client-side)**: [TanStack Query v5](https://tanstack.com/query/latest) (con estrategias de invalidación por Broadcast)
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/)
- **Notificaciones**: [Web Push API (VAPID)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) y [Sonner](https://sonner.emilkowal.ski/)
- **Tiempo Real**: [Supabase Realtime (Broadcast & Postgres Changes)](https://supabase.com/realtime)
- **Correos**: [Nodemailer](https://nodemailer.com/) (vía Gmail App Passwords)

---

## Estructura de Carpetas

El proyecto sigue una arquitectura basada en **Módulos/Features**, lo que permite una alta escalabilidad y desacoplamiento de funcionalidades.

### `src/features/`
Representa el corazón de la aplicación, organizada por dominios de negocio (ej. `auth`, `chat`, `orders`, `clients`, `lawyers`). Sigue el patrón **MVVM (Model-View-ViewModel)**:
- **`components/` (View)**: Componentes visuales específicos de la feature.
- **`hooks/` (ViewModel)**: Hooks que encapsulan el estado y la lógica de presentación.
- **`services/` (Model/Data)**: Lógica de comunicación con APIs y procesamiento de datos.
- **`types/`**: Definiciones de TypeScript específicas del dominio.
- **`store/`**: Estado local persistente o reactivo (Zustand).
- **`index.ts` (Public API)**: Barrel export que centraliza lo que otras features pueden consumir.

### `src/app/`
Estructura de App Router de Next.js para rutas de página y API.
- **`api/`**: Endpoints de backend serverless.
- **`(página)/`**: Páginas principales (`servicios`, `mis-servicios`, `admin`, `abogado`).

### `src/components/`
Componentes compartidos y transversales.
- **`layout/`**: NavBar, Sidebar, Footer.
- **`ui/`**: Componentes atómicos (Botones, Modales, Inputs).
- **`providers/`**: Proveedores de contexto (Auth, React Query, Theme).

### `src/hooks/`, `src/services/`, `src/utils/`
Utilidades, hooks y servicios globales que no pertenecen a un dominio específico (ej. `usePushNotifications`, `supabase-client`).

---

## Flujo de Datos

1. **Usuario interactúa** con un componente en `src/features`.
2. El componente usa un **Hook** (`hooks/`) para manejar la lógica.
3. El Hook llama a un **Servicio** (`services/`) para obtener o enviar datos.
4. El Servicio interactúa con **Next.js API Routes** (`src/app/api`).
5. La API Route usa **Prisma** para interactuar con la base de datos o llama a servicios externos (Supabase, Zenobank).
6. Los datos retornan y se actualiza el **Estado** (Zustand o React Query).
7. La UI se renderiza de nuevo con los nuevos datos.

---

## Reactividad en 3 Capas

VirtuAbogado usa una estrategia triple para datos siempre frescos:

| Capa | Mecanismo | Latencia | Uso |
|------|-----------|----------|-----|
| Broadcast | Supabase Realtime Broadcast | < 100ms | Invalidación remota de caché TanStack Query |
| Postgres Changes | Suscripción directa a tablas (Order, Message) | < 500ms | Detectar inserts/updates de otros usuarios |
| Polling | TanStack Query refetchInterval | 30s | Fallback cuando Realtime no está disponible |

### Tabla de Eventos de Broadcast

| Evento | Canal | Disparador | Efecto en Frontend |
|--------|-------|------------|-------------------|
| `order-updated` | `app-updates` | Webhook Zenobank / Admin Action | Invalida queries de Order, DashboardStats, Finance |
| `payout-updated` | `app-updates` | Admin aprueba payout | Invalida PayoutHistory, PendingPayouts, Finance |
| `message-new` | `user-{userId}` | Nuevo mensaje en chat | Invalida Message queries, notificación push |
| `payment-webhook` | `order-{orderId}` | Webhook de pago recibido | Refresca estado de orden, redirección automática |

### Optimizaciones de Rendimiento

- **Audio Pool**: Precarga y reuso de instancias de audio para sonidos de notificación sin latencia.
- **Debounce**: Búsquedas y filtros con debounce de 300ms para evitar re-renders excesivos.
- **Throttle**: Actualizaciones de UI en tiempo real limitadas a 1 frame cada 100ms.
- **Estabilidad de Referencias**: Todos los callbacks usan `useCallback` con dependencias estables (`user?.id`, `user?.rol`).
- **Limpieza de Stores**: Zustand stores se resetean al cerrar checkout o al desmontar componentes.
- **Debounce localStorage**: Escrituras a localStorage debounced para evitar bloqueos de IO.

---

## Notificaciones Push (Multiplataforma)

El sistema implementa notificaciones push nativas multi-dispositivo:

| Función | Archivo | Descripción |
|---------|---------|-------------|
| Suscripción | `usePushNotifications.ts` | Registra el dispositivo y almacena token en DB |
| Envío | `push-notifications.ts` | Dispatcher centralizado con manejo de errores 410 |
| Service Worker | `public/sw.js` | Receptor de push events, muestra notificación y reproduce sonido |
| UI Control | `PushNotificationToggle.tsx` | Botón de activar/desactivar notificaciones en sidebar |
| Sincronización | `usePushNotifications.ts` | Auto-re-sincroniza tokens huérfanos al cargar dashboard |

---

## Capa de Escalabilidad

1. **Connection Pooling**: Prisma + Supavisor (puerto 6543) para funciones serverless.
2. **SSR & Hydration**: Pre-carga de datos con TanStack Query y revalidate: 3600.
3. **Rate Limiting**: Next.js Middleware protege rutas críticas.
4. **Observabilidad**: @sentry/nextjs captura errores en cliente, servidor y edge.
