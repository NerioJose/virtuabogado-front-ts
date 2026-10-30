# 06 — Sistema de Eventos (bus + outbox)

> Documentación leída del **código real**. Cubre el bus de eventos de dominio, el
> patrón **outbox** (`EventLog`), su procesamiento por cron/`after()`, los
> handlers y los consumidores. No repite `01-fundacionales.md` ni `02-lib.md`
> (broadcast, push, telegram, systemUser se citan, no se re-explican).

---

## 1. Propósito y modelo conceptual (event-driven)

El subsistema `src/events/` desacopla **efectos secundarios** (broadcast Realtime,
mensajes de sistema, notificaciones push/Telegram, auto-asignación y creación de
liquidaciones) del camino síncrono de las rutas de API.

Modelo:

1. Una ruta o acción llama a `emit({ type, data })` (`src/events/eventBus.ts:10`).
2. `emit` **persiste** el evento en la tabla `EventLog` con `status: 'pending'`
   (`src/events/eventBus.ts:11-17`). Ese es el **outbox**.
3. Si nadie está registrado para ese `type`, se marca `completed` de inmediato
   (`src/events/eventBus.ts:19-22`) — los handlers se registran al importar
   `./handlers` (`src/events/eventBus.ts:8`).
4. Si hay handler, se **programa** el procesamiento (`schedule`, `src/events/eventBus.ts:24-57`).
5. Un worker procesa: síncrono (`inline`), diferido con `after()` (`after`, prod)
   o vía **cron** `/api/events/process` (Vercel).
6. El procesador reclama el evento con **lease/CAS**, ejecuta todos los handlers
   en paralelo (`Promise.allSettled`) y lo marca `completed` o `failed`.

Esto da **fiabilidad** (el evento sobrevive a un fallo de request), **reintentos**
con backoff y **concurrencia segura** entre múltiples instancias serverless.

---

## 2. Catálogo de eventos

Tipos definidos en `src/events/definitions.ts:1-14` (`BusinessEventType`). 13
tipos; `payload` en `BusinessEvent.data` (`definitions.ts:16-23`).

| Tipo | Emisor(es) | Handler(s) | Efecto |
|------|------------|-----------|--------|
| `order.created` | `orders/route.ts:190`, `orders/admin-create/route.ts:150` | `broadcastHandlers.ts:5` | Broadcast `order-updated` (creado) |
| `order.payment_received` | `payments/mercadopago:176`, `payments/yape:115`, `webhooks/zenobank:62`, `webhooks/mercadopago:93` | `orderHandlers.ts:19`, `notificationHandlers.ts:39` | **Auto-asigna** abogado si hay 1 activo, actualiza `Order`, mensaje de sistema o `order.assigned`, push venta + Telegram admins |
| `order.assigned` | `orders/route.ts:249`, `orders/[id]/route.ts:161`, `orderHandlers.ts:78` (encadenado) | `orderHandlers.ts:85`, `broadcastHandlers.ts:16`, `notificationHandlers.ts:83` | Broadcast, mensaje de presentación del abogado, push caso al abogado + push estado al cliente + Telegram abogado |
| `order.reassigned` | `orders/[id]/route.ts:180` | `orderHandlers.ts:117`, `broadcastHandlers.ts:29`, `notificationHandlers.ts:121` | Mensaje de sistema, broadcast al nuevo y al antiguo abogado, push nuevo/antiguo + Telegram |
| `order.status_changed` | `orders/route.ts:242`, `orders/[id]/route.ts:196`, pagos y webhooks (8 sitios) | `orderHandlers.ts:139`, `broadcastHandlers.ts:51`, `notificationHandlers.ts:161` | Broadcast de estado + push al cliente (omite `PAGO_RECHAZADO`/`CANCELADO`) |
| `order.completed` | `orders/[id]/route.ts:202` | `orderHandlers.ts:158`, `notificationHandlers.ts:177` | Crea `LawyerPayout` (PENDIENTE) + push a admins |
| `payout.created` | `payoutActions.ts:102` | `broadcastHandlers.ts:70` | Broadcast payout creado |
| `payout.finalized` | `payoutActions.ts:144` | `broadcastHandlers.ts:80`, `notificationHandlers.ts:191` | Broadcast + push al abogado |
| `message.sent` | `messages/[orderId]/route.ts:54`, `orderHandlers.ts:13` | `messageHandlers.ts:5`, `notificationHandlers.ts:198` | Broadcast a cliente/abogado/`chat_{orderId}` + push (omite al emisor y `CLIENTE` aguas abajo) |
| `message.deleted` | `messages/[orderId]/route.ts:86` | `messageHandlers.ts:60` | Broadcast `message_deleted` a cliente/abogado/chat |
| `service.updated` | `services/route.ts:64`, `services/[id]/route.ts:73` | `broadcastHandlers.ts:90`, `serviceHandlers.ts:5` | Broadcast `app-updates` + `revalidatePath` + `clearCache('services-')` |
| `service.deleted` | `services/[id]/route.ts:104` | `broadcastHandlers.ts:99`, `serviceHandlers.ts:11` | Broadcast + `revalidatePath` + `clearCache` |
| `user.registered` | **ninguno** (no hay `emit` de este tipo) | **ninguno** | Tipo declarado sin uso (ver §8) |

