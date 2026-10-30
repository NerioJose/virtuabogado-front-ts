# 10 — Sistema de Autenticación

> Documentación de comprensión profunda basada en la lectura del código real.
> Complementa `00-mapa.md` (capas, alias `@/`, MVVM) y `03-auth.md` (feature
> cliente). Este documento cubre el **sistema completo** (servidor + seguridad +
> persistencia + rol). No repite el inventario de la feature; enlaza a `03-auth.md`.

---

## 1. Propósito y modelo

El sistema se apoya en **Supabase Auth** como proveedor de identidad (usuarios,
credenciales, sesiones, confirmación de correo) y en una tabla **`User` de
Prisma/PostgreSQL** como espejo de dominio con el rol y los datos de negocio.

- **Identidad (Supabase `auth.users`)**: email, password hasheado, estado de
  confirmación, `user_metadata` (`nombre`, `telefono`, `rol`, `activo`).
- **Perfil (`public."User"` en Prisma)**: `id` (mismo uuid que Supabase), `email`
  único, `nombre`, `rol` (`UserRole`), `telefono`, `activo`, etc.
  (`prisma/schema.prisma:9-39`).
- **Rol**: vive en **`user_metadata.rol`** dentro de Supabase Auth y se replica a
  la columna `User.rol` (`prisma/schema.prisma:14`, enum `UserRole` en
  `prisma/schema.prisma:194-198`).
- **Sesión**: cookies HTTP (SSR) gestionadas por `@supabase/ssr`; el cliente
  mantiene además una copia optimista en `localStorage` vía Zustand.

Hay dos "sistemas" conviviendo: el flujo **Supabase nativo** (login, sesión por
cookies, confirmación `verifyOtp`) y un flujo **propio de reset de contraseña**
con tabla Prisma `PasswordResetToken` (`prisma/schema.prisma:237-245`).

---

## 2. Diagramas textuales

### 2.1 Login

```
LoginForm (View)
  └─ useLoginForm → useAuth.login
       └─ authService.login → POST /api/auth/login
            ├─ validateEmail()                    (lib/emailValidation)
            ├─ verifyTurnstile(turnstileToken)    (lib/turnstile)
            ├─ createServerClient → signInWithPassword
            └─ fija cookies de sesión en la respuesta HTTP  (login/route.ts:95-98)
       └─ store.setUser(user)  (Zustand, copia en localStorage)
       └─ window.location.href = /admin | /abogado | /mis-servicios
                    ("hard redirect" para forzar al middleware a leer las cookies)
```

### 2.2 Registro + confirmación de correo

```
RegisterForm / checkout.service
  └─ POST /api/auth/register
       ├─ validateEmailDeliverability()  (formato + desechables + MX)
       ├─ rol = (rol === 'ABOGADO') ? 'ABOGADO' : 'CLIENTE'
       ├─ requiresEmailConfirmation = (rol === 'CLIENTE')      (register/route.ts:36-37)
       ├─ 1) signInWithPassword → si ya existe y está confirmado, login directo
       ├─ 2) si existe SIN confirmar → reenvía link (sin Turnstile)          :78-113
       ├─ 3) usuario nuevo → verifyTurnstile + admin.createUser
       │        email_confirm = !requiresEmailConfirmation      (register/route.ts:124-133)
       └─ 4) CLIENTE: admin.generateLink({type:'signup'}) → sendConfirmationEmail
                       URL = /auth/callback?type=signup&email&token&next
                                                               (buildConfirmationUrl :225-240)
   (usuario abre el enlace)
  GET /auth/callback?type=signup&email&token
       └─ verifyOtp({ token_hash: token, type:'signup' })       (callback/route.ts:58-61)
            ├─ OK → cookies de sesión fijadas + redirect ?auth_success=1
            └─ FAIL → redirect ?auth_error=confirm_invalid&auth_success=0
```

- **Abogados**: `email_confirm: true` → sesión inmediata (auto-confirmados).
- **Clientes**: sin sesión hasta que clican el enlace de confirmación.
- `CheckoutStateSync` detecta `auth_success=1` para continuar el checkout.

### 2.3 Reset de contraseña (flujo propio con Prisma)

