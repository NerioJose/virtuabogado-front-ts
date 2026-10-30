# 07 — Reactividad en 3 capas (Realtime)

> Fuente: lectura directa del código. Complementa (no repite) lo ya descrito en
> `02-lib.md` §2.4 (`broadcast.ts`) y el glosario de `00-mapa.md`.

---

## 1. Propósito y arquitectura de 3 capas

El sistema necesita que **cualquier cambio escrito por Prisma/API se refleje en
todos los clientes** (anónimos, clientes, abogados, admin) sin recargar la
página. Como las escrituras de la aplicación van por **Prisma con
`DIRECT_URL`**, éstas **no siempre disparan eventos WAL** de `postgres_changes`
(nota explícita en `src/lib/broadcast.ts:4-6` y en
`src/app/api/display-settings/route.ts:107-109`). Por eso hay un diseño de
**tres capas independientes y solapadas**:

| Capa | Mecanismo | Latencia | Cobertura | Requiere auth |
|------|-----------|----------|-----------|---------------|
| **1. Broadcast** | `sendBroadcast()` server-side → `channel.send` | instantánea | anónimos + todos los roles | no (canales globales) |
| **2. WAL** | `postgres_changes` (publicación `supabase_realtime`) | instantánea (si el WAL dispara) | por tabla y con filtros/RLS | sí para tablas privadas |
| **3. Polling/focus** | `refetchInterval` + `refetchOnWindowFocus` de TanStack | 0.5–5 s | siempre | no |

La capa 1 es la **vía primaria** por escrituras Prisma; la capa 2 es un refuerzo
que funciona para escrituras con replicación (y para anónimos en tablas
públicas); la capa 3 es la **red de seguridad** cuando Realtime falla o RLS
bloquea la suscripción.

```
 API/Event-bus ──sendBroadcast()──► Supabase Realtime ──broadcast──► hooks cliente
 Prisma write ──WAL (a veces)────► postgres_changes ──► hooks cliente
 (fallback) ─────────────────────────────────────────► polling/refetchOnFocus
```

---

## 2. Tabla de canales y eventos

Canales emitidos desde el servidor (`src/lib/broadcast.ts`) y desde el bus de
eventos (`src/events/handlers/*`).

| Canal | Evento | Emisor (ruta:línea) | Listener (ruta:línea) | Efecto / cache invalidada |
|-------|--------|---------------------|-----------------------|---------------------------|
| `app-updates` | `service-updated` | `broadcast.ts:203` (`broadcastServiceUpdate`) | `useRealtimeSubscription.ts:97` | `['Service']`, `['Service','active']` (`:46-47`) |
| `app-updates` | `exchange-rate-updated` | `broadcast.ts:265` | `useRealtimeSubscription.ts:98` | `setQueryData(['exchange-rate'])` o invalida + `FINANCIAL_SETTINGS_KEYS.all` (`:50-61`) |
| `app-updates` | `display-settings-updated` | `broadcast.ts` vía `display-settings/route.ts:110` | `useRealtimeSubscription.ts:99` | `setQueryData(['display-settings'],{showUsd})` o invalida (`:63-70`) |
| `app-updates` | `payment-method-updated` | `broadcast.ts:245` (`broadcastPaymentMethodUpdate`) | **sin listener** | **canal huérfano** (ver §9) |
| `app-updates` | `new_message`, `order-updated`, `payout-updated` | *(ya no se emiten aquí)* | `useGlobalChatListener.ts:292-299` (listener residual) | `new_message` → `markAsUnread` (código muerto en la práctica) |
| `admin-updates` | `order-updated` | `broadcast.ts:168` | `useRealtimeSubscription.ts:117` + `GlobalChatListener` no lo escucha | invalida `['Order']`, `Payout*`, `FinanceSummaryDashboard` (`:38-43`) |
| `admin-updates` | `payout-updated` | `broadcast.ts:219` | `useRealtimeSubscription.ts:118` | invalida `PayoutHistory/PendingPayouts/Finance/FinancialSummary/Order` (`:72-79`) |
| `global_{userId}` / `global_{lawyerId}` | `order-updated` | `broadcast.ts:172,177` | `useRealtimeSubscription.ts:106` + `useGlobalChatListener.ts:287` | invalida `['Order']`, `['User']`, `Finance*` y dispara toasts |
| `global_{lawyerId}` | `payout-updated` | `broadcast.ts:220` | `useRealtimeSubscription.ts:107` + `useGlobalChatListener.ts:288` | invalida finanzas + toast de liquidación |
| `global_{userId}` / `global_{lawyerId}` | `new_message` | `messageHandlers.ts:39,42` | `useRealtimeSubscription.ts:108` (solo invalida) + `useGlobalChatListener.ts:249-286` (append/borrado + unread) | `['chat','messages',orderId]` + `markAsUnread` |
| `global_*` | `message_deleted` | `messageHandlers.ts:74,77` | **sin listener** | **huérfano** (el borrado se maneja por el payload `deleted` de `new_message`, no por este evento) |
| `chat_{orderId}` | `new_message` | `messageHandlers.ts:44` | `chat.service.ts:53-64` (vía `useChat.ts:40`, `chatStore.ts:54`) | `setQueryData(['chat','messages',orderId])` con anti-duplicado optimista |
| `chat_{orderId}` | `message_deleted` | `messageHandlers.ts:79` | **sin listener** | **huérfano** |
| `db-changes-{userId}-{ts}` | `postgres_changes` `*` | PostgreSQL WAL | `useRealtimeSubscription.ts:236` | ver §4.2 |
| `public:Service` | `postgres_changes` `*` | WAL `Service` | `useServicesRealtime.ts:36` | `servicesKeys.all` + `.active` |
| `public:DisplaySettings` | `postgres_changes` `*` | WAL `DisplaySettings` | `useDisplaySettingsRealtime.ts:36` | `displaySettingsKeys.all` (`['display-settings']`) |