> Nota: varios eventos se emiten también **síncronamente** desde la ruta (p. ej.
> `services` hace `broadcastServiceUpdate` + `clearCache` **y además** `emit` del
> evento, que repite broadcast/revalidate). Ver §8.

---

## 3. Detalle por archivo

### 3.1 `definitions.ts` — contrato de tipos
`BusinessEventType` (unión de strings, `:1-14`) y `BusinessEvent<T>` (`:16-23`)
con `type`, `data` y `metadata?` (`userId`, `idempotencyKey`). Payloads tipados:
`OrderCreated`, `OrderPaymentReceived`, `OrderAssigned`, `OrderReassigned`,
`OrderStatusChanged`, `OrderCompleted`, `PayoutCreated`, `PayoutFinalized`,
`MessageSent`, `MessageDeleted`, `ServiceUpdated` (`:25-100`).

> ⚠️ `metadata.idempotencyKey` **se declara pero `emit()` lo ignora** (`eventBus.ts:11-17`
> solo persiste `type` y `data`). Los webhooks pasan claves de idempotencia
> (`webhooks/zenobank:65`, `payments/mercadopago:179`, etc.) que **no se aplican**.

### 3.2 `registry.ts` — registro en memoria
Map `Map<BusinessEventType, EventHandler[]>` (`:5`). `on(...)` añade (`:7-11`),
`getHandlers` (`:13-15`), `hasHandlers` (`:17-19`). El registro vive en memoria
del proceso; se puebla al importar `./handlers` (`eventBus.ts:8`,
`processor.ts:6`).

### 3.3 `eventBus.ts` — punto de entrada (`emit` / `retryEvent`)
- `emit`: crea `EventLog` `pending` (`:11-17`); si `!hasHandlers` → `markCompleted`
  (`:19-22`); si hay → `schedule` (`:24`).
- `schedule` (`:27-57`): importa dinámicamente `processor`. Si el worker ya está
  activo (`isProcessingInWorker()`), procesa el evento directo para evitar
  latencia de cron (`:31-34`). Modo por `EVENT_DISPATCH` (default `after` en prod,
  `inline` en dev) (`:36`): `none` no hace nada, `after(run)` difiere con
  `next/server#after`, `inline` ejecuta síncrono. `run()` llama a
  `drainDue(eventLogId)` (`:40-43`).
- `retryEvent(id)` (`:59-70`): exige que exista y esté `failed`, y **re-emite**
  un evento nuevo con el mismo type/data (no resucita el registro original).

### 3.4 `dispatch.ts` — parámetros de lease/backoff
`EVENT_LEASE_MS = 5 min` (`:1`), `nextBackoffMs(retries) = min(30s·2^retries, 1h)`
(`:3-5`). Flag global `processingInWorker` (`:7-15`).

### 3.5 `EventLog.ts` — transiciones de estado y limpieza
- `markProcessing` (`:4-9`) fija `processing` + `leaseUntil`.
- `markCompleted` (`:11-16`) → `completed`, `processedAt`, limpia `lease`/`error`.
- `markFailed` (`:18-37`): incrementa `retries`, calcula `scheduledAt` con
  backoff, guarda `error`, `status: 'failed'`.
