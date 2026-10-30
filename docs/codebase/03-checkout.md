# 03b — Feature: checkout

> Documento de comprensión profunda de la feature **checkout**, leído del código real.
> No repite convenciones ni glosario: ver `00-mapa.md`; para Prisma/Supabase/dinero,
> `01-fundacionales.md` y `02-lib.md`.

---

## 1. Propósito

El checkout es el **embudo de compra** de un `Service` (caso legal). Cubre tres
cosas:

1. **Identidad-first** (paso 1): detecta si el email ya existe (`CLIENTE`) o es
   nuevo, permite login/registro y exige confirmación de correo para cuentas
   nuevas.
2. **Pago** (paso 2): muestra el resumen de precio, deja elegir una pasarela
   activa y ejecuta el cobro, ya sea **redirect** (Zenobank, USD) o **embebido**
   (MercadoPago Bricks: tarjeta PEN y Yape/Plin PEN).
3. **Confirmación** (paso 3) y post-pago: espera la confirmación de la pasarela
   (webhook/polling) y limpia el estado para no reabrir el modal.

Ambos flujos son **pesimistas**: no se marca nada como pagado ni se asigna
abogado hasta la respuesta de la pasarela o del webhook. La asignación de caso
solo la dispara el evento `order.payment_received`
(`processPaymentAction.ts:82-84`).

La feature reside en `src/features/checkout/**` (MVVM: `components/` View,
`hooks/` ViewModel, `services/`+`actions/` Model, `store/` Zustand) y se monta
globalmente vía layout.

---

## 2. Inventario de archivos

| Archivo | Exports | Importadores (fuera de la feature) |
|---|---|---|
| `index.ts` | Barrel: `CheckoutLayoutWrapper`, `CheckoutModal`, `StepIndicator`, `ServiceSummary`, `UserDataStep`, `PaymentStep`, `ConfirmationStep`, `AutoLoginIndicator`, `LoadingOverlay`, `ErrorMessage`, `CartRecovery`, `useCheckout`, `useCheckoutStorage`, `useCheckoutStore`, tipos (`CheckoutStep`,`UserCheckoutData`,`PaymentData`,`PaymentMethod`,`CheckoutData`,`CheckoutState`,`OrderResponse`,`CheckoutStorageData`) | `VirtuStudents.tsx`, `useServiciosClientPage.ts`, `ServiciosClientPage.tsx` |
| `CheckoutLayoutWrapper.tsx` | `CheckoutLayoutWrapper` | `DynamicCheckoutWrapper.tsx` |
| `DynamicCheckoutWrapper.tsx` | `DynamicCheckoutWrapper` | `src/app/layout.tsx:7,147` |
| `actions/checkUserAction.ts` | `checkUserExistsAction` | `store/checkoutStore.ts` |
| `actions/paymentMethods.ts` | `getPaymentMethodsAction`, `togglePaymentMethodAction`, `createPaymentMethodAction`, `updatePaymentMethodAction`, `deletePaymentMethodAction` | `hooks/usePaymentMethods.ts`, `components/admin/hooks/useMetodosPagoPanel.ts` |
| `actions/processPaymentAction.ts` | `processPaymentAction` | `hooks/usePaymentStep.ts`, `store/checkoutStore.ts`, `PaymentSelectorModal.tsx` |
| `components/AutoLoginIndicator.tsx` | `AutoLoginIndicator` | **Ninguno** (solo barrel; huérfano) |
| `components/CartRecovery.tsx` | `CartRecovery` | `ServiciosClientPage.tsx` (+ wrapper global) |
| `components/CheckoutModal.tsx` | `CheckoutModal` | `ServiciosClientPage.tsx` (+ wrapper global) |
| `components/CheckoutStateSync.tsx` | `CheckoutStateSync` | `CheckoutLayoutWrapper.tsx` |
| `components/ConfirmationStep.tsx` | `ConfirmationStep` | interno (`CheckoutModal`) |
| `components/ErrorMessage.tsx` | `ErrorMessage` | interno (`CheckoutModal`) |
| `components/LoadingOverlay.tsx` | `LoadingOverlay` | interno (`CheckoutModal`) |
| `components/MercadoPagoCardStep.tsx` | `MercadoPagoCardStep` | interno (`PaymentStep`) |
| `components/PaymentSelectorModal.tsx` | `PaymentSelectorModal` | **Ninguno** (huérfano) |
| `components/PaymentStep.tsx` | `PaymentStep` | interno (`CheckoutModal`) |
| `components/ServiceSummary.tsx` | `ServiceSummary` | interno (`CheckoutModal`) |
| `components/StepIndicator.tsx` | `StepIndicator` | interno (`CheckoutModal`) |
| `components/UserDataStep.tsx` | `UserDataStep` | interno (`CheckoutModal`) |
| `components/YapeStep.tsx` | `YapeStep` | interno (`PaymentStep`) |
| `hooks/useCheckoutStorage.ts` | `useCheckoutStorage` | `CheckoutModal.tsx` |
| `hooks/useCheckout.ts` | `useCheckout` | múltiples componentes/hooks internos + `VirtuStudents`, `useServiciosClientPage` |
| `hooks/useConfirmationStep.ts` | `useConfirmationStep` | `ConfirmationStep.tsx` |
| `hooks/useMercadoPago.ts` | `useMercadoPago` | `MercadoPagoCardStep.tsx` |
| `hooks/useOrderStatus.ts` | `useOrderStatus` | `usePaymentStep.ts`, `useConfirmationStep.ts` |
| `hooks/usePaymentMethods.ts` | `usePaymentMethods` | `CheckoutModal.tsx`, `PaymentStep` (via `usePaymentStep`), `useMetodosPagoPanel.ts` |
| `hooks/usePaymentStep.ts` | `usePaymentStep` | `PaymentStep.tsx` |
| `hooks/useUserDataStep.ts` | `useUserDataStep` | `UserDataStep.tsx` |
| `services/checkout.service.ts` | `EmailNotConfirmedError`, `checkoutService` | `store/checkoutStore.ts` |
| `services/mercadopago.service.ts` | `MercadoPagoService` | `api/payments/{mercadopago,yape}/route.ts`, `api/webhooks/mercadopago/route.ts` |
| `services/mercadopago.types.ts` | `MercadoPagoDocType`, `normalizeMercadoPagoDocType` | **Ninguno** (código muerto hoy) |
| `services/zenobank.service.ts` | `ZenobankService` | `actions/processPaymentAction.ts` |
| `store/checkoutStore.ts` | `useCheckoutStore` | `authStore.ts`, `useGlobalChatListener.ts`, `payment/error/page.tsx`, múltiples internos |
| `types/checkout.types.ts` | `CheckoutStep`, `UserCheckoutData`, `PaymentData`, `PaymentMethod`, `PaymentMethodDB`, `PaymentRequest`, `CheckoutData`, `CheckoutState`, `OrderResponse`, `PaymentResult`, `CheckoutStorageData` | internos |
| `utils/checkoutCleanup.ts` | `cleanupCheckoutAfterPayment` | `payment/success/page.tsx`, `payment/error/page.tsx`, `MercadoPagoCardStep.tsx`, `YapeStep.tsx` |

