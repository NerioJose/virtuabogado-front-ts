# 03i — Feature: chat

> Documentación basada en lectura del código real. Citas en formato `ruta:línea`.
> Contexto previo asumido: `00-mapa.md` y `02-lib.md` (no se repiten).

---

## 1. Propósito

La feature `chat` implementa la **mensajería por caso (`Order`)** entre cliente,
abogado y admin. Es un canal de texto + adjuntos (imágenes/documentos) ligado a
una orden, con:

- **Persistencia** en la tabla `Message` (Prisma/PostgreSQL).
- **Realtime** por **Supabase Broadcast** (canales `chat_{orderId}`, `global_{id}`),
  más `postgres_changes` como red de seguridad (ver `07-realtime.md`).
- **UI optimista** (TanStack Query) y notificaciones en cliente (sonido, toast,
  parpadeo del título).
- **Badge de no leídos** por orden (`readBy` + `/api/messages/unread-counts`).
- **Mensajes de sistema** (`isSystem = true`, sender = usuario sistema o el actor
  del evento) para avisos automáticos.
- **Videollamada** (Jitsi) y **adjuntos con carga reanudable** (TUS).

El "listener global" (`GlobalChatListener`) centraliza las suscripciones Realtime
de TODA la app para evitar múltiples WebSockets (`GlobalChatListener.tsx:7-11`).

---

## 2. Inventario

| Archivo | Exports | Importadores (reales) |
|---|---|---|
| `src/features/chat/index.ts` | re-export de todo (barrel) | **Ninguno** (nadie importa `@/features/chat`; todos importan rutas internas) |
| `components/ChatWindow.tsx` | `ChatWindow` (named) | `components/admin/ModalContainer.tsx:17`, `components/admin/AdminSupervisionTabs.tsx:5`, `components/abogado/CasosAbogadoPanel.tsx:6`, `components/abogado/MensajesPanel.tsx:13`, `features/clients/components/ClientPanel.tsx:28`, `app/detalle-servicio/[id]/page.tsx:14` |
| `components/GlobalChatListener.tsx` | `default GlobalChatListener` | `app/layout.tsx:9` (montado en `:140`) |
| `hooks/useChat.ts` | `chatKeys`, `useChat` | solo `useChatViewModel.ts:4` |
| `hooks/useChatViewModel.ts` | `useChatViewModel` | solo `ChatWindow.tsx:5` |
| `hooks/useGlobalChatListener.ts` | `useGlobalChatListener` | solo `GlobalChatListener.tsx:5` |
| `services/chat.service.ts` (feature) | `chatService` (objeto) | `hooks/useChat.ts:4`, `hooks/useGlobalChatListener.ts:6`, `store/chatStore.ts:4`, `index.ts:6` |
| `store/chatStore.ts` | `useChatStore` | admin/abogado/clients panels + `authStore.ts:96` + `hooks/useRealtimeSubscription.ts:11` + `features/services/hooks/useMisServicios.ts:5` (todos solo para `unread*` y `cleanup`) |
| `types/chat.types.ts` | `Message`, `ChatState` | `hooks/useChat.ts:5`, `store/chatStore.ts:3` |
| `utils/chatHelpers.tsx` | `linkifyText`, `getMessageContentInfo`, const `MEDIA_EXTENSIONS` (no exportada) | solo `ChatWindow.tsx:6` |
| `src/services/chat.service.ts` (global) | `ChatAuth`, `getChatAuth`, `checkChatAccess` | los 3 endpoints de `api/messages` |

> ⚠️ **Barrel muerto**: `index.ts` re-exporta hooks/componentes/store/servicio,
> pero ningún archivo del repo importa `@/features/chat` (`grep` vacío). Todos los
> consumidores entran por rutas internas. El barrel es fachada sin uso.

---

## 3. Tipos, servicio y store

### 3.1 Tipos — `types/chat.types.ts`
- `Message` (`:1-15`): `id`, `orderId`, `senderId`, `content`, `isSystem`,
  `readBy?: string[]`, `createdAt`, `sender?` (`nombre`, `picture`, `rol`) y
  `isPending?` (solo UI optimista).
- `ChatState` (`:17-21`): forma legada (`messages`, `isLoading`, `activeOrderId`).
  **A verificar**: no se usa en ningún importador detectado.