- `getFailedEvents` (`:39-45`): fallidos con `retries < maxRetries`.
- `countPending` (`:47-51`).
- `cleanupOldEvents(daysOld=7)` (`:53-65`): borra `completed` anteriores a cutoff.
- `cleanupAllFailed` (`:67-74`): borra `failed` con `retries >= maxRetries`.

### 3.6 `processor.ts` — worker
- Constantes: `DEFAULT_BATCH_SIZE=20` (`:8`), `DRAIN_TIME_BUDGET_MS=30_000` (`:13`),
  `DRAIN_MAX_ITERATIONS=10` (`:14`).
- `claimEvent(id)` (`:22-41`): **CAS por lease**. Primero `updateMany` de
  `pending|failed` → `processing` con nuevo `leaseUntil`; si no afecta filas,
  reintenta reclamar `processing` cuyo `leaseUntil` es `null` o ya expiró
  (`:32-40`). Devuelve `true/false`.
- `runEvent(id)` (`:43-77`): si no hay handler → `completed`. Si hay, activa
  `processingInWorker`, ejecuta **todos** los handlers con `Promise.allSettled`
  (`:57-61`); si no hay errores → `completed`, si hay → `markFailed` con errores
  concatenados (`:67-73`). Restaura el flag en `finally`.
- `processEvent` (`:79-82`): `claimEvent` + `runEvent`.
- `claimAndProcessBatch(limit=20)` (`:84-117`): selecciona candidatos que sean
  `pending`/`processing`(lease vencido)/`failed`(retries<maxRetries y `scheduledAt`
  vencido), orden `createdAt asc`, y los procesa en serie. Devuelve
  `{processed, completed, failed, remaining}`.
- `drainDue(triggerId, opts)` (`:129-162`): 1) procesa el evento disparador;
  2) barre lotes hasta agotar presupuesto de tiempo/iteraciones. Pensado para
  correr dentro de `after()` (drenaje oportunista sin cron).

### 3.7 `handlers/index.ts`
Solo importa los 5 módulos de handlers (`:1-5`), disparando sus `on(...)`.

### 3.8 Handlers (qué reacciona)
- **`broadcastHandlers.ts`**: Realtime. `order.created` (`:5`), `order.assigned`
  (`:16`), `order.reassigned` (`:29`, además broadcast personal al abogado antiguo
  `global_{fromLawyerId}`), `order.status_changed` (`:51`, relee la orden),
  `payout.created` (`:70`), `payout.finalized` (`:80`), `service.updated` (`:90`),
  `service.deleted` (`:99`). Usa `lib/broadcast`.
- **`messageHandlers.ts`**: `message.sent` (`:5`) relee `Message`+`Order` y
  difunde a `global_{userId}`, `global_{lawyerId}`, `chat_{orderId}` (omitiendo al
  emisor); `message.deleted` (`:60`) difunde `message_deleted`.
- **`notificationHandlers.ts`**: push + Telegram. Helpers `telegramToAdmins`
  (`:15-25`) y `telegramToLawyer` (`:28-37`). Maneja `order.payment_received`
  (`:39`, push venta + Telegram admins con lógica de auto-asignación repetida),
  `order.assigned` (`:83`), `order.reassigned` (`:121`), `order.status_changed`
  (`:161`), `order.completed` (`:177`), `payout.finalized` (`:191`),
  `message.sent` (`:198`).
- **`orderHandlers.ts`**: lógica de dominio. `notifyChat` (`:9-17`) crea `Message`
  y `emit`a `message.sent`. `order.payment_received` (`:19`) **auto-asigna** (1
  abogado activo) y actualiza `Order`; `order.assigned` (`:85`) difunde y crea el
  mensaje de presentación del abogado; `order.reassigned` (`:117`) crea mensaje de
  sistema; `order.status_changed` (`:139`) difunde; `order.completed` (`:158`)
  crea `LawyerPayout` (ignora `P2002`).