> `DynamicCheckoutWrapper` **no** se exporta por el barrel: se importa directo en
> `src/app/layout.tsx:7`.

---

## 3. Máquina de estados / wizard de pasos

`CheckoutStep = 1 | 2 | 3` (`types/checkout.types.ts:4`):
- **1 = Identidad** (`UserDataStep`)
- **2 = Pago** (`PaymentStep`)
- **3 = Confirmación** (`ConfirmationStep`)

`CheckoutModal` solo renderiza el paso activo con `AnimatePresence`
(`CheckoutModal.tsx:208-212`) y el `StepIndicator` se pinta con `totalSteps={2}`
(`CheckoutModal.tsx:173`) — el paso 3 no se cuenta como "paso de wizard".

```
                         openCheckout(service)
                                 │
              ¿authUser logueado? ┤
                    sí ───────────┴─────────── no
                    │                            │
                 step=2                        step=1
              (prefill userData)          (identidad-first)
                    │                            │
                    │                    ┌───────┴─────────────────────────────┐
                    │                    │ debounce email: checkUserExists +    │
                    │                    │ /api/auth/validate-email             │
                    │                    └───────┬─────────────────────────────┘
                    │                            │
                    │          ┌─────────────────┼──────────────────────┐
                    │          │ existe          │ no existe            │
                    │          │ (isExistingUser)│ (registro + Turnstile)│
                    │          └────────┬────────┴──────────┬───────────┘
                    │                   │ authenticateUser() │
                    │                   │  registerOrLogin()  │
                    │         requiresEmailConfirmation?     │
                    │            sí ───► sigue step=1        │
                    │                   (pantalla "revisa    │
                    │                    tu correo")         │
                    │                    │  (vuelve con auth_success=1:
                    │                    │   CheckoutStateSync → step=2)
                    │            no ─────┴──────► step=2
                    ▼
            ┌──────────────────────── step=2: PaymentStep ───────────────────────┐
            │ handlePayment(identifier)                                          │
            │   ├─ 'zenobank'  → window.open('_blank') + processPaymentAction    │
            │   │                → setIsWaitingForWebhook(true)                  │
            │   │                → cleanupCheckoutAfterPayment()                 │
            │   │                → window.location = redirectUrl                 │
            │   ├─ 'mercadopago' → processPaymentAction → activeMercadoPago(mode card) │
            │   │                → MercadoPagoCardStep (Brick embebido)          │
            │   ├─ 'yape'      → processPaymentAction → activeMercadoPago(mode yape)│
            │   │                → YapeStep (celular+OTP)                        │
            │   └─ (sin redirectUrl) → setStep(3)  [ruta legado]                 │
            └───────────────────────────────────────────────────────────────────┘
                    │                                │
        (mercadopago/yape)                  (zenobank redirect)
        POST /api/payments/*                webhook / polling
        approved → /payment/success         /payment/success hace polling
        rejected → /payment/error           con useOrder()
```

- `openCheckout` decide el paso inicial (`checkoutStore.ts:56-113`). Si el paso
  previo fue 3 o hay `completedAt`, resetea y reabre.
- Restauración desde localStorage (`useCheckoutStorage.ts:59-117`): si hay auth
  fuerza `max(step,2)`, si no, `step=1` (seguridad).
- `CheckoutStateSync` intercepta `?auth_success=1` tras confirmar correo y abre
  directo el paso 2 sin pasar por el paso 1 (`CheckoutStateSync.tsx:37-116`).
