# Arquitectura del Sistema - VirtuAbogado

Este documento describe la estructura técnica, el stack de tecnologías y los patrones de diseño utilizados en el proyecto VirtuAbogado.

## Stack Tecnológico

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos**: [PostgreSQL](https://www.postgresql.org/) con [Prisma ORM](https://www.prisma.io/)
- **Autenticación y Almacenamiento**: [Supabase](https://supabase.com/) (SSR, Auth, Storage)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Estado Global**: [Zustand](https://github.com/pmndrs/zustand)
- **Gestión de Datos (Client-side)**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/)
- **Notificaciones**: [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) y [Sonner](https://sonner.emilkowal.ski/)
- **Correos**: [Nodemailer](https://nodemailer.com/) (vía Gmail App Passwords)

---

## Estructura de Carpetas

El proyecto sigue una arquitectura basada en **Módulos/Features**, lo que permite una alta escalabilidad y desacoplamiento de funcionalidades.

### `src/features/`
Cada subcarpeta representa una funcionalidad core del negocio (ej. `auth`, `chat`, `checkout`).
- **`components/`**: Componentes visuales específicos de la feature.
- **`hooks/`**: Lógica de negocio encapsulada en React Hooks.
- **`services/`**: Llamadas a APIs y lógica de procesamiento de datos.
- **`store/`**: Estado local/global de la feature manejado con Zustand.
- **`types/`**: Definiciones de TypeScript para la feature.

### `src/app/`
Utiliza el App Router de Next.js.
- **`api/`**: Endpoints de la API (Backend-as-a-Service interna).
- **`(routes)/`**: Páginas de la aplicación organizadas por rutas URL.
- **`layout.tsx`**: Layout principal y proveedores de contexto.

### `src/infrastructure/`
Contiene los adaptadores para servicios externos o APIs globales.
- **`api/`**: Configuración del cliente base para fetch/axios.
- **`storage/`**: Adaptadores para `localStorage` o servicios de archivos.

### `src/shared/`
Recursos compartidos por múltiples features.
- **`components/ui/`**: Librería de componentes base (Buttons, Inputs, Cards).
- **`utils/`**: Funciones de utilidad (formateo de fechas, manejo de clases con `cn`).
- **`constants/`**: Rutas constantes, configuraciones globales.

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

- **Container/Presenter (implícito)**: La lógica se mantiene en Hooks y Servicios, mientras que los componentes se encargan mayormente del renderizado.
- **Repository-ish Services**: Los servicios encapsulan la comunicación con el exterior, facilitando cambios futuros en la API.
- **SSR & Client Components**: Se aprovecha el renderizado en servidor de Next.js para SEO y rendimiento, delegando la interactividad a Client Components.
