# 08 — Sistema de Pagos

> Documento de comprensión profunda del **flujo de dinero** de VirtuAbogado,
> leído del código real. No repite el checkout (ver `03-checkout.md`) ni el
> catálogo de endpoints (ver `04-api-payments.md`): aquí se profundiza en la
> **orquestación financiera end-to-end** — creación de orden, congelado de tasa,
> cobro en cada pasarela, webhooks, idempotencia y asignación del abogado.
> Convenciones y glosario en `00-mapa.md`; dinero/tasa en `02-lib.md`.

---

## 1. Propósito y pasarelas

El sistema cobra un `Service` (caso legal) y, **solo tras confirmarse el pago**,
convierte la `Order` en un caso con abogado asignado. Dos proveedores, dos monedas:

| Pasarela (`PaymentMethod.identifier`) | Moneda de cobro | Modalidad | SDK/Tipo |
|---|---|---|---|
| `zenobank` | **USD** | Redirect (pestaña nueva) | REST v1 `X-API-Key` (`zenobank.service.ts`) |
| `mercadopago` | **PEN** | Embebido (Card Payment Brick) | `mercadopago` v3 (`mercadopago.service.ts`) |
| `yape` | **PEN** | Embebido (celular + OTP) | `mercadopago` v3 (`createYapePayment`) |

Los `identifier` reales los administra el admin vía CRUD (`actions/paymentMethods.ts`);
`processPaymentAction` ramifica por `identifier` (`processPaymentAction.ts:133,175,188`).

**Principio pesimista**: ninguna pasarela marca la orden como pagada desde el
cliente. La asignación de abogado se dispara únicamente por el evento
`order.payment_received` (`orderHandlers.ts:19`), emitido por:
- la respuesta **síncrona** de MercadoPago cuando devuelve `approved`
  (`payments/mercadopago/route.ts:175-180`, `payments/yape/route.ts:114-119`), o
- el **webhook** de la pasarela (fuente de verdad), o
- alternativamente por la ruta legacy `/api/orders` solo crea evento `order.created`.

---

## 2. Diagrama textual del flujo

```
Cliente (PaymentStep)
  │  handlePayment(paymentMethodId)                 usePaymentStep.ts:97
  │  rateSaw = queryClient['exchange-rate']         usePaymentStep.ts:111
  ▼
processPaymentAction({ serviceId, paymentMethodId, rateSaw })   (Server Action)
  │  auth Supabase → syncUserIdentity
  │  zero-trust: service.activo + paymentMethod.isActive
  │  freshRate = getUsdPenRate()
  │  exchangeRateUsed = min(rateSaw, freshRate) si |Δ|/fresh ≤ 0.25
  │  totalUsd / totalPen + desglose financiero
  │  CREATE Order status='PAGO_PENDIENTE', paymentId=null      processPaymentAction.ts:114
  │
  ├── identifier === 'zenobank'  ──► ZenobankService.createCheckoutSession(USD)
  │        guarda order.paymentId = session.id
  │        return { redirectUrl, order }
  │        Front: window.open + setIsWaitingForWebhook + cleanupCheckout
  │              + window.location = redirectUrl                usePaymentStep.ts:165-175
  │        Usuario paga en Zenobank ──► redirige /payment/success?orderId=
  │                                          │
  │        POST /api/webhooks/zenobank ◄─────┘ (Svix)          zenobank/route.ts
  │
  ├── identifier === 'mercadopago' ──► return { mercadopago:true, order }
  │        Front: GET /api/payments/mercadopago?orderId= (montos + payerEmail)
  │        Monta <MercadoPagoCardStep> (Brick secure fields)
  │        onSubmit → POST /api/payments/mercadopago {paymentToken,...}
  │                  → MercadoPagoService.createPayment(PEN)
  │                  → validación currency/monto
  │                  → approved: emit order.payment_received
  │                  → rejected/cancelled: PAGO_RECHAZADO
  │        Front pesimista: /payment/success | /payment/error    CardStep.tsx:109-121
  │
  └── identifier === 'yape'       ──► return { yape:true, order }
           Monta <YapeStep> (celular 9x + OTP 6 dígitos)
           mp.yape({otp,phoneNumber}).create() → token
           POST /api/payments/yape {yapeToken,deviceId}
                  → MercadoPagoService.createYapePayment(PEN)
                  → idéntico a tarjeta (approved/rejected)
           Front pesimista: /payment/success | /payment/error    YapeStep.tsx:135-145

          (webhook pendiente de cualquier pasarela también converge en
           order.payment_received → orderHandlers → asignación)
```