- En pago inline, `usePaymentStep` monta `activeMercadoPago` con
  `mode: 'card' | 'yape'` y `PaymentStep` elige componente
  (`PaymentStep.tsx:30-49`).

---

## 4. Detalle por archivo

### 4.1 Actions (`'use server'`)

**`actions/checkUserAction.ts`** — `checkUserExistsAction(email)`: consulta
`prisma.user.findUnique` por email normalizado, devuelve `{exists, nombre?}`;
validación temprana de `@`. Efecto: lectura Prisma (`checkUserAction.ts:9-27`).

**`actions/paymentMethods.ts`** — CRUD de pasarelas (Server Actions):
- `requireAdmin()` privada: lee Supabase server, exige `rol === 'ADMIN'`
  (`paymentMethods.ts:9-19`).
- `getPaymentMethodsAction(adminView=false)`: lista `PaymentMethod`
  (`where: adminView ? {} : {isActive:true}`, orden por `name`)
  (`:21-35`).
- `toggle/create/update/delete...Action`: mutan Prisma, `revalidatePath('/servicios')`
  y emiten `broadcastPaymentMethodUpdate` de `@/lib/broadcast` (`:37-128`).
- **Efectos secundarios**: escritura DB + broadcast Realtime.

**`actions/processPaymentAction.ts`** — el corazón del cobro:
1. Verifica usuario Supabase; si no, lanza (`:19-25`).
2. `syncUserIdentity` para merge de identidad (`:27-35`).
3. Zero-trust: servicio existe y `activo`; método por `identifier` existe y
   `isActive` (`:37-53`).
4. Lee `FinancialSettings` de la fila maestra `FINANCIAL_SETTINGS_ID` (`:57-59`).
5. Congela montos y **crea la orden** `PAGO_PENDIENTE` (`:86-130`). El bloque de
   idempotencia/reutilización está **desactivado** a propósito (`:68-86`).
6. Ramifica por pasarela (`:133-197`):
   - `zenobank`: `ZenobankService.createCheckoutSession` (USD), guarda
     `paymentId` y devuelve `{success, redirectUrl, order}`.
   - `mercadopago`: devuelve `{success, mercadopago:true, order}` (sin redirect).
   - `yape`: devuelve `{success, yape:true, order}`.
   - otro: `throw 'Pasarela de pago no soportada.'`
- **Efectos**: DB (order), llamada HTTP a Zenobank, sync identidad.
- **Deuda**: importa `serializeFinance` sin usarlo (`:7`); el `if (false)`
  (`:86`) es código muerto.

### 4.2 Services (Model / pasarelas)

**`services/checkout.service.ts`** — `CheckoutService` (singleton
`checkoutService`) con cliente Supabase (`:30`):
- `registerOrLogin(userData)`: intenta `POST /api/auth/register`
  (Turnstile) y si es nuevo cliente devuelve `requiresEmailConfirmation`; si no,
  hace `supabase.auth.signInWithPassword`. Fallback cliente directo; mapea
  `email_not_confirmed` a `EmailNotConfirmedError` (`:36-87`).
- `checkUserExists(email)`: `GET /api/auth/check-user` (`:92-101`).
- `processPayment(request)`: **MOCK** (latencia 1.5s), no se usa en el flujo
  real (`:106-115`).
- `createOrder(orderData)`: `apiClient.post('/api/orders', ...)` (`:120-143`).
  **Nota**: el flujo activo **no** lo usa; la orden la crea
  `processPaymentAction`. Es ruta legada.
- `sendConfirmationEmail(orderId)`: **no-op** (`:145-147`).
- Exporta `EmailNotConfirmedError` (code `email_not_confirmed`).

**`services/zenobank.service.ts`** — `ZenobankService` estático:
- `createCheckoutSession(request)`: POST a `API_URL_ZENOBANK` con header
  `X-API-Key`, body `{orderId, priceAmount: amount.toFixed(2), priceCurrency:'USD',
  successRedirectUrl}` (`:27-75`). **No envía** `errorRedirectUrl` (la petición
  tiene `redirectUrls.error` pero el body solo incluye `successRedirectUrl`,
  `:37-42`).
- `verifyWebhookSignature(payload, headers)`: firma con `svix` (`:81-95`); hoy el
  webhook lo reimplementa con `Webhook` directo en
  `api/webhooks/zenobank/route.ts:31-39`.

**`services/mercadopago.service.ts`** — `MercadoPagoService` estático (SDK
`mercadopago` v3):
- Config perezosa (`getPaymentClient`) con `timeout 15000` e `integratorId`
  (`:50-67`).
- `buildPaymentBody` común a tarjeta y Yape; `notification_url` apunta a
  `/api/webhooks/mercadopago`; para Yape fuerza `payment_method_id='yape'`; para
  tarjeta solo pasa `payment_method_id/payment_type_id/issuer_id` si son reales
  (nunca `'card'`) (`:73-130`).
- `create(...)` con `idempotencyKey: orderId-paymentToken` y `meliSessionId`
  (Device ID antifraude) (`:139-169`).
- Públicos: `createPayment` (card), `createYapePayment` (yape), `getPayment`,
  `verifyWebhookSignature` (HMAC-SHA256 con manifest
  `id:<data.id>.creation_date:<ts>:`, `:217-259`).
