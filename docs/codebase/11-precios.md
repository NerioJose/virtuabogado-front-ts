# 11 — Sistema de Precios y Moneda

> Documento de **síntesis** del dinero en VirtuAbogado: reglas canónicas, campos,
> resolvers, tasa de cambio, realtime y trazabilidad. Complementa (no repite)
> `02-lib.md` §1, `03-checkout.md`, `03-services.md` y `03-financial-settings.md`;
> aquí se consolida la visión de **precios y conversión USD/PEN**. Toda
> afirmación proviene de leer el código real.

---

## 1. Propósito y reglas canónicas

El sistema maneja **dos monedas** simultáneas: USD (dólar, cobro de Zenobank/cripto)
y PEN (soles, cobro de MercadoPago/Yape). Para que ambas nunca diverjan se fijan
estas reglas:

| # | Regla | Evidencia |
|---|-------|-----------|
| R1 | **Un servicio tiene UN solo precio canónico**: o PEN (`precio_pen`) o USD (`precio`). | `prisma/schema.prisma:45-46`, `src/lib/servicePrice.ts:49-56` |
| R2 | Si hay `precio_pen`, el **PEN es exacto** y el USD se **deriva** de la tasa vigente. Si no, el USD es el exacto y el PEN se deriva. | `src/lib/servicePrice.ts:26-31`, `:49-56` |
| R3 | **Una sola tasa** se usa para derivar; nunca se aplica conversión dos veces (solo `usdToPen` **o** `penToUsd`, no el round-trip). | `src/lib/servicePrice.ts:39-56` |
| R4 | Todo display de precio debe pasar por `resolveServicePrice` / `resolveServiceBreakdown` (resolver único). | `src/lib/servicePrice.ts:38-56` |
| R5 | Aritmética **exacta** con `decimal.js` y `ROUND_HALF_UP` a 2 decimales (coherente con `DECIMAL(10,2)` de Prisma). | `src/lib/money.ts:8-10`, `:21-39` |
| R6 | El monto del cliente se **congela** al crear la orden (`totalPen` + `exchangeRateUsed`) y **nunca se cobra más de lo mostrado**. | `src/features/checkout/actions/processPaymentAction.ts:89-108` |
| R7 | El flag global `show_usd_prices` decide si el USD se muestra en toda la plataforma. | `prisma/schema.prisma:127`, `src/app/api/display-settings/route.ts:37` |

> **Concepto clave**: el "par canónico" `{ usd, pen }` se calcula **una sola vez**
> y cualquier escalado (base/impuesto/total) se hace sobre ese par, no re-derivando
> desde el otro lado. Es la defensa estructural contra el bug `.01` (§4).

---

## 2. Modelo de datos (campos)

### 2.1 `Service` — `prisma/schema.prisma:41-52`
| Campo | Tipo | Rol |
|-------|------|-----|
| `precio` | `Decimal @db.Decimal(10,2)` | Precio **canónico en USD** (obligatorio). |
| `precio_pen` | `Decimal? @db.Decimal(10,2)` | Precio **canónico en PEN** (opcional). Si `>0`, manda sobre `precio`. |
| `is_manual_case_placeholder` | `Boolean` | Marca servicios "basura" de caso manual; el catálogo admin los excluye (`src/app/api/services/route.ts:19`). |

> En la API el campo se expone **camelCase** `precioPen` (nunca `precio_pen` al
> cliente): `src/features/services/mappers/serviceJson.ts:26-35`. Esta forma
> unificada es la que evita la ventana "pen-less" (§4).

### 2.2 `Order` — `prisma/schema.prisma:54-98`
| Campo | Tipo | Rol |
|-------|------|-----|
| `total` | `Decimal @db.Decimal(10,2)` | Total **en USD** cobrado. |
| `totalPen` | `Decimal? @db.Decimal(10,2)` | Total **en PEN congelado** al crear la orden. |
| `exchangeRateUsed` | `Decimal? @db.Decimal(10,4)` | **Tasa congelada** para trazabilidad. |
| `commissionAmount`, `taxAmount`, `platformFeeAmount`, `netProfitAmount` | `Decimal?` | Desglose financiero derivado del USD. |