---

## 3. Creación de orden y congelado de tasa

### 3.1 `processPaymentAction` (ruta activa)

Archivo: `src/features/checkout/actions/processPaymentAction.ts` (`'use server'`).

Secuencia:
1. Sesión Supabase; sin usuario → `throw` (`:19-25`).
2. `syncUserIdentity(user, {}, {defaultName})` — merge de identidad (`:27-35`).
3. **Zero-trust**: `service` existe y `activo`; `paymentMethod` por
   `identifier` existe y `isActive` (`:37-53`).
4. `FinancialSettings` de la fila maestra `FINANCIAL_SETTINGS_ID`
   (`:57-59`).
5. `servicePen` = `precio_pen` canónico o `null` (`:63-66`).

**Congelado de tasa** (`:93-107`):

```ts
const freshRate = await getUsdPenRate();
const seenValid =
    typeof rateSaw === 'number' && Number.isFinite(rateSaw) && rateSaw > 0
    && Math.abs(rateSaw - freshRate) / freshRate <= 0.25;   // ±25%
const exchangeRateUsed = seenValid ? Math.min(rateSaw!, freshRate) : freshRate;
const totalUsd = servicePen ? penToUsd(servicePen, exchangeRateUsed) : roundMoney(Number(service.precio));
const totalPen = servicePen ? servicePen : usdToPen(totalUsd, exchangeRateUsed);
```

- La tasa que el cliente vio (`rateSaw`, leída del cache `['exchange-rate']`)
  se valida contra la tasa vigente con **tolerancia ±25%**
  (`processPaymentAction.ts:98-102`). Si es válida se congela **la menor**
  (`Math.min`): "jamás se cobra más de lo mostrado" (`:94-97,103`).
- Si no es válida o no existe, se congela `freshRate` (entorno seguro).
- `servicePen` canónico se guarda **exacto** en `totalPen`; el USD se deriva con
  la **misma** `exchangeRateUsed` (`:104-107`).

Se persiste la orden (`:114-128`):
`Order { userId, serviceId, paymentMethodId, total, totalPen, exchangeRateUsed,
status:'PAGO_PENDIENTE', commissionAmount, taxAmount, platformFeeAmount,
netProfitAmount }`. **No** se asigna `lawyerId` (pesimista explícito, `:82-84`).

> **Deuda detectada**: `netProfitAmount: platformFee` (`:126`) — el beneficio
> neto se iguala al fee de plataforma y **no se descuenta**
> `operationalCostAmount` (que ni se setea). Revisar con `06-finance`.
> Además `serializeFinance` se importa sin uso (`:7`) y `if (false)` es código
> muerto (`:86`).

La **idempotencia/reutilización** de orden está **desactivada a propósito**
(`:68-86`): cada intento de pago crea una orden nueva, para "registro visual de
toda intención de pago". Consecuencia: clics repetidos generan órdenes
duplicadas en `PAGO_PENDIENTE`.

### 3.2 Ruta legacy `POST /api/orders`

`src/app/api/orders/route.ts:131-200`. **No es el camino activo** (el flujo real
crea la orden en la Server Action). Aun así calcula de forma análoga:
`freshRate = getUsdPenRate()`, `servicePen` canónico, `currentPrice`/`totalPen`,
`exchangeRateUsed = freshRate` (`:148-154`), crea `PAGO_PENDIENTE` con
`paymentId: 'PAY-${Date.now()}'` (`:181`) y emite `order.created` (`:190-193`).
Es la que usa `checkoutService.createOrder` (`checkout.service.ts:120-143`),
hoy sin consumidores reales.

