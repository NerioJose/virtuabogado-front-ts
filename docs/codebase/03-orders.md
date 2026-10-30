# 03c — Feature: orders

> Documento derivado de la lectura directa del código (no del grafo).
> Complementa a `00-mapa.md`: aquí solo se detalla el dominio **orders**.
> Las referencias son `ruta:línea` del estado actual del repo.

---

## 2. Propósito

`src/features/orders/` es el dominio que representa el **expediente/caso**
(`Order`): la compra de un servicio por un cliente, su estado, su desglose
financiero y su historial. Expone:

- **Tipos** del DTO de orden (`Order`, filtros, requests).
- Un **store Zustand** persistido (`ordersStore`) legado/deprecado en uso.
- **Hooks TanStack Query** (`useOrders`, `useOrdersHistory`, `useOrdersHistoryTable`)
  que hablan con `/api/orders*` a través del **service** (`orders.service.ts`).
- Una **Server Action** de historial financiero (`actions/getOrdersHistory.ts`).
- **Utilidades de mapeo** (`orderMappers.ts`) que convierten `Order` → vista de
  cliente (`ServicioCliente`) y estados de dominio → estados visuales.
- La **tabla** de historial (`components/OrdersHistoryTable.tsx`) usada por admin
  y abogado.

No contiene endpoints (viven en `src/app/api/orders/**`) ni el motor financiero
(vive en `src/services/finance.service.ts` y `src/lib/finance.ts`).

---

## 3. Inventario de archivos

| Archivo | Exports | Importadores (principales) |
|---------|---------|----------------------------|
| `src/features/orders/index.ts` | Reexports (barrel) | `checkoutStore.ts:12`, `useClientesPanel.ts:3`, `NavBar.tsx:9`, `ClientPanel.tsx:26`, `useMisServicios.ts:6`, `useDocumentosPanel.ts:3`, `useClientPanel.ts:3`, `useFinanzasPanel.ts:2` |
| `src/features/orders/types/orders.types.ts` | `PaymentMethod` (enum), `OrderItem`, `Order`, `CreateOrderRequest`, `UpdateOrderStatusRequest`, `OrdersFilters`, `OrdersState`, reexport `OrderStatus` | Barrel; múltiples componentes vía `@/features/orders/types/orders.types` |
| `src/features/orders/store/ordersStore.ts` | `useOrdersStore`, `initializeOrders` | `authStore.ts:13`, `checkoutStore.ts:7`, `useClientesPanel.ts:3`, `NavBar.tsx:9` |
| `src/features/orders/services/orders.service.ts` | `ordersService` | `useOrders.ts:4`, `useDocumentosPanel.ts:3` |
| `src/features/orders/hooks/useOrders.ts` | `ORDER_KEYS`, `useOrders`, `useOrdersByLawyer`, `useOrdersByUser`, `useOrder`, `useCreateOrder`, `useCreateOrderByAdmin`, `useUpdateOrder`, `useDeleteOrder` | Barrel; ~15 hooks/paneles (admin, abogado, chat, checkout, services, hooks global) |
| `src/features/orders/hooks/useOrdersHistory.ts` | `useOrdersHistory` | `useOrdersHistoryTable.ts:2` |
| `src/features/orders/hooks/useOrdersHistoryTable.ts` | `useOrdersHistoryTable` | `OrdersHistoryTable.tsx:4` |
| `src/features/orders/components/OrdersHistoryTable.tsx` | `OrdersHistoryTable` | `app/admin/page.tsx:36,350`; `components/abogado/AbogadoPanel.tsx:48,379` (dynamic import) |
| `src/features/orders/actions/getOrdersHistory.ts` | `getOrdersHistory`, interfaz `GetOrdersFilters` | `useOrdersHistory.ts:5` |
| `src/features/orders/utils/orderMappers.ts` | `mapOrderStatusToVisual`, `getStatusText`, `getStatusColor`, `formatOrderDate`, `formatOrderDateTime`, `getServiceDescription`, interfaz `ServicioCliente`, `mapOrderToServicio`, `sortServicesByDate`, `filterServicesByStatus` | Barrel; `useMisServicios.ts:6`, `ClientPanel.tsx:26`, `useClientPanel.ts:3` |

---

## 4. Tipos y mapeo

### 4.1 `types/orders.types.ts`

