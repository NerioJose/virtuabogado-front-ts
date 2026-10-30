# 04 — API Routes (core)

Documentación de los endpoints "core" de `src/app/api/**` leídos del **código
real**. No repite lo ya cubierto en `01-fundacionales.md` (middleware, headers
`x-user-*`, Prisma, Supabase) ni en `02-lib.md` (caché, broadcast, email, etc.).
Cuando algo se apoya en esos cimientos, se referencia el archivo, no se
re-explica.

> **Nota de método**: `emit(...)` persiste en `EventLog` y despacha por
> `after()`/inline/cron (`src/events/eventBus.ts:10`). Los eventos aquí listados
> son los `BusinessEventType` de `src/events/definitions.ts:1`.

---

## 1. Tabla resumen

| Método | Ruta | Auth / Rol real | Modelos Prisma | Eventos | Notas |
|--------|------|-----------------|----------------|---------|-------|
| GET | `/api/auth/check-user` | **Público** (sin sesión) | — (Supabase Auth admin) | — | Enumera existencia de email vía `service_role` |
| POST | `/api/auth/login` | **Público** + Turnstile + `validateEmail` | — (Supabase Auth) | — | Fija cookies de sesión |
| POST | `/api/auth/register` | **Público** (Turnstile **solo en alta nueva**) | — (Supabase Auth) | — | Service role; actúa como login sin Turnstile si credenciales válidas |
| POST | `/api/auth/reset-password/request` | **Público** | `User`, `PasswordResetToken` | — | Token UUID 15 min + Nodemailer |
| POST | `/api/auth/reset-password/confirm` | **Público** | `PasswordResetToken`, `User` | — | Update password vía Supabase admin |
| POST | `/api/auth/sync` | Sesión Supabase (`getUser`) | `User` (vía `syncUserIdentity`) | — | `force-dynamic` |
| GET | `/api/auth/validate-email` | **Público** | — | — | `runtime='nodejs'`, MX + desechables |
| GET | `/api/clients` | Headers `x-user-*` **o** sesión; **ADMIN/ABOGADO** | `User`, `Order` | — | `getCached/setCache` 10 s |
| POST | `/api/clients` | Headers **o** sesión; **ADMIN/ABOGADO** | `User` (+Auth admin) | — | `validateEmailDeliverability`; upsert por email |
| PATCH | `/api/clients/[id]` | Headers **o** sesión; **ADMIN/ABOGADO** (⚠ sin ownership) | `User` (+Auth admin) | — | Cambia email/pII; sync `activo` solo ADMIN |
| DELETE | `/api/clients/[id]` | Headers **o** sesión; **ADMIN** | `User` (+Auth admin) | — | Soft delete + `activo:false` en Auth |
| GET | `/api/lawyers` | Headers **o** sesión; **ADMIN** | `User`, `Order` | — | `getCached/setCache` 10 s |
| POST | `/api/lawyers` | Headers **o** sesión; **ADMIN** | `User` (+Auth admin) | — | Upsert por email |
| PATCH | `/api/lawyers/[id]` | Headers **o** sesión; **ADMIN** o **owner** | `User` (+Auth admin) | — | Owner puede tocar `activo` (⚠) |
| DELETE | `/api/lawyers/[id]` | Headers **o** sesión; **ADMIN** | `User` (+Auth admin) | — | Soft delete + `deletedAt` |
| GET | `/api/orders` | Sesión Supabase (helpers) — filtra por rol | `Order` | — | `maxDuration=60`; contadores solo ADMIN |
| POST | `/api/orders` | Sesión; cualquier rol | `Service`, `Order`, `User` | `order.created` | Crea `PAGO_PENDIENTE`; admin puede fijar `userId` |
| PATCH | `/api/orders` | Sesión; ADMIN / owner / abogado asignado | `Order` | `order.status_changed`, `order.assigned` | |
| DELETE | `/api/orders` | Sesión; **ADMIN** | `Order` | — | Soft delete |
| GET | `/api/orders/[id]` | **Solo sesión** (⚠ sin ownership) | `Order` | — | Acepta UUID o `numericId` |
| PATCH | `/api/orders/[id]` | **Solo sesión** (⚠ sin rol/ownership) | `Order`, `OrderAssignmentLog` | `order.assigned`, `order.reassigned`, `order.status_changed`, `order.completed` | |
| DELETE | `/api/orders/[id]` | **Solo sesión** (⚠ sin ADMIN) | `Order` | — | Soft delete |
| POST | `/api/orders/admin-create` | `x-user-role: ADMIN` **o** sesión ADMIN | `User`, `Service`, `Order` | `order.created`, `order.assigned` | Auto-asigna si 1 abogado activo |
| GET | `/api/services` | **Público** (`?all=true` para no-placeholder) | `Service` | — | `Cache-Control: no-store` |
| POST | `/api/services` | `x-user-role` **o** sesión **ADMIN** | `Service` | `service.updated` + `broadcastServiceUpdate` | |
| GET | `/api/services/[id]` | **Público** | `Service` | — | |
| PATCH | `/api/services/[id]` | `requireAdmin` (header o sesión) | `Service` | `service.updated` + broadcast | |
| DELETE | `/api/services/[id]` | `requireAdmin` | `Service` | `service.deleted` + broadcast | Soft delete |
| GET | `/api/settings/financial` | Público (datos sensibles solo ADMIN) | `FinancialSettings` | — | Caché 30 s solo públicos |
| PATCH | `/api/settings/financial` | **Solo sesión** (⚠ sin ADMIN) | `FinancialSettings` | broadcast tasa | `revalidate=3600` |
| GET | `/api/display-settings` | **Público** | `DisplaySettings` | — | `no-store` |
| PATCH | `/api/display-settings` | Sesión + rol ADMIN (DB) | `DisplaySettings` | `sendBroadcast('app-updates', 'display-settings-updated')` | |
| GET | `/api/exchange-rate` | **Público** | (vía `getUsdPenRate` → `FinancialSettings`) | — | `no-store`; nunca falla (rate null) |
| GET | `/api/documents` | **Solo sesión** (⚠ sin ownership) | `Document`, `Order` | — | Filtra por `orderId` o `lawyerId` |
| POST | `/api/documents` | Headers **o** sesión; owner/abogado/ADMIN | `Order`, `Document` | — | Crea metadata |
| DELETE | `/api/documents` | Headers **o** sesión; uploader/ADMIN | `Document` | — | Borrado duro |
| POST | `/api/storage/upload` | Sesión Supabase | — (Supabase Storage) | — | ⚠ sube a cualquier bucket/path con service role |
| GET | `/api/messages/[orderId]` | `getChatAuth` + `checkChatAccess` | `Message` | — | `maxDuration=60` |
| POST | `/api/messages/[orderId]` | `getChatAuth` + `checkChatAccess` | `Order`, `Message` | `message.sent` | ⚠ `senderId` viene del body |
| DELETE | `/api/messages/[orderId]` | `getChatAuth`; sender o ADMIN | `Message` | `message.deleted` | |
| POST | `/api/messages/[orderId]/read` | `getChatAuth` + `checkChatAccess` | `Message` | — | `readBy.push(userId)` |
| GET | `/api/messages/unread-counts` | `getChatAuth` | `Message` | — | ADMIN ve todas |

