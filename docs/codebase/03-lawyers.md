# 03f — Feature: lawyers

> Documento derivado de la lectura directa del código (no del grafo).
> Complementa a `00-mapa.md` (capas, alias `@/`, barriles, MVVM) y a `02-lib.md`
> (dinero, caché). Aquí se desarrolla **solo** el dominio `lawyers`.
> Las referencias son `ruta:línea` del estado actual del repo.

---

## 1. Propósito

`src/features/lawyers/` es el dominio de **gestión de abogados** (`User` con
rol `ABOGADO`). No modela una entidad propia: un "abogado" es un `User` en
Prisma. El dominio sirve al **panel admin** (`/admin`, sección *abogados*) y a
los agregados del dashboard admin. Expone:

- **Tipos** DTO (`Lawyer`, `LawyersFilters`, `PaginatedResponse`, enums).
- Un **service** (`lawyersService`) que habla con `/api/lawyers*` vía `apiClient`.
- **Hooks TanStack Query**: `useLawyers`, `useLawyersPaginated`, `useLawyer`,
  `useCreateLawyer`, `useUpdateLawyer`, `useDeleteLawyer` + claves `LAWYER_KEYS`.
- Un **ViewModel** de panel: `useAbogadosPanel`.
- Una **View**: `components/AbogadosPanel.tsx`.
- Un **store Zustand persistido** (`useLawyersStore` + `initializeLawyers`).

> **Caso especial**: el panel del abogado (`/abogado`, `src/components/abogado/**`)
> **no** consume casi nada de este feature; solo reutiliza `lawyersService` para
> editar el perfil propio. Ver §6.

---

## 2. Inventario

| Archivo | Exports | Importadores |
|---------|---------|--------------|
| `src/features/lawyers/index.ts` | re-export barrel de hooks, componente, tipos y store | **0** (nadie importa el barrel) |
| `src/features/lawyers/types/lawyers.types.ts` | `LawyerStatus`, `LawyerSpecialty`, `Lawyer`, `CreateLawyerRequest`, `UpdateLawyerRequest`, `LawyersFilters`, `PaginatedResponse<T>`, `LawyersState` | `lawyers.service.ts`, `useLawyers.ts`, `useAbogadosPanel.ts`, `AbogadosPanel.tsx`, `useDashboardStats.ts`, `clients/...` (indirecto) |
| `src/features/lawyers/services/lawyers.service.ts` | `lawyersService` | `useLawyers.ts`, `store/lawyersStore.ts`, `components/abogado/hooks/usePerfilAbogadoPanel.ts` |
| `src/features/lawyers/hooks/useLawyers.ts` | `LAWYER_KEYS`, `useLawyers`, `useLawyersPaginated`, `useLawyer`, `useCreateLawyer`, `useUpdateLawyer`, `useDeleteLawyer` | `admin/page.tsx`, `admin/ModalContainer.tsx`, `admin/hooks/{useDashboard,useDashboardStats,useEstadisticasPanel}.ts`, `checkout/store/checkoutStore.ts`, `hooks/useRealtimeSubscription.ts` |
| `src/features/lawyers/hooks/useAbogadosPanel.ts` | `useAbogadosPanel` | `components/AbogadosPanel.tsx` |
| `src/features/lawyers/components/AbogadosPanel.tsx` | `default` (`memo`) | `app/admin/page.tsx` (lazy) |
| `src/features/lawyers/store/lawyersStore.ts` | `useLawyersStore`, `initializeLawyers` | **0** (solo comentarios en `app/admin/page.tsx` y `auth/store/authStore.ts`) |

**Endpoints relacionados**:

| Endpoint | Exports | Consumido por |
|----------|---------|---------------|
| `src/app/api/lawyers/route.ts` | `GET`, `POST`, `dynamic` | `lawyersService.getAll`/`getAllPaginated`/`create` |
| `src/app/api/lawyers/[id]/route.ts` | `PATCH`, `DELETE` | `lawyersService.update`/`delete` (ver §6: mismatch PUT/PATCH) |

---

## 3. Tipos y servicio

### 3.1 `types/lawyers.types.ts`
- `LawyerStatus` (`lawyers.types.ts:5`): `ACTIVE='ACTIVO'`, `INACTIVE='INACTIVO'`,
  `PENDING='PENDIENTE'`. **Los valores coinciden con la forma en que la API
  expone `status` en GET** (`route.ts:120`).
- `LawyerSpecialty` (`:11`): `civil|penal|laboral|mercantil|familiar|tributario`.
  En la práctica `especialidad` es un `string` libre en DB; el enum se usa laxo.