- `Order` (`orders.types.ts:26-62`) es el DTO "cliente" del expediente. Campos
  clave: `id`, `numericId`, `userId`, `lawyerId`, `lawyerName`, `userName`,
  `userEmail`, `items: OrderItem[]`, `subtotal`, `tax`, `total` (USD),
  `totalPen?` (S/ congelado), `exchangeRateUsed?`, `status: OrderStatus`,
  `paymentMethod`, `paymentMethodIdentifier/Name`, `transactionId`, fechas,
  `payoutStatus`, y objetos anidados opcionales `user` y `service`.
- `OrderStatus` **no se define aquí**: se importa de
  `@/shared/types/entities.types` y se reexporta (`orders.types.ts:5-7`). El
  enum canónico vive en `entities.types.ts` y espeja `prisma/schema.prisma`
  (ver `00-mapa.md` §6).
- `PaymentMethod` (enum local, `orders.types.ts:9-16`): `CREDIT_CARD`,
  `DEBIT_CARD`, `PAYPAL`, `BANK_TRANSFER`, `CASH`, `CRYPTO`. **No coincide** con
  los métodos reales de las pasarelas (Zenobank/MercadoPago): es un enum legado.
- `OrdersFilters` (`orders.types.ts:79-88`) lo usa el store y los hooks de lista.
- `GetOrdersFilters` (en `actions/getOrdersHistory.ts:9-19`) es **otro** tipo de
  filtro (paginación + `dateRange`), distinto del anterior. Hay dos familias de
  filtros conviviendo (ver §10).

### 4.2 `utils/orderMappers.ts` (mapeo de presentación, no Prisma→DTO)

> ⚠️ Corrección al enunciado: `orderMappers.ts` **no** mapea Prisma→DTO ni usa
> `serializeFinance` ni resuelve precios USD/PEN. Ese trabajo lo hacen
> `orders.helpers.ts` (`formatOrderResponse`) y `lib/finance.ts`
> (`serializeFinance`). Ver §5.8 y §7. Marcar esto explícitamente para evitar
> confusión futura.

Lo que `orderMappers.ts` realmente hace:

- `mapOrderStatusToVisual` (`:7-27`): `OrderStatus` → 5 estados visuales
  (`pendiente|programado|revision|completado|cancelado`). Nota: el badge de
  `OrdersHistoryTable` usa su **propio** `statusConfig` (`OrdersHistoryTable.tsx:28-38`),
  no este mapeo.
- `getStatusText`, `getStatusColor` (`:32-67`): etiquetas y clases Tailwind.
- `formatOrderDate`, `formatOrderDateTime` (`:72-93`): fechas `es-ES`.
- `getServiceDescription` (`:99-110`): descripción "hardcodeada" por nombre de
  servicio (diccionario local); no consulta catálogo.
- `mapOrderToServicio` (`:128-146`): `Order` → `ServicioCliente`. Usa
  `order.items[0].serviceName`, `formatOrderId(numericId, createdAt)` y
  `order.total` como precio. Rellena `estado` vía `mapOrderStatusToVisual`.
- `sortServicesByDate`, `filterServicesByStatus` (`:151-168`).
- `ServicioCliente` (`:115-126`): DTO de la vista `/mis-servicios`.

---

## 5. Detalle por archivo

### 5.1 Barrel `index.ts`

Reexporta tipos, store, `hooks/useOrders`, `orderMappers` y `ordersService`
(`index.ts:1-7`). **No** expone `OrdersHistoryTable`, `useOrdersHistory`,
`useOrdersHistoryTable` ni `getOrdersHistory`: esos se importan por ruta directa.
La convención "importar del barrel" (`00-mapa.md` §7) se cumple solo en parte.

### 5.2 Store `store/ordersStore.ts` (Zustand + persist)

- `useOrdersStore` (`:19`), persistido en `localStorage` con clave
  `virtuabogado-orders-v2` (`:192`) vía `createJSONStorage`.
- Estado `OrdersState`: `orders`, `isLoading`, `error`, `filters`.
- Acciones locales: `addOrder`, `setOrders`, `upsertOrder`, `updateOrder`,
  selectores `getOrderById/ByUser/ByLawyer`, `setFilters`, `clearFilters`,
  `reset` (`:27-189`).
- Acciones async contra API con `apiClient`: `fetchOrders` (`GET /api/orders`),
  `updateOrderStatus` (`PATCH /api/orders`), `assignLawyer` (`PATCH /api/orders`),
  `deleteOrder` (`DELETE /api/orders?id=`) (`:64-165`).
