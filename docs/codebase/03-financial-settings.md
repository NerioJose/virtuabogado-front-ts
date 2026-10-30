# 03h — Feature: financial-settings

> Documenta la feature **`src/features/financial-settings/`** (MVVM) y su panel
> admin. Base previa: `00-mapa.md`, `01-fundacionales.md`, `02-lib.md`.
> Todo dato aquí proviene de leer el código real; cada afirmación cita `ruta:línea`.

---

## 1. Propósito

Gestiona la **configuración financiera global** (singleton `FinancialSettings`) y
su edición desde el panel admin, además de exponer esos valores al resto de la app
(tasa USD→PEN, porcentajes de reparto, WhatsApp de contacto).

Concretamente la feature cubre:

- Lectura/escritura de `FinancialSettings` por API (`GET`/`PATCH /api/settings/financial`).
- Cálculo de **preview** de reparto de un monto simulado (abogados, operativos,
  impuestos, plataforma, neto).
- **Validación cliente** de los porcentajes y el teléfono antes de guardar.
- Propagación **realtime** de la tasa manual a todos los clientes (broadcast).
- Consumo de la config desde otros dominios (contacto, checkout, mis-servicios).

La feature **no** posee `store/` Zustand ni `components/` propios: solo hooks,
servicio y tipos. La UI vive fuera, en `src/components/admin/ConfiguracionPanel.tsx`.

> **`DisplaySettings` (`show_usd_prices`) NO es de esta feature**: vive en
> `features/finance/hooks/useDisplaySettings.ts` y su API
> `/api/display-settings`. El panel admin mezcla ambos (ver §7).

---

## 2. Inventario

| Archivo | Exports | Importadores |
|---|---|---|
| `hooks/useFinancialSettings.ts` | `FINANCIAL_SETTINGS_KEYS`, `useFinancialSettings`, `useUpdateFinancialSettings` | `useConfiguracionPanel.ts:2`, `useRealtimeSubscription.ts:10`, `useServiciosClientPage.ts:8`, `useMisServicios.ts:8`, `ServiceSummary.tsx:6`, `FormularioContacto.tsx:5`, `InformacionContacto.tsx:5` |
| `hooks/useConfiguracionPanel.ts` | `useConfiguracionPanel` | `ConfiguracionPanel.tsx:21` |
| `services/financial-settings.service.ts` | `financialSettingsService` (instancia singleton) | `useFinancialSettings.ts:4`, `useConfiguracionPanel.ts:3` |
| `types/financial-settings.types.ts` | `FinancialSettings`, `UpdateFinancialSettingsRequest`, `FinancialCalculation`, `ValidationResult` | `financial-settings.service.ts:2-6`, `useFinancialSettings.ts:5` |
| `index.ts` | **NO EXISTE** | — (ver §9, deuda) |

**Archivos externos que completan la feature** (leídos y documentados aquí):

| Archivo | Rol |
|---|---|
| `src/app/api/settings/financial/route.ts` | Endpoint `GET`/`PATCH` de la config |
| `src/components/admin/ConfiguracionPanel.tsx` | UI del panel (View) |
| `src/components/admin/hooks/useAdminConfiguracion.ts` | Estado de pestañas del panel |
| `src/lib/constants.ts` | IDs singleton |
| `src/lib/getFinancialSettings.ts` | Lectura server cacheada |
| `src/lib/exchangeRate.ts` | Resolución de tasa (manual tiene prioridad) |

---

## 3. Tipos y servicio

### 3.1 `types/financial-settings.types.ts`

- `FinancialSettings` (`:5-16`): forma **camelCase** que devuelve la API.
  Campos: `id`, `lawyerCommissionPercentage`, `operationalCostsPercentage`,
  `taxPercentage`, `platformFeePercentage`, `simulationBase`,
  `usdPenFallbackRate?`, `whatsappPhone?`, `updatedAt`, `updatedBy?`.
- `UpdateFinancialSettingsRequest` (`:18-26`): mismo set de campos salvo `id`,
  `updatedAt`, `updatedBy`; todos opcionales.
- `FinancialCalculation` (`:28-34`): contrato de preview, pero **el servicio
  devuelve un objeto más rico** (ver §3.2) — este tipo **no se usa** (código muerto).
- `ValidationResult` (`:36-40`): `{ isValid, errors[], warnings[] }`.

> **Desalineación de nombres**: la BD/Prisma usa **snake_case**
> (`lawyer_commission_percentage`, `usd_pen_fallback_rate`, `tax_percentage`) y
> la traducción a camelCase ocurre **solo** en la API (`route.ts:72-83`, `181-194`).
> El resto de la app trabaja en camelCase.

