# 02 — Capa `src/lib/` (utilidades transversales)

`src/lib/` contiene lógica **sin UI** reutilizada por features, APIs y eventos.
Aquí viven el dinero, la caché, el bus de broadcast, notificaciones, email,
seguridad y utilidades de sistema.

> Ya documentados en `01-fundacionales.md`: `lib/prisma.ts`,
> `lib/constants.ts`, `lib/getFinancialSettings.ts`. No se repiten aquí.

---

## 0. Inventario y mapa de importadores

| Módulo | Importadores | Rol |
|--------|-------------:|-----|
| `finance.ts` | 18 | Formato/serialización monetaria + re-export de conversión |
| `apiClient.ts` | 9 | Cliente HTTP con auth Supabase |
| `formatOrderId.ts` | 8 | ID legible `EXP-YYYY-MM-00000` |
| `broadcast.ts` | 8 | Señales Supabase Realtime (server) |
| `money.ts` | 7 | Aritmética exacta con `decimal.js` |
| `exchangeRate.ts` | 7 | Tasa USD→PEN (manual o Frankfurter) |
| `cache.ts` | 7 | Caché memory/Upstash |
| `emailDeliverability.ts` | 6 | Validación de correo (formato+MX) |
| `cronAuth.ts` | 4 | Autorización de cron/endpoints internos |
| `turnstile.ts` | 2 | Verify Cloudflare Turnstile |
| `telegram.ts` | 2 | Envío de mensajes Telegram |
| `servicePrice.ts` | 2 | Resolución coherente de precio USD/PEN |
| `systemUser.ts` | 1 | Usuario de sistema (sender automático) |
| `queryClient.ts` | 1 (dinámico) | `QueryClient` global |
| `push-notifications.ts` | 1 | Envío Web Push + notificaciones por evento |
| `nodemailer.ts` | 1 | Transporter Gmail |
| `emailTemplates.ts` | 1 | Plantilla de confirmación |
| `emailValidation.ts` | 1 | Formato + dominios desechables |
| `utils/cartRecovery.ts` | 1 | Carrito abandonado (localStorage) |
| `utils/analytics.ts` | 1 | Abandonos (localStorage) |
| **`api.ts`** | **0** | **VACÍO (0 líneas) — muerto** |
| **`auth.ts`** | **0** | **VACÍO (0 líneas) — muerto** |
| **`resend.ts`** | **0** | **Muerto** (instancia `Resend` no usada; lanza si falta la key) |

> **Hallazgo**: `lib/api.ts` y `lib/auth.ts` son archivos de 0 bytes. `resend.ts`
> no se importa en ningún sitio (el email real va por `nodemailer`). Los tres son
> candidatos directos a eliminación (ver `13-REFACTOR.md`).

---

## 1. Dinero y precios

### 1.1 `lib/money.ts` — aritmética exacta (client-safe)
- Configura `Decimal.set({ rounding: ROUND_HALF_UP })` (mismo motor que Prisma).
- `usdToPen(usd, rate)`, `penToUsd(pen, rate)`, `roundMoney(value, precision=2)`.
- Guardas: `rate` inválido/≤0 → `0`. **Imports**: `decimal.js`. **Usado por**: `finance`, `servicePrice`, `DualPrice`, `useServiciosPanel`, `ServiciosPanel`, `processPaymentAction`, `/api/orders`.

### 1.2 `lib/finance.ts` — formato y serialización (client-safe)
- `formatUSD(amount, precision=2)` (`Intl` en-US), `formatPEN(amount, precision=2)` (`Intl` es-PE).
- **Re-exporta** `usdToPen` y `penToUsd` desde `lib/money` (atención: importar de aquí o de `money` da lo mismo).
- `serializeFinance<T>(data)`: convierte recursivamente `Decimal→number` y `Date→ISO`; resuelve el error de Next 15 "Only plain objects can be passed to Client Components". Ruta rápida para primitivos, `Array`, `Date`, objetos con `.toNumber`.
- **Usado por 18 archivos** (APIs de clients/lawyers/orders/payments/services, paneles admin, `DualPrice`, acciones de finance/orders, `serviceJson`, `utils/formatters`).

