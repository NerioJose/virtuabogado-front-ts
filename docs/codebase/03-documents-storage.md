# 03j — Feature: documents & storage

> Documentación derivada de leer el código real (no del grafo). Toda afirmación
> cita `ruta:línea`. Complementa `00-mapa.md` y `02-lib.md`, que no se repiten.

---

## 1. Propósito

**`documents`** gestiona los **metadatos** de los archivos de un caso (`Order`):
registro en la tabla `Document`, listado por orden o por abogado, y borrado.
No sube binarios: recibe una `url` ya alojada (Supabase Storage).

**`storage`** gestiona la **subida de binarios**: estado global de cargas
(Zustand), hook de subida reanudable contra Supabase Storage (bucket
`case-files`) y el orquestador visual global tipo Gmail (`UploadManager`).

Ambas features están acopladas de facto: `storage` sube el archivo y devuelve
una `publicUrl`; `documents` la persiste como fila. La compresión de imágenes
(`utils/imageCompression.ts`) se interpone antes de la subida.

---

## 2. Inventario

| Archivo | Exports | Importadores |
|---------|---------|--------------|
| `features/documents/components/DocumentList.tsx` | `default DocumentList`, `DocumentoItem` (interface) | `components/admin/AdminSupervisionTabs.tsx:6`, `components/abogado/DocumentosPanel.tsx:7` |
| `features/documents/hooks/useDocumentListViewModel.tsx` | `useDocumentListViewModel` | `DocumentList.tsx:7` (interno) |
| `features/documents/index.ts` | barrel (`*`) | `components/abogado/hooks/useDocumentosPanel.ts:2` (vía barrel) |
| `features/documents/services/documents.service.ts` | `documentsService` | `useDocumentosPanel.ts:2`, `features/chat/hooks/useChat.ts:9` |
| `features/documents/types/documents.types.ts` | `Document`, `CreateDocumentRequest` | `documents.service.ts:1` |
| `features/storage/components/UploadManager.tsx` | `default UploadManager` | `components/providers/Providers.tsx:9` (montado en `:103`) |
| `features/storage/hooks/useResumableUpload.ts` | `useResumableUpload` | `useDocumentosPanel.ts:6`, `useChat.ts:7` |
| `features/storage/hooks/useUploadManagerViewModel.ts` | `useUploadManagerViewModel` | `UploadManager.tsx:13` |
| `features/storage/index.ts` | barrel (`*`) | **0 importadores** (todos usan rutas profundas) — ver §9 |
| `features/storage/store/uploadStore.ts` | `useUploadStore`, `UploadStatus`, `FileUpload` | solo dentro de `storage` (`useResumableUpload.ts:4`, `useUploadManagerViewModel.ts:4`) |
| `app/api/documents/route.ts` | `GET`, `POST`, `DELETE` | `documents.service.ts` (vía `fetch`) |
| `app/api/storage/upload/route.ts` | `POST` | `features/chat/services/chat.service.ts:88` |
| `utils/supabase/client.ts` | `createClient` (browser) | `useResumableUpload.ts:3`, `chat.service.ts:1` |
| `utils/supabase/server.ts` | `createClient` (SSR) | `documents/route.ts:3`, `storage/upload/route.ts:3` |
| `utils/supabase/admin.ts` | `createAdminClient` (service_role) | varios APIs, **no** `storage/upload/route.ts` (lo duplica inline) |
| `utils/imageCompression.ts` | `compressImage` | `useDocumentosPanel.ts:5`, `chat.service.ts:3`, `useChat.ts:8` |

---

## 3. Tipos, servicios y store

### 3.1 Tipos (`documents.types.ts`)
- `Document`: `{ id, orderId, uploaderId, name, url, type, size:number, createdAt:Date }` (`:1-10`).
- `CreateDocumentRequest`: `{ orderId, name, url, type, size }` (`:12-17`).
- **Importante**: la UI **no** usa `Document`; usa `DocumentoItem` (definido dentro
  del componente, ver §5.1) con otro shape (`nombre`, `tipo`, `fechaSubida`,
  `tamaño`, `caso`, `cliente`). Hay un **mapeo manual** en `useDocumentosPanel.ts:61-83`.

