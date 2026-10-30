# 04b — API Routes (pagos, webhooks, eventos, notificaciones)

> Documento de la serie `docs/codebase/`. Complementa `04-api.md` (endpoints de
> dominio: orders, clients, services, auth…). Aquí solo **pagos, webhooks,
> outbox, notificaciones y el callback de auth**. Cada afirmación procede de leer
> el código real; se cita `ruta:línea`.
>
> Pre-requisitos: `00-mapa.md` (ciclo de `Order`), `01-fundacionales.md`
> (middleware, Prisma, Supabase), `02-lib.md` (`broadcast`, `telegram`,
> `push-notifications`, `cronAuth`, `exchangeRate`). No se repiten.

---

## 1. Contexto común

### 1.1 Middleware y clasificación de rutas

`src/middleware.ts:93-101` declara **API pública sin sesión**:

```
['/api/services', '/api/webhooks', '/api/payments', '/api/exchange-rate', '/api/display-settings']
```

Consecuencia: los prefijos `/api/webhooks/*` y `/api/payments/*` **no pasan por
`updateSession`**; cada handler hace su propia autenticación (firma de pasarela o
`supabase.auth.getUser()`). El resto de rutas `/api/*` sí pasan por
`updateSession` (que inyecta `x-user-id/email/role`), pero solo bloquea las
`protectedRoutes` (`01-fundacionales.md` §2.2). Por eso:

- `/api/events/*` → middleware normal + `isCronAuthorized` en el handler.
- `/api/notifications/*` → middleware normal; la sesión la valida el handler.
- `/api/notifications/telegram/webhook` → **no** está en `publicApiPaths`, pero no
  es ruta protegida: llega sin sesión y el handler no la exige.

### 1.2 Patrón repetido: cast `as any` de Prisma

Todas las rutas de pagos y notificaciones usan:

```
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
```

(p. ej. `payments/mercadopago/route.ts:2-3`, `payments/yape/route.ts:2-3`,
`payments/status/route.ts:2-3`, `webhooks/mercadopago/route.ts:2-3`,
`webhooks/zenobank/route.ts:2-3`). **Pierde el tipado** de Prisma; los campos
(`totalPen`, `lawyerId`, `numericId`…) no se validan en compilación. Ver §7.

### 1.3 Emisión de eventos

`emit()` (`src/events/eventBus.ts:10-25`) es la puerta única: inserta un
`EventLog` (`pending`), y luego `schedule()` decide el despacho (inline/`after()`
/`none`). Los webhooks y las rutas de pago emiten `order.payment_received` y
`order.status_changed`, que consumen los handlers de `src/events/handlers/`
(§5).

---

## 2. Tabla resumen

