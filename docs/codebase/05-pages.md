# 05 — Páginas y Layouts (App Router)

Capa final del sistema: **el App Router** (`src/app/`). Aquí se decide qué se
renderiza en el servidor (RSC) y qué en el cliente, qué datos se prefetchean (SSR
+ hidratación de TanStack Query), qué metadata/SEO se emite y qué providers y
suscripciones globales se montan una sola vez en el árbol.

> Documentos previos asumidos: `00-mapa.md`, `01-fundacionales.md`, `02-lib.md`.
> Este documento **no repite** la capa de features; la enlaza.

Rutas reales detectadas en el filesystem (`find src/app`): `layout.tsx`, `page.tsx`,
`servicios/{page,ServiciosClientPage}.tsx`, `detalle-servicio/[id]/page.tsx`,
`mis-servicios/page.tsx`, `admin/page.tsx`, `abogado/page.tsx`,
`clientes/{page,layout}.tsx`, `login/page.tsx`, `recuperar-password/page.tsx`,
`compra-exitosa/page.tsx`, `error-pago/page.tsx`, `payment/{success,error}/page.tsx`,
`contacto/{page,layout}.tsx`, `nosotros/page.tsx`, `privacidad/{page,layout}.tsx`,
`terminos/{page,layout}.tsx`, `robots.ts`, `sitemap.ts`.

> ⚠️ No existen `loading.tsx`, `error.tsx`, `template.tsx` ni `not-found.tsx`
> globales (búsqueda `find src/app -name ...` sin resultados). Los estados de
> carga/errores se resuelven **dentro de cada página** (spinners condicionales,
> `ErrorBoundary` local, `Suspense` locales).

---

## 1. Tabla resumen

| Ruta | Tipo | Rol requerido | Datos / prefetch | Monta |
|------|------|---------------|------------------|-------|
| `/` (`page.tsx`) | **RSC** async | público | `prefetchQuery ['Service','active']` vía `prisma.service.findMany` + `toServiceJson`; `revalidate=3600` | `HeroSection`, `ServiciosDestacados`, `VirtuStudents`, `SectionTestimonios`, `CallToAction` |
| `/servicios` (`servicios/page.tsx`) | **RSC** async | público | mismo prefetch `['Service','active']`; `revalidate=3600` | `ServiciosClientPage` (Client) |
| `/servicios` (client) | **Client** | público | `useServices`, `useServicesRealtime`, `useFinancialSettings`, `useOrdersByUser` | `CheckoutModal`, `CartRecovery`, `CasiListo`, `DualPrice` |
| `/detalle-servicio/[id]` | **Client** | CLIENTE (redirect) | `useOrder(id)` (React Query) | `ChatWindow`, `DualPrice` |
| `/mis-servicios` | **Client** | CLIENTE (middleware) | `useMisServicios` → `useOrdersByUser` + `useRealtimeSubscription` | `ClientPanel` |
| `/admin` | **Client** | ADMIN (guard cliente) | mutaciones React Query (clients/lawyers/orders); `DashboardStats` | `Sidebar`, paneles lazy, `ModalContainer`, `ErrorBoundary` |
| `/abogado` | **RSC** async + `Suspense` | ABOGADO (server guard) | `supabase.auth.getUser()` + fallback `prisma.user.findUnique`; `experimental_ppr=true` | `AbogadoPanel` (Client) |
| `/clientes` | **Client** | público | datos estáticos embebidos | `Image`, `framer-motion` (marketing) |
| `/login` | **Client** | público | `authStore` | `LoginForm` |
| `/recuperar-password` | **Client** | público | `fetch` a `/api/auth/reset-password/{request,confirm}` | — |
| `/compra-exitosa` | **Client** | público | **datos simulados** (mock); sin fetch real | — |
| `/error-pago` | **Client** | público | `localStorage`, `logAbandonment`, `saveCartData` | `Suspense` |
| `/payment/success` | **Client** | público | `useOrder(orderId)` con `refetchInterval` 3s si `PAGO_PENDIENTE` | `cleanupCheckoutAfterPayment`, `AnimatePresence` |
| `/payment/error` | **Client** | público | `useOrder(orderId)` + mapa `cc_rejected_*` | `useCheckoutStore.openCheckout`, `cleanupCheckoutAfterPayment` |
| `/contacto` | **Client** | público | JSON-LD FAQ; componentes lazy | `FormularioContacto`, `InformacionContacto`, `SeccionFAQ`, `SeccionMapa` |
| `/nosotros` | **RSC** | público | metadata estática | secciones marketing |
| `/privacidad` | **Client** | público | — | — |
| `/terminos` | **Client** | público | — | — |
| `/robots.txt` (`robots.ts`) | RSC route | — | — | — |
| `/sitemap.xml` (`sitemap.ts`) | RSC route | — | — | — |

