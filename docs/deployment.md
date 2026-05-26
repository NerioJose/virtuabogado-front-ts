# Guía de Despliegue y Configuración - VirtuAbogado

Este documento explica cómo configurar el entorno de desarrollo y desplegar VirtuAbogado a producción.

---

## Variables de Entorno (.env)

### Supabase (Auth & Storage)
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Key pública anónima.
- `SUPABASE_SERVICE_ROLE_KEY`: Key secreta para operaciones administrativas (bypass RLS).

### Base de Datos (Prisma)
- `DATABASE_URL`: URI de conexión a PostgreSQL (puerto 5432).
- `DATABASE_URL_POOLER`: URI al puerto 6543 (Modo Transacción) de Supavisor.
- `DIRECT_URL`: Conexión directa necesaria para migraciones Prisma.

### Fintech (Zenobank)
- `ZENOBANK_API_KEY`: Key secreta para crear sesiones de pago.
- `ZENOBANK_WEBHOOK_SECRET`: Secreto Svix para verificar webhooks.

### Correos (Nodemailer + Gmail)
- `GMAIL_USER`: Email de la cuenta que envía notificaciones.
- `GMAIL_APP_PASSWORD`: Contraseña de aplicación de Google.
- `RESEND_API_KEY`: (Opcional) para logs específicos.

### Notificaciones Push (VAPID)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Generada con `web-push generate-vapid-keys`.
- `VAPID_PRIVATE_KEY`: Key privada para firmar notificaciones.

### Observabilidad (Sentry)
- `NEXT_PUBLIC_SENTRY_DSN`: URL del proyecto en Sentry.
- `SENTRY_AUTH_TOKEN`: Token interno de Sentry para Source Maps.

---

## Pasos de Despliegue

### 1. Clonar e Instalar
```bash
git clone <repo-url>
pnpm install
```

### 2. Base de Datos
```bash
npx prisma generate
npx prisma db push
```

### 3. Semilla de Datos (Opcional)
```bash
npx prisma db seed
```

### 4. Configurar Supabase
- **Auth**: Habilita proveedor de Email.
- **Storage**: Crea bucket `documents` con políticas RLS adecuadas.
- **Realtime**: Publica las tablas `Order`, `Message`, `LawyerPayout` en la publicación de Realtime para que Postgres Changes funcione.

### 5. Configurar Webhook Zenobank
Endpoint: `https://tu-dominio.com/api/webhooks/zenobank`

---

## Despliegue en Vercel

1. Sube el código a GitHub.
2. Conecta el repositorio en Vercel.
3. Agrega todas las variables de entorno en la configuración de Vercel.
4. Build command: `prisma generate && next build`

---

## Diagnóstico Común

| Problema | Causa Posible | Solución |
|----------|--------------|----------|
| Error 500 en Login | Keys de Supabase incorrectas | Verificar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Pagos no procesan | Webhook Zenobank falla (401/404) | Revisar logs de Vercel, verificar firma Svix y ID de orden |
| Push no llegan | Tokens VAPID no coinciden o permiso denegado | Verificar `NEXT_PUBLIC_VAPID_PUBLIC_KEY` cliente/servidor, re-suscribir dispositivo |
| Chunks no cargan | Build corrompido o deploy incompleto | Re-deploy en Vercel, limpiar caché del navegador |
| Logs Prisma en browser console | Aparecen solo en desarrollo | Son mensajes de depuración de Prisma; no aparecen en producción |