| Método | Ruta | Auth | Modelos (Prisma) | Eventos emitidos | Notas |
|--------|------|------|------------------|------------------|-------|
| GET | `/api/payments/mercadopago` | Supabase session + `order.userId === user.id` | `Order` | — | Devuelve montos USD/PEN del Brick |
| POST | `/api/payments/mercadopago` | Supabase session + ownership + estado `PAGO_PENDIENTE` | `Order`, `Service` | `order.payment_received`, `order.status_changed` | `maxDuration=60`; monto server-side |
| POST | `/api/payments/yape` | Supabase session + ownership + estado `PAGO_PENDIENTE` | `Order`, `Service` | `order.payment_received`, `order.status_changed` | Igual que tarjeta pero `payment_method_id:'yape'` |
| GET | `/api/payments/status` | **NINGUNA** (pública, solo `orderId`) | `Order` (`select status`) | — | Polling UX; `force-dynamic`; **IDOR** (§7) |
| POST | `/api/webhooks/mercadopago` | Firma HMAC MercadoPago (`x-signature`) | `Order` | `order.payment_received`, `order.status_changed` | Pública (middleware); fuente de verdad |
| POST | `/api/webhooks/zenobank` | Firma Svix (`svix-id/timestamp/signature`) | `Order` | `order.payment_received`, `order.status_changed` | Pública (middleware); fuente de verdad |
| GET/POST | `/api/events/process` | `isCronAuthorized` (`CRON_SECRET`) | `EventLog` | (drena eventos) | Cron Vercel 05:35 y 17:35 UTC |
| POST | `/api/events/cleanup` | `isCronAuthorized` | `EventLog` | — | Borra completados >7 d y fallidos agotados |
| POST | `/api/events/retry` | `isCronAuthorized` | `EventLog` | re-emite el evento fallido | Body `{ id }` |
| GET | `/api/events/failed` | `isCronAuthorized` | `EventLog` | — | Lista hasta 50 fallidos reintentables |
| POST | `/api/notifications/subscribe` | Supabase session | `PushSubscription` | — | Upsert por `@@unique([userId, endpoint])` |
| POST | `/api/notifications/unsubscribe` | Supabase session | `PushSubscription` | — | `deleteMany` por endpoint |
| GET | `/api/notifications/telegram/chat` | Supabase session | `User` | — | Devuelve `telegramChatId` |
| POST | `/api/notifications/telegram/chat` | Supabase session (**sin check de rol**) | `User` | — | Comentario dice solo ADMIN/ABOGADO; no se aplica |
| POST | `/api/notifications/telegram/webhook` | Secret header Telegram **si** `TELEGRAM_WEBHOOK_SECRET` existe | — | — | Sin secret → **fail-open** |
| GET | `/auth/callback` | Pública (token/code de Supabase) | `User` (vía Supabase Auth) | — | `verifyOtp` signup o `exchangeCodeForSession` |

---

## 3. Detalle por endpoint

### 3.1 Payments

#### `GET /api/payments/mercadopago` — montos para el Brick
`src/app/api/payments/mercadopago/route.ts:17-56`

1. Sesión Supabase; sin usuario → 401 (`:19-23`).
2. `orderId` por query; faltante → 400 (`:25-28`).
3. Busca la orden; no existe → 404; **`order.userId !== user.id` → 403**
   (`:30-36`).
4. Monto: `amountUsd = Number(order.total)`; `amountPen` usa el **congelado**
   `order.totalPen` y, si es legacy (`null`), recalcula con
   `convertUsdToPen` (`:38-41`).
5. Responde `{ orderId, amountUsd, amountPen, currency:'PEN', payerEmail }`
   serializado con `serializeFinance` (`:43-51`).

**Consumidor**: `usePaymentStep.ts:135` (carga de montos antes de renderizar el
Brick).

#### `POST /api/payments/mercadopago` — tarjeta (Checkout Bricks)
`src/app/api/payments/mercadopago/route.ts:67-204`

1. Sesión + ownership + guardas de estado:
   - `PAID`/`EN_PROGRESO` → `{ received:true, status:'already_processed' }`
     (idempotencia por estado, `:98-100`).
   - distinto de `PAGO_PENDIENTE` → 409 (`:101-103`).
2. `amountPen = order.totalPen ?? convertUsdToPen(order.total)` (`:105-107`).
3. Carga `Service` para descripción (`:110`).
4. `MercadoPagoService.createPayment(...)` con `payer` enriquecido desde
   `user.user_metadata` (`:113-134`). El body real se construye en
   `features/checkout/services/mercadopago.service.ts:73-130`
   (`external_reference = orderId`, `notification_url = /api/webhooks/mercadopago`).
5. Persiste `order.paymentId` (`:137-140`).
6. **Anti-manipulación**: valida `currency_id==='PEN'` y
   `|transaction_amount − amountPen| ≤ 0.01`; si `approved` y no coincide →
   `PAGO_RECHAZADO` + `order.status_changed` + 409 (`:142-168`).