> ⚠️ **Cross-dependencia**: `lib/finance` importa `lib/money`, y a la vez es el
> módulo más consumido del proyecto. Es la API pública de dinero.

### 1.3 `lib/servicePrice.ts` — fuente única de precio
- `resolveServiceUsd`, `resolveServicePen`, `resolveServicePrice` → `{usd, pen}`,
  `scalePrice`, `resolveServiceBreakdown(service, rate, taxPercentage)` → `{base, tax, total}`.
- Regla canónica: si `precioPen > 0` es el SOL exacto (USD derivado); si no, el USD
  es canónico (PEN derivado). El desglose escala AMBOS con el mismo factor para
  impedir el bug del `.01`.
- **Imports**: `lib/money`. **Usado por**: `CheckoutModal`, `ServiceSummary`.

### 1.4 `lib/exchangeRate.ts` — tasa USD→PEN (server-only)
- `getUsdPenRate()`: 1) tasa manual de `FinancialSettings.usd_pen_fallback_rate`
  (leída **fresca**, prioridad), 2) automática de **Frankfurter**
  (`api.frankfurter.app`, `revalidate: 3600`), 3) si no hay → **lanza error**.
- `convertUsdToPen`, `clearExchangeRateCache()`. Caché en memoria 1 h para la automática.
- Acceso a Prisma **defensivo vía `(prisma as any)`** buscando `financialSettings`/
  `FinancialSettings` (tolerante a la generación del cliente).
- **Imports**: `lib/prisma`, `lib/constants`. **Usado por**: `/api/exchange-rate`, `/api/orders`, `/api/payments/{mercadopago,yape}`, `/api/settings/financial`, `/api/webhooks/mercadopago`, `processPaymentAction`.

> ⚠️ **Refactor**: el hack `(prisma as any)` indica un problema de generación del
> cliente Prisma (nombres de modelo). Normalizar.

---

## 2. Datos e infraestructura

### 2.1 `lib/cache.ts` — caché con drivers
- Drivers intercambiables: **memory** (Map con TTL, por defecto) y **upstash**
  (Redis REST, si hay `KV_REST_API_*` o `UPSTASH_REDIS_REST_*`).
- API: `getCached`, `setCache`, `clearCache(pattern?)`; prefijo `vb:`;
  timeout Upstash 4 s; **fail-open** (ante error devuelve null / no lanza).
- Detección lazy del driver en `resolveDriver()`.
- **Usado por**: `/api/clients`, `/api/lawyers`, `/api/services`(+`[id]`), `/api/settings/financial`, `getFinancialSettings`, `events/handlers/serviceHandlers`.

### 2.2 `lib/queryClient.ts`
- `queryClient` global de TanStack: `staleTime 5m`, `gcTime 30m`,
  `refetchOnWindowFocus:false`, `refetchOnReconnect:true`, `retry:1`.
- **Usado por**: `features/checkout/store/checkoutStore.ts` (importado
  **dinámicamente** en `authStore.ts:106` para invalidar al cerrar sesión).

### 2.3 `lib/apiClient.ts` — cliente HTTP browser
- `ApiError(status, message)`; objeto `apiClient` con `get/post/put/patch/delete`.
- Adjunta `Authorization: Bearer <access_token>` de la sesión Supabase, `credentials:'include'`, `cache:'no-store'`; `handleResponse` normaliza errores (`error|message|details`) y soporta 204.
- **Imports**: `utils/supabase/client`. **Usado por 9**: servicios/stores de checkout, clients, financial-settings, lawyers, orders, services.

> ⚠️ **Refactor (duplicación de clientes HTTP)**: existen además
> `lib/api.ts` (vacío), `lib/apiClient.ts`, `infrastructure/api/client.ts` y
> `lib/apiClient` convive con `fetch` directo. Consolidar en un solo cliente.

### 2.4 `lib/broadcast.ts` — señales Realtime (server)
- `sendBroadcast(channel,event,payload)`: **primero REST**
  (`/realtime/v1/api/broadcast` con service key), fallback **WebSocket** (timeout 10 s).