- Nota: el tipo TS **omite** el campo `read: boolean` que sí existe en
  `prisma/schema.prisma:140`. El código escribe `read:false` en
  `orderHandlers.ts:11`, pero el front lee `readBy` para no leídos.

### 3.2 Store — `store/chatStore.ts`
Zustand con `persist` en `localStorage` bajo `chat-unread-storage` (`:155`).
Estado real (lo usado por la app): `unreadOrders` y `unreadCounts` (`:34-35`).
- `markAsUnread(orderId, messageId?)` (`:105-128`): deduplica por `Set`
  `processedMessageIds` (máx 5000, poda a la mitad, `:6-7,105-114`); si la orden
  NO está activa, incrementa contador y añade a `unreadOrders`.
- `markAsRead(orderId)` (`:130-139`): borra contador y orden de la lista.
- `hydrateUnread(counts)` (`:141-146`): filtra >0 y setea `unreadOrders`.
- `merge` de persistencia (`:158-176`): descarta claves en 0 de versiones previas.
- `cleanup()` (`:148-152`): limpia `messages`/`activeOrderId`/`subscription`;
  **único uso externo** en `features/auth/store/authStore.ts:96-97` (logout).
- **LEGADO/MUERTO**: `setActiveOrder`, `loadMessages`, `addMessage`,
  `sendMessage`, `sendFile`, `subscription` (`:37-103`) no tienen consumidores
  externos comprobados (grep vacío salvo `useChat.ts` que NO los usa). La ruta
  de mensajes real es TanStack Query en `useChat`; el store quedó solo para
  no-leídos. **A verificar** antes de borrar.

### 3.3 Servicio de feature — `services/chat.service.ts`
Cliente browser (`fetch`). Métodos:
- `getMessages(orderId)` → `GET /api/messages/{orderId}` (`:6-13`).
- `markRead(orderId)` → `POST /api/messages/{orderId}/read` fire-and-forget
  (`:16-22`).
- `getUnreadCounts()` → `GET /api/messages/unread-counts`, devuelve
  `data.counts` o `{}` (`:25-34`).
- `sendMessage(orderId, content, senderId)` → `POST` JSON (`:36-49`).
- `subscribeToMessages(orderId, cb)` → canal Supabase `chat_{orderId}`, evento
  `broadcast`/`new_message`, invoca `cb({ new: payload.payload.new })`
  (`:51-72`).
- `uploadFile(orderId, file)` → comprime imagen y `POST /api/storage/upload`
  (bucket `case-files`), devuelve `publicUrl` (`:74-100`). **A verificar**: el
  flujo real de adjuntos en `useChat` NO usa este método (usa
  `useResumableUpload` + `documentsService.create`); `uploadFile` solo lo usa el
  store legado.
- `deleteMessage(orderId, messageId)` → `DELETE` (`:102-113`).

### 3.4 Servicio global (server) — `src/services/chat.service.ts`
Diferente responsabilidad: **autorización server-side**.
- `ChatAuth` (`:4-7`): `{ user:{id,email?}, role }`.
- `getChatAuth()` (`:9-24`): lee usuario de Supabase SSR; rol desde
  `user_metadata.rol` o `prisma.user.rol` (fallback `CLIENTE`), en mayúsculas.
- `checkChatAccess(orderId, userId, role)` (`:26-36`): admin siempre; si no,
  `order.userId === userId || order.lawyerId === userId`.
- Usado exclusivamente por los 3 endpoints de mensajes.

---

## 4. Detalle por archivo

### 4.1 `components/ChatWindow.tsx` (View)
- `'use client'` (`:1`). Props: `{ orderId: string; className?: string }`
  (`:9-12`).
- Consume `useChatViewModel(orderId)` (`:42`) y todo se delega al ViewModel.
- `renderMessageContent` (`:61-139`): usa `getMessageContentInfo`; si no es media
  → `linkifyText` (`:68-71`); si imagen → `<img>` + descarga (`:76-107`); si
  documento → tarjeta con icono/descarga (`:109-138`).
- `handleStartVideoCall` (`:45-58`): abre Jitsi (`NEXT_PUBLIC_VIDEOLLAMADAS`)
  con sala `VIRTUA-{orderId.slice(0,8)}` y envía un mensaje de chat con el enlace
  (`sendMessage`). Solo visible para ABOGADO/ADMIN (`:266-276`).