---

## 2. Detalle por endpoint

### 2.1 Dominio `auth`

#### GET `/api/auth/check-user`
- **Propósito**: decir si un email ya existe en Supabase Auth (`route.ts:23-36`).
- **Auth**: **ninguna** (público). Usa `service_role` (`route.ts:16-21`).
- **Lógica**: `supabaseAdmin.auth.admin.listUsers()` sin paginar y `some()` en
  memoria (`route.ts:28-34`). No toca Prisma.
- **Respuesta**: `{ exists: boolean }`; 400 sin `email`; 500 en error de Supabase.
- **Efectos**: ninguno (ni caché ni eventos).
- **Consumidores**: `features/checkout/services/checkout.service.ts:94`
  (`/api/auth/check-user?email=`).

#### POST `/api/auth/login`
- **Propósito**: login con email/contraseña y fijar cookies de sesión SSR.
- **Auth**: pública, pero exige **Turnstile** (`verifyTurnstile`, `route.ts:32-38`)
  y formato de email (`validateEmail`, `route.ts:23-29`).
- **Lógica**: `createServerClient` con `getAll/setAll` para recolectar cookies
  (`route.ts:41-54`); `signInWithPassword` (`route.ts:56-59`); distingue
  `email_not_confirmed` (`route.ts:63-68`).
- **Respuesta**: `{ user }` 200; 400 credenciales/confirmación/bot; 500 interno.
- **Efectos**: fija cookies de sesión en la respuesta (`route.ts:96-98`). No hay
  Prisma, eventos ni caché. No crea la fila `User` (eso es `syncUserIdentity`).
- **Consumidores**: `features/auth/services/auth.service.ts:14`.

#### POST `/api/auth/register`
- **Propósito**: alta de usuario **o** login para existentes, con service role
  para esquivar rate limits de Supabase (`route.ts:8-10`).
- **Auth**: pública. Turnstile **solo** en la rama de creación nueva
  (`route.ts:115-122`); en la rama de login/reenvío no se exige.
- **Rol**: `ABOGADO` si `rol === 'ABOGADO'`, si no `CLIENTE`
  (`route.ts:36`); solo `CLIENTE` requiere confirmación (`route.ts:37`).
- **Lógica**:
  1. `validateEmailDeliverability` (`route.ts:26`).
  2. intenta `signInWithPassword`; si acierta devuelve `isNewUser:false`
     (`route.ts:60-75`) — **actúa como login sin Turnstile**.
  3. si existe sin confirmar, reenvía enlace (`findUserByEmail` +
     `buildConfirmationUrl` + `sendConfirmationEmail`, `route.ts:78-113`).
  4. si es nuevo: `admin.createUser` con `email_confirm` según rol
     (`route.ts:124-133`); envía confirmación a clientes (`route.ts:159-182`).
