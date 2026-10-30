# 03e — Feature: clients

> Documentado leyendo el código real. Cita `ruta:línea`. Convenciones y glosario
> en `00-mapa.md`; `apiClient`, `finance`, `cache`, `emailDeliverability` en
> `02-lib.md`. No se repiten aquí.

---

## 1. Propósito

La feature `clients` cubre **dos cosas distintas que comparten el mismo nombre**
y que NO deben confundirse:

1. **Panel ADMIN de clientes (gestión CRM ligera).** Lista, crea, edita y
   archiva usuarios con rol `CLIENTE`. Es lo que hace `ClientesPanel`
   (componente de gestión) + `useClientesPanel` + hooks TanStack `useClients*`.
   Vive en la sección `clientes` de `/admin`.
2. **Panel del CLIENTE (portal "Mis Servicios").** Es la experiencia que ve el
   propio cliente: sus expedientes, mensajes, perfil y cambio de contraseña.
   Son `ClientPanel` + `ClientSidebar` + `ClientStats` + `useClientPanel` +
   `useClientSidebar`. **No gestiona "clientes"**: gestiona los *servicios* del
   usuario logueado (dominio `orders`). Vive en `/mis-servicios`.

> ⚠️ **Riesgo de nombres**: `ClientesPanel` (plural, admin) ≠ `ClientPanel`
> (singular, cliente). `ClientStats` son las tarjetas del panel del cliente, no
> estadísticas de clientes. La feature mezcla ambos mundos en un solo
> directorio, lo que dificulta el refactor.

Aclaración: la ruta pública **`/clientes`** (`src/app/clientes/page.tsx`,
`src/app/clientes/layout.tsx`) **no usa esta feature**. Es una página de
marketing con testimonios y casos de éxito (contenido hardcodeado y estático).
Solo comparte la palabra "clientes" (`clientes/page.tsx:9`,
`clientes/layout.tsx:4`).

---

## 2. Inventario

| Archivo | Exports | Importadores |
|---------|---------|--------------|
| `src/features/clients/index.ts` | re-export de `useClients`, `useClientesPanel`, `ClientesPanel`, `clients.types` | El barrel **no lo importa nadie activamente** (los consumidores entran por rutas internas). `store` NO se re-exporta. |
| `components/ClientesPanel.tsx` | `default` (`memo`) | `app/admin/page.tsx:25` (lazy), `:304` |
| `components/ClientPanel.tsx` | `default` | `app/mis-servicios/page.tsx:12`, `:48` |
| `components/ClientSidebar.tsx` | `default` | `components/ClientPanel.tsx:24`, `:99` |
| `components/ClientStats.tsx` | `default` | `components/ClientPanel.tsx:25`, `:173` |
| `hooks/useClients.ts` | `CLIENT_KEYS`, `useClients`, `useClientsPaginated`, `useClient`, `useCreateClient`, `useUpdateClient`, `useDeleteClient` | ver §8 |
| `hooks/useClientesPanel.ts` | `useClientesPanel` | `ClientesPanel.tsx:8` |
| `hooks/useClientPanel.ts` | `useClientPanel` | `ClientPanel.tsx:27` |
| `hooks/useClientSidebar.ts` | `useClientSidebar` | `ClientSidebar.tsx:17` |
| `services/clients.service.ts` | `clientsService` | `hooks/useClients.ts:4` (único) |
| `store/clientsStore.ts` | `useClientsStore`, `initializeClients` | **Sin importadores activos** (solo referencias comentadas, ver §7) |
| `types/clients.types.ts` | `ClientStatus`, `Client`, `CreateClientRequest`, `UpdateClientRequest`, `ClientsFilters`, `PaginatedResponse`, `ClientsState` | `useClients`, `ClientesPanel`, `checkoutStore` |
| `src/app/api/clients/route.ts` | `GET`, `POST`, `dynamic`, `revalidate` | HTTP desde `clientsService` |
| `src/app/api/clients/[id]/route.ts` | `PATCH`, `DELETE` | HTTP desde `clientsService` |