- Funciones de dominio: `broadcastOrderUpdate` (firewall: ignora
  `PAGO_PENDIENTE`/`PAGO_RECHAZADO`; canales `admin-updates` + `global_{id}`),
  `broadcastServiceUpdate` (`app-updates`), `broadcastPayoutUpdate`,
  `broadcastPaymentMethodUpdate` (`app-updates/payment-method-updated`),
  `broadcastExchangeRateUpdate` (`app-updates/exchange-rate-updated`).
- **Imports**: `@supabase/supabase-js`, `ws`. **Usado por**: `/api/display-settings`, `/api/services`(+`[id]`), `/api/settings/financial`, `events/handlers/{broadcast,message,order}Handlers`, `paymentMethods` action.

> Canales `admin-updates` y `app-updates` (global) + `global_{userId}` (personal).
> Ver `07-realtime.md`.

---

## 3. Notificaciones

### 3.1 `lib/push-notifications.ts` — Web Push (server)
- Config VAPID al importar; `sendPushNotification(userId, opts)` envía a **todos**
  los dispositivos (`PushSubscription`), `urgency:'high'`, `TTL 86400`, y
  **auto-elimina** suscripciones 410/404.
- Funciones por evento: `notifyNewSale` (admins), `notifyNewCase`/`notifyCaseUnassigned`
  (abogado), `notifyNewMessage` (**omite CLIENTE**), `notifyCaseCompleted` (admins),
  `notifyPayoutCompleted` (abogado), `notifyOrderStatusUpdate` (cliente).
- **Imports**: `web-push`, `lib/prisma`. **Usado por**: `events/handlers/notificationHandlers.ts` (único).

### 3.2 `lib/telegram.ts` — mensajes Telegram (server)
- `sendTelegramMessage(chatId, text)` (parse HTML; detecta 403 bloqueado),
  `buildTelegramMessage(title, body, url?)` con identidad VirtuAbogado.
- **Imports**: `fetch` nativo. **Usado por**: `/api/notifications/telegram/webhook`,
  `events/handlers/notificationHandlers.ts`.

---

## 4. Seguridad

### 4.1 `lib/turnstile.ts` — Cloudflare Turnstile (server)
- `verifyTurnstile(token?)`: si faltan claves → permite; sin token → rechaza;
  tolera `timeout-or-duplicate` como humano.
- **Usado por**: `/api/auth/login`, `/api/auth/register`.

### 4.2 `lib/cronAuth.ts` — autorización de cron
- `isCronAuthorized(request)`: exige `Bearer CRON_SECRET` (comparación
  `timingSafeEqual`); si no hay secret → solo dev en NODE_ENV≠production (fail-closed).
- **Usado por**: `/api/events/{cleanup,failed,process,retry}`.

---

## 5. Email

| Módulo | Contenido | Usado por |
|--------|-----------|-----------|
| `emailValidation.ts` | `validateEmail(email)` — regex + lista de **~230 dominios desechables** (`DISPOSABLE_DOMAINS`) | `emailDeliverability` |
| `emailDeliverability.ts` | `hasMxRecord(domain)` (DNS `resolveMx`, caché 5 min, fail-open) + `validateEmailDeliverability(email)` (formato + MX) | 6 (register, checkout actions, etc.) |
| `nodemailer.ts` | `transporter` (Gmail SMTP) + `sendTransactionalMail({to,subject,html,text})` con cabeceras anti-spam (`List-Unsubscribe`) | `emailTemplates` |
| `emailTemplates.ts` | `sendConfirmationEmail({to,nombre,confirmUrl})` — HTML de confirmación de cuenta | `api/auth/register` |
| `resend.ts` | `resend = new Resend(...)` — **sin uso** | — |

> ⚠️ **Refactor**: hay **dos proveedores de email** (Nodemailer activo, Resend
> muerto) y `resend.ts` **lanza en import** si falta `RESEND_API_KEY`. Eliminarlo
> o consolidar en uno.

---

## 6. Sistema y formato

### 6.1 `lib/formatOrderId.ts`
- `formatOrderId(numericId?, createdAt?)` → `EXP-{YYYY}-{MM}-{00000}`.
  Sin `numericId` → `'EXP-00000'`. **Usado por 8** (tablas, notificaciones, componentes).

