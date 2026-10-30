# 00 — Mapa del Proyecto VirtuAbogado

> Serie de documentación de comprensión profunda del código, pensada para
> **desarrollo y refactor 100% manual**. Cada afirmación proviene de leer el
> código real (no del grafo). Índice y orden de lectura abajo.

---

## 1. Qué es este sistema

Plataforma de servicios legales digitales (Perú). Conecta **clientes** con
**abogados**; un tercero (**admin**) supervisa casos, finanzas y configuración.
Los clientes compran **servicios** (casos legales); el pago dispara la
**asignación automática** de un abogado y abre un canal de **chat** + gestión
documental.

- **3 roles**: `CLIENTE`, `ABOGADO`, `ADMIN` (`UserRole`).
- **3 paneles**: `/admin`, `/abogado`, `/mis-servicios` (cliente) + sitio público.
- **2 pasarelas**: Zenobank (cripto, cobro en USD) y MercadoPago (tarjeta y
  Yape/Plin, cobro en PEN). Ambas con flujo **pesimista** (no se confirma nada
  hasta la respuesta de la pasarela / webhook).

---

## 2. Cómo leer esta serie

Orden **bottom-up**: primero los cimientos, luego las features, luego la
orquestación (rutas/eventos), y al final la síntesis accionable (dependencias y
refactor).

| # | Documento | Contenido |
|---|-----------|-----------|
| 00 | `00-mapa.md` | Este índice, glosario, ciclo de vida de `Order`, convenciones |
| 01 | `01-fundacionales.md` | Config, Prisma, Supabase, migraciones, RLS, tipos base |
| 02 | `02-lib.md` | Cada módulo de `src/lib/` (utilidades transversales) |
| 03 | `03-auth`, `03-checkout`, `03-orders`, `03-services`, `03-clients`, `03-lawyers`, `03-finance`, `03-financial-settings`, `03-chat`, `03-documents-storage` `.md` | Features de dominio (MVVM) |
| 04 | `04-api.md`, `04-api-payments.md` | Endpoints en `src/app/api/**` y `auth/callback` |
| 05 | `05-pages.md` | Páginas y layouts del App Router |
| 06 | `06-eventos.md` | Bus de eventos + outbox `EventLog` |
| 07 | `07-realtime.md` | Reactividad en 3 capas |
| 08 | `08-pagos.md` | Zenobank + MercadoPago + Yape |
| 09 | `09-notificaciones.md` | Push VAPID + Telegram + email |
| 10 | `10-auth.md` | Supabase SSR + OTP + Turnstile |
| 11 | `11-precios.md` | DualPrice, tasa, Decimal |
| 12 | `12-DEPENDENCIAS.md` | Matriz importa / es importado por, ciclos, huérfanos |
| 13 | `13-REFACTOR.md` | Deuda técnica + plan de refactor ordenado |

**Convención de cada doc**: para cada archivo se registran *propósito*,
*exports*, *imports*, *efectos secundarios* y *quién lo usa*. Un archivo no se
considera documentado hasta registrar **imports entrantes y salientes**.

---

## 3. Stack (versiones reales de `package.json`)

| Área | Tecnología |
|------|-----------|
| Framework | Next.js `15.5.14` (App Router, RSC, PPR experimental) |
| UI | React `19`, Tailwind CSS `4.1`, Framer Motion `12`, lucide-react, sonner |
| Lenguaje | TypeScript `5` (strict), alias `@/* → ./src/*` |
| Datos | PostgreSQL + Prisma `7.6` con `@prisma/adapter-pg` y pool `pg` |
| Backend de servicios | Supabase (Auth, Storage, Realtime, Postgres) vía `@supabase/ssr` |
| Estado servidor | TanStack Query `v5` (+ devtools) |
| Estado cliente | Zustand `5` |
| Dinero | `decimal.js` |
| Pagos | `mercadopago` `3.6`, `svix` (firma webhooks) |
| Auth/crypto | `jose`, `bcryptjs` |
| Email | `nodemailer` (Gmail) + `resend` |
| Push | `web-push` (VAPID), `@types/web-push` |
| Observabilidad | `@sentry/nextjs` `10` |
| PWA | `manifest.json` + `public/sw.js` |

---

## 4. Mapa de capas

```
┌─────────────────────────────────────────────────────────────┐
│ app/  (App Router)                                           │
│   ├── (páginas)  page.tsx / layout.tsx  → RSC + componentes  │
│   └── api/**/route.ts                    → endpoints backend  │
├─────────────────────────────────────────────────────────────┤
│ features/<dominio>/  (MVVM por dominio)                      │
│   components/ (View) · hooks/ (ViewModel) · services/ (Model)│
│   store/ (Zustand) · types/ · index.ts (barrel público)      │
├─────────────────────────────────────────────────────────────┤
│ events/  (bus + outbox)   │  services/  (dominios globales)  │
├─────────────────────────────────────────────────────────────┤
│ lib/ · hooks/ · store/ · shared/ · infrastructure/ · utils/   │
├─────────────────────────────────────────────────────────────┤
│ Prisma (PostgreSQL)  ·  Supabase (Auth/Storage/Realtime)     │
└─────────────────────────────────────────────────────────────┘
```

