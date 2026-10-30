# 09 — Sistema de Notificaciones

> Documento derivado de leer el código real. Cita `ruta:línea`. No repite lo ya
> dicho en `02-lib.md` (§3 y §5) ni en `06-eventos.md`; se enfoca en el flujo
> notificador: **Web Push (VAPID)**, **Telegram** y **email transaccional**.

---

## 1. Propósito y canales

El sistema avisa a los 3 roles (`CLIENTE`, `ABOGADO`, `ADMIN`) de los hitos del
ciclo de vida de `Order` y de la mensajería interna. Hay **tres canales
independientes**, cada uno con su propio camino:

| Canal | Transporte | Módulo emisor | Registro | Destinatarios |
|-------|-----------|---------------|----------|---------------|
| **Push (VAPID)** | `web-push` → navegador (Service Worker) | `src/lib/push-notifications.ts` | `PushSubscription` (Prisma) | Cualquier usuario autenticado |
| **Telegram** | Bot API HTTP (`fetch`) | `src/lib/telegram.ts` | `User.telegramChatId` | Solo ADMIN y ABOGADO (chat vinculado) |
| **Email transaccional** | Nodemailer + Gmail SMTP | `src/lib/nodemailer.ts` | — | Registro (CLIENTE) y reset de contraseña |

La mayoría de envíos son **fire-and-forget**: se disparan desde
`src/events/handlers/notificationHandlers.ts` reaccionando a eventos del bus
(`order.*`, `message.*`, `payout.finalized`). El email, en cambio, es
**síncrono** dentro de sus rutas API.

Hallazgo transversal: Push y Telegram **solo los emite el handler de eventos**;
ningún otro sitio importa `push-notifications.ts` ni `telegram.ts`
(`src/events/handlers/notificationHandlers.ts:1-12`). El email se emite fuera
del bus (`api/auth/register`, `api/auth/reset-password/request`).

---

## 2. Tabla eventos → destinatario → canal

Fuente: `src/events/handlers/notificationHandlers.ts`.

| Evento | Destinatario | Push | Telegram | Efecto |
|--------|--------------|:----:|:--------:|--------|
| `order.payment_received` | ADMIN | ✅ `notifyNewSale` (`:58`) | ✅ `telegramToAdmins` (`:76`) | "Pago Confirmado — Asignación Pendiente" |
| `order.assigned` | ABOGADO (nuevo) | ✅ `notifyNewCase` (`:104`) | ✅ `telegramToLawyer` (`:113`) | "Nuevo Caso Asignado" |
| `order.assigned` | CLIENTE | ✅ `notifyOrderStatusUpdate('EN_PROGRESO')` (`:107`) | — | "Abogado Asignado" |
| `order.assigned` | ADMIN | ✅ `notifyNewSale(needsAssignment=false)` (`:110`) | — | 2º "Pago Confirmado" (duplicado, ver §9) |
| `order.reassigned` | ABOGADO (nuevo) | ✅ `notifyNewCase` (`:142`) | ✅ `telegramToLawyer` (`:153`) | "Nuevo Caso Asignado" |
| `order.reassigned` | ABOGADO (anterior) | ✅ `notifyCaseUnassigned` (`:146`) | — | "Caso Reasignado" |
| `order.reassigned` | CLIENTE | ✅ `notifyOrderStatusUpdate('EN_PROGRESO')` (`:150`) | — | "Abogado Asignado" |
| `order.status_changed` | CLIENTE | ✅ `notifyOrderStatusUpdate(to)` (`:173`) | — | Salvo `PAGO_RECHAZADO`/`CANCELADO` (`:164`) |
| `order.completed` | ADMIN | ✅ `notifyCaseCompleted` (`:187`) | — | "Caso Completado" + liquidaciones |
| `payout.finalized` | ABOGADO | ✅ `notifyPayoutCompleted` (`:194`) | — | "Honorarios Transferidos" |
| `message.sent` | ABOGADO/ADMIN (no sender) | ✅ `notifyNewMessage` (`:217-226`) | — | **CLIENTE omitido** (`push-notifications.ts:216`) |

Notas de cobertura:
- **CLIENTE nunca recibe Telegram** (no vincula chat: `telegram/chat/route.ts:9`).
- **CLIENTE no recibe push de chat** por decisión explícita:
  `push-notifications.ts:214-218` ("para evitar saturación de procesos").
  El cliente sí recibe push de **estado** del caso.