- `Lawyer` (`:20`): DTO aplanado (`id`, `nombre`, `email`, `telefono`, `picture`,
  `especialidad`, `status`, `matricula`, `experiencia`, `casosActivos`,
  `casosCompletados`, `rating`, `createdAt`, `updatedAt`). **No** refleja 1:1 el
  modelo `User`: añade métricas agregadas y renombra `activo`→`status`.
- `LawyersFilters` (`:58`): `status`, `especialidad`, `searchQuery`, `page`, `limit`.
  Nótese que `page`/`limit` son **soportados por los endpoints** aunque la
  versión "no paginada" también los envía.
- `PaginatedResponse<T>` (`:66`): `{ data, total, page, limit, totalPages }`.
- `LawyersState` (`:74`): contrato del store Zustand.

### 3.2 `services/lawyers.service.ts`
Objeto `lawyersService` con 6 métodos, todos vía `apiClient` (`@/lib/apiClient`):
- `getAll(filters?)` (`:5`): construye querystring y hace `GET /api/lawyers`;
  acepta respuesta **array o paginada** y normaliza devolviendo `response.data`.
- `getAllPaginated(filters?)` (`:23`): mismo URL pero tipa `PaginatedResponse`.
- `getById(id)` (`:36`): `GET /api/lawyers/${id}` (**⚠️ ese endpoint NO existe**:
  `[id]/route.ts` solo exporta PATCH/DELETE; ver §9).
- `create(data)` (`:40`): `POST /api/lawyers`.
- `update(id,data)` (`:44`): **`PUT /api/lawyers/${id}`** (⚠️ el endpoint real
  es `PATCH`; ver §9).
- `delete(id)` (`:48`): `DELETE /api/lawyers/${id}`.

`apiClient` adjunta el `Bearer` de Supabase (`02-lib.md §2.3`); por eso los
endpoints pueden autenticar por sesión además de por cabeceras `x-user-*`.

---

## 4. Detalle por archivo

### 4.1 `store/lawyersStore.ts` — estado cliente (Zustand persist)
- Store `useLawyersStore` (`:13`) con `persist` bajo `virtuabogado-lawyers-v2`
  (`:111`), almacenamiento `localStorage` (`:112`). Estado: `lawyers`, `isLoading`,
  `error`, `filters` (`:6`).
- Acciones: `addLawyer`, `setLawyers`, `fetchLawyers` (`:31`, `GET /api/lawyers`),
  `updateLawyer` (`:52`, `PUT`), `deleteLawyer` (`:74`, `DELETE`),
  `getLawyerById`, `setFilters`, `clearFilters`, `reset`.
- `initializeLawyers()` (`:118`) dispara `fetchLawyers()`.
- **Efectos secundarios**: lectura/escritura de `localStorage` (persistencia);
  llamadas HTTP en las acciones async (duplica la lógica de `lawyersService`,
  usando `apiClient` directo).
- **Importadores reales: 0**. `app/admin/page.tsx:13` y `authStore.ts:15` lo
  tienen **comentado**. Es código muerto salvo por el barrel (§9).

### 4.2 `hooks/useLawyers.ts` — hooks TanStack Query
- `LAWYER_KEYS` (`:7`): namespace de query keys bajo `['User','lawyers', ...]`.
  `list(filters)` y `detail(id)`; `lists()`/`details()` son agregadores.
- `useLawyers(filters?)` (`:15`): `queryFn = lawyersService.getAll`, `staleTime` 3 min.
  Devuelve lo que retorne `getAll` (array **o** `.data`).
- `useLawyersPaginated(filters?)` (`:23`): `queryFn = getAllPaginated`,
  `staleTime` 3 min, `placeholderData` = dato previo (paginación sin parpadeo).
- `useLawyer(id)` (`:32`): `enabled` si `id` válido y `!== 'new'`, 5 min.
- Mutaciones con **optimistic updates**:
  - `useCreateLawyer` (`:41`): inserta item temporal `temp-<ts>`, rollback, invalida lists.
  - `useUpdateLawyer` (`:67`): actualiza detail + todas las lists, rollback con
    snapshots, invalida en `onSuccess` (`refetchType:'active'`).
  - `useDeleteLawyer` (`:107`): elimina optimistamente de `list({})`, rollback,
    invalida todo `LAWYER_KEYS.all`.
- **Importadores**: `app/admin/page.tsx:15` (mutaciones), `ModalContainer.tsx:19`
  (select de abogados), hooks de dashboard, `checkoutStore.ts:10` y
  `useRealtimeSubscription.ts:7` (solo `LAWYER_KEYS` para invalidar).
