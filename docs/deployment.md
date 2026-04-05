# Guía de Despliegue y Configuración - VirtuAbogado

Este documento explica cómo configurar el entorno de desarrollo y desplegar VirtuAbogado a producción.

---

## 🛠️ Configuración de Entorno (.env)

Copia el archivo `.env.example` (o crea uno nuevo) con las siguientes variables críticas:

### Supabase (Auth & Storage)
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Key pública anónima.
- `SUPABASE_SERVICE_ROLE_KEY`: Key secreta para operaciones administrativas (bypass RLS). **Nunca exponer en el cliente.**

### Base de Datos (Prisma)
- `DATABASE_URL`: URI de conexión a PostgreSQL (se recomienda usar el pooling de Supabase en puerto 6543).
- `DIRECT_URL`: Conexión directa a la DB (puerto 5432) necesaria para migraciones de Prisma.

### Fintech (Zenobank)
- `ZENOBANK_API_KEY`: Key secreta para crear sesiones de pago.
- `ZENOBANK_WEBHOOK_SECRET`: Secreto Svix enviado por Zenobank para verificar webhooks.

### Correos (Nodemailer + Gmail)
- **GMAIL_USER**: Email de la cuenta que envía notificaciones.
- **GMAIL_APP_PASSWORD**: Contraseña de aplicación generada en la seguridad de Google.
- **RESEND_API_KEY**: (Opcional) solo si se usa para logs específicos.

### Notificaciones Push (VAPID)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Generada con `web-push generate-vapid-keys`.
- `VAPID_PRIVATE_KEY`: Key privada para firmar las notificaciones.

---

## 🚀 Pasos para el Primer Despliegue

### 1. Clonar e Instalar
```bash
git clone <repo-url>
pnpm install
```

### 2. Base de Datos
Sincroniza el esquema de Prisma con tu base de Datos:
```bash
npx prisma generate
npx prisma db push
```

### 3. Semilla de Datos (Opcional)
Para cargar servicios iniciales y configuración financiera:
```bash
npx prisma db seed
```

### 4. Configurar Supabase
- **Auth**: Habilita el proveedor de Email.
- **Storage**: Crea un bucket llamado `documents` y asegúrate de que sea público o tenga las políticas RLS adecuadas (ver `docs/architecture.md`).
- **Webhooks**: Configura el endpoint en Zenobank apuntando a `https://tu-dominio.com/api/webhooks/zenobank`.

---

## 📦 Despliegue en Vercel

1. Sube tu código a GitHub.
2. Conecta el repositorio en Vercel.
3. **Importante**: Agrega todas las variables de entorno mencionadas arriba en la configuración de Vercel.
4. Asegúrate de que el comando de build incluya la generación del cliente de Prisma:
   `prisma generate && next build`

---

## 🔍 Diagnóstico Común
- **Error 500 en Login**: Verifica que las keys de Supabase sean correctas.
- **Pagos no se marcan como PAID**: Revisa los logs de Vercel para ver si el Webhook de Zenobank está devolviendo error 401 (Firma inválida) o 404 (Orden no encontrada).
- **No llegan notificaciones**: Verifica que el navegador haya pedido permisos y que las llaves VAPID coincidan entre el cliente y el servidor.