- Render `isSystem` centrado, itálico y gris (`:186-197`).
- Borrado: botón visible si `isMe` o `user.rol==='ADMIN'` (`:208-216`) →
  `ConfirmModal` (`:306-314`).
- Estado cerrado: `isChatDisabled` (`:173-177`, `:242-247`) bloquea input y
  muestra "Chat Cerrado ({status})".
- Header incluye toggle de sonido (`FiVolume2/FiVolumeX`, `:164-171`).
- `<audio ref={audioRef} src="/virtuabogado-chat.mp3">` oculto (`:158`).

### 4.2 `components/GlobalChatListener.tsx` (View global)
- `'use client'`, default export. Montado una vez en `app/layout.tsx:140`.
- Renderiza un contenedor fijo abajo-derecha (`:29`) con:
  - **Toast** animado (Framer Motion) para `chat`/`sale`/`case` (`:31-98`); al
    clic navega según rol (`:42-47`).
  - **Banner de push** VAPID con lógica iOS/standalone y permiso (`:103-156`).
- Toda la lógica está en `useGlobalChatListener`.

### 4.3 `hooks/useGlobalChatListener.ts` (ViewModel global)
- Estado local: `toastMessage`, `showPushBanner`, `isSubscribing`, `isIOS`,
  `isStandalone` (`:81-85`).
- **Audio pool** módulo-global: un único `Audio('/virtuabogado-chat.mp3')`
  reutilizado por `playSound()` (`:11-22`).
- **Parpadeo de título** (`blinkTab`/`stopBlink`, `:24-56`): intervalo que alterna
  `(1) {text}`/título original 10 s; estado módulo-global.
- **Hidratación de no leídos** (`:115-122`): al montar usuario llama
  `chatService.getUnreadCounts()` → `hydrateUnread`.
- **Banner push** (`:97-108`): solo ADMIN/ABOGADO, se muestra 12 s tras 3 s.
- **Suscripciones Realtime** (`:126-308`), ver §6.
- `handleSubscribe` (`:310-326`): llama `subscribe()` de `usePushNotifications`.

### 4.4 `hooks/useChat.ts` (ViewModel de datos)
- `chatKeys` (`:12-15`): `['chat']`, `['chat','messages',orderId]`.
- `useQuery` de mensajes (`:22-27`): `enabled: !!orderId`, `retry:false`.
- `useEffect` (`:29-34`): al cargar, setea `activeOrderId` en store, `markAsRead`
  local y `chatService.markRead(orderId)` server.
- Suscripción **local** (`:37-72`) al canal `chat_{orderId}` vía
  `subscribeToMessages`, con **dedupe** por `id` y **reemplazo optimista**
  (`isPending` + mismo `senderId` + mismo `content`) (`:46-64`).
- `sendMessageMutation` (`:75-108`): **optimistic UI** con id `temp-{Date.now()}`,
  rollback en error y `invalidate` en `onSettled`.
- `sendFileMutation` (`:111-143`): `compressImage` → `useResumableUpload.startUpload`
  → `documentsService.create` (best-effort) → `chatService.sendMessage(orderId,
  publicUrl, senderId)`; invalida `['documents', orderId]`.
- `deleteMessageMutation` (`:146-153`): borra en servidor y filtra caché.
- Retorna `messages/isLoading/isError/error` + acciones y flags.

### 4.5 `hooks/useChatViewModel.ts`
- Compone `useChat(orderId)`, `useOrders()` (para hallar la orden) y
  `useAuthStore`.
- `isChatDisabled` (`:42`): `status === COMPLETADO || CANCELADO`.
- Sonido persiste en cookie `chatSoundEnabled` (1 año) (`:44-73`); al activar,
  reproduce el audio.
- `order` vía `useMemo` buscando en `response.data` (`:38-41`).
- Auto-scroll al fondo en cada cambio de `messages` (`:75-80`).
- `handleSend` (`:82-95`): valida, limpia input, restaura texto si falla.
- `handleFileSelect` (`:97-110`) y modales de error/borrado (`:112-128`).
- Devuelve ~28 valores consumidos por `ChatWindow` (props del View).

### 4.6 `utils/chatHelpers.tsx`
- `linkifyText(text, isMe, azulPrimarioClass)` (`:8-58`): regex de URLs, maneja
  sufijos de puntuación, soporta `**negrita**` y URLs, devuelve ReactNode.