- **`serviceHandlers.ts`**: `revalidatePath('/')`, `revalidatePath('/servicios')`
  y `clearCache('services-')` para `service.updated` (`:5`) y `service.deleted` (`:11`).

---

## 4. Ciclo de vida de un evento

```
ruta/acción ──emit()──► EventLog(status=pending)
                              │
                hasHandlers? ─┴─no──► markCompleted (fin)
                              │ sí
                         schedule()
             ┌────────────────┼─────────────────┐
     EVENT_DISPATCH=inline   after()          none/cron
       (dev, sync)          (prod, diferido)   (pendiente para cron)
             │                  │                 │
             └────────► drainDue(id) ◄────────────┘
                              │
        processEvent: claimEvent (CAS lease 5m) ──no──► null
                              │ sí
                   runEvent: Promise.allSettled(handlers)
                        │ éxito              │ error
                 markCompleted         markFailed (retries++, backoff)
```

- **Cron**: `vercel.json:1-12` → `GET /api/events/process` a `05:35` y `17:35`
  UTC. `process/route.ts:17-42` valida `isCronAuthorized`, procesa un lote y
  ejecuta limpieza (`cleanupOldEvents(7)` + `cleanupAllFailed`).
- **After**: en producción, cada `emit` dispara un `drainDue` dentro de
  `after()`, de modo que retries y pendientes no dependen de la frecuencia del
  cron (`processor.ts:119-128`).
- **Encadenamiento**: un handler puede volver a `emit` (p. ej.
  `order.payment_received` → `order.assigned` en `orderHandlers.ts:78`; y
  `notifyChat` → `message.sent` en `orderHandlers.ts:13`). El flag
  `isProcessingInWorker` hace que el hijo se procese en el mismo contexto.

---

## 5. Reintentos, lease y estados

Estados en `EventLog.status`: `pending` → `processing` → `completed` | `failed`
(campos en `prisma/schema.prisma:260-276`: `retries`, `maxRetries @default(3)`,
`error`, `scheduledAt`, `leaseUntil`, `createdAt`, `processedAt`; índices
`[status,createdAt]`, `[type,createdAt]`).

- **Lease/CAS**: `claimEvent` usa `updateMany` condicional para garantizar que
  solo un worker tome el evento (`processor.ts:22-41`). El lease dura 5 min
  (`dispatch.ts:1`); un lease vencido o `null` puede reclamarse.
- **Reintentos**: `markFailed` incrementa `retries` y fija `scheduledAt` con
  backoff exponencial 30 s·2^n tope 1 h (`EventLog.ts:18-37`, `dispatch.ts:3`).
- **Tope**: el barrido de lotes solo incluye `failed` con
  `retries < maxRetries(3)` (`processor.ts:91-95`); `cleanupAllFailed` borra los
  que agotaron reintentos (`EventLog.ts:67-74`).
- **Limpieza**: `completed` de más de 7 días se borran (`EventLog.ts:53-65`);
  el cron lo hace en cada corrida (`process/route.ts:27-30`).

> ⚠️ **A verificar**: `processEvent` (usado por `drainDue`/`schedule`) llama a
> `claimEvent` sin comprobar `maxRetries`, por lo que un evento `failed` con
> reintentos agotados **podría reprocesarse** si entra por el camino directo
> (el filtro de `maxRetries` solo está en `claimAndProcessBatch`).

---

## 6. Mapa de dependencias (importa / es importado por)

```
definitions ◄── registry? (no) · eventBus · processor · orderHandlers(tipos)
registry ◄── eventBus, processor, todos los *Handlers
dispatch ◄── eventBus, EventLog, processor
EventLog ◄── eventBus, processor, api/events/{process,cleanup,failed}
processor ◄── eventBus (dinámico), api/events/process
eventBus  ◄── 11 rutas/acciones (emit) + orderHandlers + api/events/retry

handlers/* ─► lib/broadcast, lib/prisma, lib/push-notifications, lib/telegram,
              lib/systemUser, lib/cache, shared/types/entities.types
             ─► registry.on, eventBus.emit (orderHandlers)
```