### 2.3 `FinancialSettings` (singleton) — `prisma/schema.prisma:110-123`
| Campo | Tipo | Rol |
|-------|------|-----|
| `usd_pen_fallback_rate` | `Decimal? @db.Decimal(10,4)` | **Tasa manual USD→PEN** (prioridad sobre la automática). |
| `tax_percentage`, `lawyer_commission_percentage`, `platform_fee_percentage`, … | `Decimal` | Desglose del checkout. |
| `id` fijo | `FINANCIAL_SETTINGS_ID` | Fila maestra única (no `findFirst`). |

### 2.4 `DisplaySettings` (singleton) — `prisma/schema.prisma:125-132`
| Campo | Tipo | Rol |
|-------|------|-----|
| `show_usd_prices` | `Boolean @default(true)` | Mostrar/ocultar montos USD globalmente. |
| `id` fijo | `DISPLAY_SETTINGS_ID` | Ver `src/lib/constants.ts:3`. |

---

## 3. Resolución de precio (resolvers) y el bug `.01`

### 3.1 Los resolvers — `src/lib/servicePrice.ts`
- `resolveServiceUsd(service, rate)` `:14-19`: deriva USD desde `precio_pen`
  (si existe) o devuelve `precio`.
- `resolveServicePen(service, rate)` `:26-31`: devuelve `precio_pen` exacto o
  deriva con `usdToPen`.
- **`resolveServicePrice(service, rate)` `:49-56` — RESOLVER ÚNICO** que devuelve
  el par `{ usd, pen }` coherente. Es la fuente de verdad para el display.
- `scalePrice(pair, factor)` `:62-67`: escala **ambas** monedas por el mismo factor
  redondeando las dos (`roundMoney`).
- **`resolveServiceBreakdown(service, rate, taxPercentage)` `:73-85`**: calcula
  `total = resolveServicePrice(...)`, y de ese MISMO par derivan `base` (factor
  `1/(1+tax)`), `tax` y `total`. Las tres líneas comparten origen → **imposible
  que diverjan**.

### 3.2 El bug `.01` — causa y solución
Síntoma observado: al mostrar o alternar moneda, un servicio de S/ 60.00 aparecía
como **S/ 60.01** (`USD→60.01→60.00`). Historial de commits:

| Commit | Fecha | Qué corrigió |
|--------|-------|--------------|
| `3b6c8e3` | 2026-09-24 | Introduce precios S/ (grande) + USD (chico) y tasa configurable. |
| `a0d3425` | 2026-09-24 | Precio canónico en S/ (`precio_pen`) con `decimal.js` y conversión mono-tasa. |
| `3a98756` | — | Redondeo a 2 decimales en onChange, API y `serializeFinance`. |
| `ea83233` | — | Input de precio controlado (value+onChange) en vez de uncontrolled. |
| `5a613d3` | 2026-09-25 | **Fuente única de verdad para S/ — sin artefactos `.01`.** `ServiceSummary` derivaba `usdToPen(17.65)=S/60.01` en la línea Base; ahora las tres líneas leen el MISMO par canónico escalado. `/api/services` pasa a `Cache-Control: no-store`. |
| `6cdf598` | — | Toggle S/↔US$ sin drift 60.01: restaura el PEN canónico exacto (`useServiciosPanel`). |
| `8031771` | — | Quita `persist` del catálogo (`localStorage` servía snapshots sin `precioPen`), persiste `precioPen` en el checkout y backfill defensivo. |
| `e2a0df2` | — | Prefetch SSR con el MISMO mapper que `/api/services`: fin del `.01` en el primer paint. |