### 3.3 Modelo `Order`/`PaymentMethod` (Prisma)

`prisma/schema.prisma`:
- `Order.id` UUID + `numericId` autoincremental (`:55-56`); `total`
  `Decimal(10,2)`; `totalPen` `Decimal(10,2)?`; `exchangeRateUsed`
  `Decimal(10,4)?` (`:61-63`); `status OrderStatus @default(PENDIENTE)` (`:64`);
  `paymentId String?` (`:65`); `paymentMethodId String?` (`:60`); desglose
  financiero `commissionAmount/operationalCostAmount/platformFeeAmount/
  taxAmount/netProfitAmount` (`:67-71`); `assignedAt` (`:74`).
- `PaymentMethod { id, name, identifier @unique, isActive, icon? }` (`:100-108`).
- `enum OrderStatus`: `PAGO_PENDIENTE, PAID, PAGO_RECHAZADO, PENDIENTE,
  EN_PROGRESO, REVISION, COMPLETADO, CANCELADO, FALLIDO` (`:200-210`).

---

## 4. Detalle por archivo

### 4.1 Actions

**`actions/paymentMethods.ts`** — CRUD admin de pasarelas:
- `requireAdmin()`: lee Supabase server y exige `user_metadata.rol === 'ADMIN'`
  (`:9-19`). La lectura pública (`adminView=false`) filtra `isActive:true`
  (`:21-35`).
- `toggle/create/update/delete`: mutan Prisma, `revalidatePath('/servicios')` y
  `broadcastPaymentMethodUpdate` (`:37-128`). Efecto: DB + Realtime.
- `identifier` es único; el `create` mapea `P2002` a "ya existe" (`:82`).

**`actions/processPaymentAction.ts`** — ver §3.1. Importa también
`ZenobankService` y sólo lo usa para `zenobank`.

### 4.2 Services (pasarelas)

**`services/zenobank.service.ts`** — `ZenobankService` estático:
- `createCheckoutSession(request)`: POST a `API_URL_ZENOBANK` con `X-API-Key`,
  body `{ orderId, priceAmount: amount.toFixed(2), priceCurrency:'USD',
  successRedirectUrl }` (`:37-51`). **No envía `errorRedirectUrl`** aunque el
  request lo reciba y `processPaymentAction` lo pase (`:148-151`); la
  cancelación depende del webhook (ver §9).
- `verifyWebhookSignature(payload, headers)`: firma con `svix` (`:81-95`); hoy
  **no se usa** (el webhook la reimplementa, §6).

**`services/mercadopago.service.ts`** — `MercadoPagoService` estático (SDK v3):
- Cliente perezoso con `timeout 15000` e `integratorId` (`:50-67`).
- `buildPaymentBody(request, method)` común (`:73-130`):
  `transaction_amount`, `token`, `installments:1`, `payer`,
  `external_reference = orderId`, `statement_descriptor:'VirtuAbogado'`,
  `notification_url = ${APP_URL}/api/webhooks/mercadopago`; **Yape** fuerza
  `payment_method_id:'yape'` (`:97-98`); tarjeta solo envía
  `payment_method_id/payment_type_id/issuer_id` si son valores reales (nunca
  `'card'`, `:99-112`); `additional_info.items` si hay título (`:114-127`).
- `create(...)`: `idempotencyKey = ${orderId}-${paymentToken}` (`:142`) y
  `meliSessionId = deviceId` (header antifraude) (`:144-146`).
- Públicos: `createPayment` (card, `:174-176`), `createYapePayment` (yape,
  `:185-187`), `getPayment` (`:192-207`), `verifyWebhookSignature` (`:217-259`).
- **Seguridad**: el monto nunca viene del cliente (se recalcula server-side,
  comentario `:34-40`); los datos de tarjeta no tocan el server (Brick secure
  fields).