---

## 2. Detalle por página

### 2.1 Públicas (marketing y catálogo)

#### Root — `src/app/layout.tsx` (RSC)
Es el **único layout raíz** y define el montaje global (§4). Emite `metadata`
completo (`metadataBase`, title template `%s | VirtuAbogado`, openGraph,
twitter, robots, icons, alternates) y un **JSON-LD `LegalService`**
(`src/app/layout.tsx:81-115`, inyectado con escape `\u003c` en
`src/app/layout.tsx:132-135`). `<html lang="es">` con `suppressHydrationWarning`
y fuentes Geist (`:12-20`, `:138`).

#### Home — `src/app/page.tsx` (RSC async)
`revalidate = 3600` (`:21`). Crea un `QueryClient` **nuevo por request** (`:23-25`)
y hace `prefetchQuery(['Service','active'])` consultando **directo a Prisma**
(`prisma.service.findMany({ where:{activo:true}, orderBy:{id:'asc'} })`, `:32-41`),
mapeado con `toServiceJson` (`:39`) para garantizar `precioPen` numérico (mismo
shape que `/api/services`, ver `features/services/mappers/serviceJson.ts`).
Usa `HydrationBoundary` + `dehydrate` (`:44`) para hidratar el `QueryClient` del
cliente con esa caché. Consume **`features/services`** (mapper) y `lib/prisma`.

#### `/servicios` — `servicios/page.tsx` (RSC) + `ServiciosClientPage.tsx` (Client)
La página RSC (`servicios/page.tsx:23-42`) replica exactamente el prefetch y
`revalidate=3600` (`:17`) del Home y renderiza el cliente dentro de
`HydrationBoundary`. El componente cliente (`ServiciosClientPage.tsx:1`) usa
`useServiciosClientPage` (`:58-69`) que combina: `useAuth`, `useCheckout`,
`useOrdersByUser`, `useServices`, `useServicesRealtime(true)`, `useFinancialSettings`
(`useServiciosClientPage.ts:13-28`). Renderiza 3 estados: carga (`:86`), pago
pendiente → `<CasiListo orderId>` (`:106-108`), y catálogo (`:114-246`) con
`CheckoutModal`/`CartRecovery` (`:116-117`) y `DualPrice` (`:188`). Invitados **sí**
ven el catálogo (`:110`). Detalle en `03-services.md` y `03-checkout.md`.

#### `/detalle-servicio/[id]` — Client
`'use client'` (`:1`). `params` es una **Promise** que se resuelve con `use()`
(`:18-20`). Guard de ruta por `useEffect` → `/login` si no autenticado (`:32-36`).
Datos: `useOrder(id)` (`:29`). Mapea `OrderStatus` a textos/colores (`:57-67`),
maneja pago pendiente para CLIENTE (`:70-95`) y monta `ChatWindow orderId` (`:272`)
y `DualPrice` (`:169,207,214`). Consume `features/orders` (`useOrders`, tipos) y
`features/chat`.

#### `/clientes` — Client + `layout.tsx` (RSC)
Página de **marketing** con testimonios y casos de éxito hardcodeados
(`clientes/page.tsx:9-70`). ⚠️ **No confundir** con la sección "clientes" del
panel `/admin` (que gestiona usuarios). El layout (`clientes/layout.tsx`) aporta
`metadata` y `BreadcrumbSchema` (`:4-13`, `:19-22`).

#### `/nosotros` — RSC
`metadata` (`nosotros/page.tsx:8-14`) y secciones marketing. Sin fetch.