> **Nota F3 (fan-out acotado)**: las órdenes ya **no** se difunden por
> `app-updates` a todos los clientes. Solo llegan por `admin-updates` y por los
> canales personales `global_{id}` de los implicados (`broadcast.ts:165-178`,
> `useRealtimeSubscription.ts:92-94`).

---

## 3. Detalle por archivo

### 3.1 `src/lib/broadcast.ts` (emisor, server-only)
- `getAdminClient()` (`:16`): singleton de `@supabase/supabase-js` con
  `SUPABASE_SERVICE_ROLE_KEY` y transporte `ws` (para el fallback WebSocket).
- `sendBroadcastViaRest()` (`:35`): hace `POST {url}/realtime/v1/api/broadcast`
  con `messages:[{topic,event,payload}]`; acepta `202`/`ok` (`:63`). Es la vía
  preferida porque **no requiere suscribirse** (ideal serverless).
- `sendBroadcast()` (`:79`): **primero REST**; si falla, crea canal efímero WS
  (`:95`), `subscribe → SUBSCRIBED → channel.send({type:'broadcast'})`, con
  timeout de 10 s (`:99-106`) y `removeChannel` siempre. Patrón
  "subscribe → send → removeChannel" documentado en `:8`.
- Funciones de dominio:
  - `broadcastOrderUpdate` (`:137`): **firewall** que retorna sin emitir si
    `status` es `PAGO_PENDIENTE`/`PAGO_RECHAZADO` (`:149-152`); emite a
    `admin-updates` y a `global_{userId}` / `global_{lawyerId}` (`:168-178`).
  - `broadcastServiceUpdate` (`:188`) → `app-updates`/`service-updated`.
  - `broadcastPayoutUpdate` (`:210`) → `admin-updates` + `global_{lawyerId}`.
  - `broadcastPaymentMethodUpdate` (`:230`) → `app-updates`/`payment-method-updated`.
  - `broadcastExchangeRateUpdate` (`:253`) → `app-updates`/`exchange-rate-updated`.

### 3.2 `src/hooks/useRealtimeSubscription.ts`
Dos efectos independientes:

1. **Listener de broadcasts** (`:31-127`): abre `app-updates` (siempre),
   `global_{user.id}` (si autenticado, `:103`) y `admin-updates` (solo ADMIN,
   `:114`). `handleUpdate` (`:34`) enruta por `eventName` y decide entre
   `invalidateQueries` (refetch) y `setQueryData` (aplicar la tasa/flag al
   instante). `handleNewMessage` (`:82`) invalida la query de chat y marca
   no-leído.