---

## 3. Tipos y servicio

### 3.1 `types/clients.types.ts`

- `ClientStatus` (`:5`): enum `ACTIVE='active'`, `INACTIVE='inactive'`,
  `PENDING='pending'`. **Ojo**: el API solo emite `active`/`inactive`
  (`route.ts:120`, `[id]/route.ts:97`); `PENDING` nunca se produce desde
  clients (a diferencia de lawyers).
- `Client` (`:11`): modelo de UI con campos derivados `serviciosContratados` y
  `totalGastado` (no columnas; se calculan en el API, ver §5).
- `CreateClientRequest` (`:25`), `UpdateClientRequest` (`:32`): DTOs
  declarados pero **no usados** por el servicio (usa `Partial<Client>`).
- `ClientsFilters` (`:41`): `status`, `searchQuery`, `antiguedad`
  (`'reciente'|'historico'`), `startDate`, `endDate`, `page`, `limit`.
  `startDate`/`endDate` **no se envían** al API (`clients.service.ts`).
- `PaginatedResponse<T>` (`:51`): `{data,total,page,limit,totalPages}`.
- `ClientsState` (`:59`): contrato del store Zustand.

### 3.2 `services/clients.service.ts`

Objeto `clientsService` (`:4`) sobre `apiClient` (`lib/apiClient`), es decir
`fetch` browser con `Bearer` de Supabase (ver `02-lib.md §2.3`).

| Método | Verbo/Ruta | Notas |
|--------|-----------|-------|
| `getAll` `:5` | `GET /api/clients?…` | Devuelve `Client[]` o `.data` si es paginado (`:16-19`). Envía `status`, `search`, `page`, `limit`. |
| `getAllPaginated` `:22` | `GET /api/clients?…` | Igual + `antiguedad`; tipado `PaginatedResponse<Client>`. |
| `getById` `:35` | `GET /api/clients/{id}` | **El endpoint `[id]` NO exporta GET** → devolverá 405. Usado por `useClient` (que a su vez no tiene consumidores). |
| `create` `:39` | `POST /api/clients` | |
| `update` `:43` | **`PUT`** `/api/clients/{id}` | El endpoint expone **`PATCH`**, no `PUT` (`[id]/route.ts:6`). Desajuste de método (ver §9). |
| `delete` `:47` | `DELETE /api/clients/{id}` | |

> ⚠️ **Desajustes reales**: `update` usa `PUT` pero el API implementa `PATCH`;
> `getById` llama a un `GET` inexistente. Ambos son rutas latentes (solo `update`
> se usa desde el admin y fallaría con 405; ver §4.1).

---

## 4. Detalle por archivo

### 4.1 Hooks de datos — `hooks/useClients.ts`

TanStack Query v5 sobre `clientsService`. Query keys en `CLIENT_KEYS` (`:7`):
`all=['User','clients']`, listas con filtros, detalles por `id`.

- `useClients(filters?)` `:15` — lista simple, `staleTime` 3 min.
- `useClientsPaginated(filters?)` `:23` — paginado, con
  `placeholderData: previousData` (mantiene página anterior mientras carga).
- `useClient(id)` `:32` — detalle; `enabled: !!id && id!=='new'`. **Sin
  consumidores** (apunta a un GET inexistente).
- `useCreateClient()` `:41` — mutación con update optimista en
  `CLIENT_KEYS.list({})` e `invalidateQueries` al éxito (`:62`). El optimistic
  update inserta en `list({})` aunque la query real usada es `['…','paginated',…]`
  → la inserción optimista **no se refleja** en `useClientsPaginated`.
- `useUpdateClient()` `:67` — mutación; cancela detalle+listas, snapshot,
  actualiza detalle y todas las listas, rollback en error (`:90-99`),
  invalidación activa al éxito (`:101-102`).
- `useDeleteClient()` `:107` — mutación; optimista filtrando de `list({})`,
  rollback y `invalidateQueries(CLIENT_KEYS.all)` (`:134`).