### 6.2 `lib/systemUser.ts`
- `getSystemUserId()`: `prisma.user.upsert` del usuario `sistema@virtuabogado.app`
  (nombre `VirtuAbogado`, rol `ADMIN`, activo) y devuelve su `id`. Es el **sender**
  de mensajes automáticos de sistema.
- **Imports**: `lib/prisma`, `entities.types`. **Usado por**: `events/handlers/orderHandlers`.

> ⚠️ El usuario de sistema se crea con rol **ADMIN**. Confirmar en `09-notificaciones.md`
> que no aparece como admin "real" en paneles/notificaciones.

---

## 7. Utilidades de cliente (localStorage)

### 7.1 `lib/utils/cartRecovery.ts`
- `saveCartData`, `checkAbandonedCart` (carrito > 1 h y no recuperado),
  `markCartAsRecovered`, `clearCartData`. Persistencia en `localStorage['abandonedCart']`.
- **Usado por**: `app/error-pago/page.tsx`.

### 7.2 `lib/utils/analytics.ts`
- `logAbandonment`, `getAbandonmentStats`, `clearAnalyticsData`.
  Persistencia en `localStorage['abandonmentAnalytics']`.
- **Usado por**: `app/error-pago/page.tsx` (solo `logAbandonment`;
  `getAbandonmentStats`/`clearAnalyticsData` **sin uso**).

---

## 8. Mapa de dependencias de `lib/`

```
                     ┌──────────────┐
        decimal.js ─►│  money.ts    │◄────────┐
                     └──────┬───────┘         │
                            │ re-export       │
                     ┌──────▼───────┐   ┌─────┴────────┐
                     │  finance.ts  │   │ servicePrice │
                     └──────┬───────┘   └──────┬───────┘
        (18 consumidores)   │                  │
                     ┌──────▼──────────────────▼──────┐
                     │  features / app / components   │
                     └───────────────────────────────-┘

  exchangeRate ─► prisma, constants
  broadcast    ─► @supabase/supabase-js, ws
  push-notif.  ─► web-push, prisma        ┐
  telegram     ─► fetch                   ├─ notificationHandlers (events)
  systemUser   ─► prisma, entities.types  ┘
  apiClient    ─► utils/supabase/client   ─► 9 servicios/stores
  cache        ─► (memory | upstash REST)  ─► APIs + getFinancialSettings
  cronAuth     ─► node:crypto              ─► 4 APIs de events
  turnstile    ─► fetch                    ─► login/register
  email*: emailTemplates ─► nodemailer
          emailDeliverability ─► emailValidation
```

**Orden de dependencia (de más abajo a más arriba)**:
`money` → `finance`/`servicePrice`/`exchangeRate`; `prisma`+`constants` son base;
`push-notifications`/`telegram`/`systemUser` son consumidos solo por `events/`.

---

## 9. Notas de refactor (esta capa)

1. **Eliminar muertos**: `lib/api.ts`, `lib/auth.ts` (0 bytes) y `lib/resend.ts`
   (0 importadores; además lanza en import).
2. **Unificar cliente HTTP**: `lib/apiClient.ts` es el único usado; renombrar/absorber
   y borrar `lib/api.ts`; evaluar `infrastructure/api/client.ts` (¿duplicado?).
3. **Normalizar acceso a Prisma** en `exchangeRate.ts` (quitar `(prisma as any)`).
4. **Aclarar re-exports**: `finance.ts` re-exporta `money`; decidir el punto de
   importación canónico de las conversiones para evitar ambigüedad.
5. **Email**: decidir Nodemailer vs Resend y borrar el que no se use.
6. **`systemUser` con rol ADMIN**: revisar efectos en notificaciones/paneles.
7. **`analytics.ts`**: retirar funciones sin uso (`getAbandonmentStats`, `clearAnalyticsData`).
8. **`servicePrice` importadores solo 2**: verificar que TODA la UI de precios
   pasa por el resolver único (riesgo de derivar precios por fuera → bug `.01`).

---

**Siguiente**: `03-features-*.md` (features de dominio).