- `getMessageContentInfo(content)` (`:60-87`): detecta enlaces markdown
  `[nombre](url)` o URL directa con extensión media (`MEDIA_EXTENSIONS`, `:6`);
  devuelve `{isMedia,url,fileName,extension}`.
- `MEDIA_EXTENSIONS` **no se exporta**.

---

## 5. Endpoints

### 5.1 `src/app/api/messages/[orderId]/route.ts`
`maxDuration = 60` (`:6`).
- **GET** (`:8-27`): `getChatAuth` → 401; `checkChatAccess` → 403;
  `prisma.message.findMany` por `orderId` con `sender` (`nombre,picture,rol`),
  orden `createdAt asc`.
- **POST** (`:29-63`): verifica orden y acceso; `prisma.message.create` con
  `isSystem:false` (`:47-50`); `emit('message.sent', {...})` (`:54-57`);
  devuelve el mensaje.
- **DELETE** (`:65-95`): exige `messageId`; solo el autor o ADMIN (`:80-82`);
  `prisma.message.delete`; `emit('message.deleted', {...})` (`:86-89`).

### 5.2 `src/app/api/messages/[orderId]/read/route.ts`
- **POST** (`:10-33`): `getChatAuth` + `checkChatAccess`; `updateMany` que añade
  el `userId` a `readBy` (`push`) en mensajes ajenos no leídos aún (`:19-26`).

### 5.3 `src/app/api/messages/unread-counts/route.ts`
- **GET** (`:11-43`): filtra `senderId != userId` y `readBy` sin `userId`
  (`:18-21`); si no es ADMIN, restringe a órdenes propias (`userId` o
  `lawyerId`) (`:23-25`); `groupBy(orderId).count` (`:27-31`) → `{ counts }`.

---

## 6. Flujo de mensajería end-to-end

### 6.1 Envío manual (texto)
1. **UI**: `ChatWindow` form submit → `useChatViewModel.handleSend` (`:82-95`).
2. **Optimista**: `useChat.sendMessageMutation.onMutate` inserta mensaje temporal
   (`useChat.ts:79-97`).
3. **HTTP**: `chatService.sendMessage` → `POST /api/messages/{orderId}`
   (`chat.service.ts:36-49`).
4. **Persistencia**: endpoint crea `Message` (`route.ts:47-50`) y **emite**
   `message.sent` (`:54-57`).
5. **Fan-out realtime** (worker/evento, `messageHandlers.ts:5-58`):
   `sendBroadcast('global_{userId}','new_message')` si el remitente ≠ cliente,
   ídem para `lawyerId`, y **siempre** `chat_{orderId}` (`:38-44`).
6. **Push** (opcional): `notificationHandlers.ts:198-229` llama
   `notifyNewMessage` a cliente/abogado; **omite CLIENTE**
   (`push-notifications.ts:214-219`).
7. **UI receptor**: `useChat` ya escucha `chat_{orderId}` (`useChat.ts:37-72`) y
   `useGlobalChatListener` escucha `global_{id}` (`:249-299`); ambos deduplican
   por `id`. Si la orden no es la activa, se toca sonido, toast y parpadeo, y
   `markAsUnread` (`:266-274`).

### 6.2 Adjuntos
`handleFileSelect` → `sendFileMutation` (`useChat.ts:111-143`): comprime imagen →
subida reanudable TUS → registro en `Document` (best-effort) → mensaje de chat
con la `publicUrl`. `ChatWindow.renderMessageContent` la interpreta como media.

### 6.3 Borrado
`handleDeleteClick`/`confirmDelete` → `DELETE` API → `emit('message.deleted')` →
broadcast `message_deleted` en `global_{id}` y `chat_{orderId}`
(`messageHandlers.ts:60-81`).

### 6.4 Realtime: dos mecanismos coexistentes
- **Broadcast** (primario): `messageHandlers` empuja por REST/WS vía
  `lib/broadcast.sendBroadcast`. Canales: `chat_{orderId}` (ventana abierta) y
  `global_{userId}` (personal, para badges/toast fuera de la ventana).
- **`postgres_changes`** (secundario): `hooks/useRealtimeSubscription.ts:195-206`
  escucha `Message` y hace `markAsUnread`; en cliente/abogado la tabla `Message`
  va **sin filtro** (`:243-260`), dependiendo de RLS. **A verificar** solapamiento
  con el broadcast (el comentario del propio archivo lo declara red de
  seguridad, `:219-222,279-282`).