**`services/mercadopago.types.ts`** — `normalizeMercadoPagoDocType` valida
`DNI/C.E/RUC/Otro` conservando `C.E` con punto (`:16-41`). Hoy **sin
importadores** (código muerto; el Brick entrega `identification` directamente y
el server ni lo reenvía, ver `MercadoPagoCardStep.tsx:63-66`).

**`services/checkout.service.ts`** — `CheckoutService` singleton:
`registerOrLogin`, `checkUserExists`, `processPayment` (**mock**, `:106-115`),
`createOrder` (ruta legacy `/api/orders`, `:120-143`), `sendConfirmationEmail`
(**no-op**, `:145-147`). `EmailNotConfirmedError` (`:20-27`). No participa del
cobro real.

### 4.3 Hooks (ViewModel)

- **`hooks/usePaymentStep.ts`** — ver `03-checkout.md` §4.4; clave aquí:
  persiste `virtuabogado_pending_order` (`:50-57`), polling `useOrderStatus`
  (`:59`), al `isPaid` invalida órdenes + limpia storage + `reset()` +
  `/mis-servicios` (`:78-93`); `handlePayment` obtiene montos del endpoint GET
  de MP antes de montar el paso embebido (`:133-153`).
- **`hooks/useOrderStatus.ts`** — `useQuery(['order',...,'status'])` con
  `refetchInterval: 500` ms, `retry:3`, `staleTime:0` (`:14-28`).
- **`hooks/usePaymentMethods.ts`** — `useQuery(['PaymentMethod', adminView]) →
  getPaymentMethodsAction`, `staleTime:0`, `refetchOnWindowFocus` (`:6-13`).
- **`hooks/useMercadoPago.ts`** — carga el SDK JS `js/v2` una sola vez
  (`:31-59`), `mountCardBrick` monta el `cardPayment` Brick con
  `min/maxInstallments:1` (`:79-119`), `loadSecurityScript`
  (`security.js` → `MP_DEVICE_SESSION_ID`) (`:127-141`).

### 4.4 Components (View)

- **`components/PaymentStep.tsx`** — selector de pasarelas; si
  `activeMercadoPago` renderiza `YapeStep` o `MercadoPagoCardStep`
  (`:30-49`); pantalla de espera de webhook con `isPaid` (`:65-109`).
- **`components/MercadoPagoCardStep.tsx`** — monta el Brick una vez
  (`hasMountedRef`, `:142-161`), `handleSubmit` envía
  `paymentToken/paymentMethodId/paymentTypeId/issuerId/deviceId/bin` a
  `/api/payments/mercadopago` (`:78-90`); **no reenvía `payer.identification`**
  para evitar `1004` (`:63-66`); navegación **pesimista** según
  `paymentStatus` (`:109-121`).
- **`components/YapeStep.tsx`** — valida celular `^9\d{8}$` y OTP `^\d{6}$`
  (`:71-72`), `mp.yape({otp,phoneNumber}).create()` → token (`:98-105`),
  `POST /api/payments/yape` (`:113-121`), navegación pesimista (`:135-145`).