- **Respuesta**: `{ user, isNewUser, requiresEmailConfirmation, emailSent? }`.
- **Efectos**: emails vía Nodemailer (`lib/emailTemplates`). No Prisma directo.
- **Consumidores**: `features/auth/services/auth.service.ts:42`,
  `features/checkout/store/checkoutStore.ts:184`,
  `features/checkout/services/checkout.service.ts:46`,
  `features/auth/hooks/useRegisterForm.ts:166`.

#### POST `/api/auth/reset-password/request`
- **Propósito**: generar token de reset y enviarlo por correo.
- **Auth**: pública.
- **Modelos**: `User` (find por email case-insensitive, `route.ts:24-26`),
  `PasswordResetToken` (deleteMany + create, `route.ts:45-53`).
- **Lógica**: solo si `userExists && activo`; token `uuidv4`, expira 15 min
  (`route.ts:41-42`); link a `/recuperar-password?token=`; Nodemailer.
- **Respuesta**: mensaje genérico anti-enumeración (`route.ts:30,35`); 500 si
  falla el correo (`route.ts:111-117`).
- **Consumidores**: `features/checkout/hooks/useUserDataStep.ts:167`,
  `app/recuperar-password/page.tsx:57`.

#### POST `/api/auth/reset-password/confirm`
- **Propósito**: canjear token y actualizar contraseña.
- **Auth**: pública (el token es la credencial).
- **Modelos**: `PasswordResetToken` (findUnique/delete), `User` (findUnique).
- **Lógica**: valida expiración (borra si expiró, `route.ts:23-26`); usa
  `createAdminClient().auth.admin.updateUserById` (`route.ts:38-48`).
- **Respuesta**: 200 / 400 / 404 / 500.
- **Consumidores**: `app/recuperar-password/page.tsx:87`.

#### POST `/api/auth/sync`
- **Propósito**: sincronizar el usuario de Supabase con la tabla `User`.
- **Auth**: sesión real vía `createClient().auth.getUser()` (`route.ts:14-19`).
- **Lógica**: toma `user_metadata` y llama `syncUserIdentity` (`route.ts:21-23`).
- **`dynamic`**: `force-dynamic` (`route.ts:5`).
- **Consumidores**: `features/auth/store/authStore.ts:160`.

#### GET `/api/auth/validate-email`
- **Propósito**: validación en vivo de email (formato + desechables + MX).
- **Auth**: pública. `dynamic='force-dynamic'`, `runtime='nodejs'`
  (`route.ts:4-5`).
- **Efectos**: fail-open (ante excepción devuelve `{ok:true}`, `route.ts:23-26`).
- **Consumidores**: `features/checkout/hooks/useUserDataStep.ts:101`,
  `features/auth/hooks/useRegisterForm.ts:109`.

---

### 2.2 Dominio `clients`

Patrón común de autorización (`/api/clients/route.ts:16-55`): primero intenta
leer `x-user-id`/`x-user-role`/`x-user-email`; si no, cae a
`createClient().auth.getUser()`; si aún no hay rol, consulta `prisma.user`.
La lista de clientes es `rol: 'CLIENTE'`.

#### GET `/api/clients`
- **Auth**: **ADMIN o ABOGADO** (`route.ts:53-55`). Cualquier otro rol → 403.
- **Modelos**: `User.findMany/count` + `Order.groupBy` (por `userId`, sumando
  `total`) (`route.ts:87-101`).
- **Query**: `page`, `limit` (máx 100), `search` (nombre/email/teléfono/id),
  `status` (`active`/`inactive`), `antiguedad` (`reciente`/`historico`, corte 30
  días) (`route.ts:57-85`).
