# VirtuAbogado ⚖️🚀

VirtuAbogado es una plataforma integral de servicios legales digitales, diseñada para conectar a clientes con abogados calificados a través de una experiencia fluida, segura y reactiva.

---

## 📖 Documentación Completa

Para una comprensión profunda del proyecto, hemos desglosado la documentación en secciones específicas:

1.  **[Arquitectura del Sistema](docs/architecture.md)**: Stack tecnológico, estructura de carpetas y flujos de datos.
2.  **[Guía del Código (Deep-Dive)](docs/codebase-guide.md)**: Explicación detallada de la lógica de pagos, tiempo real y patrones de diseño. **(Lectura recomendada para desarrolladores)**.
3.  **[Base de Datos](docs/database.md)**: Esquema de Prisma, relaciones y modelos de datos.
4.  **[Funcionalidades por Rol](docs/features.md)**: Capacidades para Administradores, Abogados y Clientes.
5.  **[Guía de Despliegue](docs/deployment.md)**: Configuración de variables de entorno, base de datos y publicación en Vercel.

---

## 🛠️ Inicio Rápido (Desarrollo)

1.  **Instalar dependencias**:
    ```bash
    npm install # o pnpm install
    ```

2.  **Configurar variables de entorno**:
    Crea un archivo `.env` basado en la [Guía de Despliegue](docs/deployment.md).

3.  **Preparar la Base de Datos**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

4.  **Correr el servidor de desarrollo**:
    ```bash
    npm run dev
    ```

5.  **Abrir en el navegador**:
    [http://localhost:3000](http://localhost:3000)

---

## ✨ Características Principales

-   **Engine de Escalabilidad y Resiliencia**: Connection Pooling optimizado con Supavisor y estrategias de SSR Hydration para carga instantánea bajo tráfico masivo.
-   **Observabilidad de Producción (Caja Negra)**: Monitoreo de errores en tiempo real y rastreo de rendimiento con Sentry.
-   **Seguridad en el Borde (Layer 3)**: Rate Limiting preventivo implementado en Middleware para proteger endpoints críticos de pagos y autenticación.
-   **Reactividad 100% en Tiempo Real**: Dashboards que se actualizan instantáneamente sin refrescar, usando Supabase Realtime.
-   **Notificaciones Push Transaccionales**: Alertas VAPID para Ventas, Asignaciones y Confirmaciones.
-   **Dashboard con Priorización Inteligente**: Algoritmo de ordenamiento que destaca casos urgentes y oculta casos inactivos.
-   **Chat & Gestión Documental**: Comunicación directa y subida segura de archivos legales por cada caso.

---

Desarrollado con ❤️ para transformar la asesoría legal.