2. **Listener de `postgres_changes`** (`:132-300`): exige sesión
   (`supabase.auth.getSession()`, `:226`); si no hay, `DISCONNECTED` y no se
   suscribe. Crea el canal dinámico `db-changes-${user.id}-${Date.now()}`
   (`:235`) y registra `postgres_changes event:'*'` por tabla según rol
   (`:244-261`). `handleChanges` (`:147`) hace `switch(table)`:
   - `User` → `CLIENT_KEYS.all`, `LAWYER_KEYS.all` (`:152-156`).
   - `Order` → `refetchQueries(ORDER_KEYS.all, active)` + `invalidateQueries` +
     cascada `DashboardStats/Finance/FinancialSummary/FinanceSummaryDashboard`
     (`:157-177`).
   - `Service` → `['Service']` (`:179`).
   - `FinancialSettings` → settings + stats + `['exchange-rate']` (`:183-190`).
   - `PaymentMethod` → `['PaymentMethod']` (`:191`).
   - `Message` → `['Message', orderId]` + `markAsUnread` (`:195-206`).
   - `LawyerPayouts` → mismas claves de finanzas que payout (`:207-215`).

> El estado devuelto (`CONNECTING|CONNECTED|DISCONNECTED|ERROR`, `:12`) lo
> consume el dummy `RealtimeSubscription` de `Providers.tsx:13-22` (hoy no se
> muestra en UI).

### 3.3 `src/hooks/useDisplaySettingsRealtime.ts`
Suscripción WAL **pura** a `public:DisplaySettings` (`:35-47`), sin auth, para
que anónimos vean el cambio del flag `show_usd_prices`. Invalida
`displaySettingsKeys.all` (`:45`). No hay polling: el comentario `:17` lo
declara explícitamente ("Cero polling").

### 3.4 `src/features/services/hooks/useServicesRealtime.ts`
Gemelo del anterior para `Service` (canal `public:Service`, `:36`), invalida
`servicesKeys.all` y `.active` (`:46-47`). Requiere que `Service` esté en la
publicación (lo está, `enable_realtime_on_tables.sql:11`).

### 3.5 `src/features/chat/hooks/useGlobalChatListener.ts` + componente
El hook (`:76`) es el **listener de UX**: además de invalidar, reproduce sonido
(`playSound` `:13`), hace parpadear el título (`blinkTab` `:31`) y muestra
toasts (`showToast` `:64`). Se suscribe a:
- `global_{user.id}` (`:130`): `new_message` (append/borrado optimista,
  `:249-286`), `order-updated` (`handleOrderUpdate` `:133-204`),
  `payout-updated` (`handlePayoutUpdate` `:206-236`).
- `app-updates` (`:131`): `order-updated`, `payout-updated`, `new_message`
  (`:291-300`). Estos tres **ya no se emiten por `app-updates`**, así que
  este listener es residual.
- Además hidrata contadores de no leídos vía `chatService.getUnreadCounts()`
  (`:118`) y gestiona el banner de push (`:97-108`).

`GlobalChatListener.tsx` es la vista (toast + banner) que consume el hook y se
monta globalmente en `src/app/layout.tsx:140`.

### 3.6 `src/components/providers/Providers.tsx`
Monta `RealtimeSubscription` (`:100`, llama `useRealtimeSubscription`) y
`DisplaySettingsRealtime` (`:101`, llama `useDisplaySettingsRealtime`) dentro
del `QueryClientProvider`. Configura el `QueryClient` **global** (`:70-96`) con
`staleTime 30 s`, `refetchOnWindowFocus:true` (reactividad por foco, capa 3) y
`placeholderData` para evitar flashes. Es la fuente de los defaults de la capa 3.

---

## 4. Capa 2: `postgres_changes` (WAL)

Las tablas que el código escucha y las que **realmente** están en la
publicación según migraciones:

| Tabla | ¿En `supabase_realtime`? | Evidencia | Quién la escucha |
|-------|--------------------------|-----------|------------------|
| `User` | Sí | `enable_realtime_on_tables.sql:5` | `useRealtimeSubscription` (ADMIN) |
| `Order` | Sí | `enable_realtime_on_tables.sql:8` | `useRealtimeSubscription` (filtro por `lawyerId`/`userId`) |
| `Service` | Sí | `enable_realtime_on_tables.sql:11` | `useRealtimeSubscription`, `useServicesRealtime` |
| `FinancialSettings` | Sí | `enable_realtime_on_tables.sql:14` | `useRealtimeSubscription` (ADMIN) |
| `Message` | Sí | `enable_realtime_on_tables.sql:17` | `useRealtimeSubscription` |
| `DisplaySettings` | Sí | `add_display_settings.sql:30` (+ `REPLICA IDENTITY FULL :29`) | `useDisplaySettingsRealtime` |
| `PaymentMethod` | **No (en migraciones)** | — | `useRealtimeSubscription` |
| `LawyerPayouts` | **No (en migraciones)** | — | `useRealtimeSubscription` |

> ⚠️ **A verificar en producción**: el código se suscribe a `PaymentMethod` y
> `LawyerPayouts` (`useRealtimeSubscription.ts:245,252`) pero ninguna migración
> las añade a la publicación. Si no fueron añadidas manualmente, esas ramas del
> `switch` **nunca se disparan** y el refetch depende de broadcasts/polling.
> Los broadcasts de payout sí existen (`broadcastPayoutUpdate`), pero el de
> `payment-method-updated` no tiene listener (ver §9).

El filtro por columna solo se aplica en `Order` y `LawyerPayouts`
(`useRealtimeSubscription.ts:248,252,256`); `Message`, `Service` y
`PaymentMethod` se escuchan sin filtro (comentario `:242`). El `CHANNEL_ERROR`
se **silencia** deliberadamente porque RLS puede bloquear la suscripción WAL y
el broadcast ya cubre el caso (`:279-283`).

---

## 5. Capa 3: polling de fallback

No hay un "polling global" único; la capa 3 es una **suma de estrategias locales**:

| Hook / punto | Parámetro | Ruta |
|--------------|-----------|------|
| Queries por defecto (global) | `staleTime 30s`, `refetchOnWindowFocus:true` | `Providers.tsx:76,86` |
| Catálogo público de servicios | `refetchInterval: 5000` + `staleTime:0` | `useServices.ts:38-39` |
| Monitoreo de pago (checkout) | `refetchInterval: 500` mientras espera webhook | `useOrderStatus.ts:24` |
| Payment methods | `staleTime:0`, refetch on focus | `usePaymentMethods.ts:10-11` |
| Display settings | `staleTime:0` (sin interval → solo WAL/broadcast) | `useDisplaySettings.ts:34` |
| Exchange rate | `staleTime 30s` | `useExchangeRate.ts:24` |

El endpoint de polling de pago es `GET /api/payments/status`
(`useOrderStatus.ts:19`), diseñado para reconciliación con la pasarela
(`src/app/api/payments/status/route.ts:8-9`). Es la única capa realmente
agresiva (0.5 s) y su objetivo es cerrar el checkout cuando el webhook confirma.

---

## 6. Montaje global (dónde se suscriben los listeners)

| Listener | Punto de montaje | Notas |
|----------|------------------|-------|
| `useRealtimeSubscription` | `Providers.tsx:100` (`<RealtimeSubscription/>`) | Global, dentro del `QueryClientProvider` |
| `useDisplaySettingsRealtime` | `Providers.tsx:101` | Global |
| `useGlobalChatListener` | `app/layout.tsx:140` (`<GlobalChatListener/>`) | Global, toasts/banner |
| `useServicesRealtime` | `useServiciosClientPage.ts:22` y `VirtuStudents.tsx:16` | Por página/sección de catálogo |
| `useRealtimeSubscription` (duplicado) | `AbogadoPanel.tsx:95` y `useMisServicios.ts:20` | **Reinstancia** el hook global → canales duplicados |
| `chatService.subscribeToMessages` (`chat_{orderId}`) | `useChat.ts:40` y `chatStore.ts:54` | Local a cada chat abierto |

`Providers` está montado en `src/app/layout.tsx` (dentro de `<Providers>`), por
lo que las capas 1/2/3 globales existen en **toda** la app.

---

## 7. Mapa de dependencias

**Importa de:**
- `lib/broadcast.ts` → `@supabase/supabase-js`, `ws`.
- `useRealtimeSubscription.ts` → `utils/supabase/client`, `@tanstack/react-query`,
  `CLIENT_KEYS`, `LAWYER_KEYS`, `ORDER_KEYS`, `authStore`, `FINANCIAL_SETTINGS_KEYS`,
  `chatStore`.