### 3.2 Servicio (`documents.service.ts`)
Cliente `fetch` puro (no usa `lib/apiClient`, no añade `Authorization`; depende de
cookies de sesión → las llamadas deben ser same-origin con cookies).
- `getAllByOrder(orderId)` → `GET /api/documents?orderId=` (`:4-8`).
- `create(data)` → `POST /api/documents` JSON; en error lanza `error.error` (`:10-21`).
- `delete(id)` → `DELETE /api/documents?id=` (`:23-28`).

### 3.3 Store (`uploadStore.ts`)
Zustand sin middleware (sin `persist`; el estado se pierde al recargar).
- Estado: `uploads: Record<string, FileUpload>` (`:26-27`).
- `UploadStatus = 'compressing' | 'uploading' | 'paused' | 'error' | 'success' | 'canceled'` (`:3`).
- `FileUpload = { id, fileName, fileSize, progress, status, error?, orderId, publicUrl? }` (`:5-14`).
- Acciones: `addUpload`, `updateProgress`, `updateStatus(id,status,extra?)`, `removeUpload` (`:29-51`).

> `'compressing'` está declarado pero **nunca se asigna** en el código actual
> (grep dentro de `storage/`); la compresión ocurre fuera del store.

---

## 4. Detalle por archivo

### 4.1 `documents/components/DocumentList.tsx` (View)
- `'use client'` (`:1`). Props: `documentos: DocumentoItem[]`, `onDescargar`,
  `onEliminar`, `showActions=true` (`:20-32`). El componente es **presentacional**:
  no llama API; delega en callbacks.
- Define y **exporta** la interface `DocumentoItem` (`:9-18`).
- Consume `useDocumentListViewModel()` solo para `obtenerIconoDocumento` (`:34`).
- Render responsive: cards en móvil (`:50-97`) y tabla en desktop (`:100-162`).
- Importa `react-icons/fi`, `framer-motion`.

### 4.2 `documents/hooks/useDocumentListViewModel.tsx` (ViewModel)
- `'use client'` (`:1`). Única función `obtenerIconoDocumento(nombre)` (`:9-37`):
  deriva extensión por `split('.').pop()` y devuelve `{icon JSX, color, label}`
  para `pdf|doc(x)|xls(x)` y fallback genérico.
- Importa `DocumentoItem` desde el componente (`:5`) — **dependencia circular
  View↔ViewModel** (archivo componente importa hook, hook importa interface del
  componente).

### 4.3 `documents/index.ts` (barrel)
- Re-exporta componentes, hooks, service y types (`:1-4`).
- **Colisión potencial**: exporta `Document` (types) y `DocumentoItem`
  (component), pero `DocumentList.tsx` también exporta. Sin conflicto real de
  nombres; sí hay riesgo de superficie pública ambigua.

### 4.4 `storage/store/uploadStore.ts`
Sin efectos secundarios. Store puro descrito en §3.3.

### 4.5 `storage/hooks/useResumableUpload.ts` (subida reanudable)
- `'use client'` (`:1`). Usa el cliente Supabase browser (`createClient`, `:3`).
- `startUpload(orderId, file, bucket='case-files')` (`:14-71`):
  1. `id = ${orderId}-${Date.now()}-${file.name}`; `path = ${orderId}/${Date.now()}.${ext}` (`:20-23`).
     El prefijo de carpeta es el `orderId`, que es lo que la RLS usa para autorizar (§7).
  2. `addUpload({... status:'uploading'})` al store (`:26-33`).
  3. `supabase.storage.from(bucket).upload(path, file, { cacheControl:'3600',
     upsert:true, resumable:true, onProgressUpdate })` con **cast `as any`** (`:40-50`).
     `onProgressUpdate` calcula porcentaje `loaded/total` y llama `updateProgress` (`:46-49`).
  4. Si error → `throw` → catch marca `status:'error'` (`:52, :66-70`).
  5. `getPublicUrl(path)` y `updateStatus(id,'success',{publicUrl})` (`:55-59`);
     `localStorage.removeItem(fingerprint)` (`:62`) y **devuelve la publicUrl** (`:64`).