- `message.sent` tiene **dos suscriptores**: este handler (push) y
  `messageHandlers.ts` (broadcast Realtime). Ver `06-eventos.md`.
- Telegram `order.payment_received` usa un mensaje resumido y determinístico
  sobre la auto-asignación (`notificationHandlers.ts:61-80`), replicando la
  lógica de 1 solo abogado activo.

---

## 3. Push VAPID

### 3.1 Configuración
`src/lib/push-notifications.ts:5-17`: al importar el módulo se leen
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` y se llama
`webpush.setVapidDetails`. Si falta alguna, solo hace `console.error` y **no
lanza** (el módulo queda inerte). `sendPushNotification` vuelve a configurar las
llaves y aborta temprano si faltan (`:36-43`).

### 3.2 Alta de suscripción
Flujo cliente (`src/hooks/usePushNotifications.ts`):

1. `Notification.requestPermission()` (`:111`).
2. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` (`:129-132`).
3. `POST /api/notifications/subscribe` con `subscription.toJSON()` (`:34-38`).

Endpoint `src/app/api/notifications/subscribe/route.ts`:
- Exige sesión Supabase (`:11-17`).
- Valida `endpoint`, `keys.p256dh`, `keys.auth` y devuelve 400 si faltan (`:22-25`).
- **Upsert** por índice único `@@unique([userId, endpoint])` usando
  `userId_endpoint` con `@ts-ignore` (`:34-52`). Fallback: si el upsert falla,
  hace `deleteMany`+`create` en `$transaction` (`:53-69`).
- El `userId` es el **id de Supabase Auth** (mismo id que en `User.id`).

### 3.3 Sincronización / re-suscripción proactiva
`usePushNotifications.checkSubscription` (`:52-94`) corre al montar:
- Escenario A: hay suscripción en el navegador → **siempre** re-sincroniza con
  la DB (`:72-74`) para sobrevivir a cambios de endpoint.
- Escenario B: permiso `granted` pero sin suscripción → re-suscribe en silencio
  (`:75-90`).

### 3.4 Baja de suscripción
- Manual: `unsubscribe()` (`:154-180`) llama `pushSubscription.unsubscribe()` y
  luego `POST /api/notifications/unsubscribe` con `{ endpoint }`.
- Endpoint `unsubscribe/route.ts:20-25`: `deleteMany` por `userId`+`endpoint`
  (idempotente).
- **Auto-limpieza**: si el envío devuelve **410/404**, `sendPushNotification`
  borra la fila (`push-notifications.ts:90-100`). Otros errores solo se loguean
  (`:97-99`).
- No hay limpieza de suscripciones muertas fuera del ciclo de envío (ni cron).

### 3.5 Envío
`sendPushNotification(userId, options)` (`:35-109`):
- Carga **todas** las suscripciones del usuario (`findMany`, `:49-51`); si son 0
  devuelve `{success:false, sent:0}`.
- Payload JSON: `title`, `body`, `url` (default `/`), `icon`
  (default `/logo/logo_sf_1.png`), `tag` = `(tag||'alert')-<epoch>` para que no
  colapsen (`:60-67`).
- Entrega: `urgency:'high'`, `TTL:86400` (`:70-73`), en paralelo con
  `Promise.all` (`:76-103`).
- Funciones de evento: `notifyNewSale`, `notifyNewCase`, `notifyCaseUnassigned`,
  `notifyNewMessage`, `notifyCaseCompleted`, `notifyPayoutCompleted`,
  `notifyOrderStatusUpdate` (`:119-307`). Todas construyen `url` con deep-link
  (p. ej. `/admin?orden=<id>`, `/abogado?caso=<id>`, `/detalle-servicio/<id>`).

### 3.6 Service Worker (`public/sw.js`, `SW_VERSION = v3.0.2`)
- **Registro**: `src/components/providers/Providers.tsx:37-59` registra `/sw.js`;
  si detecta una versión nueva instalada y ya hay `controller`, recarga la
  página (`:44-54`).
- **`push`** (`sw.js:9-55`): decodifica el payload JSON (fallback a texto),
  arma `notificationOptions` con `vibrate`, `renotify`, `requireInteraction:true`
  y acciones `open`/`dismiss`; muestra la notificación vía
  `event.waitUntil(showNotification)`.
- **`notificationclick`** (`:58-95`): cierra la notificación; si es `dismiss`
  no hace nada; si no, busca una pestaña del origen y la enfoca+navega al `url`
  del payload o abre una nueva (`clients.openWindow`).