### 3.2 `services/financial-settings.service.ts`

Clase `FinancialSettingsService` (`:8`) instanciada y exportada como
`financialSettingsService` (`:121`). `BASE_URL = '/api/settings/financial'` (`:9`).

| Método | Línea | Comportamiento |
|---|---|---|
| `get()` | `:14-17` | `apiClient.get<FinancialSettings>(BASE_URL)` |
| `update(data)` | `:22-25` | `apiClient.patch<FinancialSettings>(BASE_URL, data)` |
| `validateSettings(settings)` | `:30-87` | Validación **pura cliente** (no toca red) |
| `calculatePreview(...)` | `:92-118` | Cálculo puro de reparto sobre un monto base |

`validateSettings` (`:30-87`):
- Rangos `0-100` por cada porcentaje; error si se sale.
- `lawyerCommission < 50` → *warning* (motivación).
- `whatsappPhone` (si presente) debe ser **solo dígitos** (`/^\d+$/`, `:63`).
- Suma de los 4 porcentajes (con defaults 70/10/15/5, `:68-71`) **> 100 → error**
  (`:74-76`); entre `>85` y `<=95` → *warning* de margen bajo (`:78-80`).
- Devuelve `{ isValid: errors.length === 0, errors, warnings }` (`:82-86`).

`calculatePreview` (`:92-118`) devuelve
`{ totalRevenue, lawyerPayments, operationalCosts, taxAmount, platformFee,
totalDeductions, netProfit, profitMargin }` — **más campos que `FinancialCalculation`**.
El `profitMargin` vale `0` si `totalRevenue === 0` (`:106`).

**Imports**: `@/lib/apiClient`, `../types/financial-settings.types`.
**Efectos secundarios**: ninguno al importar; las llamadas de red las hacen `get`/`update`.

---

## 4. Detalle por archivo

### 4.1 `hooks/useFinancialSettings.ts`
`'use client'` (`:1`). TanStack Query.

- `FINANCIAL_SETTINGS_KEYS` (`:7-10`): `{ all: ['FinancialSettings'], detail: () =>
  ['FinancialSettings','detail'] }`. **Clave de caché canónica** reutilizada por
  el listener realtime.
- `useFinancialSettings(options?)` (`:15-23`): `useQuery` con `queryFn:
  financialSettingsService.get()`, `staleTime 10 min`, `gcTime 30 min`; acepta
  `options` (usado por consumidores para pasar `enabled`).
- `useUpdateFinancialSettings()` (`:28-79`): `useMutation` con
  - `onMutate` (`:34-52`): cancela queries, snapshot y **actualización optimista**
    (merge + `updatedAt`).
  - `onError` (`:53-62`): **rollback** al snapshot.
  - `onSuccess` (`:63-78`): escribe la **verdad del servidor** en caché (`:65`);
    si `usdPenFallbackRate > 0` setea `['exchange-rate']` al instante (`:68-71`);
    `invalidateQueries` de la clave detail (`:74-77`).

**Imports**: `@tanstack/react-query`, `../services/...`, `../types/...`.
**Usado por**: `useConfiguracionPanel`, `useRealtimeSubscription`,
`useServiciosClientPage`, `useMisServicios`, `ServiceSummary`, `FormularioContacto`,
`InformacionContacto`.

### 4.2 `hooks/useConfiguracionPanel.ts`
ViewModel del panel. Sin `'use client'` explícito, pero consume hooks de cliente
(se importa desde un componente `'use client'`).

- Estado local (`:9-17`): `simulationBase`, `lawyerCommission`,
  `operationalCosts`, `taxPercentage`, `platformFee`, `whatsappPhone` (string),
  `usdPenFallbackRate` (string), `isSaving`, `saveMessage`.
- `useEffect` (`:19-30`): hidrata el estado local desde `financialSettings` (cast
  `as any`); la tasa se deja `''` si `null`/`<= 0` (`:27-28`), para que el input
  vacío signifique "usar tasa automática".
- `validation` (`:32-41`): memo → `financialSettingsService.validateSettings(...)`.
- `previewData` (`:43-51`): memo → `calculatePreview(simulationBase, ...)`.
- `handleSave` (`:53-76`): si `!validation.isValid` **retorna sin guardar**
  (`:54`); llama `updateSettings.mutateAsync(...)`; en éxito setea mensaje y lo
  limpia a los 3 s (`:68-69`); en error `console.error` + mensaje (`:70-72`).
  La tasa se envía `null` si el input está vacío (`:66`).