- `initializeOrders()` (`:210-216`): dispara `fetchOrders()`. Está **comentado**
  en `app/admin/page.tsx:9,91` ("Legacy removed, using React Query").
- Efectos secundarios: escribe en `localStorage`; los hooks llaman
  `addOrder` al crear checkout (`checkoutStore.ts:461`) y `reset` al cerrar
  sesión (`authStore.ts:93`).
- Código muerto/roto: `fetchOrders` tiene un `// TODO: Implement` seguido de
  `try` en la misma línea (`:67`), y numerosos bloques vacíos. **A verificar**
  si el store sigue siendo fuente de verdad para alguna vista; hoy los
  consumidores son `useClientesPanel` y `NavBar` (lectura) más checkout/auth
  (escritura).

### 5.3 Service `services/orders.service.ts`

Objeto `ordersService` con llamadas `fetch` directas a la API (no `apiClient`):

- `getAll(filters)` → `GET /api/orders?…` con `cache:'no-store'` (`:18-34`).
  Serializa `lawyerId`, `userId`, `status`, `search`, `page`, `limit`,
  `hidePendingPayment`. Devuelve `{ data, pagination, countsByStatus? }`.
- `getById(id)` → `GET /api/orders/{id}` (`:39-51`); devuelve `null` en 404.
- `create(orderData)` → `POST /api/orders` (checkout público) (`:56-72`).
- `createAdmin(data)` → `POST /api/orders/admin-create` (`:77-95`).
- `updateStatus(data)` → `PUT /api/orders` (`:97-121`). ⚠️ La ruta `route.ts` de
  `/api/orders` **no exporta PUT** (solo GET/POST/PATCH/DELETE). Este método
  está roto o apunta a un endpoint inexistente. **A verificar/refactor.**
- `getByUser` y `delete` son stubs (`return []` / vacío) marcados `TODO`
  (`:126-148`).

### 5.4 Hooks `hooks/useOrders.ts`

- `ORDER_KEYS` (`:8-15`): claves de TanStack Query.
  `all:['Order']`, `lists()`, `list(filters)`, `details()`, `detail(id)`,
  `status(id)`. Es la clave raíz que el realtime invalida.
- `useOrders(filters?, options?)` (`:17-25`): `ordersService.getAll`, `staleTime`
  10 min. Base de las listas admin/abogado.
- `useOrdersByLawyer(lawyerId)` / `useOrdersByUser(userId)` (`:27-33`):
  atajos que llaman `useOrders({…})`.
- `useOrder(id, options?)` (`:35-45`): detalle; `enabled` false si `id==='new'`.
- Mutaciones:
  - `useCreateOrder` → `apiClient.post('/api/orders')` (`:47-62`).
  - `useCreateOrderByAdmin` → `ordersService.createAdmin` (`:64-83`).
  - `useUpdateOrder` (`:85-149`): `apiClient.patch('/api/orders/{id}')` con
    actualización **optimista** de detalle y todas las listas, rollback en error
    e invalidación selectiva `refetchType:'active'`.
  - `useDeleteOrder` (`:151-185`): `apiClient.delete('/api/orders/{id}')` con
    optimismo sobre `ORDER_KEYS.list({})`.

### 5.5 Hooks de historial

- `useOrdersHistory(filters, user)` (`useOrdersHistory.ts:8-14`): `useQuery`
  con `queryKey [...ORDER_KEYS.list(filters), user.id]`, `queryFn`
  `getOrdersHistory(filters, user)` (Server Action), `placeholderData` previo y
  `staleTime` 5 min.
- `useOrdersHistoryTable(user)` (`useOrdersHistoryTable.ts:6-33`): mantiene el
  estado local de `filters` (página=1, limit=10), expone `handlePageChange` y
  `handleFilterChange` (este último resetea `page` a 1).

### 5.6 Componente `components/OrdersHistoryTable.tsx`

- `'use client'`. Recibe `user:{id, rol}` (`:24-26`).
- `statusConfig` (`:28-38`): etiqueta, color y icono lucide por `OrderStatus`.
- Consume `useOrdersHistoryTable` (`:41-48`).
- UI dual: cards en móvil (`:94-165`) y tabla en desktop (`:181-311`), con
  filtros de búsqueda/estado/rango de fecha y paginación (`components/ui/Pagination`
  en móvil; botones propios en desktop).