- **Importante**: `GlobalChatListener` crea sus propios canales
  `global_{id}` y `app-updates` (`:130-131`) en paralelo a
  `useRealtimeSubscription` (que también crea `global_{id}` y `app-updates`,
  `:95,103`). Hay **duplicación de suscripciones** (ver §10).

### 6.5 Sonido
- Ventana de chat: `<audio src="/virtuabogado-chat.mp3">` (`ChatWindow.tsx:158`),
  toggle persistido en cookie (`useChatViewModel.ts:44-73`).
- Global: pool `Audio` en `useGlobalChatListener.ts:11-22` usado por ventas,
  casos, payouts y mensajes.

### 6.6 PWA / Service Worker
- `app/layout.tsx` monta `GlobalChatListener`; las notificaciones del sistema
  abren la app vía `public/sw.js`:
  - `push` → `showNotification` con `vibrate`, `renotify`, `requireInteraction`
    y acciones (`sw.js:9-55`).
  - `notificationclick` → enfoca o abre la URL (`sw.js:58-95`).
- `sw.js` **no** contiene lógica de chat; solo gestiona push. El sonido en-app lo
  reproducen los componentes, no el SW.

---

## 7. No leídos / badges

Mecánica de datos:
- **Persistencia**: `Message.readBy: String[]` (`schema.prisma:141`); existe
  también `read: Boolean` (`:140`) que el flujo nuevo **no** mantiene (solo se
  escribe `false` en `orderHandlers.ts:11`). Posible deuda: campo obsoleto.
- **Marcar leído (server)**: `POST /api/messages/{orderId}/read` hace
  `push` del `userId` en mensajes ajenos (`read/route.ts:19-26`).
- **Contadores (server)**: `/api/messages/unread-counts` agrupa por orden
  (`unread-counts/route.ts:27-31`), con alcance por rol.
- **Cliente**: `chatStore.unreadCounts` + `unreadOrders`; hidratados al login
  (`useGlobalChatListener.ts:115-122`) e incrementados en realtime
  (`markAsUnread`).
- **Reset local**: `useChat`/`useChatViewModel` llaman `markAsRead` al abrir la
  orden (`useChat.ts:29-34`, `useChatViewModel.ts:44-64`); además
  `chatService.markRead` persiste en servidor.
- **Consumidores UI**: `CasosPanel`, `CasosAbogadoPanel`, `MensajesPanel`,
  `AbogadoPanel` (`unreadCounts` total), `ClientPanel` y `useMisServicios`
  (badges `99+`). Persistidos en `localStorage` (`chat-unread-storage`).

> **Inconsistencia**: `useRealtimeSubscription` invalida `['chat','messages',orderId]`
> (`:85`) y `markAsUnread`, mientras `useGlobalChatListener` **escribe** en
> `['chat','messages',orderId]` con `setQueryData` (`:260-264`). Diferentes
> estrategias de actualización sobre la misma clave.

---

## 8. Duplicación: `features/chat/services/chat.service.ts` vs `src/services/chat.service.ts`

**No son duplicados funcionales**, pero comparten nombre y propósito confuso:

| Aspecto | `features/chat/services/chat.service.ts` | `src/services/chat.service.ts` |
|---|---|---|
| Entorno | **cliente** (browser, `fetch` + Supabase client) | **servidor** (Prisma + Supabase SSR) |
| API | `chatService` (getMessages, markRead, getUnreadCounts, sendMessage, subscribeToMessages, uploadFile, deleteMessage) | `getChatAuth`, `checkChatAccess` |
| Importadores | hooks/store de la feature | los 3 endpoints `api/messages` |
| Rol | Modelo MVVM de la feature | Autorización transversal de endpoints |

**Riesgo real**: dos módulos con el mismo nombre `chat.service` en capas
distintas invitan a importar el equivocado (p. ej. usar el cliente dentro de un
`route.ts`). **Recomendación** (ver §10): renombrar el global a
`services/chatAuth.service.ts` o moverlo a `features/chat/server/`.

---

## 9. Mapa de dependencias

**La feature `chat` importa:**
- `@/utils/supabase/client` (realtime browser) — `chat.service.ts:1`,
  `useGlobalChatListener.ts:2`.