- `useGlobalChatListener.ts` → `utils/supabase/client`, `authStore`, `chatStore`,
  `chatService`, `usePushNotifications`, `checkoutStore`, `react-query`.

**Es importado por (emisores y listeners clave):**
- `lib/broadcast` ← `/api/services`(`route.ts:5`,`[id]/route.ts:6`),
  `/api/display-settings:5`, `/api/settings/financial:8`,
  `events/handlers/broadcastHandlers.ts:2`, `events/handlers/messageHandlers.ts:2`,
  `events/handlers/orderHandlers.ts:3`, `checkout/actions/paymentMethods.ts:7`.
- `useRealtimeSubscription` ← `Providers.tsx:5`, `AbogadoPanel.tsx:33`,
  `useMisServicios.ts:7`.
- `useGlobalChatListener` ← `GlobalChatListener.tsx:5` ← `app/layout.tsx:9`.
- `useServicesRealtime` ← `useServiciosClientPage.ts:7`, `VirtuStudents.tsx:8`.
- `useDisplaySettingsRealtime` ← `Providers.tsx:6`.

---

## 8. Notas de refactor / deuda / riesgos

1. **Doble motor realtime** (broadcast vs WAL) solapado:
   `service-updated` (broadcast) y `public:Service` (WAL) invalidan la misma
   query; `display-settings-updated` (broadcast) y `public:DisplaySettings` (WAL)
   también. Es intencional como redundancia, pero genera **refetch dobles** y
   dificulta razonar quién ganó. Considerar un solo motor por tabla.
2. **Canales/eventos huérfanos**:
   - `app-updates`/`payment-method-updated` se emite (`broadcast.ts:245`) pero
     **nadie lo escucha** en `useRealtimeSubscription` (solo escucha
     `service-updated`, `exchange-rate-updated`, `display-settings-updated`,
     `:97-99`).
   - `message_deleted` se emite a `global_*` y `chat_*`
     (`messageHandlers.ts:74-79`) pero **no hay `.on('broadcast',{event:'message_deleted'})`**
     en ningún listener; el borrado se resuelve por el campo `deleted` dentro del
     evento `new_message`.
   - `app-updates`/`new_message` escuchado en `useGlobalChatListener.ts:294`
     pero `messageHandlers` no lo emite a `app-updates`.
3. **`BroadcastChannel('services-update')` sin listener**:
   `notifyServiceChange()` (`useServices.ts:75-81`) postea a un
   `BroadcastChannel` que **nadie escucha** (no hay `addEventListener` en todo
   `src`). Código muerto.
4. **Múltiples instancias de `useRealtimeSubscription`**: montado en
   `Providers` y además en `AbogadoPanel` y `useMisServicios`, cada uno con
   `useEffect` que abre `app-updates`/`global_*`/`admin-updates` y un canal
   `db-changes-*`. Duplica conexiones y suscripciones WAL (riesgo de límite de
   canales de Supabase). Unificar en un único provider.
5. **`PaymentMethod`/`LawyerPayouts` fuera de la publicación** (según
   migraciones): sus ramas de `postgres_changes` probablemente nunca disparan.
   Verificar en producción o añadir a `enable_realtime_on_tables.sql`.
6. **Dependencia del orden de eventos**: `handleUpdate` asume que el payload
   viene en `payload.payload` (`:34-36`), formato que depende de que el emisor
   use `channel.send({type:'broadcast', event, payload})`. Los `.on('broadcast')`
   de Supabase entregan `{event, payload}`; si cambia el SDK, la extracción se
   rompe silenciosamente.
7. **`FinancialSettings` WAL solo para ADMIN**: los clientes no se suscriben a
   esa tabla; la tasa les llega por el broadcast `exchange-rate-updated` /
   `setQueryData(['exchange-rate'])` (`useRealtimeSubscription.ts:50-61`). Si el
   broadcast falla, los clientes quedan con tasa vieja hasta el `staleTime`.

---

**Siguiente**: `08-pagos.md` (Zenobank + MercadoPago + Yape, y cómo se
reconcilian con la capa 3 de polling de `useOrderStatus`).
