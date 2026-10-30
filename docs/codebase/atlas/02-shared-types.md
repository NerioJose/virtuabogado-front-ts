# Atlas 02 — `shared/**` y `types/**`

Cubre los contratos y utilidades compartidas. Nivel L1 salvo los componentes
UI (L3 agrupados).

---

## 1. `src/shared/types/entities.types.ts` (L1)

**Propósito**: entidades de dominio "frontend-safe" (evitan fugas de tipos de
Prisma a componentes de cliente). Es el **2º archivo más importado del proyecto**
(32 importadores).

**Contenido**:
- `enum UserRole` (L6-10): `ADMIN|ABOGADO|CLIENTE`.
- `enum OrderStatus` (L12-22): 9 estados (ver `00-mapa.md` §6).
- `interface Servicio` (L24-34): campos **opcionales ambiguos** `nombre?`/`titulo?`,
  `precio?`/`precioPen?`, `duracion?`, `imagen?`, `icono?: any`.
- `interface User` (L36-50): id, email, nombre, rol, y campos opcionales (dni,
  especialidad, matricula...).
- `interface Abogado extends User` (L52-60), `Cliente` (L62-66), `Admin` (L68-71).

**Imports**: ninguno. **Importado por**: 32 archivos (páginas, features, hooks,
stores, `lib/systemUser`, `events/handlers/orderHandlers`).

**Qué rompe si lo cambias**: es contrato transversal. Renombrar/quitar un campo
o cambiar `OrderStatus` impacta decenas de archivos. ⚠️ `OrderStatus`/`UserRole`
**duplican** los enums de `prisma/schema.prisma` → deben sincronizarse a mano
(deuda C4 en `13-REFACTOR.md`).

---

## 2. `src/shared/types/common.types.ts` (L1)

**Propósito**: tipos genéricos de respuesta/estado.
- `ApiResponse<T>` (L5-9): `{data, message?, success}`.
- `PaginatedData<T>` (L11-17): `{items, total, page, pageSize, totalPages}`.
- `ErrorResponse` (L19-23): `{message, code?, details?}`.
- `LoadingState` (L25): unión `'idle'|'loading'|'success'|'error'`.
- `AsyncState<T>` (L27-32): `{data, loading, error, status}`.

**Importado por**: ninguno (huérfano — ver `12-DEPENDENCIAS.md`). Candidato a
eliminar o adoptar como contrato estándar de servicios.

---

## 3. `src/shared/constants/routes.ts` (L1)

**Propósito**: rutas centralizadas.
- `ROUTES` (L5-25): mapa `as const` de rutas públicas, auth, dashboard, servicios.
- `PUBLIC_ROUTES` (L27-34) y `PROTECTED_ROUTES` (L36-41): arrays derivados.

**Importado por**: 0 (huérfano segons el grafo). ⚠️ Existe duplicación con las
rutas hardcodeadas en `middleware.ts`/`utils/supabase/middleware.ts`; adoptarlo o
eliminarlo.

---

## 4. `src/shared/utils/cn.ts` (L1)

**Propósito**: `cn(...classes)` (L5-7) filtra falsy y une con espacio. Utilidad
Tailwind minimalista (**no** usa `clsx`/`tailwind-merge` pese a que el stack los
podría tener; cuidado con conflictos de clases).
**Importado por**: componentes `shared/components/ui/*` y `feedback/Loader`.

---

## 5. `src/shared/components/**` (L1/L3)

### L1
- **`TurnstileWidget.tsx`**: `'use client'`. Carga el script de Cloudflare
  Turnstile dinámicamente (`onload=onTurnstileLoad`), renderiza el widget si hay
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, y llama `onToken` en éxito/expiración/error.
  Si no hay site key, **no renderiza** (el captcha se degrada). Usa `onTokenRef`
  para evitar re-render del efecto. `window.onTurnstileLoad` y `window.turnstile`
  se declaran globalmente (L5-10).
- **`feedback/Loader.tsx`**: `Loader` (spinner con tamaños sm/md/lg + texto) y
  `FullPageLoader` (spinner centrado en toda la pantalla).

### L3 (UI genérico reutilizable)
- **`shared/components/ui/Button/Button.tsx`**: botón con variantes
  `primary|secondary|outline|ghost|danger` y tamaños `sm|md|lg`; `isLoading`
  muestra spinner+"Cargando..."; usa `motion.button` (Framer Motion) con
  `whileHover`/`whileTap`. Extrae `onDrag*` para evitar conflicto de tipos con
  motion (L47).
- **`shared/components/ui/Input/Input.tsx`**: `forwardRef`; label, `error`,
  `helperText`; `inputId` derivado del label. `displayName='Input'`.
- **`shared/components/ui/Card/Card.tsx`**: compound pattern con
  `Card` + `Card.Header` + `Card.Body` + `Card.Footer`.
- **`shared/components/ui/index.ts`**: barrel que reexporta `Button`, `Input`,
  `Card` (+ tipos). **Sin consumidores** (huérfano).

**Nota**: estos componentes usan tokens de color custom (`azul-primario`,
`vinotinto`) definidos en la config de Tailwind. Verificar que existan (el
`tailwind.config.ts` raíz es mínimo; puede depender de Tailwind 4 con `@theme`).

---

## 6. `src/types/**` (L1)

- **`types/index.ts`**: el archivo de tipos "legacy" del proyecto. Define
  `Abogado`, `Estadisticas`, `UseAbogadoDataReturn`, `SeccionAbogado`,
  `ConfiguracionSeguridad/General/Notificaciones/Pagos`, `AdminUser`, `Cliente`,
  `Caso` (equivalente a `Order`), `Transaccion`, `SeccionAdmin`,
  `ElementoSeleccionable`.
  ⚠️ **Duplica** conceptos de `shared/types/entities.types.ts` (`Abogado`,
  `Cliente`) con formas distintas. Es el 8º más importado (16). Deuda: unificar
  con `shared/types`.
- **`types/api.ts`**: **vacío (0 bytes)** → muerto.
- **`types/auth.ts`**: **vacío (0 bytes)** → muerto.

---

## 7. Resumen de deuda en esta capa

| Ítem | Evidencia | Acción |
|------|-----------|--------|
| Enums duplicados Prisma↔TS | `entities.types.ts:6-22` | generar/reexportar |
| `Servicio` con campos ambiguos | `entities.types.ts:24-34` | unificar `precio`/`precioPen`, `nombre`/`titulo` |
| `types/index.ts` duplica entidades | `types/index.ts` vs `shared/types` | unificar |
| `common.types.ts` huérfano | 0 importadores | adoptar o eliminar |
| `routes.ts` huérfano | 0 importadores | adoptar o eliminar |
| `types/api.ts`, `types/auth.ts` vacíos | 0 bytes | eliminar |
| `shared/components/ui/index.ts` huérfano | 0 importadores | eliminar barrel o darle uso |
| `cn` sin `tailwind-merge` | `cn.ts:5` | evaluar `tailwind-merge` |

---

**Siguiente**: `03-lib.md` (los 26 archivos de `src/lib/**`, L2).
