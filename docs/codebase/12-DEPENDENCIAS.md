# 12 — Mapa de Dependencias del Proyecto

Generado analizando el **grafo de imports real** (325 archivos `.ts/.tsx/.jsx` en
`src/`), resolviendo alias `@/*` y rutas relativas, incluyendo imports estáticos,
dinámicos (`import()`) y `require()`.

> **Cómo regenerarlo** (script usado):
> `/tmp/opencode/depgraph.py` + `depgraph2.py` + `depgraph3.py`
> (caminan `src/`, resuelven alias, construyen aristas, calculan reachability,
> SCC/ciclos y acoplamiento entre capas/features).

---

## 1. Métricas globales

| Métrica | Valor |
|---------|-------|
| Archivos analizados | **325** |
| Puntos de entrada (`src/app/**`, `middleware.ts`, `instrumentation.ts`) | **66** |
| Alcanzables desde un punto de entrada | **291** |
| **No alcanzables (candidatos a muertos/huérfanos)** | **36** |
| **Ciclos de importación (SCC > 1)** | **3** |

---

## 2. God nodes (lo más dependido)

Nodos con más **importadores entrantes** internos. Tocarlos tiene el mayor riesgo
de regresión: son el núcleo del acoplamiento.

| Importadores | Módulo | Capa |
|-------------:|--------|------|
| 48 | `src/lib/prisma.ts` | lib |
| 32 | `src/shared/types/entities.types.ts` | shared |
| 26 | `src/utils/supabase/server.ts` | utils |
| 25 | `src/features/orders/hooks/useOrders.ts` | features |
| 24 | `src/features/orders/types/orders.types.ts` | features |
| 23 | `src/features/auth/store/authStore.ts` | features |
| 18 | `src/lib/finance.ts` | lib |
| 16 | `src/types/index.ts` | types |
| 15 | `src/components/ui/DualPrice.tsx` | components |
| 13 | `src/events/eventBus.ts` | events |
| 12 | `src/utils/supabase/client.ts` | utils |
| 11 | `src/features/chat/store/chatStore.ts` | features |
| 11 | `src/features/checkout/store/checkoutStore.ts` | features |
| 10 | `src/components/ui/Pagination.tsx` | components |
| 10 | `src/utils/formatters.ts` | utils |
| 10 | `src/features/orders/index.ts` | features (barrel) |
| 9 | `src/features/lawyers/hooks/useLawyers.ts` | features |
| 9 | `src/lib/apiClient.ts` | lib |
| 8 | `src/lib/formatOrderId.ts` / `src/lib/broadcast.ts` | lib |

> `useOrders`/`orders.types` con 24-25 importadores indican que **la feature
> `orders` es el hub de tipos de todo el sistema**. Cambiar `orders.types`
> impacta admin, abogado, cliente, checkout, clients, services y chat.

---

## 3. Matriz de dependencias entre capas

Nº de archivos del origen que importan de la capa destino (a ≠ b):

```
app            -> lib:40, utils:22, features:14, events:14, components:12, shared:8, services:6
components     -> features:36, types:12, lib:8, hooks:7, utils:7, shared:4
features       -> lib:24, shared:20, utils:15, components:11, services:2, hooks:2, types:2, events:1
events         -> lib:8, shared:1
hooks          -> features:4, utils:2, types:1
services       -> lib:2, utils:2
lib            -> shared:1, utils:1
infrastructure -> shared:1
utils          -> lib:1
```

**Lecturas:**
- `app → lib` (40) y `app → utils` (22) son las dependencias más fuertes: las
  rutas cargan mucha lógica de infraestructura directamente.
- `components → features` (36): los componentes compartidos dependen del dominio
  (acoplamiento vía `features/*/hooks`). Idealmente `components/` no debería
  depender de `features/`.
- `features → shared` (20) y `features → lib` (24) son esperables.
- No hay dependencias `lib → features` ni `lib → components` (gracias a eso `lib`
  es la base estable).

---

## 4. Acoplamiento cruzado entre features

Dependencias **feature → feature** (violaciones de encapsulación si se espera que
cada feature use solo el barrel público de las demás):

| Origen → Destino | Archivos |
|------------------|----------|
| `auth → chat, checkout, clients, lawyers, orders` | 1 c/u: `authStore.ts` (invalida todas las cachés al cerrar sesión) |
| `checkout → auth` | 5: `CartRecovery`, `CheckoutModal`, `CheckoutStateSync`, `useCheckout*` |
| `checkout → orders` | 3: `useOrderStatus`, `usePaymentStep`, `checkoutStore` |
| `checkout → services, finance, financial-settings, clients, lawyers` | 1-2 c/u |
| `chat → orders, auth, checkout, documents, storage` | 1-2 c/u |
| `clients → orders, auth, chat` | 1-3 c/u |
| `services → orders, auth, etc.` | 1-2 c/u |

**Conclusión**: `authStore` y `useGlobalChatListener`/`useChat` concentran el
acoplamiento cruzado. `authStore` es un caso especial: al hacer logout invalida
las cachés de **todas** las features (acoplamiento 1→N).

---

## 5. Ciclos de importación (3)