- **Efectos secundarios**: red vía `lawyersService`; invalidación global de la
  caché de TanStack. El `onMutate` de create/delete asume que `list({})` es un
  array, pero `useLawyers` puede devolver `PaginatedResponse` → **riesgo** (§9).

### 4.3 `hooks/useAbogadosPanel.ts` — ViewModel del panel
- Estado local: `page`, `especialidadFilter` (`'todas'`), `statusFilter`
  (`'ALL' | LawyerStatus`), `debouncedTerm` (debounce 300 ms, `:11`).
- Resetea `page` a 1 cuando cambian búsqueda/filtros (`:16`).
- Delega en `useLawyersPaginated({ page, limit:10, searchQuery, especialidad, status })`
  (`:20`). `status` solo se envía si `!== 'ALL'`.
- Derivados: `lawyers = response?.data || []` (`:28`), `total`, `totalPages`,
  y `especialidades` (`:32`) — **construido solo con la página actual** (sesgo).
- `filteredLawyers` (`:45`) es un alias exacto de `lawyers` (el filtrado real es
  server-side).
- `updateStatus` (`:38`) es un **stub vacío** (no implementado).
- **Importador**: `AbogadosPanel.tsx:8`.

### 4.4 `components/AbogadosPanel.tsx` — View
- `'use client'` (`:1`). `memo` al export (`:284`). Props: `terminoBusqueda` y
  `abrirModal(tipo, elemento?)` (`:14`).
- Usa `useAbogadosPanel` (`:20`) para estado/datos. Presenta filtros
  (especialidad + status), vista móvil en tarjetas y tabla desktop, empty state
  y `Pagination` si `totalPages > 1` (`:271`, `pageSize=10`).
- **Imports**: `react-icons/fi`, `next/image` + `user-placeholder.png`,
  `LawyerStatus`, `useAbogadosPanel`, `Pagination` (`@/components/ui/Pagination`),
  `ElementoSeleccionable` (`@/types/index`), `formatLawyerName` (`@/utils/formatters`),
  `framer-motion`.
- **Efectos secundarios**: ninguno propio; delega navegación/CRUD a `abrirModal`
  (lo maneja el admin). No llama a la API directamente (cumple MVVM).
- **Importador**: `app/admin/page.tsx:24` (`lazy`) y se monta en `case 'abogados'`
  (`:295`).

---

## 5. Flujo MVVM y endpoints

```
AdminPage (app/admin/page.tsx)
  └─ AbogadosPanel (View)  ── useAbogadosPanel (ViewModel)
        └─ useLawyersPaginated ── lawyersService.getAllPaginated (Model)
              └─ apiClient.get('/api/lawyers?...')
                    └─ app/api/lawyers/route.ts GET ── lib/prisma.findMany(User rol ABOGADO)
                          └─ serializeFinance + setCache(10s)

ModalContainer / dashboard hooks ── useLawyers / useCreateLawyer / useUpdateLawyer / useDeleteLawyer
        └─ lawyersService ── apiClient POST / PUT / DELETE /api/lawyers[/id]
              └─ route.ts POST  /  [id]/route.ts PATCH|DELETE  ── prisma.user + Supabase Auth admin
```

### Endpoint `GET /api/lawyers` (`route.ts:13`)
- `dynamic='force-dynamic'` (`:11`).
- **Auth**: intenta cabeceras `x-user-id`/`x-user-role` (uso interno/server);
  si no, sesión Supabase (`:25`). Rol desde `user_metadata.rol` o, con fallback,
  `prisma.user.findUnique.select({rol})` (`:38`). **Solo `ADMIN`** (`:52`),
  si no `403`.
- Normaliza `userRole.toUpperCase()` (`:35`). (`UserRole` importado en `:6` pero
  no usado).
- **Paginación**: `page` (`≥1`, default 1), `limit` (`1..100`, default 50),
  `skip=(page-1)*limit` (`:57-59`).
- **Filtros**: `search` (OR insensible sobre `nombre/email/telefono/matricula`,
  `:76`), `especialidad` (`equals insensitive`, salvo `'todas'`), `status`.
- **⚠️ status**: solo `ACTIVO`→`activo=true` e `INACTIVO`→`activo=false` (`:70-71`).
  `'PENDIENTE'` **no filtra** (devuelve todos) aunque el enum lo define.
- **Prisma**: `user.findMany({ where:{ rol:'ABOGADO' }, ... })` + `user.count` +
  `order.groupBy(['lawyerId','status'])` para métricas (`:84-97`). Se consideran
  activos los estados `EN_PROGRESO|REVISION|PENDIENTE|PAID` y completados
  `COMPLETADO` (`:103-107`).
