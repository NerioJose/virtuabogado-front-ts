# 03d — Feature: services

> Documento derivado de la lectura directa del código (no del grafo).
> Complementa a `00-mapa.md` (capas, alias `@/`, barriles, MVVM) y a `02-lib.md`
> (dinero, tasa, caché). Aquí se desarrolla **solo** el dominio `services`.
> Las referencias son `ruta:línea` del estado actual del repo.

---

## 2. Propósito

`src/features/services/` es el dominio del **catálogo de servicios legales**
(`Service`): el producto vendible, su precio (USD canónico y/o PEN canónico),
su visibilidad (`activo`) y su imagen. Es un dominio **de lectura mayoritario**:
lo consumen el sitio público (home y `/servicios`), el checkout (para conocer el
precio y el `precioPen` canónico) y el panel admin (para CRUD). Expone:

- **Tipos** del DTO de servicio (`Service`, `CreateServiceRequest`, `UpdateServiceRequest`).
- Un **service** (`servicesService`) que habla con `/api/services*` vía `apiClient`.
- **Hooks TanStack Query** de escritura/lectura: `useServices`, `useAdminServices`,
  `useCreateService`, `useUpdateService`, `useDeactivateService`, más
  `useServicesRealtime` (Realtime de la tabla `Service`).
- Un **store Zustand en memoria** (`useServicesStore`) con `services`/`activeServices`.
- Un **mapper único** (`serviceJson.ts`: `toServiceJson`, `normalizeService`) que
  garantiza una sola "forma" del servicio en el cliente.
- Un hook de composición de la página pública (`useServiciosClientPage`) y uno de
  la vista de cliente (`useMisServicios`, que en realidad opera sobre **órdenes**).

> **No existe** `src/features/services/index.ts` (barrel). Los consumidores
> importan por ruta profunda (`@/features/services/hooks/...`,
> `@/features/services/store/...`, `@/features/services/mappers/...`). Esto rompe
> la convención de barrel documentada en `00-mapa.md` §7 (ver §10).

---

## 3. Inventario de archivos

| Archivo | Exports exactos | Importadores (entrantes) |
|---------|-----------------|--------------------------|
| `types/services.types.ts` | `interface Service`, `interface CreateServiceRequest`, `interface UpdateServiceRequest` | `useServices.ts:5`, `services.service.ts:2`, `serviceJson.ts:2`, `servicesStore.ts:2`, `useServiciosClientPage.ts:9`, `useServiciosPanel.ts:7` |
| `services/services.service.ts` | `class ServicesService` (no exportada), `const servicesService` | `useServices.ts:4` |
| `mappers/serviceJson.ts` | `toServiceJson`, `normalizeService` | `app/api/services/route.ts:6`, `app/api/services/[id]/route.ts:7`, `app/page.tsx:9`, `app/servicios/page.tsx:5`, `useServices.ts:6` |
| `store/servicesStore.ts` | `useServicesStore` | `useServices.ts:14`, `useServiciosClientPage.ts:6`, `VirtuStudents.tsx:9`, `ServiciosDestacados.jsx:7`, `CartRecovery.tsx:8`, `ServiceSummary.tsx:9` |
| `hooks/useServices.ts` | `servicesKeys`, `useServices`, `useAdminServices`, `useCreateService`, `useUpdateService`, `useDeactivateService` (+ `purgeLegacyServicesStorage`, `notifyServiceChange` privadas) | `useServicesRealtime.ts:25`, `useServiciosClientPage.ts:5`, `VirtuStudents.tsx:7`, `ServiciosDestacados.jsx:5`, `useServiciosPanel.ts:3-6`, `ConfiguracionPanel.tsx:19` |
| `hooks/useServicesRealtime.ts` | `useServicesRealtime` | `useServiciosClientPage.ts:7`, `VirtuStudents.tsx:8`, `ServiciosDestacados.jsx:6` |
| `hooks/useServiciosClientPage.ts` | `useServiciosClientPage` | `app/servicios/ServiciosClientPage.tsx:58` |
| `hooks/useMisServicios.ts` | `useMisServicios` | `app/mis-servicios/page.tsx:14` |
| `index.ts` | **no existe** | — |