**Causa raíz (dos fuentes sumadas)**:
1. **Doble derivación**: al no guardar el PEN canónico, cada línea del desglose
   derivaba desde el USD con redondeos distintos (`5a613d3`).
2. **Ventana pen-less**: el prefetch SSR mapeaba solo `precio` (Number) y dejaba
   `precio_pen` crudo sin `precioPen`; el primer render de `DualPrice` derivaba
   `usdToPen(17.65, 3.4) = 60.01` hasta que el refetch del API corregía (`e2a0df2`).
   Además, snapshots persistidos en `localStorage` reintroducían filas sin PEN
   (`8031771`).

**Solución estructural**:
- Un único resolver (`resolveServicePrice`/`Breakdown`) que calcula el par una vez
  y escala desde él (`src/lib/servicePrice.ts:38-85`).
- Mapper único `toServiceJson`/`normalizeService` que garantiza `precioPen` numérico
  o `null` en TODA fuente (API, prefetch SSR, realtime) (`src/features/services/mappers/serviceJson.ts:26-57`).
- `DualPrice` deriva el USD desde el PEN canónico con la MISMA tasa vigente
  (`src/components/ui/DualPrice.tsx:30-32`).
- Catálogo sin `persist` y `Cache-Control: no-store` (`src/app/api/services/route.ts:24-26`).

---

## 4. Tasa de cambio (manual/automática) y realtime

### 4.1 Precedencia — `src/lib/exchangeRate.ts`
`getUsdPenRate()` `:68-90` aplica:
1. **Tasa manual (prioridad)**: `FinancialSettings.usd_pen_fallback_rate` leída
   **fresca** de la BD para reflejar cambios del admin al instante
   (`getManualFallbackRate` `:45-59`, siempre la fila maestra
   `FINANCIAL_SETTINGS_ID`, con `findFirst` solo como fallback defensivo).
2. **Tasa automática**: Frankfurter (`api.frankfurter.app/latest?from=USD&to=PEN`,
   sin API key), cacheada **en memoria 1h** (`TTL_MS` `:17`, `fetchUsdPenRate` `:24-38`).
3. Si ninguna existe → **lanza error** para no cobrar con monto incorrecto (`:83-85`).

`convertUsdToPen()` `:96-99` (redondeo a 2) y `clearExchangeRateCache()` `:101-104`
(invalida el caché en memoria tras un PATCH del admin).

> ⚠️ **A verificar**: `convertUsdToPen` redondea con `Math.round(...*100)/100`
> (`:98`), no con `decimal.js` como el resto. Diferencia de implementación, no
> necesariamente bug (el redondeo de `decimal.js` es `ROUND_HALF_UP`; `Math.round`
> difiere en .5 negativos), pero conviene unificar.

### 4.2 Endpoint público — `src/app/api/exchange-rate/route.ts`
`GET` `:11-24` devuelve `{ rate, currency:'PEN', updatedAt }`; si falla responde
`{ rate: null }` con **HTTP 200** (nunca rompe el cliente). `Cache-Control: no-store`.

### 4.3 Realtime de la tasa
- **Escritura admin**: `PATCH /api/settings/financial` `src/app/api/settings/financial/route.ts:128` persiste
  `usd_pen_fallback_rate`, y tras invalidar cachés (`:172-176`) emite
  `broadcastExchangeRateUpdate({ rate, timestamp })` (`:198-205`).
- **Broadcast**: `src/lib/broadcast.ts:253-266` envía al canal `app-updates`,
  evento `exchange-rate-updated`.
- **Cliente**: `src/hooks/useRealtimeSubscription.ts:50-61`:
  - Si `rate` válida → `queryClient.setQueryData(['exchange-rate'], rate)` (aplica al instante).
  - Si `null` → `invalidateQueries(['exchange-rate'])` (vuelve a consultar la automática).
  - Invalida además `FINANCIAL_SETTINGS_KEYS.all`.
- **Hook de lectura**: `useExchangeRate` `src/features/finance/hooks/useExchangeRate.ts:20-30`,
  key `['exchange-rate']`, `staleTime: 30s` (el preview del checkout debe ver tasa fresca).