7. Según `payment.status`:
   - `approved` → `emit('order.payment_received', {…},
     metadata:{ idempotencyKey:`mercadopago-sync-${payment.id}` })`
     (`:175-180`).
   - `rejected`/`cancelled` → `PAGO_RECHAZADO` + `order.status_changed`
     (`:181-190`).
   - `pending`/`in_process` → decide el webhook (`:191`).

**Consumidor**: `MercadoPagoCardStep.tsx:78`.

#### `POST /api/payments/yape` — Yape (Checkout API)
`src/app/api/payments/yape/route.ts:20-141`. Idéntico a tarjeta cambiando:

- Body espera `yapeToken` (`:29-33`).
- `MercadoPagoService.createYapePayment` (`:64-76`), que fija
  `payment_method_id:'yape'` (`mercadopago.service.ts:97-98`).
- `metadata.idempotencyKey = 'mercadopago-yape-sync-${payment.id}'` (`:118`).
- `changedBy:'mercadopago-yape'` en los `order.status_changed` (`:103,127`).

**Consumidor**: `YapeStep.tsx:113`.

#### `GET /api/payments/status` — polling de reconciliación
`src/app/api/payments/status/route.ts:14-64`

- `dynamic='force-dynamic'`, `revalidate=0` (`:11-12`) y cabeceras
  `no-store/no-cache` (`:48-51,59`).
- **No valida sesión ni propiedad**: solo `orderId` (`:15-19`). Devuelve
  `status` mapeado a UX (`PENDING`/`PAID`/`ERROR`), `rawStatus` y `orderId`
  (`:32-59`). `PAID` agrupa también `PENDIENTE`, `EN_PROGRESO`, `COMPLETADO`
  (`:37-41`); `ERROR` agrupa `PAGO_RECHAZADO`, `FALLIDO`, `CANCELADO` (`:42-46`).

**Consumidor**: `useOrderStatus.ts:19` (polling del checkout).

### 3.2 Webhooks

#### `POST /api/webhooks/mercadopago`
`src/app/api/webhooks/mercadopago/route.ts:16-118`

1. Firma obligatoria:
   `MercadoPagoService.verifyWebhookSignature(query, { 'x-signature' })`
   (`:22-25`); si falla → 401. Implementación en
   `mercadopago.service.ts:217-259`:
   `x-signature = "ts=<ts>,v1=<hash>"`, manifest
   `id:<data.id>.creation_date:<ts>:`, `HMAC-SHA256(MERCADOPAGO_WEBHOOK_SECRET)`.
2. `paymentId = query['data.id'] || query.id || body.data.id || body.payment_id`
   (`:35`).
3. `getPayment(paymentId)` a la SDK (`:43`); `external_reference` = `orderId`
   (`:45`).
4. Busca la orden; guard anti-duplicado `PAID`/`EN_PROGRESO` (`:51-64`).
5. Si `approved`: recalcula `expectedPen = convertUsdToPen(order.total)` y valida
   currency/monto; si no coincide → `PAGO_RECHAZADO` + `order.status_changed` +
   `{status:'amount_mismatch'}` (`:68-91`). Si coincide → `emit`
   `order.payment_received` (`idempotencyKey = 'mercadopago-webhook-${payment.id}'`)
   (`:93-101`).
6. `rejected`/`cancelled`/`charged_back` → `PAGO_RECHAZADO` +
   `order.status_changed` (`:102-111`).

> ⚠️ Usa `convertUsdToPen(order.total)` (tasa **fresca**) en vez de
> `order.totalPen` congelado; si la tasa cambió desde la creación, puede rechazar
> un pago correcto. **A verificar** (§7).

#### `POST /api/webhooks/zenobank`
`src/app/api/webhooks/zenobank/route.ts:9-85`

1. Exige `svix-id`, `svix-timestamp`, `svix-signature` (`:10-16`); sin
   `ZENOBANK_WEBHOOK_SECRET` → 500 (`:18-22`).
2. Verifica con `new Webhook(secret).verify(payload, headers)` de `svix`
   (`:31-39`); firma inválida → 401.
