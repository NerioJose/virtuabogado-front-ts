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

## Patrones de Diseño Clave

- **MVVM (Model-View-ViewModel)**: Desacoplamiento total entre la UI y la data a través de Hooks (ViewModel) que consumen Servicios (Model/Data).
- **Feature-Driven Design**: Organización por dominios para evitar archivos gigantes y facilitar la navegación.
- **Barrel Export Pattern**: Uso de `index.ts` en cada feature para definir una API pública clara y evitar importaciones anidadas profundas.
- **Inyección de Dependencias vía Hooks**: Los componentes consumen lógica solo a través de hooks específicos, facilitando el testing y la modularidad.
- **SSR & Client Components**: Uso equilibrado de Server Components para SEO y Client Components para interactividad enriquecida.

---

## Reactividad y Tiempo Real

### Capa de Reactividad (Supabase Broadcast)
Para garantizar que los dashboards se actualicen instantáneamente sin polling constante, el sistema utiliza un patrón de **Invalidación Remota**:
1.  **Evento**: Una acción en el servidor (ej. éxito en Webhook de Zenobank) dispara un `broadcastOrderUpdate`.
2.  **Transporte**: Supabase Realtime envía un mensaje de broadcast al canal `app-updates` o `global_{userId}`.
3.  **Recepción**: El hook `useRealtimeSubscription` en el frontend intercepta el mensaje.
4.  **Reacción**: Se llama a `queryClient.invalidateQueries`, lo que fuerza a TanStack Query a refrescar los datos de la base de datos inmediatamente.

### Infraestructura VAPID (Push Notifications)
El sistema implementa notificaciones push nativas multi-dispositivo:
-   **Sincronización Proactiva**: Al cargar cualquier dashboard, el hook `usePushNotifications` verifica si el navegador tiene un token de suscripción y lo re-sincroniza automáticamente con la base de datos. Esto previene la pérdida de alertas tras reinicios de datos.
-   **Dispatcher Centralizado**: `src/lib/push-notifications.ts` abstrae la complejidad de `web-push`, manejando automáticamente la limpieza de suscripciones expiradas (error 410).

---

## Capa de Escalabilidad y Observabilidad (Lanzamiento Masivo)

Para garantizar la estabilidad durante eventos de tráfico extremo, el sistema implementa un blindaje de 4 capas:

### 1. Nivel de Datos: Connection Pooling
- **Tecnología**: Prisma + Supavisor (Modo Transacción).
- **Implementación**: `src/lib/prisma.ts` detecta el entorno de producción y utiliza el pooler en el puerto `6543`.
- **Efecto**: Permite que miles de funciones serverless simultáneas compartan un grupo reducido de conexiones a la DB, evitando el error "too many clients".

### 2. Nivel de Rendimiento: SSR & Hydration
- **Tecnología**: TanStack Query + Hydration Boundary.
- **Implementación**: Las rutas `/` y `/servicios` pre-cargan datos en el servidor (`page.tsx`) con una estrategia de revalidación de 1 hora (`revalidate: 3600`).
- **Efecto**: Carga instantánea (LCP optimizado) y reducción masiva de peticiones a la API durante ráfagas de tráfico.

### 3. Nivel de Seguridad: Rate Limiting
- **Tecnología**: Next.js Middleware.
- **Implementación**: `middleware.ts` identifica peticiones a rutas críticas (`/api/auth`, `/api/checkout`) y actúa como guardia preventivo contra ataques de bots y inundaciones.

### 4. Nivel de Observabilidad: Sentry "Caja Negra"
- **Tecnología**: @sentry/nextjs + Instrumentation API.
- **Implementación**: Configuración global de captura de errores en cliente, servidor y edge runtime.
- **Efecto**: Trazabilidad total de fallos en producción, asegurando que cualquier error crítico sea notificado al instante al equipo técnico.