- `cancelUpload(id)` (`:73-81`): solo marca `'canceled'` en el store; **no aborta
  la petición real** (comentario `:77-79`). El `activeUploads` ref (`:12`) no se
  usa efectivamente.
- Efectos secundarios: escritura/borrado en `localStorage` (fingerprint `:38`,
  `:62`), llamadas de red a Storage, mutaciones de Zustand.

> ⚠️ **A verificar**: `resumable: true` y `onProgressUpdate` **no existen** en la
> API pública del cliente `supabase-js` estándar (la subida reanudable real
> requiere `tus-js-client`). El cast `as any` (`:50`) sugiere que podrían ignorarse
> silenciosamente; el progreso nunca se actualizaría y la subida sería normal.
> Confirmar con la versión de `@supabase/supabase-js` y el comportamiento en runtime.

### 4.6 `storage/hooks/useUploadManagerViewModel.ts` (ViewModel de UI global)
- `'use client'` (`:1`). Lee `uploads` del store y deriva `uploadList =
  Object.values(uploads)`, `hasUploads` (`:11-12`).
- Estado local `isExpanded` (default `true`) e `isOnline` (`:8-9`).
- `useEffect` (`:14-28`): registra listeners `online`/`offline` del navegador;
  cleanup al desmontar.
- Devuelve `{ uploadList, hasUploads, isExpanded, toggleExpanded, isOnline, removeUpload }`.

### 4.7 `storage/components/UploadManager.tsx` (View global)
- `'use client'` (`:1`). Panel fijo abajo-derecha (`:32`), estilo Google Drive.
- Si `!hasUploads` → `return null` (`:29`).
- Cabecera colapsable (`:35-51`); lista animada con `AnimatePresence` (`:54-148`).
- Por cada upload muestra nombre, tamaño `MB`, barra de progreso (`:100-125`),
  estado, error (`:128-132`) y botón limpiar/cancelar (`:80-142`).
- Icono WifiOff animado cuando `!isOnline` (`:46`), texto "Pausado: Reintentando..."
  (`:115-116`). **No reintenta realmente**; es solo feedback visual.

### 4.8 `storage/index.ts` (barrel)
- Exporta `UploadManager` y `useUploadManagerViewModel` (`:1-2`).
- **No** exporta `useResumableUpload` ni `uploadStore` → los consumidores importan
  rutas profundas (`useChat.ts:7`, `useDocumentosPanel.ts:6`). Barrel sin uso.

### 4.9 `app/api/documents/route.ts` (API REST)
Autenticación híbrida: si llega cabecera `x-user-id` (inyectada por el middleware
`utils/supabase/middleware.ts:102-104`) la usa; si no, valida con Supabase SSR.
- **GET** (`:5-49`): exige `orderId` **o** `lawyerId` (`:21-28`); `lawyerId`
  filtra `where.order = { lawyerId }` (`:25`). Incluye `order.numericId`,
  `order.service.titulo`, `order.user.nombre` (`:32-39`). Orden `createdAt desc`.
  **No verifica** que el solicitante tenga acceso a esa orden (solo autenticación) —
  riesgo de IDOR (§9).
- **POST** (`:51-121`): valida `orderId, name, url` (`:75`); busca la orden
  (`:80-86`); autoriza si `isOwner (order.userId===user.id)` | `isLawyer
  (order.lawyerId===user.id)` | `isAdmin` (`:88-103`); crea la fila con
  `uploaderId = user.id` (`:105-114`) y responde 201.
- **DELETE** (`:123-182`): requiere `?id=` (`:145-149`); solo el `uploaderId` o un
  `ADMIN` pueden borrar (`:160-172`); `prisma.document.delete` (`:174-176`).
  **No borra el binario** de Storage (fila huérfana en bucket).