- **`notificationclose`** (`:98-103`): solo loguea (analytics futuro).
- **`install`/`activate`** (`:106-117`): `skipWaiting()` + `clients.claim()`
  para control inmediato.
- **`manifest.json`**: PWA `display:standalone`, iconos `logo_white_192/512`,
  `theme_color #0056b3`, atajos a `/abogado` y `/admin`.

> El SW funciona sin sesión ni pestaña abierta; el enrutado por rol lo resuelve
> el `url` del payload emitido por el servidor.

---

## 4. Telegram

### 4.1 Vinculación
UI: `src/components/notifications/TelegramConnect.tsx` — usada en
`admin/ConfiguracionPanel.tsx:336` y `abogado/PerfilAbogadoPanel.tsx:358`.
Muestra el bot (`NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`), instrucciones (usar
`@userinfobot`) y permite guardar/borrar el `telegramChatId`.

Endpoint `src/app/api/notifications/telegram/chat/route.ts`:
- `GET`: devuelve `telegramChatId` del usuario autenticado (`:11-29`).
- `POST`: si viene vacío → `telegramChatId = null` (`:43-49`); si no, valida
  `/^-?\d+$/` (`:52-58`) y lo guarda (`:60-63`).
- El comentario dice "Solo ADMIN y ABOGADO" (`:9`), pero **el código no valida
  el rol**: cualquier usuario autenticado puede guardar su chat. **A verificar**.

### 4.2 Bot / comandos
`scripts/setup-telegram-bot.ts` (one-time) configura nombre, descripción y
comandos `start` y `help` vía `setMyName/setMyDescription/setMyShortDescription/setMyCommands`
(`:40-53`). La foto es manual en BotFather.

### 4.3 Webhook
`src/app/api/notifications/telegram/webhook/route.ts`:
- Verifica `x-telegram-bot-api-secret-token` contra `TELEGRAM_WEBHOOK_SECRET`
  **solo si el secret está configurado** (`:14-19`) → si falta, **fail-open**:
  acepta cualquier POST (riesgo, §9).
- Toma `message`/`edited_message` (`:24`); si no hay chat responde `{ok:true}`.
- `/start`, `/help` o vacío → mensaje de bienvenida con el `chat_id` formateado
  (`:33-45`); cualquier otro texto → recuerda el `chat_id` (`:46-52`).
- El alta real del vínculo **no la hace el bot**: el usuario copia su ID y lo
  pega en su perfil (llamada a `telegram/chat`).

### 4.4 Envío y 403
`src/lib/telegram.ts`:
- `sendTelegramMessage(chatId, text)` (`:15-53`): si no hay `TELEGRAM_BOT_TOKEN`
  o `chatId` → `{ok:false,error}`; POST a `sendMessage` con `parse_mode:'HTML'`.
- **403** = bot bloqueado / chat inválido → devuelve error legible pidiendo
  re-vincular (`:42-45`). Otros errores → `data.description` (`:47-48`).
- `buildTelegramMessage(title, body, url?)` (`:68-79`) arma el mensaje con
  identidad VirtuAbogado y enlace absoluto (`NEXT_PUBLIC_APP_URL` fallback).
- Helpers `notificationHandlers.ts`: `telegramToAdmins` (todos los ADMIN activos
  con `telegramChatId != null`, `:15-25`) y `telegramToLawyer` (`:28-37`).
- **El resultado de `sendTelegramMessage` se ignora** en los handlers: un 403 no
  desvincula el chat ni avisa al usuario (§9).

---

## 5. Email transaccional

Proveedor único activo: **Nodemailer + Gmail SMTP** (`lib/nodemailer.ts:10-16`).
El transporter se verifica en `development` (`:19-25`). `sendTransactionalMail`
(`:41-53`) fija `from`/`replyTo`, envía HTML+texto y cabeceras anti-spam
`List-Unsubscribe` + `List-Unsubscribe-Post`. (Resend existe pero está muerto:
ver `02-lib.md` §5.)

- **Confirmación de cuenta** (`lib/emailTemplates.ts:8-56` →
  `sendConfirmationEmail({to,nombre,confirmUrl})`): HTML con CTA "Confirmar mi
  Correo", válido 24 h. Se usa en `api/auth/register/route.ts:93` (reenvío) y
  `:163` (alta nueva).
  - Solo los **CLIENTE** requieren confirmación; ABOGADO se auto-confirma
    (`register/route.ts:34-37,127`).
  - El enlace apunta a `/auth/callback?...&token=<hashed_token>` generado con
    `supabaseAdmin.auth.admin.generateLink` (`register/route.ts:225-241`).