- **Seguridad**: el monto jamás se confía del cliente; los datos de tarjeta no
  tocan el server (Brick secure fields) (`:34-40`).

**`services/mercadopago.types.ts`** — `normalizeMercadoPagoDocType` valida
`DNI/CE/RUC/Otro` (con `C.E` conservando el punto). Hoy sin importadores.

### 4.3 Store Zustand — `store/checkoutStore.ts`

`useCheckoutStore = create<CheckoutState>()` (sin middleware `persist`; la
persistencia es manual, ver §7).

Estado inicial (`getInitialState`, `:31-50`): `service`, `userData`,
`paymentData`, `paymentMethod='card'`, `orderId`, `total=0`, `step=1`,
`isOpen=false`, `isLoading`, `error`, `isExistingUser`, `existingUserId`,
`tempPassword`, `completedAt`, `isProcessingPayment`, `isWaitingForWebhook`,
`requiresEmailConfirmation`, `selectedMethod`.

Acciones clave:
- `openCheckout(service)`: si paso 3/completado → reset+reabrir; si auth →
  paso 2 con prefill; si no → paso 1 (`:56-113`). Usa `useAuthStore`.
- `closeCheckout()`: si paso 3/completado resetea, si no solo `isOpen=false`
  (`:115-122`).
- `setStep`, `setUserData` (normaliza `nombre = nombre || name`), `clearError`,
  `setPaymentData`, `setPaymentMethod`, `setSelectedMethod`,
  `setIsProcessingPayment`, `setIsWaitingForWebhook`, `setOrderId`
  (`:124-162`).
- `checkUserExists(email)`: llama `checkUserExistsAction` y setea
  `isExistingUser`/prefill (`:164-179`).
- `resendConfirmation`: `POST /api/auth/register`; si ya confirmó, login +
  `setStep(2)` (`:181-222`).
- `authenticateUser(userData)`: detecta sesión de otra pestaña y hace
  `signOut`; `registerOrLogin`; si requiere confirmación guarda
  `checkout_pending` y mantiene paso 1; si OK setea usuario global y **paso 2**
  (`:231-304`).
- `submitOrder()` (`:306-472`): **ruta legada**. Exige `paymentData` (tarjeta) y
  llama `processPaymentAction` con mapeo `card → 'mercadopago'`; hace updates
  optimistas en TanStack Query (`ORDER_KEYS`, `CLIENT_KEYS`, `LAWYER_KEYS`) y
  `useOrdersStore.addOrder`. Hoy `paymentData` nunca se rellena (el Brick no usa
  ese campo), por lo que **no es el camino activo**.
- `markAsCompleted()`, `reset()` (limpia `virtuabogado_checkout`,
  `activeOrderId`, `virtuabogado_pending_order` y vuelve al estado inicial)
  (`:474-485`).
- Helper privado `savePendingCheckout(service,email)` → localStorage
  `checkout_pending` (`:22-29`).

### 4.4 Hooks (ViewModel)

**`hooks/useCheckout.ts`** — selector agregado del store (estado + acciones) con
`useMemo`. Es la API de consumo principal.

**`hooks/useCheckoutStorage.ts`** — persistencia manual:
- Guarda `virtuabogado_checkout` (`CheckoutStorageData`) si `service && isOpen`;
  serializa el servicio **sin** `icono` (ReactNode) (`:26-56`).
- Al montar: **no** restaura si hay `auth_success=1` (`:63-65`) ni si
  `sessionStorage.checkout_manually_closed` (`:71-72`); expira a 24h; si auth →
  `max(step,2)`, si no → paso 1 (`:74-112`).
- Expone `clearStorage`.

**`hooks/useOrderStatus.ts`** — `useQuery` con key `ORDER_KEYS.status(orderId)`;
`queryFn` = `fetch('/api/payments/status?orderId=...')`; `enabled` si
`enabled && orderId`; `refetchInterval: 500` ms (aunque el comentario dice 3s),
`retry:3`, `staleTime:0` (`:14-28`).

**`hooks/usePaymentMethods.ts`** — `useQuery(['PaymentMethod', adminView])` →
`getPaymentMethodsAction`; `staleTime:0`, `refetchOnWindowFocus` (`:6-13`).

**`hooks/usePaymentStep.ts`** — ViewModel del paso 2:
- Persiste `virtuabogado_pending_order` cuando hay `orderId` (`:50-57`).
- Polling con `useOrderStatus(orderId, isWaitingForWebhook)`; al `isPaid` →
  invalida `ORDER_KEYS.all`, limpia localStorage, `reset()` y
  `router.push('/mis-servicios')` tras 1.5s (`:59-93`).
- `handlePayment(paymentMethodId)` (`:97-192`): abre ventana solo para
  Zenobank; `rateSaw` desde `queryClient.getQueryData(['exchange-rate'])`;
  llama `processPaymentAction`; si inline (mercadopago/yape) hace
  `GET /api/payments/mercadopago?orderId=` para obtener `amountPen/amountUsd` y
  setea `activeMercadoPago`; si `redirectUrl`, `setIsWaitingForWebhook(true)` +
  `cleanupCheckoutAfterPayment()` + navega; si no, `setStep(3)`.
- `handleMercadoPagoRedirect` (helper de compatibilidad) (`:194-199`).