- Devuelve todo el estado, `validation`, `previewData` y `handleSave` (`:78-96`).

**Imports**: `react`, `./useFinancialSettings`, `../services/...`.

### 4.3 `components/admin/ConfiguracionPanel.tsx`
`'use client'` (`:1`). View.

- `FinancialSettingsSection` (función interna, `:28-272`): usa
  `useConfiguracionPanel()` (`:43`), `useDisplaySettings()` / `useUpdateDisplaySettings()`
  (`:44-45`). Muestra inputs numéricos de los 4 porcentajes (`:82-129`), WhatsApp
  (`:138-144`, filtra `\D`), **tasa referencial USD→PEN** (`:156-164`), y el
  **switch "Mostrar montos en US$"** ligado a `DisplaySettings` (`:180-196`).
  - Botón Guardar deshabilitado si `!validation.isValid || isSaving` (`:206-211`).
  - Errores de validación visibles (`:200-204`); warnings **no se renderizan**
    (deuda menor).
  - Panel derecho = `previewData` (simulación de ganancias) (`:214-267`).
- `ConfiguracionPanel` (default, `:274-343`): usa `useAdminConfiguracion()` para
  las 4 pestañas (`servicios`, `financiero`, `perfil`, `notificaciones`); renderiza
  `<ServiciosPanel/>`, `<FinancialSettingsSection/>`, etc.

**Import muerto**: `import { useAdminServices } from '@/features/services/hooks/useServices';`
en `ConfiguracionPanel.tsx:19` **no se usa** (solo aparece en esa línea). También
`FiRefreshCw` (`:6`) y `FiAlertTriangle` (`:7`) se importan y no se usan.
**A verificar**: confirmar con `tsc --noEmit`/ESLint (el build ignora errores; ver
`01-fundacionales.md §1.1`).

### 4.4 `components/admin/hooks/useAdminConfiguracion.ts`
Hook trivial de pestañas (`:5-16`): `activeTab` (`useState<TabType>('servicios')`)
y `handleTabChange`. No toca dinero. Comparte el tipo `TabType`
(`'perfil' | 'financiero' | 'servicios' | 'notificaciones'`, `:3`).

---

## 5. Flujo del panel de configuración (lectura / edición / guardado + realtime)

**Lectura (mount):**
1. `ConfiguracionPanel` → `FinancialSettingsSection` → `useConfiguracionPanel()`.
2. `useFinancialSettings()` dispara `GET /api/settings/financial` vía `apiClient`.
3. La API resuelve admin (`route.ts:22-29`) y:
   - **admin**: lee siempre fresco (`no-store`) y devuelve todos los campos
     (`route.ts:72-83`, `89-91`).
   - **no admin**: usa caché 30 s (`financial-settings-ui`) y **oculta** los
     porcentajes devolviendo `0` (comisión, operativos, plataforma, simulación) y
     `usdPenFallbackRate: null` (`route.ts:74-79`, `33-40`, `85-87`).
     **`taxPercentage` y `whatsappPhone` sí se exponen al público** (`:76`, `:80`).
4. El `useEffect` del hook hidrata el estado local.

**Edición:** inputs controlados en `FinancialSettingsSection`; `validation` y
`previewData` se recalculan en cada cambio (memos).

**Guardado:** `handleSave` → `useUpdateFinancialSettings().mutateAsync`
(optimista + rollback). `PATCH /api/settings/financial`:
- Verifica **sesión** (`route.ts:102-113`); sin usuario → `401`.
- ⚠️ **No verifica rol ADMIN** (a diferencia de `/api/display-settings`, que sí lo
  hace). Ver §9.
- Construye `updates` snake_case + `updated_by`/`updated_at` (`:118-129`).
- **UPSERT** Prisma (`model.upsert`, `:139-156`) o fallback `$executeRaw`
  (`:157-170`).
- Invalida caché: `revalidatePath('/')`, `clearCache('financial-settings-ui')`,
  `clearCache('financial-settings')`, `clearExchangeRateCache()` (`:172-176`).
- Relee la fila persistida y devuelve la **verdad del servidor** (`:180-194`).
- **Broadcast**: `broadcastExchangeRateUpdate({ rate, timestamp })` en el canal
  `app-updates`, evento `exchange-rate-updated` (`:196-205`), envuelto en
  try/catch "no crítico".