### 4.10 `app/api/storage/upload/route.ts` (API de subida server-side)
- `POST` (`:5-54`). Autentica con Supabase SSR (`:7-14`) y exige `file`, `bucket`,
  `path` en el `FormData` (`:16-23`).
- Crea un cliente **service_role** inline con `SUPABASE_SERVICE_ROLE_KEY`
  (`:26-29`) para "evadir el Loop de Recursión Infinita RLS en Postgres (42P17)"
  (comentario `:25`). **No** usa `utils/supabase/admin.ts:createAdminClient`, que
  haría exactamente lo mismo → duplicación.
- Sube `Uint8Array(await file.arrayBuffer())` con `upsert:true` (`:31-38`) y
  devuelve `getPublicUrl(path)` (`:45-49`).
- Sólo lo consume `chat.service.ts:uploadFile` (bucket `case-files`, `:85`).

### 4.11 `utils/supabase/{client,server,admin}.ts`
- `client.ts`: `createBrowserClient`, `persistSession: remember` (`:3-14`) — usado
  por el hook reanudable.
- `server.ts`: `createServerClient` con cookies (`:4-29`) — usado por las dos APIs.
- `admin.ts`: `createAdminClient` con service_role y `persistSession:false` (`:3-13`).
  Usado por `orders/admin-create`, `auth/reset-password/confirm`, `lawyers`,
  `clients`; **no** por storage (que lo reimplementa).

### 4.12 `utils/imageCompression.ts`
- `compressImage(file)`: si no es `image/*` devuelve el original (`:8`); usa
  `browser-image-compression` con `maxSizeMB:1`, `maxWidthOrHeight:1920`,
  `useWebWorker:true`, `initialQuality:0.8` (`:10-15`); en error hace **fallback**
  al original (`:22-25`). Efecto: Web Worker en navegador.

---

## 5. Flujo de subida end-to-end

Hay **dos rutas** de subida distintas, según el consumidor:

### Ruta A — Panel del abogado (`useDocumentosPanel.ts:128-157`) y Chat (`useChat.ts:111-134`)
```
selección de File
   │
   ├─▶ compressImage(file)            (utils/imageCompression.ts:7)  ← Web Worker
   │
   ├─▶ startUpload(orderId, file)     (useResumableUpload.ts:14)
   │      ├─ addUpload(status:'uploading')        → uploadStore
   │      ├─ supabase.storage.from('case-files').upload(path=orderId/ts.ext, resumable)
   │      ├─ onProgressUpdate → updateProgress
   │      └─ getPublicUrl() → updateStatus('success',{publicUrl})
   │
   ├─▶ documentsService.create({orderId,name,url,type,size})
   │      └─ POST /api/documents → autoriza → prisma.document.create
   │
   └─▶ (solo chat) chatService.sendMessage(orderId, publicUrl, senderId)
```
- `useDocumentosPanel.processUpload` (`:128-157`) comprime, sube, registra fila,
  notifica y refresca (`fetchDocumentos`). Si falla, notifica error.
- `useChat.sendFileMutation` (`:111-134`) hace lo mismo pero **si el registro de
  documento falla, el mensaje de chat continúa** (`:128-130`); además invalida
  `['documents', orderId]` (`:141`).
- La UI global de progreso la pinta `UploadManager` leyendo el `uploadStore`; se
  monta una sola vez en `Providers.tsx:103`.

### Ruta B — `chatService.uploadFile` (server-side, legado/alterno)
```
compressImage → FormData{file,bucket:'case-files',path}
   └─▶ POST /api/storage/upload   (chat.service.ts:88)
          └─ service_role.storage.upload + getPublicUrl
```
Esta ruta **no** registra fila en `Document` ni usa el `uploadStore`/progreso.
Es un camino paralelo al de Ruta A dentro del mismo feature chat; **A verificar**
cuál se usa realmente en producción (grep muestra `useChat.startUpload` en el hook
y `chatService.uploadFile` disponible pero sin consumidor directo en el hook).