- `@/lib/formatOrderId` — `ChatWindow.tsx:7`.
- `@/features/storage/hooks/useResumableUpload` — `useChat.ts:7`.
- `@/features/documents/services/documents.service` — `useChat.ts:9`.
- `@/features/orders/hooks/useOrders` + `types/orders.types` — `useChatViewModel.ts:6-7`.
- `@/features/auth/store/authStore` — `useChatViewModel.ts:5`,
  `useGlobalChatListener.ts:3`.
- `@/features/checkout/store/checkoutStore` — `useGlobalChatListener.ts:9`.
- `@/hooks/usePushNotifications` — `useGlobalChatListener.ts:7`.
- `@/components/ui/ConfirmModal` — `ChatWindow.tsx:4`.
- `@/utils/imageCompression` — `useChat.ts:8`, `chat.service.ts:3`.
- `react-icons/fi`, `framer-motion`, `@tanstack/react-query`, `zustand`.
- (store legado) `../services/chat.service`.

**Es importado por:**
- Panels admin/abogado/cliente y `app/detalle-servicio/[id]/page.tsx`,
  `app/layout.tsx`, `app/mis-servicios/page.tsx` (badges).
- `hooks/useRealtimeSubscription.ts`, `features/services/hooks/useMisServicios.ts`,
  `features/auth/store/authStore.ts`.
- Endpoints `api/messages/**` → `src/services/chat.service.ts`.
- Eventos `messageHandlers.ts`, `orderHandlers.ts`, `notificationHandlers.ts`
  (producción de mensajes/broadcast), `lib/broadcast.ts`, `lib/systemUser.ts`.

**Ciclos**: `chat` ↔ `orders` (la feature lee órdenes; los handlers de orden
crean mensajes) y `chat` ↔ `auth` (auth limpia el store en logout). Sin ciclo de
imports directo evidente, pero acoplamiento alto.

---

## 10. Notas de refactor / deuda / riesgos

1. **Barrel huérfano**: `features/chat/index.ts` no se usa; decidir mantener
   (y migrar consumidores) o eliminar.
2. **`chatStore` legado**: ~60% del store (`setActiveOrder`, `loadMessages`,
   `addMessage`, `sendMessage`, `sendFile`, `subscription`) no tiene
   consumidores externos. Solo `unread*` + `cleanup` viven. Eliminar o marcar
   como deprecado (evita dos modelos de datos solapados).
3. **Doble suscripción Realtime**: `GlobalChatListener` y
   `useRealtimeSubscription` crean ambos canales `global_{id}` y `app-updates`.
   Unificar en un único punto de suscripción.
4. **Tres estrategias de actualización de `['chat','messages',orderId]`**:
   `setQueryData` (local channel), `setQueryData` + dedupe (global channel),
   `invalidateQueries` (`useRealtimeSubscription`). Homogeneizar.
5. **`uploadFile` muerto en el servicio**: el flujo real usa
   `useResumableUpload` + `documentsService`. `chat.service.uploadFile` solo lo
   usa el store legado → retirar junto con el store.
6. **Campo `read` obsoleto** en `Message`: el flujo nuevo usa `readBy`. Eliminar
   o documentar (afecta `schema.prisma` + `orderHandlers.ts`).
7. **Colisión de nombres** `chat.service` (feature/client vs global/server):
   renombrar el de servidor (p. ej. `chatAuth.service.ts`).
8. **`Message` sin filtro en `postgres_changes`** para cliente/abogado
   (`useRealtimeSubscription.ts:243-260`): confirmar que RLS restringe filas o
   habrá fuga de eventos entre órdenes.
9. **Duplicación de tipado**: `ChatState` sin uso; `Message` TS desalineado del
   modelo Prisma.
10. **`linkifyText`**: lógica de parseo manual (markdown+URL) sin tests; riesgo
    de regresiones visuales.
11. **`getMessageContentInfo`** clasifica por extensión de URL; un archivo sin
    extensión/media URL se renderiza como enlace de texto (comportamiento
    intencional pero frágil).
12. **Videollamada**: URL Jitsi con `orderId.slice(0,8)` como sala; sin
    control de acceso propio (depende del proveedor externo). **A verificar**
    seguridad/privacidad.

---

**Siguiente**: `03-documents-storage.md` (documentos por orden, `case-files`,
carga reanudable TUS y su relación con los adjuntos del chat).