3. Extrae `orderId` de múltiples formas (`data.orderId`, `data.order_id`,
   `evt.orderId`, `data.metadata.orderId`) (`:43`).
4. `checkout.completed`/`payment.succeeded`: guard `PAID`/`EN_PROGRESO` y
   `emit('order.payment_received', …, idempotencyKey:'${type}-${paymentId}')`
   (`:47-66`).
5. `payment.failed`/`checkout.expired`/`checkout.canceled` →
   `PAGO_RECHAZADO` + `order.status_changed` (`:68-78`).

> La verificación Svix está **duplicada**: esta ruta instancia `Webhook`
> directamente en lugar de usar `ZenobankService.verifyWebhookSignature`
> (`zenobank.service.ts:81-95`). Dos fuentes de verdad (§7).

### 3.3 Events / outbox

#### `GET|POST /api/events/process`
`src/app/api/events/process/route.ts:9-46`

- `isCronAuthorized` (`:18-20`). `maxDuration=60`, `dynamic='force-dynamic'`.
- `claimAndProcessBatch()` (procesador, §5) y limpieza oportunista
  `cleanupOldEvents(7)` + `cleanupAllFailed()` (`:23-30`).
- `OPTIONS` responde `{ok:true}` **sin auth** (`:44-46`) — inocuo.
- **Disparado por Vercel** (`vercel.json:2-11`) a las 05:35 y 17:35 UTC.

#### `POST /api/events/cleanup`
`src/app/api/events/cleanup/route.ts:5-22`. `isCronAuthorized`; borra completados
>7 d y fallidos con `retries >= maxRetries`.

#### `POST /api/events/retry`
`src/app/api/events/retry/route.ts:5-24`. `isCronAuthorized`; body `{ id }`;
`retryEvent(id)` (`eventBus.ts:59-71`): solo si el `EventLog` está `failed`,
**re-emite un evento nuevo** con el mismo tipo/payload.

#### `GET /api/events/failed`
`src/app/api/events/failed/route.ts:5-16`. `isCronAuthorized`; devuelve
`getFailedEvents()` (máx. 50, `retries < maxRetries`) (`EventLog.ts:39-45`).

**Autorización**: `lib/cronAuth.ts:13-30` — si `CRON_SECRET` existe exige
`Authorization: Bearer <secret>` con `crypto.timingSafeEqual`; si no existe,
**solo permite fuera de producción** (fail-closed).

### 3.4 Notifications

#### `POST /api/notifications/subscribe`
`src/app/api/notifications/subscribe/route.ts:9-95`. Sesión Supabase (`:11-17`).
Valida estructura Web-Push (`endpoint`, `keys.p256dh`, `keys.auth`) (`:21-25`).
`upsert` por `userId_endpoint` (`:34-52`); si el upsert falla, **fallback** con
transacción `deleteMany + create` (`:53-69`). Modelo `PushSubscription`.

#### `POST /api/notifications/unsubscribe`
`src/app/api/notifications/unsubscribe/route.ts:5-31`. Sesión Supabase;
`prisma.pushSubscription.deleteMany({ userId, endpoint })` (`:20-25`).

**Consumidores**: `hooks/usePushNotifications.ts:34` y `:163`.

#### `GET|POST /api/notifications/telegram/chat`
`src/app/api/notifications/telegram/chat/route.ts:11-69`. Sesión Supabase en
ambos (`:13-17`, `:33-37`).

- GET: devuelve `User.telegramChatId` (`:19-24`).
- POST: vacío → borra vínculo; si no, valida `/^-?\d+$/` y actualiza
  `User.telegramChatId` (`:39-65`).

> ⚠️ El docstring dice "Solo ADMIN y ABOGADO" (`:9`) pero **no hay check de
> rol**: cualquier usuario autenticado (incl. `CLIENTE`) puede fijar su chat
> (§7).

**Consumidor**: `components/notifications/TelegramConnect.tsx:22,46,70`.