- **Aplicación inmediata local (admin)**: `useUpdateFinancialSettings`
  `src/features/financial-settings/hooks/useFinancialSettings.ts:63-71` escribe la
  nueva tasa en `['exchange-rate']` al recibir la respuesta del PATCH (verdad del servidor).

> `useFinancialSettings` y `useServiciosPanel` (admin, `src/components/admin/hooks/useServiciosPanel.ts:11`) usan
> `lib/money` para convertir al alternar la moneda de entrada.

---

## 5. Mostrar/ocultar USD (`show_usd_prices`)

- **Persistencia**: `DisplaySettings.show_usd_prices` (`prisma/schema.prisma:127`).
- **API** `src/app/api/display-settings/route.ts`:
  - `GET` `:20-47` público (anon incluido), `no-store`; default `true` si no hay fila (`:37`).
  - `PATCH` `:55-119` solo ADMIN (valida rol en BD, `:65-72`); hace upsert y emite
    `sendBroadcast('app-updates','display-settings-updated', { showUsd })` (`:110-113`)
    — no depende del WAL de Supabase, que no siempre dispara para escrituras Prisma.
- **Realtime**: `useRealtimeSubscription.ts:63-70` aplica `setQueryData(['display-settings'], { showUsd })`.
- **Hook** `useDisplaySettings` `src/features/finance/hooks/useDisplaySettings.ts:30-43`:
  - Devuelve `showUsd: data?.showUsd ?? false`. El default mientras carga es
    **`false` a propósito**: evita el "flash US$ aparece y luego se oculta"
    (commit `4b5f0ee`).
  - `useUpdateDisplaySettings` `:45-76`: mutación optimista con rollback en error y
    `invalidateQueries` en `onSettled` para converger SIEMPRE al valor persistido.
- **Consumo**: `DualPrice` solo pinta la línea USD si `showUsd` es true
  (`src/components/ui/DualPrice.tsx:38-39`, `:49-51`, `:56-58`).

---

## 6. Trazabilidad (`exchangeRateUsed`) y validación de monto al pagar

`processPaymentAction` `src/features/checkout/actions/processPaymentAction.ts`:
1. **Zero-trust**: valida servicio activo (`:38-44`), método de pago activo (`:47-53`)
   y lee la configuración financiera de la fila maestra (`:57-59`).
2. **PEN canónico**: `servicePen` = `precio_pen` si `>0` (`:63-66`).
3. **Congelación de la tasa** (`:93-103`):
   - `freshRate = await getUsdPenRate()`.
   - Si el cliente envió `rateSaw` (lo que vio en el checkout, tomado de
     `queryClient.getQueryData(['exchange-rate'])` en `src/features/checkout/hooks/usePaymentStep.ts:111`),
     se valida contra `freshRate` con **tolerancia ±25 %** anti-manipulación; si es
     válida, se congela **`Math.min(rateSaw, freshRate)`** → **jamás se cobra más de
     lo mostrado** (commit `afc5675`).
4. **Monto único coherente** (`:104-107`):
   - Si hay `servicePen`: `totalUsd = penToUsd(servicePen, exchangeRateUsed)` y
     `totalPen = servicePen` (exacto).
   - Si no: `totalUsd = roundMoney(precio)` y `totalPen = usdToPen(totalUsd, exchangeRateUsed)`.
5. **Desglose** comisión/impuestos/platform fee en USD (`:109-111`, con defaults 70/15/5).
6. **Persistencia** (`:114-128`): guarda `total`, `totalPen`, `exchangeRateUsed`
   y los imports financieros. La orden nace en `PAGO_PENDIENTE` (flujo pesimista).

`exchangeRateUsed` (almacenado a 4 decimales) es la **huella de auditoría**: permite
reproducir exactamente el monto PEN que vio y pagó el cliente, incluso si la tasa
cambia después. El admin lo muestra en el historial de órdenes (commit `99f6ba2`).