Efectos secundarios: todas invalidan/refrescan caché; ninguna accede al store
Zustand.

Consumidores (grep `useClients`/`CLIENT_KEYS`):
- `src/app/admin/page.tsx:14` — `useDeleteClient/useUpdateClient/useCreateClient`
  (`:123-125`), invocadas en `handleSave` sección `clientes` (`:140-147`).
- `src/components/admin/hooks/useDashboardStats.ts:2,30` — `useClients()` para
  `totalClientes`/`clientesNuevosMes` (`:47,50`).
- `src/components/admin/hooks/useDashboard.ts:3,9` — `useClients({limit:50})`.
- `src/components/admin/hooks/useEstadisticasPanel.ts:4,14` — `useClients()`.
- `src/features/checkout/store/checkoutStore.ts:9,457` — importa `CLIENT_KEYS`
  para `invalidateQueries({queryKey: CLIENT_KEYS.all, refetchType:'none'})`.
- `src/hooks/useRealtimeSubscription.ts:6,154` — al detectar cambios en la
  tabla `User`, invalida `CLIENT_KEYS.all` (+ `LAWYER_KEYS.all`).

> `staleTime` 3 min + caché servidor 10 s (`route.ts:135`) cooperan para no
> martillar la BD, pero el realtime por tabla `User` y por broadcast de `orders`
> puede forzar refetch.

### 4.2 ViewModel admin — `hooks/useClientesPanel.ts`

`useClientesPanel(terminoBusqueda)` (`:5`):
- Estado local: `page`, `filtroActividad` (`'todos'|'reciente'|'inactivo'`),
  `debouncedTerm`.
- Debounce de 300 ms sobre el término de búsqueda (`:11-14`).
- Resetea `page` a 1 al cambiar término o filtro (`:16-18`).
- Llama `useClientsPaginated({page,limit:10,searchQuery,antiguedad})`, mapeando
  `inactivo→historico` (`:20-25`).
- Lee `orders` desde `useOrdersStore` (`@/features/orders`) y expone
  `getClientOrders(clientId)` filtrando `order.userId===clientId` (`:31-33`).
- **Efecto secundario**: la tabla admin depende de TODO el store de órdenes en
  cliente (sin filtro por usuario).

Exports: `clients`/`clientesFiltrados` (alias, `:36-37`), filtros, isLoading,
total, totalPages, page, setPage.

### 4.3 ViewModel cliente — `hooks/useClientPanel.ts`

`useClientPanel(servicios: ServicioCliente[])` (`:7`). Recibe los servicios ya
cargados (por `useMisServicios`), no consulta la API de clients.

- Estado de UI: `seccionActiva` (`'servicios'|'mensajes'|'perfil'|…`),
  `tabActivo` (`activos|historial`), `isSidebarOpen`, `conversacionActiva`,
  `filtroEstado`, `terminoBusqueda`, `page`.
- `statsData` (`:24`): conteos por estado (`pendiente`, `programado`,
  `revision`, `completado`, `cancelado`).
- Clasificación: activos = `pendiente|programado|revision`; historial =
  `completado|cancelado` (`:41-42`), filtrado por estado y búsqueda por
  nombre/número de orden.
- Paginación local `PAGE_SIZE=12` (`:5`, `:59-67`), `totalPages`.
- `handlePasswordChange` (`:72`): valida coincidencia y longitud ≥6, llama
  `useAuth().changePassword` (`@/features/auth/hooks/useAuth`), y gestiona
  `notificacion` de éxito/error con auto-limpieza a 5 s.

Exports (~30 campos): estado, setters, stats, listas paginadas, `pageSize`,
`handlePasswordChange`, `cambiandopassword`.

### 4.4 ViewModel sidebar — `hooks/useClientSidebar.ts`

`useClientSidebar(seccionActiva, setSeccionActiva, onClose)` (`:3`):
- `navItems` (memo) con `id`, `label`, `icon` (clave string resuelta por
  `ICON_MAP` en el componente) y `href` opcional para "Contratar Nuevo"
  (`/servicios`) (`:8-14`).