- **Caché**: `getCached(cacheKey)` / `setCache(..., 10_000)` (`route.ts:65-68,135).
- **Respuesta**: `serializeFinance({data,total,page,limit,totalPages})`.
- **Consumidores**: `features/clients/store/clientsStore.ts:34`,
  `features/clients/services/clients.service.ts:13,31`.

#### POST `/api/clients`
- **Auth**: **ADMIN o ABOGADO** (`route.ts:175-177`).
- **Lógica**: valida email; `adminClient.auth.admin.createUser` (service role);
  si "already registered" busca el usuario y actualiza metadata/contraseña
  (`route.ts:198-232`); luego `prisma.user.upsert` por email con `rol:'CLIENTE'`
  en `create` (`route.ts:235-255`).
- **Respuesta**: el `User` de Prisma (PII incluida).
- **Consumidores**: `features/clients/services/clients.service.ts:40`.

#### PATCH `/api/clients/[id]`
- **Auth**: **ADMIN o ABOGADO** (`[id]/route.ts:46-50`). ⚠️ **No valida
  ownership**: un ABOGADO puede editar cualquier cliente (incluido `email`,
  `dni`).
- **Lógica**: campos parciales (`nombre,email,telefono,direccion,dni,activo`);
  valida email si viene. El cambio de `activo` en Auth solo se sincroniza si
  `isAdmin` (`[id]/route.ts:76-87`).
- **Modelos**: `User.update`.
- **Nota**: la respuesta fija `serviciosContratados:0, totalGastado:0`
  (`[id]/route.ts:101-102`).
- **Consumidores**: `clientsStore.ts:57`, `clients.service.ts:44`.

#### DELETE `/api/clients/[id]`
- **Auth**: **ADMIN** (`[id]/route.ts:157-159`).
- **Lógica**: soft delete (`activo:false`) y `updateUserById(..., activo:false)`
  en Auth (`[id]/route.ts:165-183`). No borra ni documentos ni PII (comentario
  engañoso en `[id]/route.ts:187`: "datos sensibles depurados").
- **Consumidores**: `clientsStore.ts:80`, `clients.service.ts:48`.

---

### 2.3 Dominio `lawyers`

Mismo patrón de headers/sesión que clients. Lista `rol: 'ABOGADO'`.

#### GET `/api/lawyers`
- **Auth**: **ADMIN** (`route.ts:52-54`).
- **Query**: `page`, `limit`, `search` (nombre/email/teléfono/matrícula),
  `especialidad`, `status` (`ACTIVO`/`INACTIVO`).
- **Modelos**: `User.findMany/count` + `Order.groupBy(['lawyerId','status'])`;
  calcula `casosActivos` (`EN_PROGRESO|REVISION|PENDIENTE|PAID`) y
  `casosCompletados` (`route.ts:84-110`).
- **Caché**: `getCached/setCache(..., 10_000)` (`route.ts:66-67,138`).
- **Respuesta**: `serializeFinance({data,total,page,limit,totalPages})`; `rating`
  fijo en 5 (`route.ts:125`).

#### POST `/api/lawyers`
- **Auth**: **ADMIN** (`route.ts:180-182`).
- **Lógica**: igual que clients POST pero `rol:'ABOGADO'`; acepta `matricula` o
  `colegiatura` (`route.ts:188`); upsert `User` (`route.ts:241-261`).
- **Consumidores**: `features/lawyers/services/lawyers.service.ts:41`.

#### PATCH `/api/lawyers/[id]`
- **Auth**: **ADMIN o owner** (`isOwner = user.id === id`, `[id]/route.ts:32-45`).
- **⚠ Gap**: el owner puede actualizar `activo` sobre sí mismo
  (`[id]/route.ts:57`) → un abogado desactivado podría reactivarse (aunque el
  middleware ya bloquea inactivos; ver `01-fundacionales.md §2.2`).
- **Modelos**: `User.update`; sync de `activo` en Auth solo si ADMIN
  (`[id]/route.ts:65-76`).
- **Consumidores**: `lawyersStore.ts:55`, `lawyers.service.ts:45`.

#### DELETE `/api/lawyers/[id]`
- **Auth**: **ADMIN** (`[id]/route.ts:137-139`).
- **Lógica**: soft delete (`activo:false, deletedAt:new Date()`) +
  `updateUserById(activo:false)` (`[id]/route.ts:143-159`).
- **Consumidores**: `lawyersStore.ts:77`, `lawyers.service.ts:49`.

---

### 2.4 Dominio `orders`

#### Helper `orders.helpers.ts`
- `getAuthUser(request)` (`orders.helpers.ts:12-20`): **solo** usa
  `createClient().auth.getUser()` y `user_metadata.rol` (default `CLIENTE`).
  **No** lee los headers `x-user-*` → inconsistencia con clients/lawyers y
  doble verificación de sesión.
- `getCachedFinancialSettings()` → `getFinancialSettingsCached()`
  (`orders.helpers.ts:22-24`).
- `formatOrderResponse(order)` (`orders.helpers.ts:26-59`): aplana `service`,
  `user`, `lawyer`, `paymentMethod`, `payout` a la forma del frontend.

#### GET `/api/orders`
- **Auth**: `getAuthUser`; scoping por rol (`route.ts:34-43`): ABOGADO →
  `where.lawyerId=user.id`; CLIENTE → `where.userId=user.id`; ADMIN puede filtrar
  por `lawyerId`/`userId`.
- **Estados**: por defecto excluye `PAGO_PENDIENTE`/`PAGO_RECHAZADO` para no-admin
  y para admin con `hidePendingPayment=true` (`route.ts:45-62`).
- **Modelos**: `Order.count/findMany/groupBy` (`route.ts:84-105`); calcula split
  por orden con `calculateOrderFinances` (`route.ts:107-113`).
- **`maxDuration`**: 60 (`route.ts:13`); `dynamic='force-dynamic'`.
- **Respuesta**: `serializeFinance({data, pagination, countsByStatus})`;
  `countsByStatus` solo ADMIN (`route.ts:120-124`).
- **Consumidores**: `features/orders/services/orders.service.ts:29`,
  `features/orders/store/ordersStore.ts:68`.

#### POST `/api/orders`
- **Auth**: `getAuthUser` (cualquier rol autenticado). ADMIN puede fijar
  `userId` destino (`route.ts:162-164`).
- **Modelos**: `Service.findUnique`, `Order.create`, `User` (vía
  `syncUserIdentity`), `FinancialSettings` (vía caché).
- **Lógica de precio**: si `precio_pen > 0` es canónico y el USD se deriva con
  `penToUsd`; si no, USD canónico (`route.ts:148-154`). Guarda `totalPen` y
  `exchangeRateUsed`. Crea estado `PAGO_PENDIENTE` con
  `paymentId = PAY-${Date.now()}` (`route.ts:180-181`).
- **Eventos**: `order.created` con `.catch(()=>{})` (fire-and-forget,
  `route.ts:190-193`).
- **Consumidores**: `features/orders/hooks/useOrders.ts:52`,
  `features/orders/services/orders.service.ts:58,99`,
  `features/checkout/services/checkout.service.ts:124`.

#### PATCH `/api/orders`
- **Auth**: `getAuthUser`; permitido si ADMIN, owner o abogado asignado
  (`route.ts:220-225`). ⚠️ Un CLIENTE owner puede cambiar el `status` de su
  propia orden sin restricción de transición (p. ej. a `COMPLETADO`).
- **Lógica**: actualiza `status` y/o `lawyerId` (+`assignedAt`). Nota: no hay
  validación de transición de estados.
- **Eventos**: `order.status_changed` (`route.ts:242-246`); `order.assigned` si
  viene `lawyerId` (`route.ts:248-253`).
- **Consumidores**: `features/orders/store/ordersStore.ts:89,121`.

#### DELETE `/api/orders`
- **Auth**: **ADMIN** (`route.ts:270-272`).
- **Lógica**: soft delete (`activo:false, deletedAt`) (`route.ts:279-282`).
- **Consumidores**: `features/orders/store/ordersStore.ts:150` (⚠ usa
  `/api/orders?id=...`, ver hallazgo).

#### GET `/api/orders/[id]`
- **Auth**: **solo comprueba que hay sesión** (`[id]/route.ts:16-24`). ⚠️ **No
  valida rol ni ownership**: cualquier usuario autenticado lee cualquier orden.
- **Acepta** UUID o `numericId` (`[id]/route.ts:26,45`).
- **Modelos**: `Order.findUnique` con `service`, `user`, `paymentMethod`.
- **Consumidores**: `features/orders/services/orders.service.ts:41`.

#### PATCH `/api/orders/[id]`
- **Auth**: **solo `supabase.auth.getUser()`** (`[id]/route.ts:86-90`); ⚠️ **sin
  rol ni ownership**. Cualquier autenticado puede asignar/reasignar abogado o
  cambiar estado de cualquier orden.
- **Campos permitidos** en update genérico: `status, reason, description`
  (`[id]/route.ts:92-98`); `lawyerId` se maneja aparte (`[id]/route.ts:112-122`).
- **Modelos**: `Order.findUnique/update`, `OrderAssignmentLog.create`.
- **Eventos**: `order.assigned`, `order.reassigned`, `order.status_changed`,
  `order.completed` (si `status==='COMPLETADO'`) (`[id]/route.ts:160-213`).
- **Consumidores**: `features/orders/hooks/useOrders.ts:90`
  (`apiClient.patch('/api/orders/${id}')`).

#### DELETE `/api/orders/[id]`
- **Auth**: **solo comprueba sesión** (`[id]/route.ts:230-238`). ⚠️ **Sin ADMIN**:
  cualquier autenticado archiva cualquier orden.
- **Lógica**: soft delete; si `id` es numérico, resuelve UUID primero
  (`[id]/route.ts:242-262`).
- **Consumidores**: `features/orders/hooks/useOrders.ts:156`.

#### POST `/api/orders/admin-create`
- **Auth**: `x-user-role: ADMIN` **o** `getUser()` con `user_metadata.rol`
  ADMIN (`route.ts:13-20`).
- **Lógica**: busca/crea cliente (crea en Auth si no existe, exige `password`,
  `route.ts:41-43`); resuelve servicio por ID o nombre (crea placeholder
  `is_manual_case_placeholder:true, activo:false`, `route.ts:85-105`); calcula
  split; **auto-asigna** si hay exactamente 1 abogado activo (`EN_PROGRESO`), si
  no `PENDIENTE` (`route.ts:117-124`). `paymentId = ADMIN-${Date.now()}`
  (`route.ts:140`).
- **Eventos**: `order.created` y `order.assigned` (`route.ts:149-163`).
- **Consumidores**: `features/orders/services/orders.service.ts:85`.

---

### 2.5 Dominio `services`

#### GET `/api/services`
- **Auth**: **público** (declarado así en middleware, `src/middleware.ts:93`).
- **Lógica**: `showAll = ?all=true` → excluye placeholders; si no, solo
  `activo:true` (`route.ts:17-21`). Mapea con `toServiceJson` y responde
  `Cache-Control: no-store` (`route.ts:23-26`).
- **Nota**: el comentario `route.ts:15-17` explica que NO se cachea a propósito.
- **Consumidores**: `features/services/services/services.service.ts:5`.

#### POST `/api/services`
- **Auth**: `x-user-role === 'ADMIN'` o sesión con rol ADMIN (`route.ts:36-43`).
- **Lógica**: `Service.create`; luego `clearCache('services-')` +
  `broadcastServiceUpdate` + `emit('service.updated')` (`route.ts:48-67`).
- **Nota de refactor**: limpia `services-` pero el GET no usa caché → llamada
  muerta.

#### GET `/api/services/[id]`
- **Auth**: público. `Service.findUnique`; 404 si no existe (`[id]/route.ts:13-32`).

#### PATCH `/api/services/[id]`
- **Auth**: `requireAdmin` (header o sesión) (`[id]/route.ts:34-40,47`).
- **Lógica**: update parcial dinámico (incluye `precioPen → precio_pen`)
  (`[id]/route.ts:55-66`); `clearCache('services-')` + broadcast +
  `service.updated`.

#### DELETE `/api/services/[id]`
- **Auth**: `requireAdmin`.
- **Lógica**: soft delete (`activo:false`); broadcast `deleted` +
  `emit('service.deleted')` (`[id]/route.ts:95-109`).

---

### 2.6 Dominio `settings` / `display` / `exchange`

#### GET `/api/settings/financial`
- **Auth**: pública; si hay sesión consulta rol en DB (`route.ts:22-29`).
- **Lógica**: lee `FinancialSettings` singleton; si no es admin devuelve
  `lawyerCommissionPercentage`, `operationalCostsPercentage`,
  `platformFeePercentage`, `simulationBase`, `usdPenFallbackRate` en **0/null**
  (solo `taxPercentage` y `whatsappPhone` se exponen) (`route.ts:72-83`).
- **Caché**: memoria 30 s solo para no-admin (`route.ts:33-40,85-87`).
- **Acceso Prisma defensivo**: `prisma.financialSettings` o `$queryRaw`
  (`route.ts:42-55`).
- **Consumidores**: `features/financial-settings/services/financial-settings.service.ts:9`.

#### PATCH `/api/settings/financial`
- **Auth**: **solo `getUser()`** (`route.ts:105-113`). ⚠️ **No verifica rol
  ADMIN**: cualquier autenticado puede cambiar comisiones, impuestos y la tasa
  `usd_pen_fallback_rate`.
- **Lógica**: `upsert` del singleton (o `$executeRaw` si falta el modelo);
  `updated_by=user.id` (`route.ts:139-170`).
- **Efectos**: `revalidatePath('/')`, `clearCache('financial-settings-ui')`,
  `clearCache('financial-settings')`, `clearExchangeRateCache()`
  (`route.ts:172-176`) y `broadcastExchangeRateUpdate` (`route.ts:198-205`).
- **`revalidate`**: 3600 (`route.ts:10`).

#### GET `/api/display-settings`
- **Auth**: **público** (`middleware.ts:93`).
- **Lógica**: lee singleton; default `showUsd=true` (`route.ts:37`); responde
  `no-store` (`route.ts:39-42`); fail-open a `{showUsd:true}` (`route.ts:43-46`).
- **Consumidores**: `features/finance/hooks/useDisplaySettings.ts:15,50`.

#### PATCH `/api/display-settings`
- **Auth**: sesión + rol `ADMIN` consultado en DB (`route.ts:57-72`). Correcto.
- **Lógica**: valida `showUsd` boolean; `upsert`; `sendBroadcast('app-updates',
  'display-settings-updated')` (`route.ts:74-113`).

#### GET `/api/exchange-rate`
- **Auth**: **público**.
- **Lógica**: `getUsdPenRate()` (manual → Frankfurter → error);
  fail-open devolviendo `rate:null` con 200 (`route.ts:18-24`); `no-store`.
- **Consumidores**: `features/finance/hooks/useExchangeRate.ts:7`.

---

### 2.7 Dominio `documents` / `storage`

#### GET `/api/documents`
- **Auth**: **solo comprueba sesión** (`route.ts:11-19`). ⚠️ **No valida
  ownership**: cualquier autenticado puede listar documentos de cualquier
  `orderId`/`lawyerId`.
- **Lógica**: requiere `orderId` o `lawyerId`; `Document.findMany` con `order`
  (`route.ts:21-42`).
- **Consumidores**: `features/documents/services/documents.service.ts:5`,
  `components/abogado/hooks/useDocumentosPanel.ts:52`,
  `components/admin/AdminSupervisionTabs.tsx:23`.

#### POST `/api/documents`
- **Auth**: owner / abogado asignado / ADMIN (`route.ts:88-103`).
- **Lógica**: valida `orderId,name,url`; crea metadata `Document` (`uploaderId`
  = usuario actual) (`route.ts:105-116`).
- **Consumidores**: `features/documents/services/documents.service.ts:11`.

#### DELETE `/api/documents`
- **Auth**: uploader o ADMIN (`route.ts:160-172`).
- **Lógica**: borrado duro `Document.delete` (`route.ts:174-176`).
- **Consumidores**: `documents.service.ts:24`,
  `AdminSupervisionTabs.tsx:140`.

#### POST `/api/storage/upload`
- **Auth**: sesión Supabase (`route.ts:7-14`).
- **Lógica**: recibe `file/bucket/path`; sube con `SUPABASE_SERVICE_ROLE_KEY`
  (`route.ts:26-38`, `upsert:true`) y devuelve `publicUrl`.
- **⚠ Gap**: no valida bucket permitido, ni extensión/tamaño, ni pertenencia del
  `path`. Cualquier autenticado puede sobrescribir objetos arbitrarios.
- **Consumidores**: `features/chat/services/chat.service.ts:88`.

---

### 2.8 Dominio `messages`

Auth común: `getChatAuth()` (`services/chat.service.ts:9-24`) usa
`getUser()` + rol de metadata o DB; `checkChatAccess(orderId, userId, role)`
(`chat.service.ts:26-36`) da acceso a ADMIN y a `order.userId`/`order.lawyerId`.

#### GET `/api/messages/[orderId]`
- **Auth**: `getChatAuth` + `checkChatAccess` (`route.ts:11-15`); `maxDuration=60`.
- **Lógica**: `Message.findMany` orden asc con `sender` (nombre/picture/rol).

#### POST `/api/messages/[orderId]`
- **Auth**: `getChatAuth` + `checkChatAccess` (`route.ts:32-45`).
- **⚠ Gap**: crea el mensaje con `senderId` tomado del **body**
  (`route.ts:36,48`) sin comprobar que coincide con `auth.user.id` → suplantación.
- **Eventos**: `message.sent` (`route.ts:54-57`).
- **Consumidores**: `features/chat/services/chat.service.ts:37`.

#### DELETE `/api/messages/[orderId]`
- **Auth**: `getChatAuth`; solo el sender o ADMIN (`route.ts:71-82`).
- **Eventos**: `message.deleted` (`route.ts:86-89`).
- **Consumidores**: `features/chat/services/chat.service.ts:103`.

#### POST `/api/messages/[orderId]/read`
- **Auth**: `getChatAuth` + `checkChatAccess`.
- **Lógica**: `updateMany` de mensajes ajenos que no contienen el userId en
  `readBy`, con `readBy.push(userId)` (`route.ts:19-26`).
- **Consumidores**: `features/chat/services/chat.service.ts:18`.

#### GET `/api/messages/unread-counts`
- **Auth**: `getChatAuth`.
- **Lógica**: `groupBy orderId` de mensajes ajenos sin `readBy`; si no es ADMIN,
  restringe a `order: {OR:[{userId},{lawyerId}]}` (`route.ts:18-31`).
- **Consumidores**: `features/chat/services/chat.service.ts:27`.

---

## 3. Patrones transversales

- **Autenticación**: dos esquemas coexisten.
  1. **headers `x-user-*`** inyectados por middleware (`clients`, `lawyers`,
     `documents`, `admin-create`, `services`), con **fallback** a
     `createClient().auth.getUser()`.
  2. **sesión directa** (`auth/sync`, `orders.helpers`, `settings/financial`,
     `display-settings`, `storage/upload`, `messages` vía `chat.service`).
  El middleware ya inyecta los headers (`01-fundacionales.md §2.2`), por lo que
  el esquema 2 repite la verificación en rutas que podrían usar el 1.
- **Autorización**: no hay un `requireAdmin` unificado; `services/[id]` define uno
  local (`[id]/route.ts:34-40`). Varias rutas confían en `x-user-role` sin
  re-verificar contra DB.
- **Manejo de errores**: patrón `try/catch` + `console.error` +
  `NextResponse.json({error}, {status})`. Algunos endpoints filtran
  `error.message` al cliente (`orders/[id]/route.ts:72,220`,
  `storage/upload/route.ts:52`, `settings/financial/route.ts:210`).
- **`dynamic` / `runtime` / `revalidate`**:
  - `force-dynamic`: `auth/sync`, `auth/validate-email`, `clients`, `lawyers`,
    `orders`, `orders/[id]`, `services`, `display-settings`, `exchange-rate`.
  - `revalidate=0`: `clients`; `revalidate=3600`: `settings/financial`.
  - `runtime='nodejs'`: `auth/validate-email`.
- **`maxDuration`**: `orders` (60), `orders/[id]` (60),
  `messages/[orderId]` (60).
- **Caché de datos**: `lib/cache` en `clients`/`lawyers` (10 s) y
  `settings/financial` (30 s público). `services` **no** cachea pero sí limpia
  (`clearCache('services-')`) → código muerto.
- **Realtime/broadcast**: `broadcastServiceUpdate` (services),
  `broadcastExchangeRateUpdate` (settings/financial),
  `sendBroadcast('app-updates', ...)` (display-settings). Además `emit()` a
  `EventLog` para order/message/service.
- **CORS**: centralizado en `src/middleware.ts` (`ALLOWED_ORIGINS`); las rutas
  públicas no lo gestionan individualmente (`01-fundacionales.md §2.1`).

---

## 4. Hallazgos de seguridad y refactor (priorizados)

1. **[CRÍTICO] PATCH `/api/settings/financial` sin rol ADMIN**
   (`settings/financial/route.ts:105-113`). Cualquier usuario autenticado puede
   alterar comisiones, impuestos y la **tasa USD→PEN** usada en todo el cobro.
   *Fix*: exigir ADMIN contra DB como en `display-settings`.
2. **[CRÍTICO] `/api/orders/[id]` (GET/PATCH/DELETE) sin ownership ni rol**
   (`[id]/route.ts:16-24,86-90,230-238`). Un autenticado puede leer, reasignar,
   cambiar estado (`COMPLETADO` → payout) o archivar cualquier orden.
   *Fix*: reutilizar `getChatAuth`/`checkChatAccess` o scoping por rol.
3. **[ALTO] POST `/api/messages/[orderId]` acepta `senderId` del body**
   (`[orderId]/route.ts:36,48)`: suplantación de identidad en el chat.
   *Fix*: forzar `senderId = auth.user.id`.
4. **[ALTO] `/api/storage/upload` sin validación de bucket/path/tamaño**
   (`storage/upload/route.ts:16-38`): subida/sobrescritura arbitraria con service
   role. *Fix*: allowlist de buckets + validar prefijo por usuario/orden.
5. **[ALTO] GET `/api/documents` sin ownership** (`documents/route.ts:11-19`):
   fuga de metadatos de documentos de cualquier caso.
6. **[ALTO] PATCH `/api/clients/[id]` permite a ABOGADO editar cualquier cliente**
   (`clients/[id]/route.ts:46-50`): modificación de PII/email por no-admin.
7. **[MEDIO] `/api/auth/check-user` público + service role**
   (`auth/check-user/route.ts`): enumeración de usuarios y `listUsers` sin filtro.
8. **[MEDIO] `/api/auth/register` actúa como login sin Turnstile** para
   credenciales válidas (`auth/register/route.ts:60-75`), debilitando el
   anti-bot del login.
9. **[MEDIO] PATCH `/api/lawyers/[id]` permite al owner tocar `activo`**
   (`lawyers/[id]/route.ts:57`) → auto-reactivación.
10. **[MEDIO] Inconsistencia headers vs sesión**: `orders.helpers.getAuthUser`
    ignora `x-user-*` (`orders.helpers.ts:12-20`) mientras clients/lawyers los
    usan. Unificar en un único `requireAuth`/`requireRole`.
11. **[MEDIO] Confianza en `x-user-role` sin re-verificar**: si una ruta se
    invoca sin pasar por middleware, el header es spoofable (services,
    admin-create, documents, clients, lawyers). *Fix*: validar siempre contra DB.
12. **[BAJO] `CLIENTE` owner puede cambiar estado de su orden** en PATCH
    `/api/orders` (`orders/route.ts:220-228`) sin máquina de estados.
13. **[BAJO] DELETE `/api/orders?id=...`**: `ordersStore.ts:150` apunta a
    `/api/orders?id=`, donde no hay handler DELETE (solo `orders/[id]`) → 405.
14. **[BAJO] `clearCache('services-')` sin caché asociada** (services POST/PATCH/
    DELETE): llamada muerta; o se implementa caché o se elimina.
15. **[BAJO] Fuga de `error.message`** al cliente en varias rutas
    (`orders/[id]`, `storage/upload`, `settings/financial`).
16. **[BAJO] Mensaje engañoso** en DELETE clients ("datos sensibles depurados",
    `clients/[id]/route.ts:187`) cuando solo se marca `activo:false`.

> Marcar **"A verificar"**: (a) si `migrations/*.sql`/`rls_policies.sql` protegen
> realmente las tablas contra PostgREST anon, dado que muchas rutas escriben con
> Prisma `service_role` (bypassa RLS); (b) la regla exacta de transición de
> `OrderStatus`, hoy sin validar en ningún endpoint.

---

## 5. Siguiente

`04-api-payments.md` (endpoints de pagos — MercadoPago/Yape/Zenobank/webhooks —
no incluidos en este documento).