- **Reset de contraseña** (`api/auth/reset-password/request/route.ts`):
  - Respuesta genérica anti-enumeración si el email no existe o está inactivo
    (`:28-36`).
  - Genera `uuid`, expira en **15 min** (`:41-42`), borra tokens previos del
    email y crea `PasswordResetToken` (`:45-53`).
  - Envía el HTML de reset con link `/recuperar-password?token=<uuid>`
    (`:61-106`). A diferencia del email anterior, la plantilla está **inline**
    en la ruta (no reutiliza `emailTemplates.ts`) → duplicación.
  - La confirmación (`reset-password/confirm/route.ts`) valida token + expiración,
    actualiza password vía Admin Auth de Supabase y borra el token (un solo uso).

---

## 6. Detalle por archivo

### `src/lib/push-notifications.ts` (307 líneas)
- **Propósito**: despachador Web Push multi-dispositivo + helpers por evento.
- **Exports**: `sendPushNotification`, `notifyNewSale`, `notifyNewCase`,
  `notifyCaseUnassigned`, `notifyNewMessage`, `notifyCaseCompleted`,
  `notifyPayoutCompleted`, `notifyOrderStatusUpdate`.
- **Imports**: `web-push`, `./prisma`. **Importado por**: solo
  `events/handlers/notificationHandlers.ts`.
- **Efectos secundarios**: `setVapidDetails` al importar; escritura/borrado en
  `PushSubscription`.

### `src/lib/telegram.ts` (80 líneas)
- **Propósito**: envío de mensajes Telegram + formateo.
- **Exports**: `sendTelegramMessage`, `buildTelegramMessage`,
  `TelegramSendResult`. **Imports**: `fetch` nativo.
- **Importado por**: `notificationHandlers.ts`, `telegram/webhook/route.ts`.

### `src/lib/systemUser.ts` (22 líneas)
- `getSystemUserId()`: `upsert` del usuario `sistema@virtuabogado.app`
  (rol `ADMIN`, activo) y devuelve su id. **Importado por**:
  `events/handlers/orderHandlers.ts:4` (sender de mensajes automáticos).
- No participa directamente en push/telegram, pero **sí es un `ADMIN` activo**
  y por tanto es candidato en `telegramToAdmins`/`notifyNewSale` (§9).

### `src/lib/nodemailer.ts` / `src/lib/emailTemplates.ts`
- Ver §5. `emailTemplates` importa `nodemailer`; `register` importa
  `emailTemplates`; `reset-password/request` importa `nodemailer` directo.

### `src/hooks/usePushNotifications.ts` (192 líneas)
- Hook cliente (ViewModel). Exporta el hook; gestiona permiso, suscripción,
  re-suscripción silenciosa, unsubscribe. Importa `authStore`.

### `src/components/notifications/*`
- `PushNotificationToggle.tsx`: botón de estado (usa `react-icons/fi`, Framer
  Motion). Usado en `AbogadoPanel.tsx:193` y `ClientSidebar.tsx:132`.
- `TelegramConnect.tsx`: tarjeta de vinculación (ver §4.1).

### `public/sw.js` / `public/manifest.json`
- Ver §3.6. `sw.js` es JS plano servido desde `public/`, registrado por
  `Providers.tsx`.

### `src/events/handlers/notificationHandlers.ts` (229 líneas)
- Suscribe 7 eventos del bus y orquesta push+telegram. Importa
  `push-notifications`, `telegram`, `registry`, `prisma`. Registrado en
  `events/handlers/index.ts:2`.

### `src/events/handlers/messageHandlers.ts` (82 líneas)
- Suscribe `message.sent` y `message.deleted` para **broadcast Realtime**
  (no push). Importa `broadcast` y `prisma`. Registrado en `index.ts:4`.

### Rutas API
- `notifications/subscribe`, `notifications/unsubscribe` (auth Supabase + Prisma).
- `notifications/telegram/chat`, `notifications/telegram/webhook`.
- `auth/register`, `auth/reset-password/request|confirm` (email).

### `scripts/setup-telegram-bot.ts`
- Script one-time de identidad del bot (no runtime de la app).