- **Formateo** (`:112`): aplana `User`→`Lawyer`, `especialidad` a minúsculas,
  `status` `activo?'ACTIVO':'INACTIVO'` (**nunca `PENDIENTE`**), y **`rating` fijo `5`**.
- **Caché**: `getCached(cacheKey)` (`:66`) con TTL `10_000` ms (`setCache`, `:138`);
  clave incluye `page/limit/especialidad/status/search`.
- Respuesta pasada por `serializeFinance` (`:131`) para Decimal/Date→plain
  (ver `02-lib.md §1.2`).

### Endpoint `POST /api/lawyers` (`route.ts:149`)
- **Auth**: `ADMIN` (`:180`).
- Valida `email`+`nombre` (`:190`) y `validateEmailDeliverability` (`:194`).
- Crea el usuario en **Supabase Auth** (`createAdminClient`, `:205`) con
  `user_metadata.rol='ABOGADO'`; si ya existe, lo busca con `listUsers` y
  actualiza metadata/contraseña (`:212-231`).
- `prisma.user.upsert` por `email` (`:241`) con `rol:'ABOGADO'`,
  `especialidad` default `'General'`, `matricula` (acepta `matricula||colegiatura`),
  `activo:true`.
- **⚠️ No invalida la caché** del GET tras crear (§9).

### Endpoint `PATCH /api/lawyers/[id]` (`[id]/route.ts:5`)
- **Auth**: `ADMIN` **o** dueño del perfil (`isOwner = user.id===id`, `:32`;
  `isAdmin` `:41`; si no → `403`).
- Actualiza campos selectivos (`nombre`, `especialidad`, `experiencia`, `picture`,
  `telefono`, `matricula`, `activo`; `''`→`null`/`Number`) vía `prisma.user.update` (`:59`).
- Si `activo` cambia y es admin, **sincroniza metadata en Supabase Auth**
  (`updateUserById`, `:65-75`, best-effort).
- **⚠️ Formato inconsistente**: devuelve `status:'active'|'inactive'` (minúsculas)
  y usa `casosAsignados` (no `casosActivos`), `casosCompletados:0`, `rating:5`.

### Endpoint `DELETE /api/lawyers/[id]` (`[id]/route.ts:103`)
- **Auth**: solo `ADMIN` (`:137`).
- **Soft delete**: `prisma.user.update({ activo:false, deletedAt:new Date() })`
  (`:143`); marca `activo:false` en Supabase Auth metadata (`:153`).
- No borra datos históricos (preserva órdenes/payouts).

---

## 6. Relación con `/abogado` y otros consumidores

- `app/abogado/page.tsx` (`:27`): RSC con guard de rol (`ABOGADO`, con fallback
  a DB `:44`) que renderiza `@/components/abogado/AbogadoPanel` (`:58`). **No usa
  el feature lawyers** para el panel en sí.
- `components/abogado/hooks/usePerfilAbogadoPanel.ts:3`: único punto donde el
  panel del abogado toca el feature: usa `lawyersService.update` para guardar
  perfil/foto (`:63`, `:84`). **Aquí el mismatch PUT/PATCH rompe la edición** si
  el endpoint no acepta PUT (§9).
- `components/admin/ModalContainer.tsx:35`: `useLawyers()` para poblar el
  `<select>` de asignación de abogado a un caso.
- Dashboard admin: `useDashboard.ts:10`, `useDashboardStats.ts:31`,
  `useEstadisticasPanel.ts:15` usan `useLawyers()` para conteos/estadísticas.
- `features/checkout/store/checkoutStore.ts:458` y
  `hooks/useRealtimeSubscription.ts:155`: importan `LAWYER_KEYS` y **invalidan**
  la caché de abogados ante eventos (pago/realtime), sin leer datos.

---

## 7. Estado (`lawyersStore`) y paginación

- **Fuente de verdad de datos** en el panel admin: **TanStack Query** vía
  `useLawyersPaginated` (server-side, `page/limit=10`). El `lawyersStore`
  (Zustand + persist) es un remanente **sin consumidores**; el filtrado es
  100% server-side.
- **Paginación**: `GET /api/lawyers` calcula `total`/`totalPages`; el hook
  `useLawyersPaginated` conserva `placeholderData` para evitar flash; el
  componente renderiza `Pagination` solo si `totalPages>1`.
- **Filtros**: `status` y `especialidad` van al servidor; la búsqueda se
  debouncea 300 ms en el ViewModel.