#### `POST /api/notifications/telegram/webhook`
`src/app/api/notifications/telegram/webhook/route.ts:12-58`. Webhook del bot:

- Si `TELEGRAM_WEBHOOK_SECRET` está definido, exige
  `x-telegram-bot-api-secret-token` igual; si no, **no verifica nada**
  (`:14-19`).
- Ante `/start`/`/help`/vacío responde bienvenida con el `chat_id`
  (`:33-45`); cualquier otro mensaje recuerda el ID (`:46-52`).
- No toca BD: solo informa el ID para que el usuario lo pegue en su perfil.

### 3.5 Auth callback

#### `GET /auth/callback`
`src/app/auth/callback/route.ts:39-95`. Público.

- Flujo **confirmación de cuenta**: `type==='signup'` + `token` + `email` →
  `verifyOtp({ token_hash: token, type:'signup' })` sobre cookies de la respuesta
  de redirección (`:49-67`); éxito añade `auth_success=1`; fallo →
  `auth_error=confirm_invalid` (`:69-73`).
- Flujo **code (magic link / OAuth / recovery)**: `exchangeCodeForSession(code)`
  (`:77-89`); `type==='recovery'` redirige a `/auth/reset-password` (`:78`).
- Falla total → `/` con `auth_error=1` (`:92-95`).
- `createCallbackClient` escribe cookies de sesión sobre la `NextResponse` de
  redirección (`:12-25`).

**Consumidor**: enlace del correo (`sendConfirmationEmail`) y flujos Supabase.

---

## 4. Flujo de webhook: MercadoPago vs Zenobank

Ambos convergen en el **mismo evento** `order.payment_received` y por tanto en el
mismo handler de asignación (`orderHandlers.ts:19`), garantizando paridad (§3.1,
comentarios `mercadopago/route.ts:63-65`).

```
Pasarela ──POST──► /api/webhooks/<gateway>
   │
   ├─ MercadoPago: HMAC-SHA256 de x-signature vs MERCADOPAGO_WEBHOOK_SECRET
   │   manifest = id:<data.id>.creation_date:<ts>:
   │   (mercadopago.service.ts:217-259)
   │
   └─ Zenobank: Svix verify(payload, headers) vs ZENOBANK_WEBHOOK_SECRET
       (webhooks/zenobank/route.ts:31-39)

   ▼
getPayment / parse event  → external_reference|data.orderId = orderId
   ▼
prisma.order.findUnique  ── no existe ──► 404
   ▼
guard: status ∈ {PAID, EN_PROGRESO} ? ── sí ──► already_processed (idempotencia)
   ▼ no
approved/succeeded ?
   ├─ sí → validar currency/monto → emit order.payment_received
   │        (idempotencyKey …-${payment.id})
   └─ no (rejected/cancelled/charged_back/failed/expired)
            → UPDATE Order.status = PAGO_RECHAZADO
            → emit order.status_changed

   ▼
eventBus.emit → EventLog(pending) → dispatch (inline/after)
   ▼
orderHandlers.on('order.payment_received'):
   - re-guard status PAID/EN_PROGRESO
   - 1 abogado activo → auto-asignar (EN_PROGRESO); si >1 → PENDIENTE
   - UPDATE Order { status, paymentId, lawyerId, assignedAt }
   - broadcastOrderUpdate(...)  → Realtime (firewall: ignora PAGO_PENDIENTE/RECHAZADO)
   - sin abogado → mensaje de sistema en el chat (getSystemUserId)
   - con abogado → emit 'order.assigned'
      ▼
   notificationHandlers: push (admins/abogado/cliente) + Telegram (admins/abogado)
```

Notas del flujo:

- `broadcastOrderUpdate` (`lib/broadcast.ts:137-184`) **no** notifica estados
  `PAGO_PENDIENTE`/`PAGO_RECHAZADO` (firewall) y emite a `admin-updates` +
  `global_{userId}` + `global_{lawyerId}` (fan-out acotado).