- Render por rol: `ABOGADO` ve comisión (negativa) y "Su Neto"
  (`order.financials?.netoPlataforma`); `ADMIN` ve `S/ cobrado × Tasa`
  (`order.totalPen`, `order.exchangeRateUsed`).
- Usa `DualPrice`, `formatPEN`, `formatOrderId`.

### 5.7 Server Action `actions/getOrdersHistory.ts`

- `'use server'` (`:1`). `getOrdersHistory(filters, user)` (`:26`).
- Seguridad por rol: `ABOGADO` → fuerza `lawyerId = user.id`; `ADMIN` puede
  filtrar por `lawyerId`; `clientId` → `userId` (`:30-37`).
- Filtro de fecha por `dateRange` (`today|week|month|year|custom`) → `createdAt`
  (`:39-59`).
- `where`: `activo:true`, `OR` de búsqueda (`id`, `service.titulo`,
  `user.nombre`). Si no hay `status`, **excluye** `PAGO_PENDIENTE` y
  `PAGO_RECHAZADO` (`:73-80`).
- `Promise.all` de `count`, `findMany` (incluye `service{titulo,precio}`,
  `user{nombre,email}`, `lawyer{nombre}`) y `getFinancialSettingsCached()`
  (`:84-98`).
- Enriquece cada orden con `calculateOrderFinances(order.total, settings)` →
  `financials { bruto, comisionLawyer, netoPlataforma }` (`:101-111`).
- Devuelve `serializeFinance({ data, total, totalPages, currentPage })`
  (`:114-119`).
- Errores: log con prefijo `[DATABASE_REPAIR]` y `throw` (`:120-131`).

### 5.8 `lib/formatOrderId.ts` y `lib/finance.ts`

- `formatOrderId(numericId?, createdAt?)` (`formatOrderId.ts:5-16`): ID de
  expediente `EXP-AAAA-MM-NNNNN`; `EXP-00000` si no hay `numericId`. Formato
  único en toda la plataforma.
- `lib/finance.ts`: `formatUSD`, `formatPEN`, reexporta `usdToPen`/`penToUsd`
  de `@/lib/money`, y **`serializeFinance`** (`finance.ts:48-77`), que convierte
  recursivamente `Decimal` (`.toNumber()`) a `number` y `Date` a ISO. Es la
  utilidad que resuelve el error de Next.js 15 "Only plain objects…" al pasar
  datos Prisma a Client Components. `[CLIENT-SAFE]`.

---

## 6. Flujo MVVM y consumidores

```
OrdersHistoryTable (View)
  └─ useOrdersHistoryTable (VM local: filtros/paginación)
       └─ useOrdersHistory (TanStack Query)
            └─ getOrdersHistory (Server Action)  →  prisma + calculateOrderFinances + serializeFinance
```

```
useOrders / useOrdersByLawyer / useOrdersByUser (TanStack Query)
  └─ ordersService.getAll (fetch)  →  GET /api/orders  →  prisma
       (formato vía orders.helpers.formatOrderResponse + serializeFinance)
```

Consumidores por panel (verificados):

- **Admin**:
  - `OrdersHistoryTable` en `app/admin/page.tsx:350`.
  - `useOrders` en `useCasosPanel`, `useDashboard`, `useDashboardStats`,
    `useEstadisticasPanel`, `useFinanzasPanel`, `RecentOrders`.
  - `useUpdateOrder`, `useDeleteOrder`, `useCreateOrderByAdmin` en
    `app/admin/page.tsx:10`.
- **Abogado**:
  - `OrdersHistoryTable` (dynamic, `ssr:false`) en `AbogadoPanel.tsx:48,379`.
  - `useOrdersByLawyer` en `useAbogadoPanel`, `useAgendaPanel`,
    `useFacturacionPanel`, `useClientesAbogadoPanel`, `AgendaPanel`.
  - `useOrders`/`useUpdateOrder` en `useMensajesPanel`, `useCasosAbogadoPanel`.
- **Cliente / `/mis-servicios`**: `useMisServicios.ts:16` usa `useOrdersByUser`
  y mapea con `mapOrderToServicio` + `sortServicesByDate` (`:61-62`);
  `ClientPanel.tsx` consume `ServicioCliente`, `getStatusColor`, `getStatusText`.