- `handleNavItemClick` setea sección y cierra sidebar móvil (`:16-19`).
- `seccionActiva` y `setSeccionActiva` se reciben como parámetros (no usa
  estado propio); `seccionActiva` no se lee dentro del hook (parámetro sin uso
  real aquí).

### 4.5 View admin — `components/ClientesPanel.tsx`

`'use client'`, `default memo(ClientesPanel)` (`:290`). Props `terminoBusqueda`
y `abrirModal(tipo, elemento?)` (`:14-17`) — el modal lo orquesta `admin/page.tsx`.

- Usa `useClientesPanel` (`:20`) y `Pagination` (`@/components/ui/Pagination`).
- Filtros "Segmentación": Todos / Recientes / Históricos → `setFiltroActividad`
  (`:58-74`).
- Vista móvil: tarjetas (`:79-155`); desktop: tabla (`:157-265`).
- Usa `ClientStatus.ACTIVE/PENDING` para colores de badge (`:108-110`), aunque el
  API nunca envía `PENDING`.
- `getClientOrders(cliente.id)` para "Órdenes totales" en la tabla (`:213`).
- Acciones por fila: `ver`, `editar`, `eliminar` → `abrirModal(...)` (`:234,242,250`).
  El botón "eliminar" solo existe en desktop.
- `Image` con placeholder local `user-placeholder.png` (`:6,100,184`).

Efectos secundarios: ninguno propio; los dispara `useClientesPanel` (fetch) y
`abrirModal` (padre).

### 4.6 View cliente — `components/ClientPanel.tsx`

`'use client'`, `default ClientPanel` (`:40`). Props: `user`, `servicios`,
`unreadOrders`, `unreadCounts`, `isLoading`, `handleLogout` (`:31-38`), provistos
por `useMisServicios` desde `/mis-servicios`.

- Consume `useClientPanel(servicios)` (`:48`) y compone `ClientSidebar` (`:99`) y
  `ClientStats` (`:173`).
- `now` en estado para marcar "Reciente" (<48 h) sin mismatch SSR (`:78-81,
  :261`).
- `totalUnread` por suma de `unreadCounts` (`:83-86`).
- Header con buscador y CTA "Contratar Servicio" → `/servicios` (`:146-155`).
- Tres secciones `AnimatePresence`:
  - **servicios** (`:164-462`): stats, pestañas activos/historial, filtros,
    cards/tabla, enlaces a `/detalle-servicio/{id}` y `#chat`.
  - **mensajes** (`:464-583`): lista de conversaciones + `ChatWindow`
    (`@/features/chat/components/ChatWindow`) con `orderId={conversacionActiva}`.
  - **perfil** (`:585-699`): datos usuario + formulario de seguridad ligado a
    `handlePasswordChange`, `passwords`, `notificacion`.
- Usa `getStatusColor`/`getStatusText` y `ServicioCliente` de `@/features/orders`
  (`:26`).

### 4.7 View cliente — `components/ClientSidebar.tsx`

`'use client'`, `default` (`:39`). Props de navegación + datos de usuario
(`:27-37`). Renderiza logo, info de usuario, `navItems` (`ICON_MAP`, `:19-25`),
badge de no leídos en "Mensajes" (`:117-123`), `PushNotificationToggle`
(`@/components/notifications/PushNotificationToggle`, `:132`) y "Cerrar Sesión".
Drawer responsive con overlay móvil (`AnimatePresence`, `:145-170`). Efectos:
los de los componentes hijos (push).

### 4.8 View cliente — `components/ClientStats.tsx`

`'use client'`, `default` (`:23`). Puro presentacional: recibe `stats`
(`total`, `pendientes`, `programados`, `completados`, `cancelados`) e `isLoading`
(`:12-21`). Renderiza 4 tarjetas animadas (`:39-44`); `cancelados` se recibe pero
**no se muestra** en ninguna tarjeta (solo se usan 4 de 6 métricas). Sin efectos.