```
/recuperar-password (pide email)
  └─ POST /api/auth/reset-password/request
       ├─ prisma.user.findFirst(email, insensitive) y activo === true
       ├─ deleteMany PasswordResetToken previos por email
       ├─ create PasswordResetToken { token: uuid, expiresAt: +15min }  (:41-53)
       └─ sendTransactionalMail (Nodemailer/Gmail) con /recuperar-password?token=...
  (usuario abre el enlace y envía nueva contraseña)
  └─ POST /api/auth/reset-password/confirm
       ├─ findUnique PasswordResetToken
       ├─ verifica expiración (si expiró, borra y 400)                  (:22-26)
       ├─ prisma.user.findUnique por email
       ├─ createAdminClient().auth.admin.updateUserById(password)       (:38-43)
       └─ delete token (un solo uso)                                    (:51-53)
```

> **A verificar**: coexiste con el `code`/`recovery` de Supabase en
> `auth/callback` (`type==='recovery'` → `/auth/reset-password`,
> `callback/route.ts:76-89`). No está claro cuál es el vigente; este flujo
> Prisma parece el realmente usado por la UI de `/recuperar-password`.

### 2.4 Logout

```
NavBar/panel → useAuth.logout / authStore.logout
  ├─ limpia estado (user=null, isAuthenticated=false) al instante
  ├─ borra localStorage: virtuabogado_checkout, virtuabogado-auth,
  │     virtuabogado-clients-v2, virtuabogado-lawyers-v2, virtu-services-storage
  ├─ reset de useCheckoutStore / useOrdersStore / useChatStore.cleanup()
  ├─ queryClient.clear()
  └─ await authService.logout() → supabase.auth.signOut()   (authStore.ts:74-121)
       └─ hard redirect a /login
```

---

## 3. Roles y verificación (triple verificación)

Existen **tres capas** que comprueban autenticación/rol, con fuentes distintas:

1. **Middleware de sesión** (`src/utils/supabase/middleware.ts`):
   - Define rutas protegidas y rol requerido (`:41-45`): `/admin`→ADMIN,
     `/abogado`→ABOGADO, `/mis-servicios`→CLIENTE.
   - Llama `supabase.auth.getUser()` **solo** para rutas protegidas/auth/api
     (`:57-65`) para no penalizar la navegación pública.
   - Bloquea usuarios con `user_metadata.activo === false` (`:69-77`).
   - Redirige no autenticados a `/login` (`:80-84`) y autenticados fuera de
     `/login`/`/register` según rol (`:87-97`).
   - Inyecta **headers** `x-user-id`, `x-user-email`, `x-user-role` para que la
     API no tenga que volver a llamar a `getUser()` (`:99-111`).

2. **Tabla `User` (Prisma)**: fuente de negocio. `syncUserIdentity` escribe/lee
   `rol` y `activo`, aplica `resolveSafeRole` y la "protección de rol" por
   `EMAIL_MASTER_ADMIN` (`identity.service.ts:24,75-76,126-127`).

3. **`user_metadata.rol` (Supabase)**: lo que el middleware y el cliente leen
   (`utils/supabase/middleware.ts:88,104`). `mapSupabaseUserToEntity` lo mapea al
   `User` de entidades en cliente (`03-auth.md` §4.2).

Además, los endpoints consumen los headers del middleware como "rol confiable":
`x-user-role`/`x-user-id` en `api/clients`, `api/lawyers`, `api/documents`,
`api/orders`, `api/services` (p. ej. `api/services/route.ts:36`).

**Riesgo de desincronización**: el rol efectivo que autoriza el middleware proviene
de `user_metadata`, mientras el de negocio vive en `User.rol`. Si ambos divergen,
el middleware autoriza con el metadata y la app muestra datos según Prisma.
`/api/auth/sync` intenta reconciliar ambos lados
(`identity.service.ts:104-149`).

---

## 4. Detalle por archivo

### 4.1 Clientes Supabase (`src/utils/supabase/`)

| Archivo | Función | Uso |
|---|---|---|
| `server.ts` | `createClient()` con `cookies()` de `next/headers`; `setAll` ignora errores en RSC (`:20-24`) | `/api/auth/sync`, callback |
| `client.ts` | `createClient(remember=true)` → `createBrowserClient` con `persistSession`, `autoRefreshToken`, `detectSessionInUrl` (`:8-12`) | `auth.service.ts` (browser) |
| `admin.ts` | `createAdminClient()` → service-role, `persistSession:false` (`:3-13`) | reset-password/confirm |
| `middleware.ts` | `updateSession(request)` (ver §3) | `src/middleware.ts` |