**Importadores de `@/events` (23, grep real)**:
`app/api/payments/{yape,mercadopago}`, `app/api/webhooks/{zenobank,mercadopago}`,
`app/api/services/(+[id])`, `app/api/orders/(+[id],admin-create)`,
`app/api/messages/[orderId]`, `app/api/events/{cleanup,process,retry,failed}`,
`features/finance/actions/payoutActions`, y los propios `events/handlers/*`.

**Emiten (13 archivos, 31 llamadas a `emit(`)**: incluye `orderHandlers.ts:13,78`
y `eventBus.ts:67` (retry), además de las rutas anteriores.

---

## 7. API de administración de eventos

| Endpoint | Método | Auth | Efecto |
|----------|--------|------|--------|
| `/api/events/process` | GET/POST | `isCronAuthorized` | Procesa 1 lote + limpieza (`route.ts:17-42`) |
| `/api/events/cleanup` | POST | `isCronAuthorized` | Borra `completed`>7d y `failed` agotados (`route.ts:5-22`) |
| `/api/events/retry` | POST | `isCronAuthorized` | `retryEvent(id)` re-emite (`route.ts:5-24`) |
| `/api/events/failed` | GET | `isCronAuthorized` | Lista fallidos retryables (`route.ts:5-16`) |

`isCronAuthorized` (`lib/cronAuth.ts:13-30`): exige `Bearer CRON_SECRET`
(`timingSafeEqual`); sin secret solo permite en dev (fail-closed en prod).

> ⚠️ **A verificar**: `cleanup`, `retry` y `failed` **no están en `vercel.json`**
> ni se invocan desde el código; parecen endpoints de operación manual.

---

## 8. Notas de refactor / deuda / riesgos

1. **Ciclo de import real**: `eventBus` importa `./handlers` (`eventBus.ts:8`),
   y `orderHandlers` importa `eventBus.emit` (`orderHandlers.ts:7`). Es un ciclo
   `eventBus ↔ handlers/orderHandlers`. Hoy funciona por el registro lazy, pero es
   frágil ante cambios de orden de evaluación.
2. **`metadata.idempotencyKey` ignorado**: los webhooks lo envían pero `emit` no
   lo persiste ni deduplica. La idempotencia se apoya en guards en los handlers
   (`orderHandlers.ts:35` corta si `PAID/EN_PROGRESO`) y en los webhooks
   (`webhooks/zenobank:58`). Endurecer: persistir la clave y usarla como índice
   único para no duplicar `order.payment_received`.
3. **Broadcasts duplicados**: `order.status_changed` difunde en `orderHandlers.ts:149`
   **y** `broadcastHandlers.ts:61`; `order.assigned`/`order.reassigned` también
   difunden en dos handlers. Además las rutas de `services` hacen broadcast
   síncrono **y** emiten el evento. Consolidar en un único handler por efecto.
4. **Lógica de auto-asignación triplicada**: (a) trigger SQL
   `fn_auto_assign_order` (`01-fundacionales.md §3.3d`), (b) `orderHandlers.ts:39-56`,
   (c) recalculada en `notificationHandlers.ts:63-74` solo para el texto de Telegram.
   Doble/triple fuente de verdad → riesgo de divergencia.
5. **`user.registered` sin emisor ni handler**: tipo muerto (`definitions.ts:14`).
   Un `emit('user.registered')` se marcaría `completed` al instante. Eliminar o
   implementar.
6. **`processEvent` no respeta `maxRetries`** en el camino directo (ver §5). Si se
   quiere tope estricto, mover el filtro a `claimEvent`.
7. **`retryEvent` genera un evento nuevo**: no reutiliza el registro `failed`, por
   lo que el conteo/historial no refleja el reintento sobre el mismo id.
8. **Auth de crons**: `CRON_SECRET` debe existir en producción; si falta, los
   endpoints quedan cerrados (bien), pero el cron fallará silenciosamente (401).
9. **Observabilidad**: los handlers registran con `console.*`; `compiler.removeConsole`
   los elimina en prod salvo `error` (`01-fundacionales.md §1.1`). Sentry no está
   integrado en el worker de eventos.

---

**Siguiente**: `07-realtime.md` (reactividad en 3 capas: broadcast Realtime,
TanStack Query y Zustand).