**Realtime en cliente:**
- `onSuccess` del mutation setea `['exchange-rate']` local (`useFinancialSettings.ts:68-71`).
- El listener global `useRealtimeSubscription.ts:50-61` recibe
  `exchange-rate-updated` y, si `rate > 0`, hace `setQueryData(['exchange-rate'], rate)`;
  si no, invalida la tasa y **siempre** invalida `FINANCIAL_SETTINGS_KEYS.all` (`:60`).
- Además hay WAL `postgres_changes`: la tabla `FinancialSettings` solo se
  suscribe para **ADMIN** (`useRealtimeSubscription.ts:245`), y al cambio invalida
  `FINANCIAL_SETTINGS_KEYS.all`, `DashboardStats` y `['exchange-rate']` (`:183-190`).

**Switch `show_usd_prices` (DisplaySettings):** el botón (`ConfiguracionPanel.tsx:180-196`)
llama `updateDisplaySettings.mutate(!showUsd)` → `PATCH /api/display-settings`
(verifica ADMIN) → `sendBroadcast('app-updates','display-settings-updated',{showUsd})`
(`api/display-settings/route.ts:110-113`). El listener setea
`['display-settings']` al instante (`useRealtimeSubscription.ts:63-70`).

---

## 6. Relación con finance/display settings y endpoints

| Recurso | API | Feature/hook | Almacenamiento |
|---|---|---|---|
| `FinancialSettings` (singleton `…0001`) | `/api/settings/financial` | `features/financial-settings` | tabla `FinancialSettings` |
| `DisplaySettings` (singleton `…0002`) | `/api/display-settings` | `features/finance/hooks/useDisplaySettings.ts` | tabla `DisplaySettings` |

- IDs: `FINANCIAL_SETTINGS_ID` y `DISPLAY_SETTINGS_ID` en `lib/constants.ts:1,3`.
- La **tasa manual** (`usd_pen_fallback_rate`) es la fuente prioritaria de
  `getUsdPenRate()` (`lib/exchangeRate.ts:68-73`): 1) manual fresca, 2) Frankfurter
  (`:81-89`), 3) error si ninguna (`:84`).
- `getFinancialSettingsCached()` (`lib/getFinancialSettings.ts:17-41`) lee el
  singleton vía `prisma.financialSettings` (¡sin el hack `as any`!) y cachea 30 s.
  **No incluye** `usd_pen_fallback_rate` ni los campos `simulation_base`/`whatsappPhone`
  en su normalización (`:25-37`, aunque el tipo los declare opcionales `:13-14`).
- La ruta `/api/settings/financial` usa acceso **defensivo** a Prisma con cast
  `(prisma as any)` y triple fallback de nombre de modelo, más `$queryRaw` de
  respaldo (`route.ts:42-55`, `131-134`). Igual patrón en `display-settings`.
- `PATCH` de la tasa limpia la caché de `exchangeRate` (memoria, 1 h) para que el
  próximo `getUsdPenRate()` lea la manual nueva (`:176` + `exchangeRate.ts:101-104`).
- Consumo indirecto: `processPaymentAction.ts:10,58` lee `FINANCIAL_SETTINGS_ID`
  para el cobro (ver `03-checkout.md`); `getFinancialSettingsCached` es usado por
  `finance`, `orders` y APIs (`01-fundacionales.md §3.4`).

---

## 7. Mapa de dependencias

```
useConfiguracionPanel ──► useFinancialSettings (hooks) ──► financialSettingsService ──► apiClient
        │                        │                                   │
        │                        └──► types/                         └──► /api/settings/financial
        └──► financialSettingsService.validateSettings/calculatePreview

ConfiguracionPanel ──► useConfiguracionPanel + useDisplaySettings(finance) + useAdminConfiguracion
useRealtimeSubscription ──► FINANCIAL_SETTINGS_KEYS
ServiciosClientPage / MisServicios / ServiceSummary / FormularioContacto / InformacionContacto
        └──► useFinancialSettings

/api/settings/financial ──► lib/prisma, lib/constants (FINANCIAL_SETTINGS_ID),
                            lib/cache, lib/exchangeRate (clear), lib/broadcast
lib/getFinancialSettings ──► lib/prisma, lib/constants, lib/cache
lib/exchangeRate ──► lib/prisma, lib/constants
```

**Importa (saliente):** `@tanstack/react-query`, `@/lib/apiClient`,
`@/lib/constants`, `@/lib/prisma`, `@/lib/cache`, `@/lib/exchangeRate`,
`@/lib/broadcast`, `@/utils/supabase/server`, `react`, `react-icons/fi`, `sonner`.

**Es importado por (entrante):** panel admin (`ConfiguracionPanel`), hooks de
servicios/mis-servicios, componentes de contacto y checkout, y el listener
realtime global.