### 4.9 Store Zustand — `store/clientsStore.ts`

- `useClientsStore` (`:13`): `persist` en `localStorage['virtuabogado-clients-v2']`
  (`:113-115`).
- Estado: `clients`, `isLoading`, `error`, `filters` (`:6-11`).
- Acciones: `addClient`, `setClients`, `fetchClients` (GET `/api/clients`, con
  modo offline ante error, `:31-51`), `updateClient` (PUT), `deleteClient`
  (DELETE), `getClientById`, `setFilters`, `clearFilters`, `reset`.
- `initializeClients()` (`:131`) llama `fetchClients()`.
- **Sin importadores activos**: los consumidores fueron migrados a TanStack
  Query (`admin/page.tsx:12` comentado; `authStore.ts:14` y `checkoutStore.ts:11`
  comentados). Es **código muerto persistido** (y duplica la lógica de
  `clientsService` con `apiClient` directo).

### 4.10 Barrel — `index.ts`

Re-exporta hooks, `ClientesPanel` y tipos (`:1-4`). **No exporta `clientsStore`**
ni `clients.service`. Nota: exportar un componente `default` vía `export *` no
lo hace importable por nombre desde el barrel (`export * from './components/ClientesPanel'`
no re-exporta el default). El barrel apenas se usa.

---

## 5. Flujo MVVM y endpoints

### 5.1 Admin (gestión de clientes)

```
admin/page.tsx ('clientes')
  ├─ ClientesPanel (lazy, :25/:304)
  │    └─ useClientesPanel ─► useClientsPaginated ─► clientsService.getAllPaginated
  │                                                          └─► GET /api/clients
  └─ handleSave (:134) ─► useCreate/Update/DeleteClient ─► clientsService.{create,update,delete}
                                                              └─► POST /api/clients, PUT/PATCH/DELETE /api/clients/{id}
```

Componente View → hook ViewModel → service Model → `fetch /api/…` → Prisma →
PostgreSQL. Coherente con `00-mapa.md §4`.

### 5.2 Cliente (portal)

```
/mis-servicios ─► useMisServicios (features/services) ─► servicios + unread
  └─ ClientPanel ─► useClientPanel (ViewModel local)
       ├─ ClientStats (puro)
       ├─ ClientSidebar ─► useClientSidebar + PushNotificationToggle
       ├─ ChatWindow (features/chat)
       └─ handlePasswordChange ─► useAuth().changePassword
```

El panel del cliente **no usa `clientsService` ni `/api/clients`**: consume el
dominio `orders`/`services` y `auth`.

### 5.3 Endpoints — `src/app/api/clients/**`

`api/clients/route.ts`: `dynamic='force-dynamic'`, `revalidate=0` (`:11-12`).

**GET** (`:14`) — lista paginada de clientes (rol `ADMIN` **o** `ABOGADO`):
- Auth por header `x-user-id`/`x-user-role` (uso interno/cron) o sesión Supabase
  (`createClient`, `:26-34`). Rol derivado de `user_metadata.rol`; si falta, se
  consulta `prisma.user` (`:38-48`). Autorización: `ADMIN`/`ABOGADO`, si no 403
  (`:53-55`).
- Filtros (`:57-85`): `page` (≥1), `limit` (1..100, default 50), `search`
  (OR `nombre|email|telefono|id`, `insensitive`), `status` (`active→activo:true`,
  `inactive→activo:false`), `antiguedad` (`reciente`=últimos 30 d, `historico`=más
  antiguos) sobre `createdAt`. Base `where: {rol:'CLIENTE'}`.
- **Caché**: `getCached(cacheKey)` (`:67`), `setCache(cacheKey, response, 10_000)`
  (`lib/cache`, TTL 10 s). La clave incluye page/limit/status/antiguedad/search.
- Consulta `Promise.all` (`:87-101`): `user.findMany` + `count` +
  `order.groupBy(['userId'], where activo:true, _count, _sum.total)`.