**Inconsistencia**: `register` y `check-user` crean su propio cliente admin
inline con `createClient` de `@supabase/supabase-js`
(`register/route.ts:52-57`, `check-user/route.ts:16-21`) en lugar de reutilizar
`createAdminClient`. Hay **tres variantes** de cliente admin.

### 4.2 `src/middleware.ts` (entrypoint)

- Rate limiting **token bucket en memoria por IP** (`:22-56`), activo solo para
  rutas de `RATE_LIMIT_PATHS` (`AUTH_PATHS`, `:14-19,72-79`); si la env está
  vacía, **no limita** (deuda conocida en `00-mapa.md` §8).
- CORS con `ALLOWED_ORIGINS`, incluyendo `*` (`:4-12,63-69,81-101`).
- Rutas API públicas: `/api/services`, `/api/webhooks`, `/api/payments`,
  `/api/exchange-rate`, `/api/display-settings` (`:93-101`).
- Siempre delega la sesión a `updateSession(request)` (`:103-110`).
- `matcher`: `/admin/:path*`, `/abogado/:path*`, `/mis-servicios/:path*`,
  `/api/:path*`, `/login`, `/register`, `/auth/callback` (`:121-123`).

### 4.3 Endpoints `src/app/api/auth/`

- **`login/route.ts`**: valida body, normaliza email, `validateEmail`,
  `verifyTurnstile`; `signInWithPassword`; mensaje específico si
  `email_not_confirmed` (`:63-68`); devuelve `user` y **fija cookies** de sesión
  en la respuesta (`:83-100`).
- **`register/route.ts`**: ver §2.2. Usa service-role para **bypasear rate limits**
  de Supabase (`:7-10,39`). Helpers `findUserByEmail` (vía `listUsers`,
  `:208-219`) y `buildConfirmationUrl` (`:225-240`).
- **`sync/route.ts`**: `force-dynamic`; obtiene el usuario de la sesión SSR y
  llama `syncUserIdentity(user, metadata)` (`:12-24`).
- **`check-user/route.ts`**: `GET ?email=`; lista usuarios con service-role y
  responde `{ exists }` (`:28-36`). Consumido por
  `features/checkout/services/checkout.service.ts:94`.
- **`validate-email/route.ts`**: `GET ?email=`; `runtime='nodejs'` (necesita DNS);
  devuelve `validateEmailDeliverability`; ante excepción degrada a `{ok:true}`
  (`:21-26`).
- **`reset-password/request/route.ts`** y **`confirm/route.ts`**: ver §2.3.
- **`auth/callback/route.ts`**: ver §2.2/2.3. `createCallbackClient` escribe
  cookies directamente sobre la respuesta de redirección (`:12-25`).

### 4.4 Librerías de seguridad

- **`lib/turnstile.ts`**: `verifyTurnstile(token)` → POST a
  `challenges.cloudflare.com/turnstile/v0/siteverify`. Si faltan claves, degrada
  a `true` (`:11-13`); sin token, `false` (`:15-17`); tolera
  `timeout-or-duplicate` como humano (`:42-44`).
- **`lib/emailValidation.ts`**: `validateEmail` (formato regex + set de ~250
  dominios desechables) (`:1,3-246,251-264`).
- **`lib/emailDeliverability.ts`**: `hasMxRecord` con `resolveMx` y cache 5 min
  (`:4,27-50`); solo rechaza ante `ENOTFOUND/ENODATA/NODATA`; fallos transitorios
  dejan pasar (`:40-48`). `validateEmailDeliverability` = formato + desechables +
  MX (`:55-70`).
- **`lib/nodemailer.ts`**: transporter Gmail SMTP; `sendTransactionalMail` con
  `List-Unsubscribe` para entregabilidad (`:41-53`).
- **`lib/emailTemplates.ts`**: `sendConfirmationEmail` (plantilla HTML, enlace
  válido 24 h) (`:8-56`).

### 4.5 Servicio de identidad — `services/identity.service.ts`

`syncUserIdentity(supabaseUser, extraData, options)` es el corazón de la
reconciliación Supabase ↔ Prisma:

- Resuelve nombre desde `extraData`/metadata (`:44`).
- `updateData` incluye `email`, `updatedAt`, `activo:true`, y opcionalmente
  `rol`/`telefono` (`:46-52`).
- **Caso colisión** (existe fila con el email pero distinto `id`) (`:60-123`):
  1. "rescate" de nombre (`:62-66`);
  2. libera el email viejo renombrándolo `legacy_<id>_<email>` (`:69-72`);
  3. `resolveSafeRole` (protege rol no-CLIENTE y fuerza ADMIN master) (`:18-31`);
  4. `upsert` por `targetUserId` (`:79-91`);
  5. **migra relaciones** (orders, messages, documents, pushSubscriptions) en
     transacción (`:94-102`);
  6. sincroniza metadata vía `supabase.auth.updateUser` (`:104-122`).
- **Caso normal**: `upsert` simple, con captura de `P2002` → re-lectura por id
  (`:151-173`).

Importado por `/api/auth/sync`, `api/orders/route.ts:167` y
`features/checkout/actions/processPaymentAction.ts:29`.

### 4.6 Cliente — `features/auth/store/authStore.ts`

Cubierto en `03-auth.md` §4.1/§7. Claves para el sistema:
- Zustand `persist` sobre `localStorage['virtuabogado-auth']`, parcializa solo
  `user`/`isAuthenticated` (`:211-217`).
- `checkAuth()` obtiene el usuario real con `authService.getCurrentUser()` y
  dispara `POST /api/auth/sync` para reconciliar nombre/rol (`:145-198`,
  especialmente `:160-180`).
- `initializeAuth()` se ejecuta en `Providers.tsx:34`.

### 4.7 `components/providers/Providers.tsx`

Cliente. En `useEffect` de montaje llama `initializeAuth()` (`:32-34`) y registra
el Service Worker para push. No rehidrata sesión por sí mismo; delega en el store.

---

## 5. Seguridad

- **Turnstile** obligatorio para login y registro de usuarios nuevos; el reenvío
  de confirmación a usuarios existentes sin confirmar **no** lo exige
  (`register/route.ts:88-90`). Degradación silenciosa si faltan claves
  (`turnstile.ts:11-13`).
- **Validación de email / MX**: registro y alta de clientes/abogados usan
  `validateEmailDeliverability` (`register`, `api/clients`, `api/lawyers`,
  `api/orders/admin-create`); login solo `validateEmail` (no resuelve MX).
  Frontend consulta `/api/auth/validate-email` con debounce.
- **Inactivación de usuarios**: el middleware bloquea el paso si
  `user_metadata.activo === false` y redirige a `/login?error=Cuenta inactivada`
  (`utils/supabase/middleware.ts:69-77`). `syncUserIdentity` fuerza `activo:true`
  en cada sync (`identity.service.ts:48-50`) → **posible conflicto**: un usuario
  inactivado podría reactivarse al sincronizar. **A verificar**.
- **Rate limiting**: solo si `RATE_LIMIT_PATHS` está configurado; en memoria (no
  distribuido, se pierde entre instancias serverless).
- **Service-role**: `register`/`check-user` usan service-role para saltar rate
  limits de Supabase; riesgo de abuso si un endpoint se filtra.
- **Reset**: tokens uuid en BD, expiración 15 min, borrado de tokens previos y
  uso único (`request/route.ts:41-53`, `confirm/route.ts:22-53`).

---

## 6. Doble creación de usuario (trigger vs API) — análisis

Hay **dos mecanismos que crean la fila `public."User"`** al registrarse en
Supabase:

1. **Trigger SQL** `public.handle_new_user()` (`scripts/supabase_trigger.sql:2-24`):
   `AFTER INSERT ON auth.users` → `INSERT INTO public."User"` con `id`, `email`,
   `nombre` (de `raw_user_meta_data->>'nombre'`), `rol` (con cast a `UserRole`),
   `activo=true`, timestamps. **No** escribe `telefono`.
2. **`/api/auth/sync` → `syncUserIdentity`** (`identity.service.ts:151-173`):
   `prisma.user.upsert({ where:{id} })` con `email, rol, nombre, telefono,
   activo=true`.