---

## 7. Detalle por archivo

| Archivo | Propósito | Puntos clave |
|---------|-----------|--------------|
| `src/lib/money.ts` | Aritmética exacta `decimal.js` (client-safe). | `ROUND_HALF_UP` (`:10`); `usdToPen :21`, `penToUsd :30`, `roundMoney :38`; guardas de tasa. |
| `src/lib/servicePrice.ts` | Resolver único de precio USD/PEN. | `resolveServicePrice :49`, `scalePrice :62`, `resolveServiceBreakdown :73`. |
| `src/lib/finance.ts` | Formato y serialización. | `formatUSD :6`, `formatPEN :20`; re-exporta `usdToPen`/`penToUsd` (`:34`,`:40`); `serializeFinance :48` (Decimal→number, Date→ISO; resuelve error RSC de Next 15). |
| `src/lib/exchangeRate.ts` | Tasa USD→PEN. | Manual prioritaria (`:68-73`), Frankfurter cacheado 1h, error controlado (`:83-85`). |
| `src/lib/getFinancialSettings.ts` | Config financiera cacheada 30s. | `getFinancialSettingsCached :17`; NO incluye la tasa (esa va por `exchangeRate`). |
| `src/lib/constants.ts` | IDs singleton. | `FINANCIAL_SETTINGS_ID :1`, `DISPLAY_SETTINGS_ID :3`. |
| `src/features/finance/hooks/useExchangeRate.ts` | Tasa para display. | Query `['exchange-rate']`, `staleTime 30s`. |
| `src/features/finance/hooks/useDisplaySettings.ts` | Flag `showUsd`. | Default `false` anti-flash; mutación optimista con rollback. |
| `src/components/ui/DualPrice.tsx` | UI de precio dual. | S/ grande + USD chico; deriva USD del PEN canónico con la misma tasa (`:30-32`). |
| `src/features/services/mappers/serviceJson.ts` | Forma única del `Service` al cliente. | `toServiceJson :26`, `normalizeService :43`; garantiza `precioPen` numérico o null. |
| `src/app/api/services/route.ts` | CRUD catálogo. | `toServiceJson` en GET/POST; `no-store` (`:24-25`); broadcast síncrono. |
| `src/app/api/services/[id]/route.ts` | Detalle/edición. | Mapper local `precioPen: service.precio_pen ?? null` (`:8-11`); PATCH parcial dinámico (`:55-61`). |
| `src/app/api/settings/financial/route.ts` | Config financiera. | `PATCH` persiste tasa y emite broadcast (`:198-205`); invalida cachés. |
| `src/app/api/display-settings/route.ts` | Flag de visualización. | GET público / PATCH admin; broadcast `display-settings-updated`. |
| `src/app/api/exchange-rate/route.ts` | Tasa pública. | `getUsdPenRate()`; nunca 5xx (devuelve `rate:null`). |
| `src/features/checkout/actions/processPaymentAction.ts` | Creación de orden. | Congela `total`, `totalPen`, `exchangeRateUsed` (`:89-128`). |

> A verificar: `/api/services/[id]` define su **propio** mapper local
> (`src/app/api/services/[id]/route.ts:8-11`) en vez de reutilizar `toServiceJson`;
> hoy coinciden, pero es un punto de divergencia si cambia la forma.

---

## 8. Mapa de dependencias

### Importa (salientes)
```
money.ts        → decimal.js
finance.ts      → money.ts
servicePrice.ts → money.ts
exchangeRate.ts → prisma, constants
serviceJson.ts  → finance.ts, services/types
DualPrice.tsx   → finance, money, useExchangeRate, useDisplaySettings
processPaymentAction → prisma, exchangeRate, constants, money, zenobank, identity
/api/services   → prisma, serviceJson, broadcast, eventBus, cache
/api/settings/financial → prisma, constants, cache, exchangeRate, broadcast
/api/display-settings   → prisma, constants, broadcast
```