#### `/contacto` — Client + `layout.tsx` (RSC)
Client con `faqSchema` JSON-LD inyectado (`contacto/page.tsx:69-72`) y lazy
loading de `FormularioContacto`/`InformacionContacto`/`SeccionFAQ` (`:8-10`).
`SeccionMapa` import directo (`:5`). El layout añade metadata + breadcrumb
(`contacto/layout.tsx`).

#### `/privacidad` y `/terminos` — Client + `layout.tsx`
Contenido legal estático con animaciones; cada uno con su layout que aporta
`metadata` + `BreadcrumbSchema` (`privacidad/layout.tsx`, `terminos/layout.tsx`).
Nota: **el contenido de privacidad/terminos cita Zenobank** pero no menciona
MercadoPago/Yape (ver hallazgos).

#### `/robots` y `/sitemap`
- `robots.ts`: permite `/`, bloquea `/admin/`, `/abogado/`, `/api/`, `/auth/callback`,
  `/checkout/`, `/mis-servicios/` (`:9-16`). ⚠️ Bloquea `/checkout/`, ruta que **no
  existe** (el checkout es modal); ver hallazgos.
- `sitemap.ts`: 7 rutas estáticas con `priority` variable (`:7-20`). No incluye
  `/login`, `/detalle-servicio/*` ni páginas de pago.

### 2.2 Checkout / pago

#### `/compra-exitosa` — Client (legacy)
Página de confirmación **mock**: `detalleCompra` se inicializa con valores
simulados (`ORD-xxxxxx`, precio fijo 99.99) y el `useEffect` está vacío/comentado
(`compra-exitosa/page.tsx:22-46`). **Duplica** funcionalidad de `/payment/success`
sin datos reales. Candidata a eliminación.

#### `/error-pago` — Client (legacy)
Lee `searchParams` (`error`, `serviceId`, `serviceName`) y `localStorage['currentService']`
(`error-pago/page.tsx:40-83`); llama `saveCartData` y `logAbandonment`
(`lib/utils/cartRecovery.ts`, `lib/utils/analytics.ts` — ver `02-lib.md §7`).
**Duplica** `/payment/error`. La moneda mostrada es **EUR** (`:155-157`), errónea
para Perú. Candidata a eliminación.

#### `/payment/success` — Client (real)
Recibe `orderId` por `searchParams` (Promise + `use()`, `:14-19`). `useOrder`
con `refetchInterval` dinámico: reintenta cada 3 s mientras `PAGO_PENDIENTE`
(`:20-26`). Al montar ejecuta `cleanupCheckoutAfterPayment()` (`:31-33`). Deriva
`isPendingApproval` / `isApproved` (`PAID|EN_PROGRESO|COMPLETADO`) / `isFailed`
(`:37-42`) y `paymentMethodIdentifier` para textos (`isCard`=mercadopago,
`isYape`, default Zenobank; `:45-46`). Timeout de 30 s para "demora en verificación"
(`:48-58`); al aprobar redirige a `/mis-servicios` en 3 s (`:60-67`). Consume
`features/orders` y `features/checkout/utils/checkoutCleanup`.

#### `/payment/error` — Client (real)
Recibe `orderId` + `error` (`:14-19`). Traduce ~18 códigos
`cc_rejected_*`/`cc_amount_*` de MercadoPago a mensajes (`:27-49`). Limpia el
checkout al montar (`:55-57`). Botón "Intentar con otro método" reabre el
checkout con el mismo servicio (`useCheckoutStore.getState().openCheckout`,
`:61-80`). Consume `features/checkout` y `features/orders`.

### 2.3 Paneles por rol

#### `/mis-servicios` — Client (CLIENTE)
`'use client'` (`:1`). Toda la lógica vive en `useMisServicios`
(`features/services/hooks/useMisServicios.ts`): `useOrdersByUser` +
`useRealtimeSubscription` + `useFinancialSettings`, hidratación, guard por
`useEffect` → `/login`, y mapeo `mapOrderToServicio` filtrando
`PAGO_PENDIENTE|PAGO_RECHAZADO` (`useMisServicios.ts:54-63`). Renderiza
`ClientPanel` (`mis-servicios/page.tsx:48-55`). La protección gruesa es el
middleware (`/mis-servicios`→CLIENTE, `01-fundacionales.md §2.2`).

