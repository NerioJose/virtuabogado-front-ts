# Atlas 01 — Configuración y punto de entrada

Cubre: `src/middleware.ts` (L2), `src/instrumentation.ts` (L2),
`src/app/layout.tsx` (L2), `src/app/robots.ts` (L1), `src/app/sitemap.ts` (L1).

---

## 1. `src/middleware.ts` (L2)

**Propósito**: middleware de borde (Edge). Hace CORS, rate limiting preventivo y
delega la gestión de sesión a `updateSession`. Se ejecuta para el `matcher` del
final (líneas 121-123).

### Recorrido línea a línea

- **L1-2**: importa `NextResponse`/`NextRequest` y `updateSession`.
- **L4-12**: `getOrigins()` lee `ALLOWED_ORIGINS` (CSV) → array; `ALLOWED_ORIGINS`
  se calcula **una vez al cargar el módulo** (estático por instancia).
- **L14-19**: `getRateLimitPaths()` lee `RATE_LIMIT_PATHS` (CSV) → `AUTH_PATHS`.
- **L22-26**: estado del **token bucket en memoria**: `rateLimitMap` (por IP),
  10 tokens, refill 1/s, ventana de limpieza 60 s.
- **L28-56 `checkRateLimit(ip)`**:
  - L30-35: crea entrada `{tokens:10,lastRefill:now}` si no existe.
  - L38-43: recarga tokens según tiempo transcurrido (`floor(elapsed/1000)*1`),
    tope 10.
  - L46-51: si el mapa supera 1000 entradas, purga las viejas (> 60 s).
  - L53-55: consume 1 token o rechaza (`false`) si no hay.
- **L58-119 `middleware(request)`**:
  - L59-61: lee `origin`, `pathname`, `ip` (`x-forwarded-for` o `'anonymous'`).
  - L63-69: `isAllowedOrigin` — compara origen contra `ALLOWED_ORIGINS`
    (soporta `*` → construye RegExp).
  - L71-79: **rate limit** solo si `pathname` empieza por alguna ruta de
    `AUTH_PATHS`; si excede → `429` con `Retry-After: 60`.
  - L81-91: responde preflight `OPTIONS` (204) con cabeceras CORS.
  - L93-101: **API pública** (`/api/services`, `/api/webhooks`, `/api/payments`,
    `/api/exchange-rate`, `/api/display-settings`) pasa sin sesión (solo CORS).
  - L103-118: para el resto llama a `updateSession(request)`; añade CORS si el
    origen está permitido. Nota: la rama `AUTH_PATHS` (L105-107) y la `else`
    (L109) hacen **lo mismo** salvo una cabecera `x-security-guarded` — código
    redundante.
  - L121-123: `config.matcher`.

### Qué rompe si lo cambias
- Quitar `updateSession` → no se refresca la sesión ni se protegen rutas.
- El rate limit **solo actúa si `RATE_LIMIT_PATHS` está definido**; en el
  `.env.example` está vacío → no limita. Además es **por instancia**, inútil en
  serverless multi-instancia (ver `13-REFACTOR.md` A).
- `ALLOWED_ORIGINS`/`AUTH_PATHS` se cachean al importar: cambiarlas requiere
  reinicio (no son dinámicas).

---

## 2. `src/instrumentation.ts` (L2)

**Propósito**: punto de instrumentación de Next. Registra Sentry por runtime.

- **L1-8 `register()`**: si `NEXT_RUNTIME === "nodejs"` importa
  `../sentry.server.config`; si `"edge"` importa `../sentry.edge.config`.
- El cliente se registra aparte vía `sentry.client.config.ts` (convención de
  `@sentry/nextjs`).
- **Efecto**: sin este archivo, no se inicializa la observabilidad de Sentry en
  servidor/edge dentro de Next 15.

---

## 3. `src/app/layout.tsx` (L2)

**Propósito**: Root layout (Server Component). Define fuentes, metadata/SEO,
JSON-LD, y monta los providers globales y componentes transversales.

### Recorrido línea a línea

- **L1-10**: imports. Destaca el montaje global: `NavBar`, `Footer`,
  `DynamicCheckoutWrapper`, `Providers`, `GlobalChatListener`, `Toaster`
  (sonner). `./globals.css` (Tailwind).
- **L12-20**: fuentes Geist y Geist_Mono (variables CSS `--font-geist-*`).
- **L22-79 `metadata`**:
  - `metadataBase` (L23), `title.default`/`template` (L24-27).
  - `description`, `keywords` (L28-29, con "derecho peru" — ya migrado a Perú).
  - `formatDetection` desactivado (L33-37).
  - `alternates.canonical: '/'` (L38-40).
  - `openGraph` (L41-56): imagen `/logo/logo_resized.png` 800×600, `locale es_ES`.
  - `twitter` (L57-62): `summary_large_image`.
  - `robots` (L63-73): index/follow + googleBot.
  - `icons` (L74-78): favicon/logo.
- **L81-115 `jsonLd`**: schema.org `LegalService` (nombre, dirección Lima/PE,
  geo, horario 24/7, `sameAs` redes, `priceRange`).
- **L117-161 `RootLayout`**:
  - L123: `<html lang="es" suppressHydrationWarning>`.
  - L124-136 `<head>`: manifest PWA, `theme-color`, metatags Apple,
    apple-touch-icon y el JSON-LD inyectado (con `.replace(/</g,'\\u003c')` para
    evitar XSS de cierre de script).
  - L139-157 cuerpo: `<Providers>` envuelve `GlobalChatListener`, `NavBar`, el
    contenedor de páginas (con `pt-24` fijo — ver nota de deuda en `05-pages.md`),
    `DynamicCheckoutWrapper`, `Footer` y `<Toaster>` (sonner, bottom-right).

### Qué rompe si lo cambias
- El contenedor `pt-24` afecta el layout de **todas** las páginas (incluidas las
  de panel full-height).
- `DynamicCheckoutWrapper` y `GlobalChatListener` se montan **globalmente**: su
  lógica debe ser segura en cualquier ruta.
- Cambiar `metadataBase`/URLs afecta SEO y enlaces absolutos.

---

## 4. `src/app/robots.ts` (L1)

- **Ficha**: `robots()` devuelve reglas de `MetadataRoute.Robots`: `allow:'/'` y
  `disallow` para `/admin/`, `/abogado/`, `/api/`, `/auth/callback`, `/checkout/`,
  `/mis-servicios/`; `sitemap` apuntando a `https://virtuabogado.app/sitemap.xml`.
- **Nota**: `disallow: '/checkout/'` no corresponde a una ruta real (el checkout
  es un modal; ver `05-pages.md`). `/register` no está en el disallow aunque el
  middleware lo matchea.
- **Qué rompe si lo cambias**: exponer paneles privados a indexación.

---

## 5. `src/app/sitemap.ts` (L1)

- **Ficha**: `sitemap()` genera entradas para rutas estáticas: `/`, `/servicios`,
  `/nosotros`, `/contacto`, `/privacidad`, `/terminos`, `/clientes`.
  `changeFrequency: 'monthly'`, prioridades 1.0/0.8/0.7.
- **Nota**: incluye `/clientes` (panel del cliente) en el sitemap público — revisar
  si debería ser privado. No incluye páginas dinámicas (`/detalle-servicio/[id]`).
- **Qué rompe si lo cambias**: SEO (URLs indexadas).

---

**Siguiente**: `02-shared-types.md`.