**Consumidores de `useFinancialSettings` (7):** `useConfiguracionPanel.ts:2`,
`useRealtimeSubscription.ts:10`, `useServiciosClientPage.ts:8`, `useMisServicios.ts:8`,
`ServiceSummary.tsx:6`, `FormularioContacto.tsx:5`, `InformacionContacto.tsx:5`.
> Nota: `useServiciosClientPage`/`useMisServicios` solo leen `isLoading` (para
> *gate* de carga); `ServiceSummary` usa `taxPercentage` (¡que la API sí expone a
> no-admin!); `FormularioContacto`/`InformacionContacto` usan `whatsappPhone`.

**`FINANCIAL_SETTINGS_ID` (6 fuera de la feature):** `lib/getFinancialSettings.ts:2`,
`lib/exchangeRate.ts:15`, `api/settings/financial/route.ts:5`,
`checkout/actions/processPaymentAction.ts:10`, `scripts/seed_final.ts:5`,
`scripts/test-import.ts:1`.
**`DISPLAY_SETTINGS_ID` (2):** `lib/constants.ts:3`, `api/display-settings/route.ts:4`.

---

## 8. Notas de refactor / deuda / riesgos

1. **Sin barrel `index.ts`**: la feature rompe la convención de `features/*/index.ts`
   (`00-mapa.md §7`). Todos los consumidores importan rutas internas profundas
   (p. ej. `@/features/financial-settings/hooks/useFinancialSettings`). Crear el
   barrel y migrar imports.
2. **PATCH sin control de rol (seguridad)**: `api/settings/financial/route.ts:99-113`
   solo comprueba que exista sesión, **no** `rol === 'ADMIN'`. Cualquier usuario
   autenticado puede alterar porcentajes y tasa. Comparar con
   `api/display-settings/route.ts:65-72`. **Alto riesgo — corregir.**
3. **Validación solo en cliente**: `validateSettings`/`calculatePreview` son del
   servicio cliente; la API **no valida** rangos ni suma ≤ 100. Un PATCH directo
   puede dejar la config inválida.
4. **`(prisma as any)` + triple fallback de modelo**: en el route y en
   `exchangeRate.ts:47`. Indica problema de generación del cliente Prisma
   (normalizar nombre del modelo `financialSettings`). Ver `02-lib.md §1.4`.
5. **Inconsistencia de columna `whatsappPhone`/`whatsapp_phone`**: el `upsert`
   Prisma usa `whatsappPhone` (`route.ts:149`) mientras el `$executeRaw` de
   respaldo inserta en `whatsapp_phone` (`route.ts:159,167`); el `GET` tolera
   ambas (`route.ts:80`). **A verificar** cuál columna existe en el schema real.
6. **Dato público por error probable**: `taxPercentage` y `whatsappPhone` se
   devuelven a no-admin (`route.ts:76,80`), mientras el resto de porcentajes se
   enmascara a `0`. `ServiceSummary` depende de `taxPercentage` para el desglose
   público, así que el "0" sería un cálculo erróneo si se enmascarara. Revisar
   intención (¿es delito exponer el impuesto?).
7. **Imports muertos**: `useAdminServices` (`ConfiguracionPanel.tsx:19`),
   `FiRefreshCw` (`:6`), `FiAlertTriangle` (`:7`). El build no los detecta
   (`ignoreDuringBuilds`/`ignoreBuildErrors`).
8. **Tipo muerto**: `FinancialCalculation` (`types:28-34`) no se usa y no coincide
   con el retorno real de `calculatePreview`.
9. **Warnings de validación no visibles**: `validation.warnings` se calcula pero el
   panel no los muestra (solo `errors`, `ConfiguracionPanel.tsx:200-204`).
10. **Doble fuente de lectura de la config**: `getFinancialSettingsCached`
    (`cache financial-settings`) vs `route.ts` (`cache financial-settings-ui`) vs
    `exchangeRate` (memoria). Tres cachés con TTL distintos y claves distintas:
    riesgo de deriva. Unificar en una única fuente cacheada.
11. **`getFinancialSettingsCached` no lee `usd_pen_fallback_rate`**: aunque el tipo
    lo declare, el objeto `result` no lo incluye (`getFinancialSettings.ts:25-37`).
    Quien lo use para convertir deberá ir a `exchangeRate`.

---

## 9. Siguiente

**`03-chat.md`** — feature de mensajería/canal por `Order` (chat realtime,
`Message`, `chatStore`, notificaciones de mensajes).