#### `/admin` — Client (ADMIN)
Página extensa (500 líneas). Guard cliente: `checkAuth()` + `useEffect` que
redirige si rol ≠ `ADMIN` (`admin/page.tsx:74-105`). Estado `seccionActiva`
(9 secciones, `:62`), búsqueda y sidebar colapsable persistido en `localStorage`
(`vb:sidebar-collapsed:admin`, `:79-85`). Paneles pesados con `lazy(() => import(...))`
(`:23-35`) y `Suspense`/`ErrorBoundary` (`:456-468`). CRUD vía mutaciones React
Query de `features/clients` y `features/lawyers` (`:123-131`, `handleSave`
`:134-191`). `historial` monta `OrdersHistoryTable` (`:350`). Consume
`features/auth`, `features/orders`, `features/clients`, `features/lawyers`,
`components/admin/*`. **No** re-valida rol en servidor (solo middleware + cliente).

#### `/abogado` — RSC (ABOGADO) con PPR
Único panel con **guard server-side**: `supabase.auth.getUser()` (`abogado/page.tsx:29-36`),
y fallback autoritativo a `prisma.user.findUnique` si faltan metadatos (`:38-49`);
si el rol no es `ABOGADO` → `/login` (`:51-54`). `experimental_ppr = true` (`:64`).
`Suspense` con `DashboardSkeleton` (`:56-59`) y renderiza `AbogadoPanel` (Client,
`components/abogado/AbogadoPanel.tsx`) que a su vez monta
`useRealtimeSubscription` y paneles lazy (`CasosAbogadoPanel`, `AgendaPanel`,
`MensajesPanel`, `ClientesAbogadoPanel`, `FacturacionPanel`; `ssr:false`).

### 2.4 Auth

#### `/login` — Client
`useAuthStore` (`:12`). `useEffect` re-verifica la sesión Supabase real
(`supabase.auth.getSession()`) y redirige por rol (ADMIN/ABOGADO/MIS_SERVICIOS,
`:15-34`). Renderiza `LoginForm` (`features/auth`). El middleware ya redirige a un
usuario logueado fuera de `/login` (`01-fundacionales.md §2.2`).

#### `/recuperar-password` — Client
Componente maestro que maneja **dos flujos** según `searchParams.get('token')`
(`:31-32`): sin token → solicitud (`POST /api/auth/reset-password/request`,
`:57`), con token → cambio (`POST /api/auth/reset-password/confirm`, `:87`).
`Suspense` externo por `useSearchParams` (`:18-27`). No usa el `authStore`.

> ⚠️ El middleware menciona una `authRoute` `/register`, pero **no existe página
> `/register`** (solo `src/app/api/auth/register/route.ts`). El registro parece
> vivir embebido en `LoginForm`. "A verificar" en `03-auth.md`.

---

## 3. Montaje global (root layout + Providers + realtime + PWA)

### 3.1 Árbol del root layout
`src/app/layout.tsx:139-157`:

```
<Providers>                 (Client: QueryClient + realtime + SW + UploadManager + PWA banner)
  <GlobalChatListener />    (Client: realtime global + toasts + banner push)
  <NavBar />
  <div min-h-screen ... pt-24>{children}</div>   ← todas las páginas viven aquí
  <DynamicCheckoutWrapper /> (Client, ssr:false → CheckoutLayoutWrapper)
  <Footer />
  <Toaster />               (sonner)
</Providers>
```

⚠️ El wrapper `div` con `pt-24` (`:142`) envuelve **todas** las páginas,
incluidos los paneles `/admin` y `/abogado` que se diseñan como pantallas
completas (sidebar full-height). Es un candidato a conflicto de layout: los
paneles dependen de que su contenedor no imponga padding. "A verificar"
visualmente.

### 3.2 `Providers` — `components/providers/Providers.tsx` (Client)
Responsabilidades:
1. **TanStack Query**: crea **un `QueryClient` inline** con defaults propios
   (`staleTime 30s`, `gcTime 5m`, `refetchOnMount:false`, `refetchOnWindowFocus:true`,
   `retry:1`, `placeholderData`) — `:70-96`. ⚠️ **Difiere** del `lib/queryClient.ts`
   documentado en `02-lib.md §2.2` (staleTime 5m/gcTime 30m). Hay **dos configs**
   de QueryClient (ver hallazgos).