**Fuera de la feature, pero parte del flujo:**
`app/api/services/route.ts`, `app/api/services/[id]/route.ts`,
`app/servicios/page.tsx`, `app/servicios/ServiciosClientPage.tsx`,
`app/page.tsx` (home), `app/mis-servicios/page.tsx`, `app/detalle-servicio/[id]/page.tsx`,
`components/homePage/ServiciosDestacados.jsx`, `components/homePage/VirtuStudents.tsx`,
`components/admin/ServiciosPanel.tsx`, `components/admin/hooks/useServiciosPanel.ts`,
`components/admin/ConfiguracionPanel.tsx`.

---

## 4. Modelo de datos y mapeo

### 4.1 `types/services.types.ts`

Contrato del cliente (NO es el modelo Prisma). El modelo Prisma es `Service` con
campos `id Int`, `titulo`, `descripcion`, `precio` (USD `Decimal`), `precio_pen`
(`Decimal?`), `imagenUrl`, `activo`, `is_manual_case_placeholder`, `createdAt`.

```ts
interface Service {            // services.types.ts:1
  id: number;
  titulo: string;
  descripcion: string;
  precio: number;              // USD canónico (o derivado si precio_pen es canónico)
  precioPen: number | null;    // PEN canónico (exacto) o null → S/ derivado de la tasa
  imagenUrl: string | null;
  activo: boolean;
}
interface CreateServiceRequest { … precioPen?: number | null … }  // :11
interface UpdateServiceRequest extends Partial<CreateServiceRequest> { id: number }  // :20
```

> Nota: el DTO del cliente **no** expone `is_manual_case_placeholder` ni `createdAt`,
> aunque el API los devuelve en el JSON crudo (ver §10).

### 4.2 `mappers/serviceJson.ts` — el mapper único (anti-`.01`)

Dos funciones, deliberadamente separadas:

- **`toServiceJson(service)`** (`serviceJson.ts:26`): usado por **el servidor**
  (`/api/services`, prefetch SSR de `/` y `/servicios`). Aplica `serializeFinance`
  (convierte `Decimal`→`number`, `Date`→ISO; resuelve el error de Next 15 "Only
  plain objects…") y normaliza `precioPen` aceptando indistintamente
  `precioPen` (camel) o `precio_pen` (snake) en la fila cruda de Prisma
  (`:28`). Garantiza `precioPen` **numérico o `null`**, nunca `undefined`, y
  `precio` numérico (`:32-33`).
- **`normalizeService(raw)`** (`serviceJson.ts:43`): usado por **el cliente**
  (`useServices`/`useAdminServices` antes de `setServices`). Reconstruye
  explícitamente el objeto `Service` campo por campo (tolerante a filas parciales
  del realtime o de snapshots). `activo` por defecto `true` (`:55`).

**Por qué existen las dos y por qué es "fuente única":** el bug del `.01` ocurre
cuando el **primer paint** del cliente usa un dato hidratado que **no** trae
`precioPen`. En ese caso `DualPrice` deriva el S/ desde el USD con la tasa, y al
llegar el refetch del API (que sí trae `precioPen` canónico) el valor cambia
(artefacto de redondeo, p. ej. `60.01`). La solución aplicada en la rama
`e2a0df2` ("prefetch SSR con mismo mapper que /api/services") es que **prefetch
SSR, `/api/services` y realtime produzcan exactamente la misma forma** vía
`toServiceJson`/`normalizeService`, de modo que el primer render ya tenga el
`precioPen` correcto. Comentario explícito en `serviceJson.ts:4-12`,
`useServices.ts:44-46` y `servicesStore.ts:11-18`.

> **RESUELTO** (fix aplicado): `app/api/services/[id]/route.ts` definía su
> **propio** `toServiceJson` local (`{ ...serializeFinance(service), precioPen: service.precio_pen ?? null }`),
> que devolvía `precioPen` como **string/Decimal** en lugar de number. Ahora
> **importa** el mapper de la feature (`@/features/services/mappers/serviceJson`),
> eliminando la divergencia. Ver §10.

---

## 5. Detalle por archivo

### 5.1 `services/services.service.ts`

- **Propósito**: capa Model (MVVM) que envuelve los endpoints REST del catálogo.
- **Exports**: `const servicesService` (`:43`). La clase `ServicesService` es privada.
- **Imports**: `apiClient` (`@/lib/apiClient`, `:1`), tipos (`:2`).
- **Métodos / endpoints**:
  - `getActive()` → `GET /api/services?t=<Date.now()>` (`:10-12`). El `t` cache-bustea.
  - `getAll()` → `GET /api/services?all=true&t=…` (`:17-19`).
  - `create(data)` → `POST /api/services` (`:24-26`).
  - `update(id, data)` → `PATCH /api/services/{id}` (`:31-33`).
  - `deactivate(id)` → `DELETE /api/services/{id}` (`:38-40`).
- **Efectos secundarios**: ninguno propio; delega en `apiClient` (que adjunta el
  `Bearer` de Supabase y `cache:'no-store'` — ver `02-lib.md` §2.3).
- **Importadores**: `useServices.ts:4`.

### 5.2 `hooks/useServices.ts`

- **Exports**: `servicesKeys` (`:8`), `useServices` (`:32`), `useAdminServices` (`:56`),
  `useCreateService` (`:83`), `useUpdateService` (`:94`), `useDeactivateService` (`:109`).
- **Claves de query** (`:8-12`):
  - `all = ['Service']`, `active = ['Service','active']`, `detail(id) = ['Service', id]`.
- **`useServices(options?)`** (`:32`):
  - Llama `purgeLegacyServicesStorage()` (limpieza one-shot de la clave
    `virtu-services-storage`, `:20-30`) — residuo de una persistencia anterior.
  - `useQuery({ queryKey: active, queryFn: getActive, staleTime: 0, refetchInterval: 5000, refetchOnWindowFocus: true, ...options })` (`:35-42`).
    **Polling cada 5 s** además del realtime.
  - `useEffect` (`:47-51`): al cambiar `query.data`, `setServices(data.map(normalizeService))`
    → alimenta `useServicesStore`. Se aplica **siempre** `normalizeService`.
- **`useAdminServices()`** (`:56`): igual pero `queryKey: all` y `getAll()`; sin
  `refetchInterval`, con `refetchOnWindowFocus: true`.
- **Mutaciones** (`:83`,`:94`,`:109`): `useCreateService`/`useUpdateService`/`useDeactivateService`
  invalidan `servicesKeys.all` con `refetchType:'all'` y llaman `notifyServiceChange()`
  (`:75-81`), que emite `'changed'` por un `BroadcastChannel('services-update')` a
  **otras pestañas** del mismo navegador. `useUpdateService` además invalida en `onError`.
  > El `BroadcastChannel` se emite pero **no se encontró un listener** de
  > `'services-update'` en el repo (**a verificar**: posible código muerto).
- **Importadores**: home (`VirtuStudents.tsx:7`, `ServiciosDestacados.jsx:5`),
  `useServiciosClientPage.ts:5`, `useServicesRealtime.ts:25` (solo `servicesKeys`),
  y el panel admin vía `useServiciosPanel.ts:3-6` / `ConfiguracionPanel.tsx:19`.

### 5.3 `hooks/useServicesRealtime.ts`

- **Propósito**: invalidar las queries del catálogo ante cualquier cambio WAL en
  la tabla `Service`, para todos (incluso **anónimos**, usa `createClient()` con
  anon key, `:33`).
- **Export**: `useServicesRealtime(enabled = true)` (`:27`).
- **Imports**: `useQueryClient`, `createClient` (`@/utils/supabase/client`), `servicesKeys` (`:25`).
- **Suscripción** (`:35-59`): canal `public:Service`, `postgres_changes`
  `event:'*'|schema:'public'|table:'Service'`; en el callback invalida
  `servicesKeys.all` **y** `servicesKeys.active` (`:46-47`). Log de aviso si
  `CHANNEL_ERROR` (sugiere RLS SELECT para `anon` o falta de publicación realtime,
  `:55-57`).
- **Prerrequisito**: `Service` debe estar en la publicación `supabase_realtime`
  (`migrations/enable_realtime_on_tables.sql:11`).
- **Importadores**: `useServiciosClientPage.ts:7`, `VirtuStudents.tsx:8`,
  `ServiciosDestacados.jsx:6`.

### 5.4 `store/servicesStore.ts`

- **Export**: `useServicesStore` (`:19`).
- **Estado**: `services: Service[]`, `activeServices: Service[]` (`:5-6`).
- **Acciones**:
  - `setServices(services)` (`:23`): guarda todo y deriva `activeServices` filtrando `activo`.
  - `updateServiceState(id, updates)` (`:27`): update-in-place o upsert; recalcula `activeServices`.
- **Sin `persist`** (comentario `:11-18`): deliberado, para que ningún snapshot en
  `localStorage` sin `precioPen` pinte un precio derivado incorrecto antes del
  primer refetch. Junto a esto, `purgeLegacyServicesStorage` elimina la clave vieja.
- **Importadores**: ver §3.

### 5.5 `hooks/useServiciosClientPage.ts`

- **Propósito**: ViewModel de la página pública `/servicios`. Orquesta auth,
  checkout, órdenes y catálogo.
- **Export**: `useServiciosClientPage` (`:12`).
- **Imports internos cruzados**: `useAuth`, `useCheckout` (feature checkout),
  `useOrdersByUser` (feature orders), `useServices`, `useServicesStore`,
  `useServicesRealtime`, `useFinancialSettings`, `Service`, `slugify`.
- **Lógica**:
  - `useServices()` (`:21`) + `useServicesRealtime(true)` (`:22`, siempre activo).
  - `activeServices` desde el store (`:28`).
  - `isClient`, `hasPendingPayment`, `pendingOrder` a partir de órdenes del usuario (`:30-32`).
  - `getServiceImage(service)` (`:34-49`): si no hay `imagenUrl`, usa `slugify(titulo)`
    con un `manualMap` de excepciones y resuelve a `/images/<slug>.png` (o `.jpg`
    literal si el slug ya trae extensión). **Nota**: el mapa del hook sirve `.png`
    por defecto, mientras el admin (`useServiciosPanel.ts:201`) sirve `.jpg` →
    convención de imágenes inconsistente (ver §10).
  - `handleRequestService(servicio)` (`:51-54`): quita `icono` y llama `openCheckout(serviceData)`.
  - `isLoading = authLoading || (user && ordersLoading) || servicesLoading || settingsLoading` (`:56`).
- **Importador**: `app/servicios/ServiciosClientPage.tsx:58`.

### 5.6 `hooks/useMisServicios.ts`

- **Propósito**: ViewModel de `/mis-servicios`. A pesar de vivir en `services`,
  opera sobre **órdenes** del usuario, no sobre el catálogo.
- **Export**: `useMisServicios` (`:10`).
- **Imports**: `useOrdersByUser` (orders), `useAuth`, `useChatStore`,
  `mapOrderToServicio`+`sortServicesByDate` (desde `@/features/orders`),
  `useRealtimeSubscription`, `useFinancialSettings`.
- **Lógica**:
  - `useOrdersByUser(user?.id, { enabled: !!user?.id })` (`:16`);
  - `useRealtimeSubscription()` (`:20`, ver §8) + `useFinancialSettings` (`:22`);
  - hidratación (`hasHydrated`) y `checkAuth` (`:26-36`); redirección a `/login`
    si no autenticado (`:38-43`); `handleLogout` (`:45-52`);
  - `servicios` (`:54-63`): filtra órdenes `PAGO_PENDIENTE`/`PAGO_RECHAZADO`, las
    mapea con `mapOrderToServicio` (de orders) y ordena.
- **Importador**: `app/mis-servicios/page.tsx:14`.

### 5.7 Páginas y endpoints (resumen; detalle en §6)

- `app/api/services/route.ts`: `GET` (catálogo; `all=true` admin) y `POST` (crear, admin).
- `app/api/services/[id]/route.ts`: `GET`/`PATCH`/`DELETE` (soft delete).
- `app/servicios/page.tsx`: RSC con prefetch SSR + `HydrationBoundary`.
- `app/servicios/ServiciosClientPage.tsx`: vista cliente del catálogo.
- `app/page.tsx`: RSC home con prefetch SSR (mismo `queryKey` y mapper).
- `app/mis-servicios/page.tsx`: vista cliente de casos.
- `app/detalle-servicio/[id]/page.tsx`: detalle de una **orden** (usa `useOrder`,
  `DualPrice`, `ChatWindow`); no usa la feature services directamente.

---

## 6. Flujos

### 6.1 Catálogo público `/servicios` (prefetch SSR + realtime)

1. **SSR** (`app/servicios/page.tsx`): `revalidate = 3600` (`:17`). Crea un
   `QueryClient`, hace `prefetchQuery({ queryKey: ['Service','active'], queryFn: prisma.service.findMany({where:{activo:true}, orderBy:{id:'asc'}}).map(toServiceJson) })`
   (`:27-36`) y envuelve la página con `dehydrate` + `HydrationBoundary`
   (`:39-41`). El `queryKey` coincide **exactamente** con `servicesKeys.active`.
2. **Hidratación cliente** (`ServiciosClientPage.tsx`): renderiza
   `useServiciosClientPage()` (`:69`), que llama `useServices()` → la query ya
   tiene datos del prefetch (primer paint con `precioPen` correcto) y en
   paralelo `servicesService.getActive()`.
3. `useEffect` de `useServices` normaliza y vuelca a `useServicesStore`;
   `activeServices` pinta la lista. Cada tarjeta usa
   `<DualPrice usd={precio} pen={precioPen} />` (`ServiciosClientPage.tsx:188`).
4. **Estados**: `isLoading` → skeleton; `hasPendingPayment` → `<CasiListo>` (`:106-108`);
   si no, el listado.
5. **Realtime**: `useServicesRealtime(true)` + `useRealtimeSubscription` (si hay
   sesión) invalidan y refrescan al cambiar `Service` / broadcast.

### 6.2 Home (`/`)

`app/page.tsx` hace el **mismo prefetch** (`:32-41`, `queryKey ['Service','active']`,
`toServiceJson`) y delega en componentes cliente:
- `ServiciosDestacados.jsx`: `useServices()` + `useServicesRealtime()` +
  `activeServices` del store (`:55-57`). Mapea icono/imagen por slug (`.jpg`).
- `VirtuStudents.tsx`: idéntico, busca el servicio "estudiante" por
  `imagenUrl`/título (`:21-28`) y ofrece `openCheckout` + `DualPrice` (`:113,123`).

### 6.3 `mis-servicios`

`app/mis-servicios/page.tsx` (client) usa `useMisServicios()` y renderiza
`<ClientPanel>` (de `features/clients`). **No muestra el catálogo**: muestra las
**órdenes** del usuario mapeadas a `ServicioCliente`. Realtime vía
`useRealtimeSubscription` (órdenes, payouts, etc.).

### 6.4 Detalle

`app/detalle-servicio/[id]/page.tsx` (client) carga una **orden** con `useOrder(id)`
(orders), muestra estado, financiero (`DualPrice`), items y `ChatWindow`. No
consume el catálogo.

### 6.5 Panel admin (reutilización)

- `components/admin/ConfiguracionPanel.tsx`: pestaña `servicios` renderiza
  `<ServiciosPanel />` (`:327`). Importa `useAdminServices` (`:19`) **sin usarlo**
  (import muerto — ver §10).
- `components/admin/ServiciosPanel.tsx` (View, `:19`) consume
  `useServiciosPanel` (`components/admin/hooks/useServiciosPanel.ts:15`), que
  reutiliza `useAdminServices`, `useUpdateService`, `useCreateService` de la
  feature y `useExchangeRate`.
- `useServiciosPanel` implementa la **lógica anti-`.01` de edición**:
  recuerda el PEN canónico al alternar `USD↔PEN` (`penBaseRef`/`usdPreviewRef`,
  `:60-79`) y `resolvePrecio` (`:82-100`) decide qué es canónico al guardar
  (`precio` USD + `precioPen` exacto cuando se cargó en soles). `toggleStatus`
  usa `useUpdateService` (soft delete vía `activo`).

---

## 7. Precio / tasa / mostrar-USD: cómo se combinan aquí

El catálogo sólo **transporta** los dos precios; el cálculo de visualización vive
en `components/ui/DualPrice.tsx` (documentado aquí por ser el consumidor directo
del `precio`/`precioPen` de `Service`).

- **Datos de entrada** (por servicio): `precio` (USD) y `precioPen` (PEN canónico o `null`).
  Regla canónica (misma que `lib/servicePrice.ts`): si `precio_pen > 0`, el PEN es
  el **exacto** y el USD se deriva de la tasa vigente; si es `null`, el USD es
  canónico y el PEN se deriva (`servicePrice.ts:14-56`).
- **Tasa** (`DualPrice`): `useExchangeRate()` (`DualPrice.tsx:26`) →
  `useQuery(['exchange-rate'], fetch('/api/exchange-rate'), staleTime 30s)`
  (`features/finance/hooks/useExchangeRate.ts:20-29`). El endpoint usa
  `lib/exchangeRate.getUsdPenRate()` (server-only): 1) tasa manual
  `FinancialSettings.usd_pen_fallback_rate` leída fresca, 2) auto Frankfurter
  cacheada 1 h, 3) error si no hay (`exchangeRate.ts:68-90`).