### Visualización y borrado
- Descarga: `useDocumentosPanel.handleDescargar` → `window.open(doc.url)` (`:159-161`).
- Borrado: `documentsService.delete` → `DELETE /api/documents` → fila; **el binario
  permanece** en el bucket.

---

## 6. Permisos / seguridad

### 6.1 Buckets
- Único bucket detectado: **`case-files`**, creado como **privado**:
  `insert into storage.buckets (id,name,public) values ('case-files','case-files',false)`
  (`scripts/create_storage.sql:1-4`).
- No se detectan otros buckets en el código (`grep storage.from` sólo devuelve
  `case-files` vía variables).
- **A verificar**: el hook y la API usan `getPublicUrl()`
  (`useResumableUpload.ts:55-57`, `storage/upload/route.ts:45-47`) sobre un bucket
  privado. `getPublicUrl` no firma ni valida acceso; en bucket privado la URL
  directa no debería ser accesible sin `createSignedUrl`/RLS. Comprobar si el
  bucket se volvió público en el proyecto real o si las descargas fallan.

### 6.2 RLS de `storage.objects`
`scripts/create_storage.sql:6-44` (versión inicial) y `scripts/fix_storage_rls.ts:6-42`
(versión vigente, corrige recursión `42P17`):
- INSERT y SELECT `TO authenticated`.
- Condición: `bucket_id='case-files'` **y** existe una `Order` cuyo `id` es el
  **primer segmento del path** (`storage.foldername(name))[1]`, y el usuario es
  `Order.userId`, `Order.lawyerId`, o `rol='ADMIN'`.
- La versión de `fix_storage_rls.ts` usa `auth.jwt()->'user_metadata'->>'rol'` en
  lugar de subconsulta a `public."User"` (evita recursión). **La vigente es esta.**
- Consecuencia: el binario **debe** subirse con path `orderId/...`; si no, la RLS
  INSERT lo rechaza. `startUpload` respeta esto (`useResumableUpload.ts:22`).

### 6.3 Autorización de la fila `Document`
- POST/DELETE en `documents/route.ts` autorizan por rol/relación (§4.9).
- **GET no valida pertenencia** a la orden: cualquier usuario autenticado que
  conozca un `orderId`/`lawyerId` puede listar esos documentos (metadatos +
  `url`). Riesgo IDOR (§9).
- La API server-side de storage usa **service_role**, que **ignora RLS** por diseño
  (evita el loop) → la autorización depende del chequeo de sesión previo (`:13`),
  no de RLS. Cualquier usuario autenticado puede subir a cualquier `bucket`/`path`
  si adivina parámetros, **sin** validar que `Order.lawyerId/userId` lo incluyan.

### 6.4 Prisma
```prisma
model Document {
  id String @id @default(uuid())
  orderId String
  uploaderId String
  name String; url String; type String; size Int
  createdAt DateTime @default(now())
  order    Order @relation(fields:[orderId], references:[id], onDelete: Cascade)
  uploader User  @relation(fields:[uploaderId], references:[id], onDelete: Restrict)
  @@index([orderId]) @@index([uploaderId])
}
```
(`prisma/schema.prisma:150-164`). Borrar la `Order` **cascadea** los documentos;
borrar el uploader está **restringido** (no se puede borrar un usuario con uploads).

---

## 7. Mapa de dependencias

```
document.types ◄── documents.service ◄── useDocumentosPanel / useChat
                          │ fetch
                          ▼
                   /api/documents (GET/POST/DELETE) ── prisma ── PostgreSQL
                          ▲ header x-user-id (middleware)

imageCompression ◄── useDocumentosPanel / useChat / chat.service
       │
useResumableUpload ── supabase/client ──► Supabase Storage('case-files')
       │                    ▲
       └── uploadStore ◄── useUploadManagerViewModel ◄── UploadManager
                                                        (montado en Providers)

chat.service.uploadFile ──► /api/storage/upload ── service_role ──► Storage
```

**Importa (salientes)**
- `documents.service` → `documents.types`; (nada más).
- `DocumentList` → `useDocumentListViewModel`, `react-icons`, `framer-motion`.
- `useDocumentListViewModel` → `DocumentList` (interface; ciclo).
- `UploadManager` → `useUploadManagerViewModel`, `framer-motion`, `react-icons`.
- `useResumableUpload` → `supabase/client`, `uploadStore`.
- `useUploadManagerViewModel` → `uploadStore`.
- `documents/route` → `lib/prisma`, `utils/supabase/server`.
- `storage/upload/route` → `@supabase/supabase-js`, `utils/supabase/server`.

**Es importado por (entrantes)**
- `documents`: `AdminSupervisionTabs`, `DocumentosPanel`, `useDocumentosPanel`,
  `useChat`.
- `storage`: `Providers` (UploadManager), `useDocumentosPanel`, `useChat`
  (useResumableUpload). Barrel `storage/index.ts` **sin consumidores**.

---

## 8. Notas de refactor / deuda / riesgos

1. **Doble ruta de subida en chat**: `useChat.sendFileMutation` (Ruta A, con
   store + fila) coexiste con `chatService.uploadFile` (Ruta B, service_role sin
   fila). Consolidar en una sola. `chat.service.ts:74-100`, `useChat.ts:111-134`.
2. **`resumable:true`/`onProgressUpdate` dudosos** (`useResumableUpload.ts:40-50`):
   probable no-op del SDK estándar. O adoptar TUS real (`tus-js-client`) o
   renombrar el hook y quitar el cast `any`; hoy el "resumable" es confuso.
3. **`UploadManager` no aporta recuperación real**: `isOnline`/`cancelUpload` no
   abortan ni reintentan; solo cambian texto/estado (`uploadStore.ts`, `:73-81`).
   O implementar retry/abort o simplificar la UI.
4. **Barrel `storage/index.ts` muerto**: exporta solo 2 de 4 módulos y nadie lo
   importa. Decidir punto de entrada público (o eliminar).
5. **Duplicación de cliente admin**: `storage/upload/route.ts:26-29` reimplementa
   `utils/supabase/admin.ts:createAdminClient`. Reutilizar.
6. **`getPublicUrl` sobre bucket privado** (`create_storage.sql:3` vs
   `useResumableUpload.ts:55`): verificar si el bucket es realmente público o si
   debería usarse `createSignedUrl`. Riesgo de URLs rotas o exposición indebida.
7. **GET de documentos sin autorización de pertenencia** (`documents/route.ts:21-44`):
   IDOR de metadatos. Añadir verificación owner/lawyer/admin como en POST.
8. **DELETE no borra el binario** (`documents/route.ts:174-176`): deja huérfanos en
   Storage. Añadir `storage.remove`.
9. **Tipos duplicados/desalineados**: `Document` (types) vs `DocumentoItem` (view)
   con mapeo manual (`useDocumentosPanel.ts:61-83`). Unificar con un mapper
   compartido y usar el barrel.
10. **Ciclo View↔ViewModel** (`DocumentList.tsx:7` ↔ `useDocumentListViewModel.tsx:5`):
    mover `DocumentoItem` a `types/`.
11. **`'compressing'` sin uso** en `UploadStatus` (`uploadStore.ts:3`): si se quiere
    reflejar la fase de compresión, marcar estado antes de `compressImage`.
12. **Store no persistente** (sin `persist`): recargar la página durante una subida
    pierde el progreso aunque el fingerprint TUS quede en `localStorage`
    (`useResumableUpload.ts:38`) — el fingerprint nunca se consume en un resume.
13. **`DocumentoItem` con `url` directa** abierta con `window.open` (`:160`): si el
    bucket es privado, requiere signed URL; validar.

---

## 9. Siguiente

`04-api.md` — inventario y contrato de todos los endpoints en `src/app/api/**`
(con énfasis en `/api/documents` y `/api/storage/upload` cubiertos aquí).