- La asignación real ocurre en `orderHandlers.ts:44-56`: `activeLawyers.length===1`
  → auto; si no, `PENDIENTE`. Esta lógica **duplica** el trigger SQL
  `fn_auto_assign_order` (`01-fundacionales.md` §3.3(d)).
- El handler **no escribe `PAID`**: salta de `PAGO_PENDIENTE` a
  `EN_PROGRESO`/`PENDIENTE`. El guard `status==='PAID'` del webhook podría ser
  prácticamente inalcanzable por esta vía. **A verificar** (¿algún endpoint pone
  `PAID`?).

---

## 5. Outbox / eventos: bus, procesador y crons

### 5.1 Bus

- `definitions.ts:1-14`: tipos `BusinessEventType` (13) y `BusinessEvent`
  (`data`, `metadata.idempotencyKey?`).
- `emit()` (`eventBus.ts:10-25`): crea `EventLog` y despacha.
- `schedule()` (`eventBus.ts:27-57`): modo `EVENT_DISPATCH` — `inline` (dev por
  defecto), `after` (prod por defecto, vía `next/server.after`), `none`.
  Si ya se está procesando en el worker, procesa directo (evita latencia).
- `retryEvent()` (`eventBus.ts:59-71`): re-emite un fallido.
- Registro de handlers: `registry.ts` (Map tipo→handlers) y `handlers/index.ts`
  importa `order/notification/broadcast/message/serviceHandlers`.

### 5.2 Procesador (`events/processor.ts`)

- `claimEvent` (`:22-41`): **CAS atómico** con `updateMany` sobre `status` y
  `leaseUntil` (`EVENT_LEASE_MS = 5 min`, `dispatch.ts:1`). Concurrencia segura.
- `runEvent` (`:43-77`): ejecuta handlers con `Promise.allSettled`; sin handlers
  → `markCompleted`; errores → `markFailed`.
- `claimAndProcessBatch` (`:84-117`): lotes (`DEFAULT_BATCH_SIZE=20`) de
  `pending`, `processing` con lease vencido y `failed` retryables.
- `drainDue` (`:129-163`): procesa el evento que originó el ciclo y barre
  vencidos dentro de un presupuesto (`30 s`, `10 iteraciones`).

### 5.3 Ciclo de vida de `EventLog` (`events/EventLog.ts`)

- `markCompleted` (`:11-16`), `markFailed` (`:18-37`) con **backoff
  exponencial** `min(30s·2^retries, 1h)` (`dispatch.ts:3-5`) e incremento de
  `retries`.
- `cleanupOldEvents(7)` (`:53-65`) borra `completed` >7 d;
  `cleanupAllFailed` (`:67-74`) borra `failed` con `retries >= maxRetries`.

### 5.4 Crons e idempotencia

- `vercel.json:2-11`: `GET /api/events/process` 05:35 y 17:35 UTC.
- **Idempotencia**: los `metadata.idempotencyKey` que emiten las rutas
  (`mercadopago-sync-*`, `mercadopago-webhook-*`, `<type>-<paymentId>`) **no se
  persisten**: `emit()` (`eventBus.ts:11-17`) solo guarda `type`, `payload` y
  `status`; ignora `event.metadata`. La deduplicación real depende de los
  **guards de estado** (`PAID`/`EN_PROGRESO`) y del CAS por lease del procesador.
  **A verificar** si existe dedupe a nivel de reconciliación (§7).

---

## 6. Telegram: webhook y vinculación de chat

```
Usuario ──/start──► Bot Telegram ──POST──► /api/notifications/telegram/webhook
                                              │ (secret_token opcional)
                                              ▼
                                       sendTelegramMessage(chatId, "Tu ID es …")
                                              ▲
Usuario copia el chat_id ─────────────────────┘
        │
        ▼
TelegramConnect.tsx ──POST /api/notifications/telegram/chat──► User.telegramChatId
        │
        ▼
notificationHandlers.telegramToAdmins / telegramToLawyer
   (filtra activo && telegramChatId != null)  ──► sendTelegramMessage(buildTelegramMessage(...))
```