- **Mostrar USD**: `useDisplaySettings()` (`DualPrice.tsx:27`) →
  `useQuery(['display-settings'], fetch('/api/display-settings'))`
  (`useDisplaySettings.ts:30-43`); default mientras carga es `false` (no flash).
- **Render** (`DualPrice.tsx:34-60`): si hay tasa, muestra **S/** grande
  (`penValue` exacto si existe, o `usdToPen(usd, rate)`) y, **solo si `showUsd`**,
  una segunda línea `USD` pequeña. Si no hay tasa pero hay `penValue`, muestra S/
  + (si `showUsd`) el USD numerado. Si `showUsd`, muestra solo USD; si no, `<span/>`.
  Cuando el precio es canónico en soles, `displayUsd = penToUsd(penValue, rate)`
  (`:32`) para usar **una sola tasa**.
- **Coherencia anti-`.01`**: el `precioPen` que llega a `DualPrice` es el canónico
  (garantizado por `toServiceJson`/`normalizeService` en cada fuente). Sin esto, el
  S/ se derivaría del USD y diferiría del canónico tras el refetch.
- El checkout usa el resolver estricto `lib/servicePrice.ts`
  (`resolveServicePrice`/`resolveServiceBreakdown`) para escalar base/IGV/total
  desde el **mismo par** (`servicePrice.ts:73-85`; consumido por `CheckoutModal`
  y `ServiceSummary`, ver `02-lib.md` §1.3). La feature services no duplica esa lógica.

---

## 8. Realtime: canales/eventos suscritos y qué invalidan

Hay **tres** mecanismos que afectan al catálogo:

1. **WAL directo de `Service`** — `useServicesRealtime` (`hooks/useServicesRealtime.ts`):
   canal `public:Service`, `postgres_changes event:'*'` → invalida
   `['Service']` y `['Service','active']` (`:46-47`). Anon-safe. Usado en home,
   `/servicios` y (`VirtuStudents`/`ServiciosDestacados`).
2. **Broadcast global `app-updates`** — `useRealtimeSubscription`
   (`src/hooks/useRealtimeSubscription.ts`), sólo para usuarios autenticados:
   - `service-updated` (`:45-48`): invalida `['Service']` y `['Service','active']`.
     Emitido por `broadcastServiceUpdate` (`lib/broadcast.ts:188-208`) tras
     POST/PATCH/DELETE (`api/services/route.ts:62`, `[id]/route.ts:71,102`) y por
     los event handlers (`events/handlers/broadcastHandlers.ts:90-105`).
   - `exchange-rate-updated` (`:50-61`): `setQueryData(['exchange-rate'], rate)` o
     invalida si no hay tasa; e invalida `FINANCIAL_SETTINGS_KEYS.all`.
   - `display-settings-updated` (`:63-70`): `setQueryData(['display-settings'], {showUsd})`
     o invalida.
3. **WAL directo `Service` en el canal de sesión** — `useRealtimeSubscription`
   añade `Service` (sin filtro) a las tablas suscritas para ADMIN/ABOGADO/CLIENTE
   (`useRealtimeSubscription.ts:245,248,257`) e invalida `['Service']` (`:179-182`).
4. **WAL de `DisplaySettings`** — `useDisplaySettingsRealtime`
   (`src/hooks/useDisplaySettingsRealtime.ts:35-47`) canal `public:DisplaySettings`
   → invalida `['display-settings']`. (No forma parte de services, pero es el
   segundo camino para el flag que gatea la línea USD de `DualPrice`.)

**Eventos de outbox**: `service.updated` / `service.deleted`
(`events/definitions.ts:12-13`, `ServiceUpdated` `:97-100`). `emit(...)` se llama
en los endpoints (`api/services/route.ts:64`, `[id]/route.ts:73,104`). Handlers:
`serviceHandlers.ts:5,11` hacen `revalidatePath('/')`, `revalidatePath('/servicios')`
y `clearCache('services-')`; `broadcastHandlers.ts:90,99` reemiten el broadcast.

> **Doble canal redundante para `Service`**: si un usuario autenticado está en
> home o `/servicios`, recibe WAL (`useServicesRealtime` + el canal de sesión) **y**
> broadcast, además del `refetchInterval: 5000` de `useServices`. Ver §10.

---

## 9. Mapa de dependencias

### 9.1 La feature services importa

```
services.service ─► @/lib/apiClient, types
useServices       ─► services.service, types, mappers/serviceJson, store/servicesStore
useServicesRealtime ─► @/utils/supabase/client, useServices (servicesKeys)
useServiciosClientPage ─► @/features/auth, @/features/checkout, @/features/orders,
                          services (useServices/store/realtime), @/features/financial-settings,
                          types, @/utils/formatters
useMisServicios   ─► @/features/orders (useOrdersByUser, mapOrderToServicio,
                     sortServicesByDate), @/features/auth, @/features/chat,
                     @/hooks/useRealtimeSubscription, @/features/financial-settings
mappers/serviceJson ─► @/lib/finance, types
store/servicesStore ─► zustand, types
types             ─► (nada)
```

### 9.2 Es importada por

| Origen | Qué importa |
|--------|-------------|
| `app/api/services/route.ts`, `app/api/services/[id]/route.ts` | `toServiceJson` |
| `app/page.tsx`, `app/servicios/page.tsx` | `toServiceJson` (prefetch SSR) |
| `app/servicios/ServiciosClientPage.tsx` | `useServiciosClientPage` |
| `app/mis-servicios/page.tsx` | `useMisServicios` |
| `components/homePage/ServiciosDestacados.jsx` | `useServices`, `useServicesRealtime`, `useServicesStore` |
| `components/homePage/VirtuStudents.tsx` | idem |
| `components/admin/hooks/useServiciosPanel.ts` | `useAdminServices`, `useUpdateService`, `useCreateService`, tipos |
| `components/admin/ConfiguracionPanel.tsx` | `useAdminServices` (import muerto) |
| `features/checkout/components/CartRecovery.tsx` | `useServicesStore` |
| `features/checkout/components/ServiceSummary.tsx` | `useServicesStore` |

### 9.3 Endpoints y páginas del flujo

```
POST   /api/services          (auth ADMIN)   → create + clearCache + broadcast + emit
GET    /api/services          (público; ?all=true admin) → findMany + toServiceJson
PATCH  /api/services/[id]     (auth ADMIN)   → update parcial + clearCache + broadcast + emit
DELETE /api/services/[id]     (auth ADMIN)   → soft delete (activo=false) + broadcast + emit
GET    /api/services/[id]     (público)      → findUnique + toServiceJson (compartido)
```

Autorización admin: cabecera `x-user-role` inyectada por
`utils/supabase/middleware.ts:104`, con fallback a `supabase.auth.getUser()` +
`user_metadata.rol` (`api/services/route.ts:36-43`, `[id]/route.ts:34-40`).

---

## 10. Notas de refactor / deuda / riesgos

1. **Falta el barrel `index.ts`** de la feature (rompe la convención §7 de
   `00-mapa.md`). Los consumidores importan rutas profundas; crear barril y
   migrar imports.
2. ~~**Mapper duplicado en `[id]/route.ts:8`**~~ → **RESUELTO**: `[id]/route.ts`
   ahora importa `toServiceJson` de la feature (antes devolvía `precioPen` como
   string/Decimal; ahora numérico y consistente con `/api/services`). Verificado
   con `tsc --noEmit` y `next build`.
3. **Realtime redundante**: `Service` se escucha por WAL (2 canales) **y** broadcast
   **y** además `useServices` hace `refetchInterval: 5000` (`useServices.ts:39`).
   Evaluar eliminar el polling (el commit `ed6b75e`/`402f68d` fue hacia propagación
   inmediata) o el canal WAL anon si el broadcast basta.
4. **`notifyServiceChange` / `BroadcastChannel('services-update')`**: se emite pero
   **no hay listener** en el repo (**a verificar**). Probable código muerto entre
   pestañas (el realtime ya cubre cross-tab/cross-device).
5. **Import muerto** `useAdminServices` en `ConfiguracionPanel.tsx:19`.
6. **Convención de imágenes inconsistente**: `useServiciosClientPage.getServiceImage`
   usa `.png` por defecto (`:48`) mientras `useServiciosPanel.getServiceImage` usa
   `.jpg` (`:201`) y `ServiciosDestacados.jsx` usa `.jpg` (`:93`). Unificar.
7. **DTO incompleto**: `Service` del cliente no incluye `is_manual_case_placeholder`
   ni `createdAt`, aunque `/api/services` los devuelve (Prisma `findMany` sin
   `select`). El mapper `toServiceJson` no los elimina (`...ser`). Si se quiere DTO
   limpio, definir `select` o tipar el sobrante.
8. **`(prisma as any)` en `exchangeRate.ts`** afecta indirectamente la tasa que
   consumen los precios (ya anotado en `02-lib.md` §9.3).
9. **`purgeLegacyServicesStorage`** (one-shot) y `LEGACY_SERVICES_STORAGE_KEY`
   son deuda de migración; retirar cuando no queden clientes con la clave vieja.
10. **`useMisServicios` vive en services pero es de órdenes**: conceptualmente
    debería vivir en `features/orders` (o `clients`). Reubicar.

---

## 11. Siguiente

`03-clients.md` — feature `clients` (paneles de cliente, `ClientPanel`, hooks de
perfil/listado y su relación con `services`/`orders`).