### Es importado por (entrantes)
- `money.ts` ← `finance`, `servicePrice`, `DualPrice`, `useServiciosPanel`,
  `processPaymentAction`, `/api/orders`, `ServiceSummary`.
- `servicePrice.ts` ← `ServiceSummary` (`:8`), `CheckoutModal` (`:20`) **[a verificar: pocos consumidores]**.
- `finance.ts` ← 18 archivos (formateo/serialización transversal).
- `useExchangeRate` ← `DualPrice`, `ServiceSummary`, `CheckoutModal`,
  `useServiciosPanel`.
- `useDisplaySettings` ← `DualPrice`.
- `exchangeRate.ts` ← `/api/exchange-rate`, `/api/settings/financial`,
  `processPaymentAction`.
- `serviceJson.ts` ← `/api/services`, prefetch SSR (`/`, `/servicios`),
  `useServices`/`useAdminServices`.

**Cadena crítica del display**:
`Service (DB) → toServiceJson → useServices/store → DualPrice → resolveServicePrice`
(en checkout: `ServiceSummary → resolveServiceBreakdown`).

**Cadena crítica del cobro**:
`usePaymentStep (rateSaw) → processPaymentAction → getUsdPenRate → money → Order(total,totalPen,exchangeRateUsed)`.

---

## 9. Notas de refactor / deuda / riesgos

1. **Dos implementaciones de redondeo**: `lib/money` usa `decimal.js`; 
   `exchangeRate.convertUsdToPen` usa `Math.round` (`src/lib/exchangeRate.ts:98`).
   Unificar en `money.ts`. *(A verificar impacto real.)*
2. **Mapper duplicado**: `/api/services/[id]` no usa `toServiceJson`
   (`src/app/api/services/[id]/route.ts:8-11`). Riesgo de divergencia de forma.
3. **`FinancialSettingsData` no expone la tasa**: `getFinancialSettings.ts:8-15`
   no incluye `usd_pen_fallback_rate`; la tasa se obtiene por otro camino. Dos
   fuentes de settings financieros (`getFinancialSettingsCached` cache 30s vs.
   `/api/settings/financial` cache 30s propia) — consolidar.
4. **Acceso defensivo `(prisma as any)`**: `financial/route.ts:42`,
   `exchangeRate.ts:47`, `display-settings/route.ts:9` evaden el tipado Prisma para
   resolver el nombre del modelo. Deuda de tipos; los nombres de modelo Prisma
   deberían ser estables (`financialSettings`, `displaySettings`).
5. **Caché en memoria de la tasa automática** (`exchangeRate.ts:19-20`): en
   serverless cada instancia tiene su propio caché; no hay invalidación distribuida
   salvo `clearExchangeRateCache()` en el PATCH del admin (misma instancia). *(A verificar.)*
6. **Tolerancia ±25 % de `rateSaw`** (`processPaymentAction.ts:102`): decisión de
   producto anti-manipulación. Documentar el número mágico o extraerlo a constante.
7. **`showUsd` default `false` mientras carga**: comportamiento intencional
   anti-flash (`4b5f0ee`); no "corregir" a `true` sin entender el trade-off.
8. **Bug `.01` cerrado pero frágil**: depende de que TODA fuente pase por el mapper
   y que el store no se persista. Si se reintroduce `persist` en
   `servicesStore` o un prefetch con otro mapper, puede reaparecer. Añadir test de
   regresión sobre `resolveServiceBreakdown` (60.00 + tasa 3.4 ⇒ PEN exacto 60.00).
9. **`DualPrice` con `precision` configurable** (`:25`) pero casi siempre 2; el
   cripto fuerza USD con `toFixed(2)` en `ServiceSummary.tsx:44` (no usa `formatUSD`).

---

**Siguiente**: `12-DEPENDENCIAS.md` (matriz importa / es importado por, ciclos, huérfanos).