- **Checkout**: `checkoutStore.ts:12` importa `ORDER_KEYS`; `checkout.service.ts:124`
  hace `POST /api/orders`; `useOrderStatus`/`usePaymentStep` importan
  `ORDER_KEYS`.
- **Chat**: `useChatViewModel.ts:23` usa `useOrders`.
- **NavBar**: `useOrdersStore` (lectura del store Zustand) en `NavBar.tsx:45`.

### Refresco (TanStack + realtime)

`src/hooks/useRealtimeSubscription.ts` es el orquestador de refresco:

- **Broadcast** (canales `app-updates`, `global_{id}`, `admin-updates`): ante
  `order-updated` invalida `['Order']`, `PayoutHistory`, `PendingPayouts`,
  `FinanceSummaryDashboard` (`:38-43`); ante `payout-updated` invalida además
  `ORDER_KEYS.all` (`:72-79`).
- **postgres_changes** por rol (`:244-261`): admin escucha `Order` sin filtro;
  abogado con `lawyerId=eq.{id}`; cliente con `userId=eq.{id}`. Al cambiar
  `Order` hace `refetchQueries` activo + `invalidateQueries` de `ORDER_KEYS.all`
  y cascada a stats/finanzas (`:157-178`).
- El store Zustand **no** está suscrito a realtime: solo se actualiza con
  mutaciones locales (`addOrder` en checkout) y `reset` en logout.

---

## 7. Relación con endpoints `/api/orders*` y con finance

Endpoints:

- `src/app/api/orders/route.ts`: `GET`, `POST`, `PATCH`, `DELETE`
  (`dynamic='force-dynamic'`, `maxDuration=60`).
  - `GET` (`:15`): roles y scope; `hidePendingPayment`; búsqueda incl. `numericId`;
    `groupBy` de contadores para admin (`:103`); `formatOrderResponse` +
    `calculateOrderFinances` + `serializeFinance`.
  - `POST` (`:131`): crea orden en `PAGO_PENDIENTE`; precio canónico
    (`precio_pen` → USD con tasa, o `precio` USD → PEN), congela `totalPen` y
    `exchangeRateUsed`; `syncUserIdentity`; emite `order.created`.
  - `PATCH` (`:202`): actualiza `status`/`lawyerId`; control de permisos
    (admin/owner/abogado asignado); emite `order.status_changed` y `order.assigned`.
  - `DELETE` (`:264`): solo admin; **soft delete** (`activo:false`, `deletedAt`).
- `src/app/api/orders/[id]/route.ts`: `GET/PATCH/DELETE` por UUID o `numericId`.
  `PATCH` maneja asignación vs reasignación (crea `OrderAssignmentLog`), y emite
  `order.assigned`, `order.reassigned`, `order.status_changed`, `order.completed`
  (`:157-213`). `DELETE` también soft delete.
- `src/app/api/orders/admin-create/route.ts`: `POST` solo admin. Crea/busca
  usuario, resuelve servicio (ID o nombre → servicio placeholder
  `is_manual_case_placeholder:true`), auto-asigna si hay **un solo** abogado
  activo (`EN_PROGRESO`, si no `PENDIENTE`), calcula split y emite
  `order.created` (+`order.assigned`).
- `src/app/api/orders/orders.helpers.ts`: `getAuthUser`, `getCachedFinancialSettings`,
  `formatOrderResponse` (Prisma→DTO: `lawyerName` con `formatLawyerName`,
  `userName` con `capitalizeName`, `items` de `service`, `subtotal/tax/total` a
  `Number`, `paymentMethod`, `transactionId`, `commissionAmount`,
  `netProfitAmount`, `payoutStatus`).

Relación con finance:

- `calculateOrderFinances` (`src/services/finance.service.ts`) es el motor de
  split (comisión, gastos operativos, impuestos, platform fee, neto).
- `serializeFinance` (`src/lib/finance.ts:48`) serializa Decimal/Date.
- `getFinancialSettingsCached` (`src/lib/getFinancialSettings.ts`) provee los
  porcentajes.
- `DualPrice` (usado en la tabla) consume la tasa de cambio y
  `show_usd_prices`.

---

## 8. Estado (ordersStore) y claves de query

- **Zustand `ordersStore`**: estado cliente persistido (`virtuabogado-orders-v2`).
  Hoy usado para lectura en `NavBar` y `useClientesPanel`, y escritura puntual en
  `checkoutStore.addOrder` y `authStore.reset`. Coexiste con TanStack Query para
  los mismos datos → **posible desincronización** (ver §10).
