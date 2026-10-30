# 01 — Capa Fundacional (Config · Prisma · Supabase)

Esta capa define **cómo arranca, se conecta y se protege** la aplicación. Es la
base sobre la que se apoyan `lib/`, `features/` y `app/`.

---

## 1. Configuración de build y runtime

### 1.1 `next.config.ts`
Envuelve la config en `withSentryConfig`. Claves:

- `compiler.removeConsole` = activo **solo en producción**, excepto `error`.
- `experimental.webpackMemoryOptimizations` y `optimizeServerReact` = `true`.
- ⚠️ **`eslint.ignoreDuringBuilds: true`** y **`typescript.ignoreBuildErrors: true`**:
  el build **NO falla** por errores de TS/lint. Esto es crítico para refactor:
  los errores solo se ven con `tsc --noEmit` / `next lint` explícitos.
- `headers()` aplica cabeceras de seguridad globales: `Strict-Transport-Security`
  (HSTS preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: strict-origin-when-cross-origin`.
- Sentry: `org/project = virtuabogado`, `hideSourceMaps`, `disableLogger`,
  `widenClientFileUpload`, `automaticVercelMonitors`.

> Efectos secundarios: instrumentación de Sentry en build; sin `next.config` no
> hay Sentry ni cabeceras de seguridad.

### 1.2 `tsconfig.json`
- `strict: true`, `noEmit: true`, `moduleResolution: "bundler"`, `target: ES2017`.
- Alias `@/* → ./src/*`.
- `include`: todo `.ts/.tsx` + `.next/types`. `exclude`: `node_modules`,
  **`scripts`**, **`migrations`**. → Los scripts y SQL no se type-checkean.

### 1.3 `eslint.config.mjs`
Flat config con `FlatCompat` extendiendo `next/core-web-vitals` y `next/typescript`.
(ejecutado por `pnpm lint` = `next lint`).

### 1.4 `src/instrumentation.ts`
`register()` importa dinámicamente:
- `sentry.server.config` si `NEXT_RUNTIME === "nodejs"`.
- `sentry.edge.config` si `NEXT_RUNTIME === "edge"`.
Los tres `sentry.*.config.ts` están en la raíz del repo.

### 1.5 `vercel.json`
Solo define **crons**: `GET /api/events/process` a las `05:35` y `17:35` UTC.
→ Drenaje programado del outbox. Ver `06-eventos.md` y `04-api.md`.

### 1.6 `prisma.config.ts`
Prisma 7: mueve la URL fuera del schema. Expone `schema: 'prisma/schema.prisma'`
y `datasource.url = process.env.DATABASE_URL`. Importa `dotenv/config`.

### 1.7 Variables de entorno (`.env.example`)
Agrupadas por dominio (todo real está en `.env` / `.env.production`):

| Grupo | Variables |
|-------|-----------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| App | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_VIDEOLLAMADAS` |
| DB | `DATABASE_URL`, `DATABASE_URL_POOLER`, `DIRECT_URL` |
| Email | `EMAIL_MASTER_ADMIN`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `RESEND_API_KEY` |
| Telegram | `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` |
| Push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` |
| Zenobank | `ZENOBANK_API_KEY`, `ZENOBANK_WEBHOOK_SECRET`, `API_URL_ZENOBANK` |
| MercadoPago | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` |
| Middleware | `ALLOWED_ORIGINS`, `RATE_LIMIT_PATHS` |
| Caché | `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Upstash Redis opcional) |

---

## 2. Middleware (borde)

### 2.1 `src/middleware.ts` (punto de entrada)
Responsabilidades:
1. **CORS**: lee `ALLOWED_ORIGINS` (soporta wildcard `*` → regex). Responde
   `OPTIONS` (preflight) y añade cabeceras CORS si el origen está permitido.
2. **Rate limiting**: token-bucket **en memoria** por IP (`RATE_LIMIT_TOKENS = 10`,
   refill 1/s, ventana 60 s). Solo se aplica a rutas cuyo prefijo esté en
   `RATE_LIMIT_PATHS`.
   > ⚠️ Si `RATE_LIMIT_PATHS` está vacío (por defecto en `.env.example`), **no
   > limita nada**. El `docs/architecture.md` lo describe como activo: impreciso.
   > Además, al ser en memoria por instancia, **no es efectivo en serverless multi-instancia**.
3. **API pública** (sin sesión): `/api/services`, `/api/webhooks`, `/api/payments`,
   `/api/exchange-rate`, `/api/display-settings` → pasan solo con CORS.
4. **Sesión**: para todo lo demás llama a `updateSession(request)`.
5. `config.matcher`: `/admin/:path*`, `/abogado/:path*`, `/mis-servicios/:path*`,
   `/api/:path*`, `/login`, `/register`, `/auth/callback`.

**Imports**: `next/server`, `@/utils/supabase/middleware`.
**Usado por**: Next.js (borde). No es importado por otro archivo.

### 2.2 `src/utils/supabase/middleware.ts` → `updateSession()`
- Crea el server client de Supabase leyendo cookies de la request y
  reescribiendo cookies en la response (patrón SSR).
- **Atajo de rendimiento**: si la ruta **no** es protegida, ni auth, ni `/api/`,
  retorna sin llamar a `supabase.auth.getUser()`.
- **`protectedRoutes`**: `/admin`→`ADMIN`, `/abogado`→`ABOGADO`,
  `/mis-servicios`→`CLIENTE`. `authRoutes`: `/login`, `/register`, `/auth/callback`.
- **Bloqueo de inactivos**: si `user.user_metadata.activo === false` → redirige a
  `/login?error=Cuenta inactivada…`.
- Sin sesión en ruta protegida → `/login`.
- Con sesión en `/login` o `/register` → redirige a su panel por rol.
- Con sesión en ruta protegida → inyecta headers `x-user-id`, `x-user-email`,
  `x-user-role` en la request (para que las APIs no repitan `getUser()`).
- Si faltan `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, **no crashea**: deja pasar.

**Imports**: `@supabase/ssr`, `next/server`. **Usado por**: `src/middleware.ts`.

> ⚠️ **Punto clave para refactor**: hay una **doble verificación de rol**. El
> middleware usa `user_metadata.rol` para redirigir, pero las APIs validan contra
> la tabla `User` (Prisma). Si ambas fuentes divergen, hay inconsistencia.

---

## 3. Prisma

### 3.1 `src/lib/prisma.ts` — cliente singleton
- Construye un `Pool` de `pg` + adaptador `PrismaPg`.
- Selección de URL por prioridad: `DATABASE_URL_POOLER` → `DATABASE_URL` →
  `DIRECT_URL`. Detecta pooler por `pooler.supabase.com` o `:6543`.
- `max` conexiones: dev `10`; prod `5` con pooler, `3` sin pooler.
  `idleTimeoutMillis 3000`, `connectionTimeoutMillis 10000`.
- En dev: log de queries por evento y **alerta de slow queries ≥ 1000 ms**.
- **Singleton global** (`globalForPrisma`) para evitar múltiples pools en HMR.

**Exports**: `prisma` (named + default). **Importado por 47 archivos** (ver §5).
Es el **god node** del proyecto.

### 3.2 `prisma/schema.prisma` — modelos
`datasource postgresql` (sin url, vive en `prisma.config.ts`). Modelos:

| Modelo | Notas clave |
|--------|-------------|
| `User` | `rol UserRole`, `telegramChatId`, `activo`, soft-delete (`deletedAt`), índices `[activo,createdAt]`, `[rol]` |
| `Service` | `precio` (USD canónico), `precio_pen?`, `is_manual_case_placeholder`, `activo` |
| `Order` | `numericId` autoincrement legible, `total`/`totalPen`/`exchangeRateUsed`, desglose financiero (`commissionAmount`, `operationalCostAmount`, `platformFeeAmount`, `taxAmount`, `netProfitAmount`), `status`, `paymentId`, `payoutId`, 9 índices |
| `PaymentMethod` | `identifier` único, `isActive`, `icon` |
| `FinancialSettings` | singleton (`whatsappPhone` mapeado, `usd_pen_fallback_rate`, `simulation_base`) |
| `DisplaySettings` | singleton `show_usd_prices` |
| `Message` | `isSystem`, `read` + `readBy String[]`, cascade al borrar Order |
| `Document` | metadata de archivo; cascade con Order |
| `Review` | 1-1 con Order (`orderId @unique`) |
| `OrderAssignmentLog` | trazabilidad de asignación/reasignación |
| `LawyerPayout` | liquidación; `PayoutStatus`; mapeada como `LawyerPayouts` |
| `PasswordResetToken` | tokens propios de reset |
| `PushSubscription` | `@@unique([userId, endpoint])` |
| `EventLog` | outbox: `type`, `payload Json`, `status`, `retries`, `maxRetries`, `scheduledAt`, `leaseUntil`, `processedAt` |

Enums: `UserRole`, `OrderStatus`, `PayoutStatus`.

> ⚠️ On-deletes sensibles: `Order.user` y `Order.service` son `Restrict`
> (no puedes borrar un usuario/servicio con órdenes). Esto explica por qué el
> borrado de clientes de prueba requirió eliminar dependencias en cascada a mano.

### 3.3 Migraciones y esquemas SQL (¡tres fuentes distintas!)
Hay **tres mecanismos** que tocan el esquema; hay que entender el reparto:

**(a) `prisma/migrations/`** (gestionadas por Prisma):
- `20260902_add_usd_pen_fallback_rate/migration.sql` → columna `usd_pen_fallback_rate`.
- `20260924_add_message_read_by/migration.sql` → columna `readBy TEXT[]`.

**(b) `migrations/*.sql`** (aplicadas **manualmente** en Supabase, comentadas como
"aplicado a producción vía pooler 2026-09-24"):
- `create_financial_settings.sql`: crea tabla `FinancialSettings` (singleton
  `…0001`), trigger `update_financial_settings_updated_at`, RLS y policies.
- `add_display_settings.sql`: crea `DisplaySettings` (singleton `…0002`),
  RLS, `REPLICA IDENTITY FULL` y la añade a `supabase_realtime`.
- `add_service_precio_pen.sql` / `add_service_placeholder_flag.sql`: columnas de `Service`.
- `enable_realtime_on_tables.sql`: añade `User, Order, Service, FinancialSettings, Message` a la publicación `supabase_realtime`.
- `security_rls.sql`: habilita RLS + policies de `User, Service, Order, Message,
  Document, Review, FinancialSettings` + `GRANT`s.

**(c) `supabase/rls_policies.sql`**: conjunto **completo y distinto** de policies
(de nombre y lógica diferentes) para 13 tablas, incluida `LawyerPayouts`,
`PushSubscription`, `PasswordResetToken`, `EventLog`, `DisplaySettings`.
Comentario: "Prisma usa `service_role` (bypassa RLS); estas policies protegen
contra acceso directo vía PostgREST con anon key".

> ⚠️ **Deuda técnica grave para refactor**: (b) y (c) definen policies con
> **nombres y semánticas solapadas** sobre las mismas tablas (`security_rls.sql`
> usa `auth.uid()` + subconsultas; `rls_policies.sql` usa `auth.role()` y
> `auth.jwt()->>'role'`). No está claro cuál está aplicada. Consolidar en un único
> archivo versionado es tarea prioritaria de `13-REFACTOR.md`.

**(d) Triggers en `scripts/*.sql`** (manuales, **fuera** de `migrations/` ni `prisma/`):
- `auto_assign_trigger.sql`: `fn_auto_assign_order()` + trigger `tr_auto_assign_order`
  `BEFORE INSERT` en `Order`. Si hay **exactamente 1** abogado activo, asigna
  `lawyerId`, pone `status='EN_PROGRESO'` y `assignedAt=NOW()`.
  > ⚠️ **Solapa con la lógica de asignación del backend** (misma regla
  > implementada en TS). Doble fuente de verdad → riesgo de doble asignación o
  > comportamiento divergente. Ver `06-eventos.md`/`08-pagos.md`.
- `supabase_trigger.sql`: `handle_new_user()` + trigger `on_auth_user_created`
  (`AFTER INSERT ON auth.users`) que inserta en `public."User"`.
  > ⚠️ **Solapa con el registro de la app** (`/api/auth/register`), que también
  > crea el usuario. A confirmar en `10-auth.md` cuál crea realmente la fila.

### 3.4 `src/lib/getFinancialSettings.ts`
- `getFinancialSettingsCached()`: lee `FinancialSettings` singleton
  (`FINANCIAL_SETTINGS_ID`), normaliza a números, cachea 30 s (`lib/cache`).
- **Imports**: `lib/prisma`, `lib/constants`, `lib/cache`.
- **Usado por**: `/api/orders/admin-create`, `/api/orders/orders.helpers`,
  `features/finance/actions/getFinancialSummary`, `features/orders/actions/getOrdersHistory`.

### 3.5 `src/lib/constants.ts`
`FINANCIAL_SETTINGS_ID = …0001`, `DISPLAY_SETTINGS_ID = …0002`.
**Usado por**: `/api/display-settings`, `/api/settings/financial`,
`processPaymentAction`, `lib/exchangeRate`, `lib/getFinancialSettings`.

---

## 4. Supabase (clientes)

Cuatro clientes, cada uno para un contexto distinto:

| Archivo | Factory | Contexto | Import externo |
|---------|---------|----------|----------------|
| `utils/supabase/server.ts` | `createClient()` (async) | Server Components / Route Handlers (cookies de `next/headers`) | `@supabase/ssr` |
| `utils/supabase/client.ts` | `createClient(remember=true)` | Browser (persistSession configurable) | `@supabase/ssr` |
| `utils/supabase/admin.ts` | `createAdminClient()` | Admin con `SUPABASE_SERVICE_ROLE_KEY` (**bypassa RLS**) | `@supabase/supabase-js` |
| `utils/supabase/middleware.ts` | `updateSession()` | Borde (ver §2.2) | `@supabase/ssr` |

**Usos (grep real):**
- `server`: 25 archivos (APIs y páginas server).
- `client`: 12 archivos (login, auth.service, chat realtime, checkout store,
  storage, realtime hooks, `lib/apiClient`).
- `admin`: 6 archivos (reset-password/confirm y CRUD de clients/lawyers/orders-admin).
- `middleware`: solo `src/middleware.ts`.

> ⚠️ **Refactor**: hay **dos funciones llamadas `createClient`** distintas
> (`server` y `client`) con la misma firma semántica pero distinto retorno. Es
> una fuente de confusión de imports; el grafo lo marca como god node
> (`createClient()` 58 aristas). Considerar renombrar (`createServerSupabase` /
> `createBrowserSupabase`).

---

## 5. Tipos de dominio base

### `src/shared/types/entities.types.ts`
- `enum UserRole`, `enum OrderStatus` (**duplican** los enums de Prisma).
- Interfaces frontend-safe: `Servicio` (con campos opcionales ambiguos
  `nombre`/`titulo`, `precio`/`precioPen`), `User`, `Abogado`, `Cliente`, `Admin`.
- Comentario explícito: "Centralización de tipos Frontend-Safe para evitar fugas
  de Prisma".

**Importado por 32 archivos** (2º god node). Incluye páginas, hooks, stores,
componentes y hasta `lib/systemUser`.

> ⚠️ **Refactor**: `Servicio` mezcla dos formas (`nombre?` vs `titulo?`,
> `precio?` vs `precioPen?`) para compatibilidad checkout/página. Unificar el
> modelo evita bugs de precio. Además `OrderStatus`/`UserRole` deben generarse o
> reexportarse desde Prisma para no divergir.

---

## 6. Mapa de dependencias de esta capa

```
next.config.ts ─┬─► @sentry/nextjs
                └─► (build)
instrumentation.ts ─► sentry.{server,edge}.config

src/middleware.ts ─► utils/supabase/middleware.updateSession
        │                         └─► @supabase/ssr
        └─► (config.matcher)

lib/prisma (God Node, 47 importadores)
   ▲        ▲         ▲          ▲            ▲
   │        │         │          │            │
app/api/*  events/*  features/* lib/*    services/*

utils/supabase/{server,client,admin}
   server:25   client:12   admin:6   (middleware:1)

shared/types/entities.types (32 importadores)
lib/constants (5)   lib/getFinancialSettings (4)
```

**Cadenas de dependencia fundacionales:**
`app/api` → `utils/supabase/server` + `lib/prisma` + `shared/types` +
`lib/getFinancialSettings` → `lib/constants` + `lib/cache`.

---

## 7. Notas de refactor (esta capa)

1. **Consolidar migraciones/RLS**: unificar `migrations/*.sql`,
   `supabase/rls_policies.sql` y `scripts/*.sql` en un solo flujo versionado
   (`prisma migrate` + un único `schema/rls.sql`). Hoy hay policies duplicadas y
   contradictorias.
2. **Doble fuente de asignación**: trigger `fn_auto_assign_order` vs lógica TS.
   Decidir una sola (probablemente backend, por testabilidad y observabilidad).
3. **Doble creación de usuario**: trigger `handle_new_user` vs `/api/auth/register`.
4. **Enums duplicados** Prisma/TS: generar o reexportar para eliminar deriva.
5. **`createClient` x2**: renombrar para evitar ambigüedad.
6. **Rate limit en memoria**: inútil en serverless multi-instancia; si se
   necesita, mover a Upstash (`KV_REST_API_*`) o eliminarlo y documentar.
7. **`ignoreBuildErrors`/`ignoreDuringBuilds`**: activar en CI de forma explícita
   (`tsc --noEmit`, `next lint`) porque el build no los detecta.
8. **`Servicio`**: unificar contrato de precio (`precio`/`precioPen`,
   `nombre`/`titulo`).
9. **On-delete `Restrict`**: documentar el procedimiento de borrado en cascada
   manual (usado para limpiar clientes de prueba).

---

**Siguiente**: `02-lib.md` (módulos de `src/lib/`).