- Envío: `lib/telegram.ts:15-53` (detecta 403 = bot bloqueado).
- Plantilla: `lib/telegram.ts:68-80`.
- Destinos: admins activos con chat (`notificationHandlers.ts:15-25`) y abogado
  asignado (`:28-37`).

---

## 7. Hallazgos de seguridad y refactor

1. **IDOR en `/api/payments/status`** (`payments/status/route.ts:14-46`): sin
   sesión ni ownership; cualquiera con el UUID de una orden consulta su estado
   (`rawStatus` incluido). Mitigación: exigir sesión y `order.userId===user.id`
   (o token firmado de tracking).
2. **Idempotencia aparente**: `emit()` ignora `metadata.idempotencyKey`
   (`eventBus.ts:11-17`). Los webhooks dependen de un **check-then-act** no
   atómico sobre `order.status` para deduplicar; dos notificaciones concurrentes
   de la pasarela podrían pasar el guard antes de que una actualice la orden →
   doble `order.payment_received` (asignación/notificación duplicada). Considerar
   `idempotencyKey` único persistido o `UPDATE … WHERE status='PAGO_PENDIENTE'`
   condicional.
3. **Firma MercadoPago no constante en tiempo**:
   `mercadopago.service.ts:254` compara con `expected === sign` (no
   `timingSafeEqual`) y **no valida la antigüedad de `ts`** (replay). El hash de
   los `idempotencyKey` tampoco impide reenvíos.
4. **Telegram webhook fail-open**: `telegram/webhook/route.ts:14-19` solo valida
   si `TELEGRAM_WEBHOOK_SECRET` existe. Sin la variable, cualquiera puede POSTear
   updates y provocar envíos. Igualar la política fail-closed de `cronAuth`.
5. **Falta de check de rol en telegram/chat**: el docstring promete
   ADMIN/ABOGADO (`telegram/chat/route.ts:9`) pero el código no lo aplica;
   cualquier `CLIENTE` puede vincular. Añadir verificación contra `User.rol`.
6. **Webhook MercadoPago usa tasa fresca**: `convertUsdToPen(order.total)`
   (`webhooks/mercadopago/route.ts:69`) vs. `order.totalPen` congelado que usan
   las rutas síncronas. Una variación de tasa puede marcar `PAGO_RECHAZADO` un
   pago válido. Usar `order.totalPen ?? convertUsdToPen(order.total)`.
7. **Verificación Svix duplicada**: `webhooks/zenobank/route.ts:31` reimplementa
   `ZenobankService.verifyWebhookSignature` (`zenobank.service.ts:81-95`).
   Centralizar.
8. **`as any` en Prisma** en todas estas rutas (p. ej.
   `payments/mercadopago/route.ts:3`): anula el tipado y oculta campos
   inexistentes mientras `tsc --noEmit` no falle.
9. **Doble fuente de asignación**: `orderHandlers.ts:44-56` vs trigger SQL
   `fn_auto_assign_order` (`01-fundacionales.md` §3.3(d)). Riesgo de
   comportamiento divergente.
10. **`PAID` inalcanzable / guard muerto**: el handler de
    `order.payment_received` escribe `EN_PROGRESO`/`PENDIENTE`, no `PAID`
    (`orderHandlers.ts:46-56`), dejando el guard `PAID` de webhooks/checkout
    prácticamente sin uso. **A verificar** dónde se escribe `PAID`.
11. **Rate limiting inefectivo** sobre estos endpoints: depende de
    `RATE_LIMIT_PATHS` y es en memoria (`middleware.ts:19,71-79`), no aplica a
    `/api/payments` (públicos saltan el middleware) → pagos/webhooks sin límite.

---

**Siguiente**: `05-pages.md` (páginas y layouts del App Router).