- **TanStack `ORDER_KEYS`** (`useOrders.ts:8-15`):
  - `['Order']` (todo), `['Order','list',filters]`, `['Order','detail',id]`,
    `['Order','detail',id,'status']`.
  - `useOrdersHistory` añade `user.id` a la clave de lista.
- El realtime invalida `['Order']`/`ORDER_KEYS.all`, cubriendo ambas variantes.

---

## 9. Mapa de dependencias

**orders importa (salientes):**

- `@/lib/prisma`, `@/lib/finance` (`serializeFinance`, `formatPEN`),
  `@/lib/formatOrderId`, `@/lib/apiClient`, `@/lib/money`, `@/lib/getFinancialSettings`,
  `@/lib/exchangeRate`.
- `@/services/finance.service` (`calculateOrderFinances`),
  `@/services/identity.service` (`syncUserIdentity`).
- `@/shared/types/entities.types` (`OrderStatus`, `UserRole`, `Servicio`).
- `@/events/eventBus` (`emit`) — solo desde las rutas API, no desde la feature.
- Terceros: `zustand`, `zustand/middleware`, `@tanstack/react-query`, `lucide-react`,
  `react`.

**Es importado por (entrantes):**

- `src/app/admin/page.tsx`, `src/components/admin/*` (CasosPanel, Dashboard,
  RecentOrders, hooks de panel).
- `src/components/abogado/*` (AbogadoPanel, AgendaPanel, CasosAbogadoPanel y hooks).
- `src/features/clients/*`, `src/features/services/hooks/useMisServicios.ts`,
  `src/features/chat/hooks/useChatViewModel.ts`, `src/features/checkout/*`.
- `src/components/layout/NavBar.tsx`, `src/features/auth/store/authStore.ts`,
  `src/hooks/useRealtimeSubscription.ts`.
- `src/components/ui/DualPrice`, `src/lib/formatOrderId`, `src/lib/finance` son
  dependencias compartidas, no consumidores de orders.

---

## 10. Notas de refactor / deuda / duplicaciones

1. **Doble sistema de estado**: `ordersStore` (Zustand persistido) y TanStack
   Query manejan las mismas órdenes. El store ya está marcado como "legacy" en
   `admin/page.tsx` pero sigue alimentando `NavBar` y `useClientesPanel`. Unificar
   en TanStack y eliminar/reducir el store.
2. **Dos familias de filtros**: `OrdersFilters` (store/hooks) y `GetOrdersFilters`
   (Server Action). Nombres y formas divergentes; unificar.
3. **Enums duplicados/legados**: `PaymentMethod` local no refleja las pasarelas
   reales; `OrderStatus` está duplicado Prisma/TS (ver `00-mapa.md` §6).
4. **Server Action vs API REST**: `getOrdersHistory` reimplementa el filtrado de
   `GET /api/orders` con distinta proyección (incluye `lawyer`/`financials`).
   Ambos existen; evaluar converger a un único camino.
5. **`getStatusColor`/`getStatusText`/`mapOrderStatusToVisual` vs `statusConfig`**:
   dos sistemas paralelos de presentación de estado. Consolidar.
6. **`ordersService.updateStatus` (PUT /api/orders) no tiene handler** en
   `route.ts`; `getByUser` y `delete` son stubs. Código muerto/roto.
7. **Duplicación `getOrdersHistory` orders vs finance**: **no existe** un
   `src/features/finance/actions/getOrdersHistory.ts` (el directorio
   `src/features/finance/actions/` solo contiene `getFinancialSummary.ts`,
   `paymentActions.ts`, `payoutActions.ts`). Por tanto **no hay duplicación
   física hoy**; el enunciado asumía uno que no está presente. **A verificar** si
   existió y se movió a `src/features/orders/actions/getOrdersHistory.ts`.
8. **Importadores duales**: unos usan el barrel `@/features/orders` y otros rutas
   internas profundas. Normalizar según la convención del repo.

---

## 11. "Siguiente": `03-services.md`

El siguiente documento cubre el dominio de catálogo de servicios
(`src/features/services/`), incluyendo `useMisServicios`, que consume
`orders` mediante `mapOrderToServicio` (documentado aquí en §4.2 y §6).