- Mapea a `Client` con `status` activo/inactive y stats derivadas
  (`serviciosContratados`, `totalGastado`, `:103-126`).
- `serializeFinance(...)` (`lib/finance`) para convertir `Decimal`/`Date`
  (`:128`) y responde `{data,total,page,limit,totalPages}`.
- **Nota**: la caché de 10 s puede dejar el listado admin brevemente desfasado
  tras mutaciones (las mutaciones no invalidan esta caché).

**POST** (`:146`) — crea cliente (rol `ADMIN` o `ABOGADO`):
- Auth idéntica (`:147-177`). Valida `email`+`nombre` requeridos (`:182`) y
  `validateEmailDeliverability` (`lib/emailDeliverability`, `:186`).
- Crea usuario en **Supabase Auth** con `createAdminClient().auth.admin.createUser`
  (`:191-203`), password temporal (`:196`). Si ya existe ("already registered")
  busca el ID y lo actualiza (`:205-225`).
- **Upsert en Prisma `user`** (`:235-255`) con `rol:'CLIENTE'`, `activo:true`,
  teléfono/dirección/DNI. Devuelve el registro (sin `serializeFinance`).

**PATCH `[id]`** (`[id]/route.ts:6`) — edita cliente (rol `ADMIN` o `ABOGADO`):
- Auth igual (`:13-50`). Valida email si viene (`:56-61`).
- `prisma.user.update` con campos condicionales; `''`→`null` en
  teléfono/dirección/dni (`:63-73`).
- Si cambia `activo` y es `ADMIN`, sincroniza `user_metadata.activo` en Supabase
  Auth vía `createAdminClient` (import **dinámico**, `:76-87`).
- Formatea respuesta a `Client` con `serviciosContratados:0`, `totalGastado:0`
  (`:90-105`) — **pierde las stats** que sí calcula GET.

**DELETE `[id]`** (`[id]/route.ts:115`) — **solo `ADMIN`** (`:157`):
- **No borra**: archivado lógico `activo:false` en Prisma (`:165-170`) y
  `user_metadata.activo=false` en Auth para que el middleware bloquee acceso
  (`:172-183`). Preserva documentos/PII y el historial de casos. Respuesta
  `{success,message}`.

---

## 6. Estado y realtime

### 6.1 Zustand `clientsStore`

Cuasi-muerto (§4.9). Persiste en `localStorage`; nadie lo consume. La fuente de
verdad de la lista admin es **TanStack Query** (`useClients*`), con
`staleTime` 3-5 min.

### 6.2 Realtime

- `useRealtimeSubscription.ts` (`hooks/` global): al recibir `postgres_changes`
  de la tabla `User` (solo ADMIN se suscribe a `User`, `:245`), invalida
  `CLIENT_KEYS.all` y `LAWYER_KEYS.all` (`:154-155`). Los cambios de rol/activo
  del `User` también impactan lawyers (misma tabla).
- Broadcast `order-updated`: invalida `['Order']` y finanzas (`:38-43`), lo que
  indirectamente refresca los conteos del dashboard admin que derivan de órdenes.
- **No existe un broadcast específico de clientes** (`broadcastClientUpdate` no
  existe en `lib/broadcast`); la sincronización depende de la suscripción WAL a
  `User` (sujeta a RLS; puede fallar con `CHANNEL_ERROR`, `:279-283`).
- La caché servidor de 10 s del GET **no** se limpia en POST/PATCH/DELETE →
  ventana de inconsistencia breve.

---

## 7. Mapa de dependencias