**`hooks/useConfirmationStep.ts`** — usado por `ConfirmationStep`; considera
`needsWaiting` para `zenobank`/`crypto`; `useOrderStatus`; si **no** está
pendiente, tras 5s `reset()` + `closeCheckout()` + `router.push('/mis-servicios')`
(`:6-41`).

**`hooks/useUserDataStep.ts`** — ViewModel del paso 1: estados locales (email,
formData, password visible, Turnstile, cooldown de reenvío), debounce 800ms para
`checkUserExists` + `GET /api/auth/validate-email` (deliverabilidad MX),
`handleSubmit` → `authenticateUser`, reset password/email, reenvío con cooldown
60s (`:75-232`).

**`hooks/useMercadoPago.ts`** — carga dinámica del SDK JS `js/v2` (id `mp-sdk`),
`mountCardBrick` (Card Payment Brick, `min/maxInstallments:1`), `destroy` con
`unmount`, y `loadSecurityScript` (`security.js` para Device ID). El Brick usa un
`onSubmit` estable que lee del ref del componente para no re-montar (`:24-150`).

### 4.5 Components (View)

- **`CheckoutModal.tsx`** — modal raíz. Bloquea scroll del body, cierra con
  Escape/backdrop (excepto `isLoading`), marca `checkout_manually_closed` en
  `sessionStorage` (`:97-106`). Renderiza `ZenobankTacticalAlert` (solo si hay
  método `zenobank` activo, muestra el monto exacto USD), el banner SSL, el
  `ServiceSummary` y el paso activo. En `step===3` limpia storage tras 5s
  (`:77-84`).
- **`ServiceSummary.tsx`** — resumen con desglose usando
  `resolveServiceBreakdown(service, rate, taxPercentage)` (`:31-38`); **backfill
  defensivo** de `precioPen` desde `servicesStore.activeServices` si el snapshot
  no lo trae (`:24-26`); en modo cripto (`selectedMethod==='zenobank'`) muestra
  todo en USD con decimales (`:42-47`).
- **`StepIndicator.tsx`** — indicador genérico (`currentStep`, `totalSteps`).
- **`UserDataStep.tsx`** — formulario identidad-first: email con check en vivo,
  bloque condicional confirmación vs auth (nombre/teléfono solo nuevos), Turnstile
  (`captchaAttempt` fuerza remount), modal reset password (`:12-367`).
- **`PaymentStep.tsx`** — selecciona método (usa `selectedMethod` por
  `identifier`); renderiza `MercadoPagoCardStep`/`YapeStep` si
  `activeMercadoPago`; pantalla de espera de webhook con `isPaid`; barra de
  confianza; botón "Modificar mis datos" → `setStep(1)` (`:14-223`).
- **`MercadoPagoCardStep.tsx`** — monta el Brick una vez (`hasMountedRef`), envía
  `paymentToken/paymentMethodId/paymentTypeId/issuerId/deviceId/bin` a
  `/api/payments/mercadopago`; **pesimista**: según `paymentStatus` navega a
  `/payment/success` o `/payment/error`; llama `cleanupCheckoutAfterPayment()`
  antes (`:53-127`). No reenvía `payer.identification` (evita 1004) (`:63-66`).
- **`YapeStep.tsx`** — carga SDK, valida celular (`^9\d{8}$`) y OTP (`^\d{6}$`),
  `mp.yape({otp, phoneNumber}).create()` → token, `POST /api/payments/yape`;
  navega success/error según estado; `cleanupCheckoutAfterPayment()` (`:74-150`).
- **`ConfirmationStep.tsx`** — UI del paso 3; distingue `isPendingConfirmation`
  (spinner "Validando Pago...") de éxito; muestra orden/servicio/email.
- **`CartRecovery.tsx`** — banner de carrito abandonado (auth, `step>=2`, sin
  `completedAt`, no pagando, 2s de gracia). Normaliza `precioPen` desde
  `activeServices` (`:30-34`); "Retomar compra" → `openCheckout`; "Luego" →
  `reset()`.
- **`CheckoutStateSync.tsx`** — ver §3; consume `checkout_pending`,
  `checkUserExists`… no: consume `checkAuth`, abre paso 2, limpia URL.
- **`ErrorMessage.tsx`**, **`LoadingOverlay.tsx`**, **`AutoLoginIndicator.tsx`** —
  utilidades de UI (la última huérfana).

### 4.6 Types / Utils

- **`types/checkout.types.ts`** — `CheckoutStep`; `UserCheckoutData` (incluye
  `turnstileToken`); `PaymentData` (tarjeta, legado); `PaymentMethod`
  (`'card'|'paypal'|'transfer'|'zenobank'|'crypto'`); `PaymentMethodDB`;
  `PaymentRequest`; `CheckoutData`; `CheckoutState` (estado + acciones);
  `OrderResponse`; `PaymentResult`; `CheckoutStorageData`.
  **Nota**: `PaymentMethod` **no incluye** `'mercadopago'` ni `'yape'`, pero
  `usePaymentStep` pasa `identifier` de DB y `processPaymentAction` los reconoce;
  el tipo no cubre el flujo real (deuda de tipos).
- **`utils/checkoutCleanup.ts`** — `cleanupCheckoutAfterPayment()`: setea
  `checkout_manually_closed`, limpia `virtuabogado_checkout`, `activeOrderId`,
  `virtuabogado_pending_order`, y `markAsCompleted()`+`reset()` del store
  (`:13-36`). Evita reapertura del modal en las páginas de resultado.