- **Caché**: GET cacheado 10 s por combinación de filtros; POST/PATCH/DELETE
  **no** invalidan esa caché en el servidor (solo TanStack en el cliente), por lo
  que puede haber hasta 10 s de desfase entre dispositivos.

---

## 8. Mapa de dependencias

**`features/lawyers` importa de:**
- `@/lib/apiClient` (service, store)
- `@tanstack/react-query` (hooks)
- `zustand` (+`/middleware`) (store)
- `@/features/lawyers/*` (interno: tipos, service)
- View: `@/components/ui/Pagination`, `@/types/index`,
  `@/utils/formatters`, `next/image`, `framer-motion`, `react-icons/fi`

**Es importado por:**
- `app/admin/page.tsx` (mutaciones + panel lazy)
- `components/admin/ModalContainer.tsx` (`useLawyers`)
- `components/admin/hooks/{useDashboard,useDashboardStats,useEstadisticasPanel}.ts`
- `components/abogado/hooks/usePerfilAbogadoPanel.ts` (`lawyersService`)
- `features/checkout/store/checkoutStore.ts` (`LAWYER_KEYS`)
- `hooks/useRealtimeSubscription.ts` (`LAWYER_KEYS`)

**Endpoints** → `@/lib/prisma`, `@/utils/supabase/server`,
`@/utils/supabase/admin`, `@/lib/finance`, `@/lib/cache`,
`@/lib/emailDeliverability`, `@/shared/types/entities.types`.

**Acoplamiento cruzado**: `clients` y `orders` alimentan métricas de abogados
(el GET hace `order.groupBy`), aunque no hay import directo.

---

## 9. Notas de refactor / deuda / riesgos

1. **Mismatch PUT vs PATCH (bug funcional)**: `lawyersService.update` usa
   `apiClient.put` (`lawyers.service.ts:45`) pero `[id]/route.ts` **solo exporta
   `PATCH`**. La edición de perfil del abogado (`usePerfilAbogadoPanel`) y
   `useUpdateLawyer` fallarían con 405. **A verificar** en runtime; corregir a
   `patch` o añadir handler `PUT`.
2. **`getById` sin endpoint**: `lawyersService.getById` (`:36`) apunta a
   `GET /api/lawyers/[id]`, que no existe (solo PATCH/DELETE). `useLawyer` queda
   inservible. **A verificar**.
3. **Filtro `PENDIENTE` no funciona**: el enum existe y el UI lo ofrece
   (`AbogadosPanel.tsx:80`) pero el endpoint solo mapea `ACTIVO/INACTIVO`
   (`route.ts:70`). `status` de un abogado se deriva de `activo` (booleano), por
   lo que **nunca** es `PENDIENTE`/`INACTIVO` a la vez que otros estados. Unificar
   modelo de estado vs booleano `activo`.
4. **Formato de respuesta divergente** entre GET (`status` mayúsculas, `casosActivos`)
   y PATCH (`status` minúsculas, `casosAsignados`) → DTO inconsistente.
5. **`rating` hardcodeado a 5** (`route.ts:125`) y `casosCompletados` forzado a 0
   en PATCH (`[id]/route.ts:86`): métricas ficticias.
6. **Caché sin invalidación**: POST/PATCH/DELETE no llaman `clearCache`; el GET
   puede servir datos obsoletos hasta 10 s. Añadir invalidación o versionar la clave.
7. **`lawyersStore` y el barrel `index.ts` sin uso** (0 importadores reales):
   `initializeLawyers`/`useLawyersStore` solo aparecen comentados. Duplica lógica
   del service con `apiClient` directo. Candidato a eliminación (o a migrar los
   consumidores al store si se decidiera).
8. **`updateStatus` stub** en `useAbogadosPanel.ts:38`: no hace nada; la UI no
   ofrece acción de cambio de estado directa. Eliminar o implementar.
9. **`especialidades` sesgadas**: se derivan de la página actual
   (`useAbogadosPanel.ts:32`), no del universo → filtro incompleto en páginas >1.
10. **`as any` abundante** (`lawyer as any` en el panel, `statusFilter as any`,
    `response as any` en dashboard): pérdida de type-safety en el DTO.
11. **Auth duplicada** en GET/POST/PATCH/DELETE (mismo bloque copiado): extraer
    un helper `requireAdminOrOwner` reutilizable.
12. **`rol` normalization**: `userRole.toUpperCase()` asume que la DB guarda en
    mayúsculas; validar contra `UserRole` (`entities.types.ts`).

---

**Siguiente**: `03-finance.md`.