- **`components/ConfirmationStep.tsx`** — UI del paso 3 (spinner "Validando
  Pago…" vs éxito), usado en la ruta legada sin redirect (`useConfirmationStep`).

---

## 5. Endpoints de cobro (detalle)

> Resumen en `04-api-payments.md` §3.1; aquí lo relevante al dinero.

**`GET /api/payments/mercadopago?orderId=`** (`payments/mercadopago/route.ts:17-56`):
sesión + `order.userId === user.id` (`:34-36`); `amountUsd = Number(order.total)`;
`amountPen = order.totalPen ?? convertUsdToPen(amountUsd)` (`:38-41`); responde
`{orderId, amountUsd, amountPen, currency:'PEN', payerEmail}` (`:43-51`).
Es el que usa `usePaymentStep` para montar el Brick.

**`POST /api/payments/mercadopago`** (`:67-204`):
- ownership + idempotencia por estado: `PAID`/`EN_PROGRESO` →
  `already_processed` (`:98-100`); otro ≠ `PAGO_PENDIENTE` → 409 (`:101-103`).
- `amountPen = order.totalPen ?? convertUsdToPen(order.total)` (`:105-107`).
- `MercadoPagoService.createPayment(...)` con payer enriquecido de
  `user_metadata` (`:113-134`); persiste `order.paymentId` (`:137-140`).
- **Anti-manipulación** (`:142-168`): exige `currency_id==='PEN'` y
  `|transaction_amount − amountPen| ≤ 0.01`; si `approved` y no coincide →
  `PAGO_RECHAZADO` + `order.status_changed` + 409.
- `approved` → `emit('order.payment_received', metadata.idempotencyKey =
  'mercadopago-sync-${payment.id}')` (`:175-180`); `rejected/cancelled` →
  `PAGO_RECHAZADO` (`:181-190`); `pending/in_process` → decide el webhook.

**`POST /api/payments/yape`** (`payments/yape/route.ts:20-141`): idéntico
cambiando `yapeToken` (`:29-33`), `createYapePayment` (`:64-76`),
`idempotencyKey='mercadopago-yape-sync-${payment.id}'` (`:118`) y
`changedBy:'mercadopago-yape'` (`:103,127`).

**`GET /api/payments/status?orderId=`** (`payments/status/route.ts:14-64`):
`dynamic='force-dynamic'`, `revalidate=0`, cabeceras no-store (`:11-12,48-51`).
**Sin auth ni ownership** (solo `orderId`). Mapea estado interno a UX:
`PAID` = `PAID|PENDIENTE|EN_PROGRESO|COMPLETADO` (`:37-41`); `ERROR` =
`PAGO_RECHAZADO|FALLIDO|CANCELADO` (`:42-46`); resto `PENDING`. Devuelve
`rawStatus` (`:57`). Ver riesgo IDOR en §9.

---

## 6. Webhooks: firma, idempotencia y efectos

Ambos webhooks convergen en el **mismo evento** `order.payment_received` y por
tanto en el mismo handler de asignación (`orderHandlers.ts:19`).

### 6.1 MercadoPago (`api/webhooks/mercadopago/route.ts:16-118`)

1. **Firma obligatoria**: `MercadoPagoService.verifyWebhookSignature(query,
   {'x-signature': signature})`; si falla → 401 (`:22-25`).
   Implementación (`mercadopago.service.ts:217-259`):
   header `x-signature = "ts=<ts>,v1=<hash>"`, manifest
   `id:<data.id>.creation_date:<ts>:`, `hash = HMAC-SHA256(
   MERCADOPAGO_WEBHOOK_SECRET, manifest)`.
   - **Riesgo**: compara con `expected === sign` (no `timingSafeEqual`, `:254`)
     y **no valida antigüedad del `ts`** (replay). Ver §9.
2. `paymentId = query['data.id'] || query.id || body.data.id || body.payment_id`
   (`:35`).
3. `getPayment(paymentId)` a la SDK (`:43`); `external_reference` = `orderId`
   (`:45`).
4. Busca orden; guard anti-duplicado `PAID`/`EN_PROGRESO` (`:51-64`).
5. Si `approved`: **`expectedPen = convertUsdToPen(order.total)`** (tasa
   **fresca**, no el `totalPen` congelado) y valida currency/monto; si no
   coincide → `PAGO_RECHAZADO` + `order.status_changed` +
   `{status:'amount_mismatch'}` (`:68-91`). Si coincide → `emit
   'order.payment_received'` con `idempotencyKey='mercadopago-webhook-${payment.id}'`
   (`:93-101`).
6. `rejected`/`cancelled`/`charged_back` → `PAGO_RECHAZADO` +
   `order.status_changed` (`:102-111`).

> ⚠️ Diferencia con las rutas síncronas (que usan `order.totalPen` congelado):
> el webhook recalcula con la tasa del día. Si la tasa cambió desde la creación,
> puede rechazar un pago correcto (§9).

### 6.2 Zenobank (`api/webhooks/zenobank/route.ts:9-85`)

1. Exige `svix-id`, `svix-timestamp`, `svix-signature` (`:10-16`); sin
   `ZENOBANK_WEBHOOK_SECRET` → 500 (`:18-22`).
2. **Firma Svix**: `new Webhook(secret).verify(payload, headers)` (`:31-39`),
   firma inválida → 401. Está **duplicada** respecto de
   `ZenobankService.verifyWebhookSignature` (`zenobank.service.ts:81-95`).
3. `orderId` de múltiples formas: `data.orderId`, `data.order_id`, `evt.orderId`,
   `data.metadata.orderId` (`:43`); `paymentId = data.id || evt.id` (`:44`).
4. `checkout.completed`/`payment.succeeded`: guard `PAID`/`EN_PROGRESO` (`:58-60`)
   y `emit('order.payment_received', metadata.idempotencyKey='${type}-${paymentId}')`
   (`:62-66`).
5. `payment.failed`/`checkout.expired`/`checkout.canceled` → `PAGO_RECHAZADO` +
   `order.status_changed` (`:68-78`).

### 6.3 Idempotencia — realidad

- **`idempotencyKey` NO se persiste**: `emit()` sólo guarda `type`, `payload` y
  `status` (`eventBus.ts:10-17`); ignora `event.metadata`. Los hashes
  (`mercadopago-sync-*`, `mercadopago-webhook-*`, `<type>-<paymentId>`) son
  decorativos.
- La deduplicación real depende de:
  - **guards de estado** en cada webhook/ruta (`PAID`/`EN_PROGRESO` → ya
    procesado), que son un **check-then-act no atómico**; y
  - el **CAS por lease** del procesador de eventos (`processor.ts:claimEvent`).
- El `idempotencyKey` de la SDK de MP (`${orderId}-${paymentToken}`,
  `mercadopago.service.ts:142`) sí lo aplica MercadoPago (esa sí es idempotencia
  real de la pasarela).

### 6.4 Efectos del evento `order.payment_received` (`orderHandlers.ts:19-83`)

1. Re-guard `PAID`/`EN_PROGRESO` → salir (`:35-37`).
2. Lista abogados activos (`rol='ABOGADO', activo:true`) (`:39-42`).
3. **Asignación** (`:44-56`):
   - `activeLawyers.length === 1` → **auto-asignación** a ese abogado y estado
     `EN_PROGRESO` (`assignedAt = now`).
   - Si hay **varios** (o ninguno) → `lawyerId = currentOrder.lawyerId`
     (normalmente `null`) y estado **`PENDIENTE`** (cola de asignación manual).
   - **Nunca escribe `PAID`** (`:46`).
4. `broadcastOrderUpdate(...)` → Realtime (`:61-67`).
5. Sin abogado → mensaje de sistema en el chat (`getSystemUserId`,
   `:69-76`); con abogado → `emit('order.assigned')` (`:77-82`), cuyo handler
   (`:85-115`) hace broadcast con `isNewAssignment:true` y publica el mensaje de
   presentación del abogado.
6. `order.status_changed` (`:139-156`) propaga el estado por broadcast.

> **Nota**: la asignación en JS (`orderHandlers.ts:44-56`) **duplica** el trigger
> SQL `fn_auto_assign_order` (ver `01-fundacionales.md`). Dos fuentes de verdad.

---

## 7. Estados de pago y páginas de resultado

### 7.1 Transiciones reales

```
(creación) ─► PAGO_PENDIENTE
                  │
      ┌───────────┴────────────────────────────┐
      │ confirmado (evento order.payment_received)│ rechazado
      ▼                                            ▼
  1 abogado activo → EN_PROGRESO              PAGO_RECHAZADO
  varios/ninguno   → PENDIENTE
      │                                            │
      └─► REVISION ─► COMPLETADO                    └─► (terminal)
CANCELADO / FALLIDO = terminales de excepción
```

`PAID` existe en el enum pero **el handler no lo escribe**; el guard
`status==='PAID'` de rutas/webhooks es prácticamente inalcanzable salvo escritura
externa (`[A verificar]`). Ver `04-api-payments.md` §7.10.

### 7.2 Páginas de resultado

- **`/payment/success`** (`app/payment/success/page.tsx`): `useOrder` con
  `refetchInterval` 3 s mientras `PAGO_PENDIENTE` (`:20-26`); `cleanupCheckout`
  al montar (`:31-33`); timeout 30 s → "Demora en la Verificación" (`:48-58`);
  `isApproved` (`PAID|EN_PROGRESO|COMPLETADO`, `:40`) redirige a
  `/mis-servicios` a los 3 s (`:60-67`); `isFailed` muestra "Pago Rechazado"
  (`:42,181-211`). Distingue textos/logo por `paymentMethodIdentifier`
  (`mercadopago`/`yape`/zenobank, `:44-46`).
- **`/payment/error`** (`app/payment/error/page.tsx`): mapea `status_detail` de
  MP a mensajes en español (`getCardErrorMessage`, `:27-49`); botón "Intentar
  con otro método" reabre checkout con el mismo servicio en paso 2
  (`:61-80`); `cleanupCheckout` al montar (`:55-57`).
- **`/compra-exitosa`** (`app/compra-exitosa/page.tsx`): página **simulada**
  con datos hardcodeados (`:22-34`), no vinculada al flujo real.
- **`/error-pago`** (`app/error-pago/page.tsx`): página **legacy/estática**
  (usa `EUR`, códigos tipo `insufficient_funds`, `analytics`/`cartRecovery`);
  no forma parte del flujo actual.

---

## 8. Mapa de dependencias

### 8.1 Importa (salientes)

- Pasarelas: `mercadopago` (SDK v3), `svix`, `crypto`, `fetch` nativo (Zenobank).
- Infra: `@/lib/prisma`, `@/utils/supabase/server`, `@/events/eventBus`,
  `@/lib/broadcast`, `@/lib/finance` (`serializeFinance`), `next/cache`.
- Dinero/tasa: `@/lib/exchangeRate` (`getUsdPenRate`, `convertUsdToPen`),
  `@/lib/money` (`usdToPen`, `penToUsd`, `roundMoney`), `@/lib/servicePrice`.
- Dominio: `@/services/identity.service`, `@/services/finance.service`,
  `@/lib/constants` (`FINANCIAL_SETTINGS_ID`), `@/events/handlers/*`,
  `@/features/orders` (`ORDER_KEYS`), `@/features/auth`, `@/features/services`.
- Cliente: `react`, `@tanstack/react-query`, `sonner`, `framer-motion`.

### 8.2 Es importado por (entrantes)

| Consumidor | Qué usa |
|---|---|
| `features/checkout/hooks/usePaymentStep.ts` | `processPaymentAction`, `useOrderStatus`, `usePaymentMethods` |
| `components/MercadoPagoCardStep.tsx` | `useMercadoPago`, `cleanupCheckoutAfterPayment` |
| `components/YapeStep.tsx` | `cleanupCheckoutAfterPayment` |
| `app/api/payments/{mercadopago,yape}/route.ts` | `MercadoPagoService` |
| `app/api/webhooks/mercadopago/route.ts` | `MercadoPagoService` |
| `actions/processPaymentAction.ts` | `ZenobankService` |
| `events/handlers/orderHandlers.ts` | evento `order.payment_received` (asignación) |
| `app/payment/success/page.tsx`, `app/payment/error/page.tsx` | `cleanupCheckoutAfterPayment`, `useOrder` |
| `components/admin/hooks/useMetodosPagoPanel.ts` | `usePaymentMethods` + CRUD de pasarelas |

### 8.3 Dependencias internas del módulo dinero

```
exchangeRate.getUsdPenRate ─┬─► processPaymentAction (congelado)
                            ├─► api/orders (legacy)
                            └─► convertUsdToPen (webhooks/rutas MP)
money.usdToPen/penToUsd/roundMoney ─► processPaymentAction, api/orders, servicePrice
servicePrice ─► display (ServiceSummary), no en creación de orden
```

---

## 9. Notas de refactor / deuda / riesgos

1. **`idempotencyKey` no persistida**: `emit()` ignora `event.metadata`
   (`eventBus.ts:10-17`). La dedupe es un **check-then-act** sobre `order.status`
   no atómico (`webhooks/*`, `payments/*`); dos notificaciones concurrentes
   pueden pasar el guard y disparar **doble `order.payment_received`**
   (asignación/notificación duplicada). Mitigar con `UPDATE … WHERE
   status='PAGO_PENDIENTE'` condicional o `idempotencyKey` único persistido.
2. **Webhook MercadoPago usa tasa fresca**: `convertUsdToPen(order.total)`
   (`webhooks/mercadopago/route.ts:69`) en vez de `order.totalPen` congelado.
   Una variación de tasa puede marcar `PAGO_RECHAZADO` un pago válido.
   Alinear con `order.totalPen ?? convertUsdToPen(order.total)`.
3. **Firma MercadoPago no constante en tiempo + sin anti-replay**:
   `expected === sign` (`mercadopago.service.ts:254`) y no se valida la
   antigüedad de `ts`. Usar `crypto.timingSafeEqual` y rechazar `ts` viejo.
4. **Verificación Svix duplicada**: `webhooks/zenobank/route.ts:31` reimplementa
   `ZenobankService.verifyWebhookSignature` (`zenobank.service.ts:81-95`).
   Centralizar.
5. **Zenobank sin `errorRedirectUrl`**: el body solo envía `successRedirectUrl`
   (`zenobank.service.ts:37-42`), aunque `processPaymentAction` pasa
   `redirectUrls.error` (`:148-151`). Cancelación depende del webhook; sin él no
   hay retorno explícito al `/payment/error`.
6. **IDOR en `/api/payments/status`**: sin sesión ni ownership; cualquiera con
   el UUID ve `status`/`rawStatus` (`payments/status/route.ts:14-59`). Exigir
   sesión + `order.userId===user.id` o token firmado.
7. **`processPaymentAction` sin idempotencia activa**: cada clic crea una orden
   `PAGO_PENDIENTE` nueva (bloque deshabilitado `:68-86`). Riesgo de órdenes
   basura y de pagos múltiples por token distinto.
8. **`netProfitAmount = platformFee`** (`processPaymentAction.ts:126`):
   `netProfitAmount` no descuenta costos operativos (`operationalCostAmount` ni
   se asigna). La ruta legacy sí usa el split real
   (`api/orders/route.ts:182-185`, `calculateOrderFinances`). Divergencia de
   cálculo entre flujo activo y legacy. **A verificar** contra `06-finance`.
9. **`PAID` inalcanzable / guard muerto**: el handler escribe
   `EN_PROGRESO`/`PENDIENTE` (`orderHandlers.ts:46`), no `PAID`; los guards
   `PAID` de webhooks/rutas quedan sin uso real. `[A verificar]`.
10. **Doble fuente de asignación**: `orderHandlers.ts:44-56` vs trigger SQL
    `fn_auto_assign_order`. Riesgo de comportamiento divergente.
11. **`as any` en Prisma** en todas las rutas de pago (`payments/*`,
    `webhooks/*`): anula el tipado (`totalPen`, `lawyerId`, etc. no se validan
    en compilación).
12. **Código muerto**: `mercadopago.types.ts` sin importadores;
    `checkout.service.ts` (`processPayment` mock, `createOrder` legacy,
    `sendConfirmationEmail` no-op); `ZenobankService.verifyWebhookSignature` no
    usado; en `processPaymentAction` el import `serializeFinance` (`:7`) y el
    `if (false)` (`:86`).
13. **Polling agresivo**: `useOrderStatus` con `refetchInterval: 500` ms
    (`useOrderStatus.ts:24`) pese al comentario "3 segundos"; junto con
    `/payment/success` (3 s) puede saturar `/api/payments/status`.
14. **Páginas legacy fuera del flujo**: `/compra-exitosa` (simulada) y
    `/error-pago` (EUR/analytics) no deben enlazarse como destinos reales.

---

**Siguiente**: `09-notificaciones.md` (Push VAPID + Telegram).