---

## 5. Flujo end-to-end por pasarela

### 5.1 Zenobank (redirect, USD)

1. `usePaymentStep.handlePayment('zenobank')` abre `window.open('')` y llama
   `processPaymentAction` con `rateSaw`
   (`usePaymentStep.ts:100-117`).
2. Se crea la orden `PAGO_PENDIENTE` con `total` (USD), `totalPen` y
   `exchangeRateUsed` congelado (`processPaymentAction.ts:86-128`).
3. `ZenobankService.createCheckoutSession` (USD) → se guarda `paymentId` en la
   orden → se devuelve `redirectUrl` (`processPaymentAction.ts:133-169`).
4. El front `setIsWaitingForWebhook(true)`, `cleanupCheckoutAfterPayment()`
   (que **resetea** el store) y navega a la URL
   (`usePaymentStep.ts:165-175`).
5. El usuario paga; Zenobank redirige a `/payment/success?orderId=...`
   (`processPaymentAction.ts:148-151`).
6. **Webhook** `POST /api/webhooks/zenobank`: valida Svix; en
   `checkout.completed|payment.succeeded` emite `order.payment_received` (con
   guard anti-duplicado); en `payment.failed|checkout.expired|checkout.canceled`
   marca `PAGO_RECHAZADO` (`zenobank/route.ts:47-78`).
7. `/payment/success` hace polling con `useOrder` mientras
   `PAGO_PENDIENTE` (3s) y muestra aprobado/rechazado/pendiente
   (`payment/success/page.tsx:20-42`).

### 5.2 MercadoPago — tarjeta (Bricks embebido, PEN)

1. `handlePayment('mercadopago')` → `processPaymentAction` devuelve
   `{mercadopago:true, order}`; el front hace
   `GET /api/payments/mercadopago?orderId=` y obtiene
   `{amountUsd, amountPen, payerEmail}` (`usePaymentStep.ts:124-163`).
2. Monta `MercadoPagoCardStep` con `amountPen`; el Brick captura la tarjeta
   (secure fields) y devuelve `formData.token` (`MercadoPagoCardStep.tsx:53-90`).
3. `POST /api/payments/mercadopago` con el token: valida dueño y estado
   `PAGO_PENDIENTE`; usa `order.totalPen` (o `convertUsdToPen` fallback) como
   monto; crea el pago vía `MercadoPagoService.createPayment`; actualiza
   `paymentId`; **anti-manipulación** (currency PEN y |Δ|≤0.01); si `approved`
   emite `order.payment_received`, si `rejected/cancelled` marca
   `PAGO_RECHAZADO` (`mercadopago/route.ts:67-199`).
4. El componente navega pesimista: approved → `/payment/success`,
   rejected/cancelled/charged_back → `/payment/error?error=<statusDetail>`,
   pending/in_process → `/payment/success` (polling) (`MercadoPagoCardStep.tsx:102-121`).
5. **Webhook** `POST /api/webhooks/mercadopago`: valida HMAC; consulta el pago;
   `external_reference` = orderId; anti-manipulación; approved →
   `order.payment_received`, rechazos → `PAGO_RECHAZADO`
   (`mercadopago/route.ts:16-117`).

### 5.3 Yape / Plin (Checkout API embebido, PEN)

1. Igual arranque que tarjeta pero `mode:'yape'` → `YapeStep`.
2. El usuario ingresa celular + OTP; `mp.yape().create()` genera el token;
   `POST /api/payments/yape` (`YapeStep.tsx:96-121`).
3. El endpoint es idéntico al de tarjeta salvo
   `MercadoPagoService.createYapePayment` (`yape/route.ts:63-137`).
4. Navegación pisimista success/error y webhook idénticos.

### 5.4 Polling y páginas de resultado

- `useOrderStatus` (`/api/payments/status`): mapea estados internos a UX
  `PAID` = `PAID|PENDIENTE|EN_PROGRESO|COMPLETADO`, `ERROR` =
  `PAGO_RECHAZADO|FALLIDO|CANCELADO`, resto `PENDING`
  (`payments/status/route.ts:33-46`).
- `/payment/success`: `useOrder` con refetch cada 3s mientras
  `PAGO_PENDIENTE`; `isApproved` redirige a `/mis-servicios` tras 3s; timeout de
  30s muestra "Demora en la Verificación" (`payment/success/page.tsx:20-67`).
- `/payment/error`: mapea `status_detail` de MP a mensajes en español; botón
  "Intentar con otro método" reabre checkout con el servicio en paso 2
  (`payment/error/page.tsx:27-80`).
- `/compra-exitosa`: **página legacy/estática** con datos simulados, no vinculada
  al flujo real (`compra-exitosa/page.tsx:22-34`).

---

## 6. Dinero y precios

Fuentes: `lib/servicePrice.ts`, `lib/money.ts`, `lib/exchangeRate.ts`,
`lib/finance.ts` (ver `02-lib.md` §1). Puntos de resolución:

| Punto | Resolver / cálculo | Notas |
|---|---|---|
| Display de precio | `resolveServicePrice` / `resolveServiceBreakdown` con `rate = useExchangeRate().rate` (`['exchange-rate']`) | `ServiceSummary.tsx:31-38` |
| Alerta cripto exacta | `resolveServiceUsd(service, rate)` | `CheckoutModal.tsx:203` |
| Creación de orden | `getUsdPenRate()` fresco; valida `rateSaw` (±25%) y congela `min(rateSaw, fresh)` | `processPaymentAction.ts:93-107` |
| USD de la orden | `servicePen` → `penToUsd(servicePen, exchangeRateUsed)`, si no `roundMoney(precio)` | `processPaymentAction.ts:106` |
| PEN de la orden | `servicePen` exacto, si no `usdToPen(totalUsd, exchangeRateUsed)` | `processPaymentAction.ts:107` |
| Desglose finanzas | `commission/taxes/platformFee` sobre `totalUsd` con `FinancialSettings` | `processPaymentAction.ts:109-111` |
| Monto MP/Yape | `order.totalPen` (o `convertUsdToPen` fallback) | `mercadopago/route.ts:105-107`, `yape/route.ts:50-52` |
| Validación MP | currency `PEN` y `|monto−amountPen| ≤ 0.01` | `mercadopago/route.ts:142-168` |

- **USD vs PEN**: Zenobank cobra en **USD** (`priceCurrency:'USD'`,
  `amount=order.total`); MercadoPago (tarjeta/Yape) cobra en **PEN**
  (`amountPen`).
- **`exchangeRateUsed`**: se persiste en la orden para trazabilidad y **no es
  retroactivo**: la tasa nueva solo aplica a órdenes creadas después
  (`processPaymentAction.ts:89-92`).
- **Bug `.01`**: `resolveServiceBreakdown` deriva `base`, `tax` y `total` del
  **mismo par canónico escalado** (`servicePrice.ts:73-86`), y
  `processPaymentAction` usa **una sola tasa** para USD y PEN. Base+impuesto no
  pueden divergir del total.
- **Backfill**: `ServiceSummary`/`CartRecovery` rellenan `precioPen` desde
  `servicesStore.activeServices` cuando el snapshot persistido no lo trae
  (`ServiceSummary.tsx:24-26`, `CartRecovery.tsx:32-34`).

---

## 7. Estado y realtime/broadcast

- **Zustand sin `persist`**: `checkoutStore` es en memoria; la persistencia es
  manual en `useCheckoutStorage` (`virtuabogado_checkout`) y en
  `usePaymentStep` (`virtuabogado_pending_order`). `checkout_pending` lo escribe
  `savePendingCheckout` (store) y lo lee `CheckoutStateSync`. `activeOrderId` se
  limpia en `reset`/cleanup.
- **Flags de UI**: `isProcessingPayment`, `isWaitingForWebhook`,
  `requiresEmailConfirmation`, `selectedMethod`, `completedAt`.
- **Realtime**: no hay suscripción propia dentro de `src/features/checkout`.
  La reactividad la aportan:
  - `useRealtimeSubscription` (`app-updates`): `exchange-rate-updated` →
    `queryClient.setQueryData(['exchange-rate'], rate)`; y `postgres_changes`
    de `PaymentMethod` → invalida `['PaymentMethod']` (`useRealtimeSubscription.ts:50-61,191-194`).
  - `useGlobalChatListener`: en broadcast de orden, si
    `checkout.isWaitingForWebhook && orderId coincide` y el estado es de éxito,
    `setIsWaitingForWebhook(false)` + limpia `virtuabogado_pending_order` +
    `reset()` + `router.push('/mis-servicios')`
    (`useGlobalChatListener.ts:191-206`).
  - `broadcastPaymentMethodUpdate` (server, `@/lib/broadcast`) dispara
    `payment-method-updated` en `app-updates`.
- **Integración auth**: `authStore` llama `useCheckoutStore.getState().reset()`
  en logout (`authStore.ts:92`).

---

## 8. Mapa de dependencias

### 8.1 La feature importa (salientes)

- `@/lib/prisma`, `@/utils/supabase/{client,server}`, `@/lib/broadcast`,
  `next/cache` (actions).
- `@/lib/servicePrice`, `@/lib/money`, `@/lib/exchangeRate`, `@/lib/finance`
  (dinero).
- `@/lib/apiClient` (checkout.service legado).
- `@/services/identity.service`, `@/lib/constants`, `@/events/eventBus` (indirecto
  vía endpoints, no en la feature directamente salvo identity).
- `@/features/auth` (`useAuthStore`, `authService`), `@/features/orders`
  (`useOrdersStore`, `Order`, `OrderStatus`, `ORDER_KEYS`,
  `OrderPaymentMethod`), `@/features/clients` (`CLIENT_KEYS`,
  `ClientStatus`), `@/features/lawyers` (`LAWYER_KEYS`), `@/features/services`
  (`useServicesStore`), `@/features/finance` (`useExchangeRate`),
  `@/features/financial-settings` (`useFinancialSettings`), `@/lib/queryClient`.
- `@/shared/types/entities.types`, `@/shared/components/*`, `@/components/ui/*`
  (DualPrice, ConfirmModal).
- Externos: `zustand`, `@tanstack/react-query`, `framer-motion`, `react-icons`,
  `lucide-react`, `sonner`, `next/image`, `next/dynamic`, `next/navigation`,
  `mercadopago`, `svix`, `crypto`.