**Flujo de datos (MVVM)**:
`Component` → `hook` (ViewModel) → `feature.services` (Model) →
`fetch('/api/...')` → `app/api/route.ts` → `lib/prisma` → PostgreSQL.
Las respuestas actualizan **TanStack Query** o **Zustand** y la UI re-renderiza.
Los componentes **no** llaman a la API directamente (salvo excepciones a anotar).

---

## 5. Glosario de dominio

- **Servicio (`Service`)**: producto legal vendible. Precio canónico en USD
  (`precio`) o en soles (`precio_pen`; si es `NULL`, el S/ se deriva de la tasa).
  `is_manual_case_placeholder` marca servicios basura creados para "caso manual".
- **Orden / Caso (`Order`)**: compra de un servicio por un cliente. Es el
  expediente. Tiene `total` (USD), `totalPen`, `exchangeRateUsed` (trazabilidad),
  desglose financiero y `status`.
- **`OrderStatus`**: ver §6.
- **Asignación**: la orden se liga a un `lawyerId`. Automática si hay **un solo
  abogado activo**; si hay varios, queda para asignación manual del admin.
- **Payout (`LawyerPayout`)**: liquidación al abogado. Se crea/agrupa cuando las
  órdenes pasan a `COMPLETADO`.
- **Broadcast**: señal de Supabase Realtime (`app-updates`) para invalidar caché
  de TanStack Query entre dispositivos.
- **Tasa (`usd_pen_fallback_rate`)**: tipo de cambio USD→PEN. El S/ y el USD de
  cada precio se derivan de aquí (con excepción si `precio_pen` es canónico).
- **`show_usd_prices` (`DisplaySettings`)**: bandera global (singleton) que
  muestra u oculta los montos en USD en toda la plataforma.
- **Outbox / EventLog**: patrón de eventos persistentes (`EventLog`) procesados
  por un worker/cron, para notificar, asignar y difundir cambios de forma fiable.
- **`SystemUser`**: usuario del sistema (sender de mensajes automáticos).

---

## 6. Ciclo de vida de `Order` (estados reales)

`OrderStatus` (definido en **dos** lugares que deben mantenerse sincronizados:
`prisma/schema.prisma` y `src/shared/types/entities.types.ts`):

```
PAGO_PENDIENTE ──(pasarela confirma)──► PAID ──(asignación)──► EN_PROGRESO
      │                                   │                        │
      └──(rechazo)──► PAGO_RECHAZADO      │                        ▼
                                          │                     REVISION
                    PENDIENTE (varios abogados, cola admin)        │
                                          │                        ▼
                                          └──────────────────► COMPLETADO ──► crea/agrupa Payout
     CANCELADO / FALLIDO (terminales de excepción)
```

- `PAGO_PENDIENTE`: creada, esperando webhook/confirmación.
- `PAGO_RECHAZADO` / `FAILIDO`: pago no concretado.
- `PAID`: pago confirmado; dispara asignación y notificaciones.
- `PENDIENTE`: sin abogado asignado aún (hay >1 abogado → decisión admin).
- `EN_PROGRESO` → `REVISION` → `COMPLETADO`: avance del caso.
- `CANCELADO`: anulado.

> ⚠️ **Riesgo de refactor conocido**: el enum existe duplicado (Prisma + TS). Al
> añadir un estado hay que tocar ambos (ver `docs/codebase-guide.md`, consejo 1).

---

## 7. Convenciones del repo

- **Alias de import**: `@/…` = `src/…` (`tsconfig.json` → `paths`).
- **Barrel exports**: cada feature expone su API pública en `index.ts`; otras
  features deben importar del barrel, no de archivos internos (a verificar).
- **Rutas protegidas** (gestionadas en `utils/supabase/middleware.ts`):
  `/admin` (ADMIN), `/abogado` (ABOGADO), `/mis-servicios` (CLIENTE).
- **Server/Client**: componentes que usan hooks/browser APIs llevan `'use client'`;
  las páginas RSC hacen prefetch (SSR) y pasan datos a componentes cliente.
- **Cron (Vercel)**: `vercel.json` ejecuta `/api/events/process` a las 05:35 y
  17:35 UTC (drenaje del outbox).

---

## 8. Estado de la documentación previa (deuda inmediata)

Los `docs/` originales están **parcialmente obsoletos** y deben corregirse o
marcarse:

| Doc | Problema detectado |
|-----|--------------------|
| `docs/codebase-guide.md` | Cita `src/lib/payout.ts` y `src/lib/order-utils.ts` que **no existen** (hoy: `src/lib/finance.ts`, `src/lib/formatOrderId.ts`). |
| `docs/architecture.md` | Describe "Rate Limiting" como activo; hoy depende de `RATE_LIMIT_PATHS` (si está vacío, no limita). Ver `01-fundacionales.md`. |
| `docs/database.md` | Pendiente de validar contra el `schema.prisma` real (Fase 0/1). |

Esta serie (`docs/codebase/`) es la fuente autoritativa; los docs viejos se
conservan solo como referencia histórica.

---

**Siguiente**: `01-fundacionales.md` (config, Prisma, Supabase, migraciones, RLS).