```
(1) features/auth/store/authStore.ts
        ↔ features/checkout/store/checkoutStore.ts

(2) events/eventBus.ts
        → events/handlers/index.ts
        → events/handlers/orderHandlers.ts
        → events/processor.ts

(3) features/documents/components/DocumentList.tsx
        ↔ features/documents/hooks/useDocumentListViewModel.tsx
```

Impacto:
- **(1)** auth↔checkout: la cadena de logout/invalidate acopla ambas features.
  Romper extrayendo la invalidación a un helper neutro (`lib/queryClient`).
- **(2)** outbox: `orderHandlers` emite y el `processor` importa handlers; el
  ciclo funciona pero dificulta el testing y el tree-shaking. Invertir con
  inyección del registry.
- **(3)** vista↔viewmodel en documents: ciclo típico de MVVM; se rompe moviendo
  tipos compartidos a `documents.types.ts`.

---

## 6. Archivos NO alcanzables desde puntos de entrada (36)

Candidatos a **código muerto**. *(Verificación previa a borrar: pueden ser
importados dinámicamente por string o expuestos como API pública.)*

**Confirmados muertos (0 líneas o 0 importadores):**
- `src/lib/api.ts` — **vacío (0 bytes)**
- `src/lib/auth.ts` — **vacío (0 bytes)**
- `src/lib/resend.ts` — sin uso (y lanza en import sin `RESEND_API_KEY`)
- `src/features/finance/actions/paymentActions.ts` — 0 importadores
- `src/features/checkout/services/mercadopago.types.ts` — sin uso
- `src/features/checkout/components/PaymentSelectorModal.tsx` — huérfano
- `src/features/auth/components/RegisterForm.tsx` + `auth/components/index.ts` + `useRegisterForm.ts` + `useAuthGuard.ts` — registro real ocurre en checkout
- `src/hooks/useApi.ts`, `src/hooks/useAuth.ts`, `src/hooks/useLocalStorage.ts`, `src/hooks/useAbogadoData.ts` — hooks globales sin consumidores
- `src/store/userStore.ts`, `src/types/api.ts`, `src/types/auth.ts`, `src/shared/types/common.types.ts`
- `src/infrastructure/api/client.ts`, `src/infrastructure/storage/localStorage.adapter.ts`
- `src/shared/components/ui/Card/Card.tsx` + `shared/components/ui/index.ts`
- `src/features/chat/index.ts`, `src/features/storage/index.ts` — barrels sin consumidores
- `src/components/ui/LoadingSpinner.tsx`, `src/components/ui/SecundaryButton.tsx`
- `src/components/layout/AbandonedCartReminder.tsx`

**Componentes de layout "legacy" no enrutados:**
- `src/components/abogado/{AbogadoAuthGuard,AbogadoLayout,AbogadoMainContent,AbogadoSidebar,ContentRenderer,EstadisticasCards}.tsx`
- `src/components/admin/Dashboard.tsx` + `admin/hooks/useDashboard.ts`
- `src/components/nosotros/NuestroEquipoSection.tsx`

> ⚠️ Parte de estos (p. ej. `AbogadoAuthGuard`, `AbogadoLayout`) parecen ser el
> **layout antiguo del panel abogado** que hoy vive dentro de
> `src/app/abogado/page.tsx` (RSC). Antes de borrar, confirmar contra el diseño
> actual (ver `05-pages.md`).

### Barrels `index.ts` (API pública de features)
- Con consumidores: `features/orders/index.ts` (10), `features/lawyers/index.ts`,
  `features/clients/index.ts`, `features/auth/index.ts`, `features/checkout/index.ts`,
  `features/documents/index.ts`.
- Sin consumidores (muertos): `features/chat/index.ts`, `features/storage/index.ts`,
  `features/auth/components/index.ts`, `shared/components/ui/index.ts`.

---

## 7. Dependencias externas por módulo (resumen)

- `lib/prisma` → `pg`, `@prisma/adapter-pg`, `@prisma/client`.
- `lib/broadcast` → `@supabase/supabase-js`, `ws`.
- `lib/push-notifications` → `web-push`, `lib/prisma`.
- `lib/apiClient` → `@supabase/ssr` (client).
- `lib/money` → `decimal.js`.
- `utils/supabase/*` → `@supabase/ssr`, `@supabase/supabase-js`.
- `app/api/webhooks/zenobank` → `svix`.
- `features/checkout/services/mercadopago.*` → `mercadopago`.

---

## 8. Uso de este mapa para refactor

1. **Antes de tocar un god node**, revisar la lista de importadores (§2) y el
   doc de su capa.
2. **Romper ciclos** (§5) en este orden: (3) documents [fácil] → (2) events →
   (1) auth↔checkout.
3. **Reducir `components → features`** (§3): mover los hooks de dominio fuera de
   `components/` o inyectarlos por props.
4. **Eliminar muertos** (§6) con verificación previa (grep de la ruta string +
   build).
5. **Unificar duplicaciones** (cliente HTTP, email, realtime, RLS, enums) — ver
   `13-REFACTOR.md`.

---

**Siguiente**: `13-REFACTOR.md` (plan de refactor accionable y priorizado).