### 8.2 Consumidores externos (entrantes)

| Consumidor | Qué importa |
|---|---|
| `src/app/layout.tsx` | `DynamicCheckoutWrapper` (monta `CheckoutStateSync`+`CheckoutModal`+`CartRecovery` en toda la app) |
| `src/app/servicios/ServiciosClientPage.tsx` | `CheckoutModal`, `useCheckout`, `CartRecovery` (segunda instancia de modal/recovery) |
| `src/components/homePage/VirtuStudents.tsx` | `useCheckout.openCheckout` |
| `src/features/services/hooks/useServiciosClientPage.ts` | `useCheckout.openCheckout` |
| `src/features/auth/store/authStore.ts` | `useCheckoutStore.reset` (logout) |
| `src/features/chat/hooks/useGlobalChatListener.ts` | `useCheckoutStore` (reactividad de orden) |
| `src/components/admin/hooks/useMetodosPagoPanel.ts` | `usePaymentMethods` + actions CRUD |
| `src/app/payment/success/page.tsx` | `cleanupCheckoutAfterPayment` |
| `src/app/payment/error/page.tsx` | `cleanupCheckoutAfterPayment`, `useCheckoutStore` |
| `src/app/api/payments/mercadopago/route.ts` | `MercadoPagoService` |
| `src/app/api/payments/yape/route.ts` | `MercadoPagoService` |
| `src/app/api/webhooks/mercadopago/route.ts` | `MercadoPagoService` |

### 8.3 Endpoints consumidos por checkout

- `POST /api/orders` (POST de creación de orden) — **legado**: lo usa
  `checkoutService.createOrder`, no el flujo activo (el activo usa
  `processPaymentAction`, que crea la orden directo vía Prisma). Igual calcula
  precios con `getUsdPenRate`/`penToUsd`/`usdToPen` y emite `order.created`
  (`api/orders/route.ts:131-200`).
- `GET/POST /api/payments/mercadopago`, `POST /api/payments/yape`,
  `GET /api/payments/status`.
- `POST /api/webhooks/{mercadopago,zenobank}`.
- `GET /api/exchange-rate` (vía `useExchangeRate`).
- Auth: `POST /api/auth/register`, `GET /api/auth/check-user`,
  `GET /api/auth/validate-email`, `POST /api/auth/reset-password/request`.

---

## 9. Notas de refactor / deuda / riesgos

1. **Componentes huérfanos**: `PaymentSelectorModal.tsx` y `AutoLoginIndicator.tsx`
   no tienen importadores; `mercadopago.types.ts`
   (`normalizeMercadoPagoDocType`) tampoco. Candidatos a eliminar/preservar
   (`[A verificar]` si se usan dinámicamente).
2. **Doble instancia de `CheckoutModal`/`CartRecovery`**: el layout global
   (`DynamicCheckoutWrapper`) ya los monta, y `ServiciosClientPage.tsx:116-117`
   los vuelve a montar. Riesgo de duplicación de banners/modales.
3. **Ruta legada `submitOrder`**: exige `paymentData` (tarjeta) que ya no se
   rellena (el Brick no lo setea). El flujo real es `usePaymentStep.handlePayment`.
   `checkoutService.processPayment` (mock), `createOrder` y
   `sendConfirmationEmail` (no-op) también son código muerto probable.
4. **`PaymentMethod` tipo vs realidad**: el tipo no incluye `'mercadopago'` ni
   `'yape'`, pero el flujo usa esos `identifier`; el mapeo `'card'→'mercadopago'`
   solo vive en `submitOrder`. Tipos desalineados.
5. **Zenobank sin `errorRedirectUrl`**: el body solo envía `successRedirectUrl`;
   `redirectUrls.error` se ignora (`zenobank.service.ts:37-42`). La cancelación
   depende del webhook. Si el usuario cancela y no hay webhook, no hay retorno
   explícito.
6. **Orquestación pesimista duplicada**: `cleanupCheckoutAfterPayment()` resetea
   el store mientras `usePaymentStep` aún tiene promesas pendientes; convive con
   el polling de `ConfirmationStep`/`useGlobalChatListener`. `[A verificar]`
   posibles carreras de `isWaitingForWebhook` tras redirect.
7. **`retry:3` + `refetchInterval:500`** en `useOrderStatus`: pese al comentario
   "3 segundos", el intervalo es 0.5s durante el monitoreo; puede ser agresivo
   contra `/api/payments/status`.
8. **Persistencia dispersa**: tres claves localStorage
   (`virtuabogado_checkout`, `virtuabogado_pending_order`, `checkout_pending`) +
   `sessionStorage.checkout_manually_closed`, gestionadas en distintos archivos.
   Fácil descuido; centralizar.
9. **`compra-exitosa`** es una página simulada y no forma parte del flujo real;
   no enlazarla como destino de pagos.
10. **`paymentMethodIdentifier`** solo lo devuelve `/api/orders/[id]`
    (`api/orders/[id]/route.ts:57`), no el listado (`formatOrderResponse` no lo
    incluye); las páginas de resultado dependen del detalle. `[A verificar]` si
    algún consumer de listado lo espera.
11. **`processPaymentAction`**: import `serializeFinance` sin uso y bloque
    `if (false)` muerto; limpiar.

---

**Siguiente**: `03-orders.md`.