2. Monta `RealtimeSubscription` → `useRealtimeSubscription()` (`:13-22`).
3. Monta `DisplaySettingsRealtime` → `useDisplaySettingsRealtime()` (`:25-29`).
4. `initializeAuth()` (`:34`).
5. **Registro del Service Worker** `/sw.js` con recarga en `updatefound`
   (`:37-67`).
6. Monta `UploadManager` y `PWAInstallBanner` (`:103-104`) y
   `ReactQueryDevtools` (`:105`).

### 3.3 Suscripciones realtime activas
- **`useRealtimeSubscription`** (`hooks/useRealtimeSubscription.ts`): abre el canal
  broadcast `app-updates` (`:95`), el personal `global_{user.id}` (`:103`) si hay
  sesión, y `admin-updates` (`:114`) si ADMIN. Además un canal `db-changes-{id}`
  con `postgres_changes` **acotado por rol** (`:235-269`): ADMIN escucha 7 tablas;
  ABOGADO filtra `Order.lawyerId`/`LawyerPayouts.lawyerId`; CLIENTE filtra
  `Order.userId`. Invalida cachés por tabla (`handleChanges`, `:147-217`).
- **`useDisplaySettingsRealtime`** (`hooks/useDisplaySettingsRealtime.ts`):
  canal `public:DisplaySettings` (postgres_changes) que invalida
  `['display-settings']` — funciona para anónimos por RLS `USING(true)`.
- **`GlobalChatListener`** (`features/chat/components/GlobalChatListener.tsx` +
  `useGlobalChatListener`) montado en el root **fuera** de `Providers` pero dentro
  del árbol: abre sus **propios** canales `global_{id}` y `app-updates`
  (`useGlobalChatListener.ts:130-131`), hidrata contadores de no leídos
  (`:115-122`) y muestra toasts con sonido/blink/redirección por rol
  (`:133-204`).
- **`useServicesRealtime`** (por página de servicios/catálogo,
  `features/services/hooks/useServicesRealtime.ts`).

> ⚠️ **Duplicación de canales**: `useRealtimeSubscription` y
> `useGlobalChatListener` **ambos** se suscriben a `app-updates` y `global_{id}`,
> y algunos eventos de orden se manejan en los dos con lógica distinta
> (invalidación vs toast). Dos fuentes de verdad para el mismo broadcast; ver
> hallazgos y `07-realtime.md`.

### 3.4 PWA / Service Worker
`public/manifest.json` (name, standalone, theme `#0056b3`, iconos 192/512,
shortcuts a `/abogado` y `/admin`) + `<link rel="manifest">` y metas Apple en el
head del root layout (`layout.tsx:125-131`). `public/sw.js` (v3.0.2) maneja
**push VAPID** (`self.addEventListener('push', ...)`) con
`requireInteraction`, vibración y fallback a texto plano. El SW se registra en
`Providers` (§3.2-5). El banner de instalación es `components/ui/PWAInstallBanner`.

---

## 4. SEO / metadata y sitemap/robots

- **Metadata global**: `layout.tsx:22-79` (title template, OG, twitter, robots,
  icons, `metadataBase`, canonical `/`).
- **Metadata por página**: `page.tsx`, `servicios`, `nosotros`, y los `layout.tsx`
  de `clientes`, `contacto`, `privacidad`, `terminos`. Las páginas client
  (login, recuperar-password, pago, etc.) **no** exportan `metadata` (no pueden en
  `'use client'`), por lo que heredan la global.
- **JSON-LD**: `LegalService` global (`layout.tsx:81-115`) y `FAQPage` en
  `/contacto` (`contacto/page.tsx:12-49`). `BreadcrumbSchema`
  (`components/seo/BreadcrumbSchema`) en los layouts de `clientes`, `contacto`,
  `privacidad`, `terminos`.
- **`robots.ts`**: `Allow /` + disallow de rutas privadas + referencia al sitemap.
- **`sitemap.ts`**: 7 URLs públicas estáticas.
- `alternates.canonical` se declara en varias páginas apuntando a
  `https://virtuabogado.app/...`.

---