```
index.ts ──► hooks/useClients, hooks/useClientesPanel, components/ClientesPanel, types

useClients ──► clients.service ──► lib/apiClient ──► (Supabase token) ──► /api/clients
            └► @tanstack/react-query
useClientesPanel ──► useClients(useClientsPaginated) + features/orders(useOrdersStore)
ClientesPanel ──► useClientesPanel + ui/Pagination + types + utils/formatters
                └► react-icons, next/image, framer-motion
ClientPanel ──► useClientPanel + ClientSidebar + ClientStats
             └► features/orders(status helpers), features/chat/ChatWindow, ui/Pagination
ClientSidebar ──► useClientSidebar + notifications/PushNotificationToggle
useClientPanel ──► features/auth/useAuth + features/orders(type ServicioCliente)
clientsStore ──► lib/apiClient (SIN consumidores)

IMPORTADO POR (entrantes):
  useClients ── admin/{page, hooks:useDashboard, useDashboardStats, useEstadisticasPanel},
                checkoutStore, useRealtimeSubscription
  ClientesPanel ── app/admin/page.tsx (lazy)
  ClientPanel ── app/mis-servicios/page.tsx
  ClientStatus ── checkoutStore
  clientsStore ── (nadie)
```

Sin ciclos directos detectados dentro de la feature. Dependencia cruzada con
`features/orders` (store + helpers) y `features/chat`/`features/auth`.

---

## 8. Notas de refactor / deuda / riesgos

1. **Nombres ambiguos**: separar físicamente "gestión admin de clientes" de
   "portal del cliente" (p. ej. `features/clients-admin` vs
   `features/client-portal`). Hoy ambos viven en `features/clients`.
2. **`clientsStore` muerto**: eliminar `store/clientsStore.ts` (nadie lo importa;
   referencias comentadas en `admin/page.tsx:12`, `authStore.ts:14`,
   `checkoutStore.ts:11`). Evita persistencia `localStorage` inútil.
3. **Desajuste de verbo HTTP**: `clientsService.update` usa `PUT`
   (`clients.service.ts:44`) pero el API solo expone `PATCH`
   (`[id]/route.ts:6`). **Editar cliente desde el admin probablemente da 405** —
   A verificar en runtime.
4. **`getById` roto**: `GET /api/clients/{id}` no existe; `useClient` no tiene
   consumidores (retirar o implementar el endpoint).
5. **Stats inconsistentes**: PATCH devuelve `serviciosContratados:0`,
   `totalGastado:0` (`[id]/route.ts:101-102`), rompiendo el optimistic update que
   luego `onSuccess` invalida. GET sí las calcula. Homogeneizar forma de
   respuesta en un serializador `toClientDTO`.
6. **POST/PATCH/DELETE no invalidan la caché de `lib/cache`** (solo GET la
   escribe). Añadir `clearCache('clients-')` tras mutaciones, o bajar/omitir TTL.
7. **Optimistic update desalineado**: `useCreateClient`/`useDeleteClient`
   actualizan `CLIENT_KEYS.list({})`, pero la query real es
   `[...CLIENT_KEYS.lists(),'paginated',…]` (`useClients.ts:25`). El cambio
   optimista no se ve; conviene usar `setQueriesData({queryKey:CLIENT_KEYS.lists()})`.
8. **`ClientStatus.PENDING`** definido pero nunca emitido por clients; `ClientesPanel`
   lo contempla (`ClientesPanel.tsx:109`). Confirmar si debe eliminarse.
9. **`useClientPanel` casa el cambio de contraseña** (dominio `auth`) dentro de
   una feature de "clients"; mover a un hook/página de perfil.
10. **API auth duplicada** en GET/POST/PATCH/DELETE (mismo bloque de
    header→Supabase→Prisma). Extraer helper `requireRole(request, ['ADMIN','ABOGADO'])`.
11. **Ruta pública `/clientes`** (marketing) comparte nombre con la feature:
    posible confusión en navegación y búsquedas; considerar renombrar a
    `/nuestros-clientes`.
12. **Barrel inefectivo**: `export * from './components/ClientesPanel'` no
    re-exporta el default; documentar/ajustar si se quiere consumir por nombre.
13. **`CreateClientRequest`/`UpdateClientRequest`/`ClientsState` sin uso**; el
    servicio usa `Partial<Client>`. Alinear DTOs o eliminarlos.

---

**Siguiente**: `03-lawyers.md` (feature `lawyers`).