### Modelo Prisma `PushSubscription` (`prisma/schema.prisma:247-258`)
- Campos `id`, `userId`, `endpoint`, `p256dh`, `auth`, `createdAt`;
  `@@unique([userId, endpoint])`, `@@index([userId])`; relación
  `UserPushSubscriptions` con `onDelete: Cascade`.
- `User.telegramChatId String?` (`schema.prisma:22`).

---

## 7. Mapa de dependencias

```
web-push ─► push-notifications ─┐
prisma   ─► push-notifications ─┤
                                ├─► events/handlers/notificationHandlers ─► events/registry
fetch    ─► telegram ───────────┘            │
                                             ▼
prisma   ─► systemUser ─► events/handlers/orderHandlers (sender de chat)

push-notifications ─► (ningún otro importador)
telegram          ─► telegram/webhook/route

nodemailer ─► emailTemplates ─► api/auth/register
nodemailer ─► api/auth/reset-password/request (HTML inline)

hooks/usePushNotifications ─► notifications/subscribe + unsubscribe
TelegramConnect ─► notifications/telegram/chat
Providers ─► registra public/sw.js ─► consume payload de push-notifications

tablas: PushSubscription (user 1─N), User.telegramChatId
```

- **Nada importa `push-notifications` ni `telegram` salvo los handlers/route.**
- Push y Telegram comparten un único punto de entrada: el bus de eventos.
- El email no pasa por el bus: es síncrono en las rutas de auth.

---

## 8. Notas de refactor / deuda / riesgos

1. **Usuario de sistema con rol `ADMIN`** (`systemUser.ts:11,17`): es un ADMIN
   activo, por lo que aparece como destinatario potencial de `notifyNewSale`
   (`push-notifications.ts:127-130`), `notifyCaseCompleted` (`:242-245`) y
   `telegramToAdmins` (`notificationHandlers.ts:16-19`). Sin suscripciones ni
   `telegramChatId`, hoy no recibe nada; pero **A verificar** que no se filtre en
   paneles/contadores de "admins reales" ni en notificaciones futuras. Dedicar
   un rol `SYSTEM` evitaría el problema.
2. **Webhook de Telegram fail-open** (`telegram/webhook/route.ts:14-19`): si
   `TELEGRAM_WEBHOOK_SECRET` no está definido, acepta cualquier petición. Debería
   ser fail-closed (rechazar si falta el secret).
3. **403 de Telegram ignorado**: `notificationHandlers` no usa el
   `{ok:false,error}` de `sendTelegramMessage`; un usuario con el bot bloqueado
   se queda con el `telegramChatId` guardado y no se le avisa. Falta auto-limpiar
   o marcar el vínculo como inválido.
4. **Sin validación de rol en `telegram/chat`**: el comentario promete "solo
   ADMIN y ABOGADO" (`telegram/chat/route.ts:9`) pero no se comprueba rol.
   Un CLIENTE podría guardar un `chatId` (aunque el cliente nunca recibe
   Telegram desde el bus).
5. **`@ts-ignore` en el upsert push** (`subscribe/route.ts:36`) y fallback
   transaccional (`:53-69`): sintoma de índice `userId_endpoint` no estable tras
   `prisma generate`. Normalizar el cliente Prisma y eliminar el fallback.
6. **Doble `notifyNewSale` en `order.assigned`** (`notificationHandlers.ts:110`):
   los admins ya fueron notificados en `order.payment_received`; con la
   asignación reciben un segundo "Pago Confirmado". Evaluar si es intencional.
7. **Duplicación de HTML de email**: la plantilla de reset está inline en
   `reset-password/request/route.ts:70-105` en vez de vivir en
   `emailTemplates.ts`; ambas comparten estilos. Unificar.
8. **Dos proveedores de email** (Nodemailer activo / Resend muerto): ver
   `02-lib.md` §5; eliminar `resend.ts`.
9. **Push: `result.sent` cuenta dispositivos, no envíos exitosos**: en
   `notifyNewSale`/`notifyCaseCompleted` el éxito se calcula sumando `res.sent`
   (`push-notifications.ts:155,259`), que puede incluir endpoints que luego
   fallen (se limpian pero igual se contaron).
10. **CLIENTE sin push de chat** es intencional (`:214-218`) para no saturar;
    si se cambia, revisar coste por mensaje.
11. **Sin cron de limpieza de suscripciones**: solo se limpian al intentar un
    envío (410/404). Un usuario inactivo conserva filas obsoletas.

---

**Siguiente**: `10-auth.md` (Supabase SSR + OTP + Turnstile).