## 5. Mapa de dependencias (qué features consume cada página)

```
page.tsx (/) ─► features/services (serviceJson) ─► lib/finance
             └─► lib/prisma
servicios/ ─► features/services (useServices, useServiciosClientPage, useServicesRealtime)
          ─► features/checkout (CheckoutModal, CartRecovery, useCheckout)
          ─► features/orders (useOrdersByUser)
          ─► features/financial-settings (useFinancialSettings)
detalle-servicio/[id] ─► features/orders (useOrder) · features/chat (ChatWindow) · features/auth
mis-servicios ─► features/services (useMisServicios) → features/clients (ClientPanel)
             └► hooks/useRealtimeSubscription · features/chat (chatStore) · features/orders
admin ─► features/auth · features/orders · features/clients · features/lawyers · components/admin
abogado ─► components/abogado/AbogadoPanel · utils/supabase/server · lib/prisma
login ─► features/auth (authStore, LoginForm) · shared/constants/routes
recuperar-password ─► api/auth/reset-password/{request,confirm} (fetch directo)
payment/success|error ─► features/orders (useOrder) · features/checkout (cleanup, checkoutStore)
error-pago ─► lib/utils/{analytics,cartRecovery}
compra-exitosa ─► (mock, sin features)
contacto/nosotros/clientes/privacidad/terminos ─► components/{contacto,nosotros,...} · components/seo
```

**Providers/realtime global** es transversal a **todas** las rutas.
Material de detalle en: `03-services.md`, `03-checkout.md`, `03-orders.md`,
`03-chat.md`, `03-clients.md`, `03-lawyers.md`, `03-finance.md`,
`03-financial-settings.md`, `03-auth.md`.

---

## 6. Hallazgos de refactor / deuda

1. **Páginas legacy duplicadas**: `/compra-exitosa` y `/error-pago` replican
   (peor) lo que hacen `/payment/success` y `/payment/error`. `compra-exitosa`
   usa datos mock; `error-pago` muestra **EUR** y usa `localStorage`. Eliminar o
   redirigir.
2. **Doble `QueryClient`**: el de `Providers.tsx:70-96` (`staleTime 30s`) vs
   `lib/queryClient.ts` (5m/30m, usado por checkout/auth). Unificar configuración
   para evitar comportamientos de caché divergentes.
3. **Doble motor realtime**: `useRealtimeSubscription` y `useGlobalChatListener`
   abren los mismos canales (`app-updates`, `global_{id}`) y procesan los mismos
   eventos con lógicas distintas. Consolidar en un único listener global.
4. **Guard de rol inconsistente**: `/abogado` valida en servidor (con fallback a
   DB); `/admin` y `/mis-servicios` dependen del middleware + guard cliente
   (`useEffect`). Un usuario puede ver el shell antes del redirect. Homogeneizar
   con guard RSC como `/abogado`.
5. **`/register` inexistente** aunque el middleware lo trata como `authRoute`
   (`01-fundacionales.md §2.2`). Aclarar dónde se registra el usuario.
6. **`robots.ts` bloquea `/checkout/`**, ruta que no existe (el checkout es modal).
   Ruido/incoherencia con la arquitectura real.
7. **Root layout impone `pt-24` a paneles full-height** (`layout.tsx:142`). Los
   shells de `/admin` y `/abogado` compensan a mano; frágil. Evaluar route groups
   `(marketing)` vs `(panel)` con layouts separados.
8. **Sin `error.tsx`/`not-found.tsx`** globales: cada página reinventa estados de
   error/carga. Añadir boundaries de App Router.
9. **Metadata ausente en páginas client importantes** (login, pago). No pueden
   exportar `metadata`; si necesitan SEO propio, extraer un layout RSC.
10. **PPR aislado**: solo `/abogado` usa `experimental_ppr` (`abogado/page.tsx:64`);
    el resto no explota PPR pese a estar habilitado en `next.config`. Decidir
    estrategia (PPR global o ninguna).
11. **Legal desactualizado**: `privacidad`/`terminos` citan solo **Zenobank**;
    omiten MercadoPago/Yape (pasarelas activas). Revisar cumplimiento.

---

**Siguiente**: `06-eventos.md` (bus de eventos + outbox `EventLog`).