**Consecuencias**:
- Al crear un usuario con service-role, el trigger inserta la fila con el rol de
  metadata; luego `checkAuth`/sync hace `upsert` que la actualiza. No es
  exactamente una "creación doble" en el caso normal (upsert evita duplicado),
  pero sí **responsabilidad duplicada** y ventanas de carrera.
- Si `read`/`write` se cruzan, el `upsert` puede chocar con clave única
  (`email`/`id`) → `P2002`, mitigado con re-lectura por id
  (`identity.service.ts:165-173`).
- El trigger crea la fila **antes** de que `sync` pueda meter `telefono`; si
  `sync` nunca corre, el `telefono` de metadata queda sin persistir.
- En el camino de colisión de emails, `sync` **renombra** el email viejo
  (`legacy_...`) y migra relaciones; el trigger no contempla este escenario.

**Recomendación de refactor**: elegir una sola fuente de creación de la fila
(idealmente el trigger, y que `sync` solo haga `update`), o desactivar el trigger
y centralizar la creación en `syncUserIdentity`. Añadir `telefono` al trigger si
se conserva.

---

## 7. Mapa de dependencias

**El sistema auth importa (salientes):**
- `@supabase/ssr` (`createServerClient`, `createBrowserClient`),
  `@supabase/supabase-js` (`createClient` admin).
- `@/lib/prisma`, `@/services/identity.service`,
  `@/lib/{turnstile,emailValidation,emailDeliverability,nodemailer,emailTemplates}`.
- `@/features/auth/*` (store, service, hooks, componentes) desde las páginas.
- `next/headers` (`cookies`), `node:dns/promises` (`resolveMx`), `uuid`.

**Es importado por (entrantes principales):**
- `utils/supabase/middleware.ts` ← `src/middleware.ts`.
- `utils/supabase/{server,client,admin}.ts` ← endpoints auth, callback,
  `identity.service`, `auth.service`.
- `services/identity.service` ← `api/auth/sync`, `api/orders/route.ts:167`,
  `features/checkout/actions/processPaymentAction.ts:29`.
- `lib/emailDeliverability` ← `api/auth/register`, `api/auth/validate-email`,
  `api/clients*`, `api/lawyers*`, `api/orders/admin-create`.
- `lib/turnstile` ← `api/auth/login`, `api/auth/register`.
- `features/auth/store/authStore` ← `Providers.tsx` y ~20 componentes/hooks
  (ver `03-auth.md` §8).

---

## 8. Notas de refactor / deuda / riesgos

1. **Triple verificación de rol con fuentes distintas** (middleware metadata,
   Prisma `User`, headers) → posible deriva; `useAuthGuard` (cliente) está
   huérfano. Unificar en una sola fuente autoritativa.
2. **Doble mecanismo de creación de usuario** (trigger SQL vs `syncUserIdentity`);
   el trigger no guarda `telefono` y `sync` fuerza `activo:true` (podría reactivar
   inactivados). Ver §6.
3. **Tres clientes admin dispersos**: `utils/supabase/admin.ts`,
   `register/route.ts` y `check-user/route.ts` (inline). Consolidar en
   `createAdminClient`.
4. **Reset de contraseña en dos sistemas** (Prisma `PasswordResetToken` vs
   Supabase `type=recovery` en callback). Documentar/eliminar el no usado.
5. **Rate limiting no distribuido y opcional** (`RATE_LIMIT_PATHS`); en serverless
   el `Map` en memoria no persiste ni se comparte.
6. **Turnstile degradable** a `true` sin claves; riesgo si el entorno de
   producción no configura `TURNSTILE_SECRET_KEY`.
7. **`user_metadata` sin tipar** en varios puntos (`any`); rol casteado a
   mayúsculas sin validar contra el enum (`mapSupabaseUserToEntity`,
   `middleware.ts:88`). Solo `resolveSafeRole` protege el servidor.
8. **Sesión de Supabase vs `authStore` desacoplados**: `isAuthenticated` puede
   quedar `true` en `localStorage` sin cookie válida; `app/login/page.tsx:18-21`
   mitiga re-verificando con `getSession()`.
9. **`check-user` pagina mal**: `listUsers()` sin filtro recorre usuarios y solo
   es viable a la escala actual (`check-user/route.ts:23-34`,
   `register/route.ts:208-219`).

---

## 9. Siguiente

**Siguiente**: `11-precios.md` (DualPrice, tasa USD→PEN, Decimal).
