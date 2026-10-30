# 03a — Feature: auth

> Documentación de comprensión profunda basada en lectura del código real.
> Complementa `00-mapa.md` (capas, alias `@/`, barriles, MVVM); aquí solo se
> desarrolla la feature **auth**.

---

## 2. Propósito

`src/features/auth` es la feature que gestiona **identidad y sesión del lado
cliente**: formulario de login, formulario/registro de cuentas, un store Zustand
que actúa como fuente única de verdad del usuario autenticado, y la capa de
servicio que habla con los endpoints `/api/auth/*`. La persistencia real de la
sesión la termina de garantizar Supabase Auth vía cookies de servidor, mientras
el store mantiene una copia optimista en `localStorage`. El rol (`CLIENTE`,
`ABOGADO`, `ADMIN`) viaja dentro de `user_metadata` de Supabase y se replica a la
tabla `User` de Prisma mediante `/api/auth/sync`.

---

## 3. Inventario de archivos

| Archivo | Exports | Importadores (entrantes) |
|---|---|---|
| `index.ts` | `export *` de `store/authStore`, `hooks/useAuth`, `types/auth.types`, `services/auth.service` | `features/checkout/hooks/useCheckoutStorage.ts:5`, `app/detalle-servicio/[id]/page.tsx:10` |
| `components/index.ts` | `LoginForm`, `RegisterForm` (named) | **Nadie** (a verificar; ver §9) |
| `components/LoginForm.tsx` | `LoginForm` (named) | `app/login/page.tsx:6` |
| `components/RegisterForm.tsx` | `RegisterForm` (named); prop `{ defaultRole?: UserRole }` | **Nadie** (a verificar; ver §9) |
| `hooks/useLoginForm.ts` | `useLoginForm` | `components/LoginForm.tsx:15` |
| `hooks/useRegisterForm.ts` | `useRegisterForm` | `components/RegisterForm.tsx:9` |
| `hooks/useAuth.ts` | `useAuth` | `hooks/useLoginForm.ts:2`, `hooks/useRegisterForm.ts:2`, `components/abogado/hooks/usePerfilAbogadoPanel.ts:5`, `features/services/hooks/useMisServicios.ts:4`, `features/services/hooks/useServiciosClientPage.ts:2`, `features/clients/hooks/useClientPanel.ts:2` |
| `hooks/useAuthGuard.ts` | `useAuthGuard` | **Nadie** (huérfano; ver §9) |
| `services/auth.service.ts` | `AuthService` (clase), `authService` (singleton) | `hooks/useAuth.ts:10`, `store/authStore.ts:113,149`, `features/checkout/store/checkoutStore.ts:204,264,334` (import dinámico) |
| `store/authStore.ts` | `useAuthStore`, `initializeAuth` | Muchos componentes/hooks (ver §8) |
| `types/auth.types.ts` | `LoginCredentials`, `RegisterData`, `AuthState`, `AuthResponse` | `hooks/useAuth.ts:11`, `services/auth.service.ts:7` |

---

## 4. Detalle por archivo

### 4.1 Store — `store/authStore.ts`

`'use client'`. Crea el store con Zustand `persist` sobre `localStorage`
(`name: 'virtuabogado-auth'`, `createJSONStorage(() => localStorage)`,
`authStore.ts:211-213`). Solo persiste `user` e `isAuthenticated`
(`partialize`, `authStore.ts:214-217`).

**Estado** (`AuthState`, `authStore.ts:17-39`): `user`, `isAuthenticated`,
`isLoading`, `error`, `isLoggingOut`.

**Acciones:**
- `setUser(user)` (`authStore.ts:56-67`): setea `user`/`isAuthenticated` y emite
  `window.dispatchEvent(new Event('authChange'))` para componentes legacy.
- `login(user)` (`69-72`): delega en `setUser`.
- `logout()` async (`74-121`): (1) limpia estado al instante, (2) elimina
  `virtuabogado_checkout` y `virtuabogado-auth` de localStorage, (3) resetea
  `useCheckoutStore` y `useOrdersStore`, (4) limpia `useChatStore` por import
  dinámico, elimina `virtuabogado-clients-v2`, `virtuabogado-lawyers-v2`,
  `virtu-services-storage`, (5) `queryClient.clear()` vía `@/lib/queryClient`
  (`106-108`), (6) `await authService.logout()` (signOut de Supabase, `113-115`).
- `updateUser(partial)` (`123-130`) y `clearUser()` (`132-135`, alias de logout).
- `setError`/`setLoading` (`139-141`).
- `checkAuth()` async (`145-198`): obtiene usuario con
  `authService.getCurrentUser()`; si existe, setea estado y dispara
  `POST /api/auth/sync` para reconciliar `nombre`/`rol` (`160-180`). Si no, deja
  `user=null`.
- `reset()` (`200-209`): vuelve a `initialState` y borra `localStorage['user']`.

`onRehydrateStorage` (`219-233`) migra el `localStorage['user']` legacy al store.

**Efectos secundarios:** escribe `localStorage`, dispara eventos `authChange`,
limpia otros stores y el cache de React Query, importa dinámicamente chat,
queryClient y auth.service.

`initializeAuth()` (`authStore.ts:239-242`) se ejecuta una vez al montar la app
desde `components/providers/Providers.tsx:7,34`.

### 4.2 Service — `services/auth.service.ts`

Clase `AuthService` + singleton `authService` (`auth.service.ts:9,150`). No lleva
`'use client'` explícito pero usa `createClient` de `@/utils/supabase/client`
(browser).

- `login(credentials)` (`13-35`): `POST /api/auth/login` con
  `{ email, password, turnstileToken }`; lanza `Error` si `!response.ok`; mapea
  `payload.user` con `mapSupabaseUserToEntity`.
- `register(data)` (`41-69`): `POST /api/auth/register` con
  `{ email, password, nombre, telefono, rol, turnstileToken }`; devuelve
  `{ user, requiresEmailConfirmation }`.
- `logout()` (`74-81`): `createClient().auth.signOut()`.
- `getCurrentUser()` (`87-92`): `supabase.auth.getUser()`; mapea o `null`.
- `verifyPassword(currentPassword)` (`97-114`): re-autentica con
  `signInWithPassword` usando el email del usuario actual; devuelve `boolean`.
- `updatePassword(newPassword)` (`119-129`): `supabase.auth.updateUser`.
- `mapSupabaseUserToEntity(supabaseUser)` (`134-147`) **público**: construye `User`
  desde `user_metadata` (`nombre`, `rol` en mayúsculas, `telefono`,
  `especialidad`, `matricula` ← `numeroColegiado`/`matricula`, `experiencia` ←
  `experienciaAnios`/`experiencia`). Rol por defecto `'CLIENTE'`.

### 4.3 Hooks (ViewModel)

- `useAuth.ts` (`'use client'`): envuelve `authService` y expone `user`,
  `isAuthenticated`, `isLoading`, `error`, `login`, `register`, `logout`,
  `changePassword`, `checkAuth`, `isLoggingOut`.
  - `login` (`24-53`): llama servicio, `setLogin(user)`, y hace **hard redirect**
    `window.location.href` a `/admin`, `/abogado` o `/mis-servicios` según rol.
    El comentario `useAuth.ts:40-42` justifica el hard redirect: `router.replace`
    no ejecuta el middleware en Next 15.
  - `register` (`58-87`): si `requiresEmailConfirmation` retorna sin redirigir;
    si no, `setLogin` y `router.refresh()` + `router.push` según rol.
  - `logout` (`92-107`): `setLogout()` + hard redirect a `/login`.
  - `changePassword` (`112-135`): `verifyPassword` → `updatePassword`.
- `useLoginForm.ts`: estado del formulario (email, password, showPassword,
  remember, turnstileToken). Persiste con debounce 500 ms `remember_me` y
  `remember_email` en `localStorage` (`15-43`). `handleSubmit` llama `login`.
- `useRegisterForm.ts`: estado del formulario + validación de contraseñas
  coincidentes (`129-132`), validación de email en vivo contra
  `/api/auth/validate-email` con debounce 700 ms (`94-122`), estado
  `awaitingConfirmation` y cooldown de reenvío de 60 s (`78-91`).
  `handleResendConfirmation` (`163-184`) hace `fetch('/api/auth/register')`
  directamente (bypass de `authService`).
- `useAuthGuard.ts`: `use client`; redirige a login si no autenticado y valida
  `requiredRole` en `useEffect`. Retorna `{ user, isAuthenticated, isLoading }`.
  **Sin importadores** (ver §9).

### 4.4 Components (View)

- `LoginForm.tsx`: `'use client'`. Renderiza logo, error, inputs email/contraseña
  (toggle `showPassword`), checkbox "Recordarme", `<TurnstileWidget>` y botón
  (deshabilitado si falta email/password/token, `LoginForm.tsx:156`). Incluye link
  a `ROUTES.RECUPERAR_PASSWORD` y a `/servicios`. Usa `useLoginForm`.
- `RegisterForm.tsx`: `'use client'`. Recibe `defaultRole` (default
  `UserRole.CLIENTE`). Renderiza nombre, email (con `emailError`), teléfono,
  contraseña y confirmación, checkbox remember, Turnstile y botón. Si
  `awaitingConfirmation` oculta el form y muestra pantalla "Revisa tu correo" con
  reenvío y "Usar otro correo" (`148-181`). Usa `useRegisterForm`.

### 4.5 Types — `types/auth.types.ts`

`LoginCredentials` (email, password, remember?, rol?, turnstileToken?),
`RegisterData` (nombre, email, password, telefono?, rol, remember?,
turnstileToken?, y campos de abogado/cliente), `AuthState` (duplica la forma del
estado del store) y `AuthResponse`.

---

## 5. Flujo MVVM

### 5.1 Login

1. **View** `LoginForm` → `useLoginForm` recolecta `email/password/remember/
   turnstileToken`; botón solo activo con token Turnstile.
2. **ViewModel** `useLoginForm.handleSubmit` (`useLoginForm.ts:45`) → `useAuth.login`
   (`useAuth.ts:24`).
3. **Model** `authService.login` → `POST /api/auth/login`
   (`auth.service.ts:14`).
4. **Endpoint** `app/api/auth/login/route.ts`: valida email
   (`validateEmail`), verifica Turnstile (`verifyTurnstile`), crea
   `createServerClient` y `supabase.auth.signInWithPassword` (`56`). Recoge las
   cookies de sesión y las **fija en la respuesta** (`83-100`).
5. **Vuelta**: `useAuth.login` hace `setLogin(user)` (store Zustand) y **hard
   redirect** `window.location.href` a `/admin` / `/abogado` / `/mis-servicios`
   según `user.rol` (`useAuth.ts:33-43`).

- **Sesión persiste?** Sí: el endpoint setea las cookies de Supabase en la
  respuesta HTTP; el hard redirect fuerza al middleware a leerlas. El store
  guarda copia en `localStorage` (`virtuabogado-auth`).
- **Rol dónde vive?** En `user_metadata.rol` de Supabase Auth; el cliente lo lee
  vía `mapSupabaseUserToEntity` (`auth.service.ts:139`) y el middleware lo lee de
  `user.user_metadata?.rol` (`utils/supabase/middleware.ts:88,104`).
- **Redirect según rol?** Sí, en `useAuth.ts:33-38` (cliente → `/mis-servicios`).

### 5.2 Registro

1. **View** `RegisterForm` → `useRegisterForm`.
2. Validaciones cliente: formato+MX vía `GET /api/auth/validate-email`
   (debounce), y contraseñas iguales.
3. **ViewModel** `handleSubmit` → `useAuth.register` (`useAuth.ts:58`).
4. **Model** `authService.register` → `POST /api/auth/register`
   (`auth.service.ts:42`).
5. **Endpoint** `app/api/auth/register/route.ts`:
   - Normaliza email, `validateEmailDeliverability` (formato+desechables+MX,
     `register/route.ts:26`).
   - Determina `userRole` (`ABOGADO` o `CLIENTE`) y
     `requiresEmailConfirmation = userRole === 'CLIENTE'` (`36-37`).
   - **Intenta login primero** con `supabaseAdmin.signInWithPassword` para
     usuarios existentes confirmados (`60-75`).
   - Si el email existe pero no está confirmado, reenvía el enlace sin exigir
     Turnstile (`78-113`).
   - Para usuario **nuevo** exige Turnstile (`116-122`) y crea con
     `supabaseAdmin.auth.admin.createUser` con `email_confirm:
     !requiresEmailConfirmation` y `user_metadata: { nombre, telefono, rol }`
     (`124-133`).
   - Clientes: genera link con `admin.generateLink({ type:'signup' })` y envía
     correo con `sendConfirmationEmail` (`159-183`, `225-240`).
6. **Vuelta** `useAuth.register`: si `requiresEmailConfirmation` **no** redirige
   (el form muestra "Revisa tu correo"); si `false` (abogado) `setLogin` +
   `router.refresh()` + `router.push` a `/abogado` o `/mis-servicios`
   (`useAuth.ts:63-78`).

- **Abogados:** auto-confirmados (`email_confirm: true`), sesión inmediata.
- **Clientes:** deben confirmar el correo; **no** hay sesión hasta clicar el
  enlace.

### 5.3 Confirmación de email (callback)

`app/auth/callback/route.ts` recibe `type=signup&email&token&next`. Crea un
`createServerClient` que escribe cookies sobre la **respuesta de redirección**
(`12-25`) y ejecuta `verifyOtp({ token_hash: token, type: 'signup' })` (`58-61`).
Si funciona, redirige a `next` con `auth_success=1` (cookies de sesión ya
fijadas). `CheckoutStateSync.mounted` (`features/checkout/components/
CheckoutStateSync.tsx`) detecta `auth_success=1` para avanzar el checkout. También
soporta `code` (magic link / OAuth / recovery) con `exchangeCodeForSession`
(`77-89`).

---

## 6. Integraciones

### Supabase Auth
- **Cliente browser** (`utils/supabase/client.ts`): `createBrowserClient` con
  `persistSession: remember`, `autoRefreshToken`, `detectSessionInUrl`. Usado por
  `auth.service.ts` (logout, getUser, verify, update).
- **Cliente server** (`utils/supabase/server.ts`): `createServerClient` con
  `cookies()` de `next/headers`; usado en `/api/auth/sync` y en el callback.
- **Cliente service-role** (`utils/supabase/admin.ts`, `createAdminClient`):
  bypassa RLS/rate-limits; usado en `reset-password/confirm` y (con un
  `createClient` de `@supabase/supabase-js` inline) en `register` y `check-user`.
- **Middleware** (`utils/supabase/middleware.ts`): protege `/admin` (ADMIN),
  `/abogado` (ABOGADO), `/mis-servicios` (CLIENTE) (`41-45`), refresca sesión, e
  inyecta `x-user-id`, `x-user-email`, `x-user-role` en headers (`101-104`).
  Bloquea usuarios con `user_metadata.activo === false` (`69-77`).

### Turnstile (`lib/turnstile.ts`)
`verifyTurnstile(token)` → POST a Cloudflare `siteverify`. Si faltan las claves
degradá a `true` (`turnstile.ts:11-13`); tolera `timeout-or-duplicate` como humano
(`42-44`). Usado en `login` y `register`.

### Validación de email / MX (`lib/emailDeliverability.ts` + `lib/emailValidation.ts`)
`validateEmail` valida formato y bloquea dominios desechables
(`emailValidation.ts:251-263`). `validateEmailDeliverability` añade `resolveMx`
con cache TTL 5 min (`emailDeliverability.ts:4,27-50`); ante fallos transitorios
deja pasar. El registro llama la versión completa; el login solo
`validateEmail`. El form de registro consulta `/api/auth/validate-email` en vivo.

### OTP / confirmación
Los clientes nuevos se crean sin confirmar y reciben un correo con
`/auth/callback?...token=HASHED_TOKEN`. `verifyOtp` con `token_hash` confirma y
crea la sesión. Reenvío: volver a POSTear a `/api/auth/register` con el mismo
email (no exige Turnstile si el usuario ya existe sin confirmar).

### OTP / reset de contraseña
No lo consume la feature auth; lo usan `app/recuperar-password/page.tsx` y los
endpoints `reset-password/request` (genera `PasswordResetToken` en Prisma, uuid,
expira en 15 min, envía enlace con Nodemailer/Gmail) y `reset-password/confirm`
(valida token, actualiza password con `createAdminClient().auth.admin
.updateUserById`, borra el token). Es un flujo **paralelo** a Supabase Auth, basado
en Prisma.

### ¿Quién crea la fila en `User`?
**Ambos, en competencia.** El trigger SQL `public.handle_new_user()`
(`scripts/supabase_trigger.sql:2-24`) inserta en `public."User"` al insertarse en
`auth.users` (`nombre`, `rol` desde metadata, `activo=true`; **no** setea
`telefono`). En paralelo, `/api/auth/sync` llama `syncUserIdentity`
(`services/identity.service.ts:33`), que hace `prisma.user.upsert` por `id` con
`nombre`, `rol` (con `resolveSafeRole`), `telefono` y `activo=true`. Resultado:
doble responsable de creación; el upsert de sync mitiga colisiones `P2002`
(`identity.service.ts:165-173`). La protección de rol por email
`EMAIL_MASTER_ADMIN` fuerza `ADMIN` (`identity.service.ts:24,75`).

---

## 7. Estado y persistencia

- **Zustand `useAuthStore`**: única fuente cliente del usuario. Persistencia en
  `localStorage` bajo `virtuabogado-auth` (parcial: `user`, `isAuthenticated`).
  Evento `authChange` para componentes legacy. Al logout se limpian además
  `virtuabogado_checkout`, `virtuabogado-clients-v2`, `virtuabogado-lawyers-v2`,
  `virtu-services-storage`, el store de checkout/orders/chat y el cache de
  TanStack Query.
- **localStorage del form**: `remember_me`, `remember_email`, `remember_nombre`,
  `remember_telefono` (login/registro).
- **TanStack Query**: la feature auth **no** define claves propias; el logout
  llama `queryClient.clear()` genérico. `checkAuth`/sync no usa queries.
- **Cookies**: la sesión real de Supabase vive en cookies httpOnly del
  navegador, gestionadas por los route handlers/middleware (no en el store).

---

## 8. Mapa de dependencias

**Auth importa (salientes):**
- `@/shared/types/entities.types` (`User`, `UserRole`)
- `@/shared/constants/routes` (`ROUTES`)
- `@/utils/supabase/client` (`createClient`)
- `@/features/checkout/store/checkoutStore`, `@/features/orders/store/ordersStore`
  (para `reset()` en logout)
- `@/features/chat/store/chatStore`, `@/lib/queryClient` (import dinámico)
- `@/shared/components/ui/Button`, `ui/Input`, `TurnstileWidget`

**Importan de auth (entrantes):** ~30 sitios.
- Del **barrel** `@/features/auth`: `features/checkout/hooks/useCheckoutStorage.ts`,
  `app/detalle-servicio/[id]/page.tsx`.
- De `@/features/auth/store/authStore` (`useAuthStore`/`initializeAuth`):
  `components/providers/Providers.tsx`, `components/layout/NavBar.tsx`,
  `components/admin/Sidebar.tsx`, `components/admin/hooks/useDashboardStats.ts`,
  `components/admin/hooks/useFinanzasPanel.ts`,
  `components/abogado/AbogadoPanel.tsx`, `components/abogado/hooks/
  useAbogadoPanel.ts`, `.../useFacturacionPanel.ts`, `.../usePerfilAbogadoPanel.ts`,
  `features/checkout/components/CheckoutModal.tsx`, `CheckoutStateSync.tsx`,
  `CartRecovery.tsx`, `features/checkout/store/checkoutStore.ts`,
  `features/chat/hooks/useChatViewModel.ts`, `useGlobalChatListener.ts`,
  `app/login/page.tsx`, `app/admin/page.tsx`, `hooks/useAbogadoData.ts`,
  `hooks/useRealtimeSubscription.ts`, `hooks/usePushNotifications.ts`.
- De `@/features/auth/hooks/useAuth`: `components/abogado/hooks/
  usePerfilAbogadoPanel.ts`, `features/services/hooks/useMisServicios.ts`,
  `useServiciosClientPage.ts`, `features/clients/hooks/useClientPanel.ts`.
- De `@/features/auth/services/auth.service`: `features/checkout/store/
  checkoutStore.ts` (import dinámico, usa `mapSupabaseUserToEntity`).

---

## 9. Notas de refactor / deuda / duplicaciones / riesgos

1. **Doble creación de usuario (trigger SQL vs `syncUserIdentity`)** — el trigger
   `handle_new_user` y el `prisma.user.upsert` de `/api/auth/sync` pueden crear la
   fila. Hay mitigación para `P2002` (`identity.service.ts:165-173`) pero es
   responsabilidad duplicada. Además el trigger no guarda `telefono`.
2. **`createClient` duplicado / clientes Supabase dispersos** — se crean clientes
   admin inline en `register` y `check-user` (`createClient` de
   `@supabase/supabase-js`) en lugar de reutilizar `utils/supabase/admin.ts`
   (`createAdminClient`). Tres variantes de cliente admin.
3. **Doble verificación de rol** — el middleware valida rol por ruta
   (`middleware.ts:41-45,88-95`) y `useAuthGuard` lo revalida en cliente, pero
   `useAuthGuard` **no se usa** (huérfano). Además `service/abogado` verifican rol
   en headers. Rol puede quedar desincronizado entre `user_metadata` y tabla
   `User` (lo intenta reconciliar `/api/auth/sync`).
4. **`RegisterForm` sin ruta** — no existe `app/register/page.tsx`; el componente
   y `useRegisterForm` solo se exportan por el barril de `components` (que a su
   vez nadie importa). El registro real ocurre dentro del **checkout**
   (`features/checkout/services/checkout.service.ts:46`,
   `features/checkout/store/checkoutStore.ts:184`), que POSTea a
   `/api/auth/register` por su cuenta. Hay **3 caminos** que llaman a
   `/api/auth/register`: `authService.register`, `useRegisterForm
   .handleResendConfirmation` y `checkout.service.registerOrLogin` (duplicación de
   lógica de registro).
5. **`AuthState` duplicado** en `types/auth.types.ts` no coincide exactamente con
   el estado real del store (`isLoggingOut` falta). Posible deriva.
6. **Acceso a `user_metadata` sin tipar** — `auth.service.ts` usa `any` y
   `(credentials as any).turnstileToken`; `RegisterData` ya declara
   `turnstileToken?`, así que el cast es innecesario.
7. **Reset de contraseña en dos sistemas** — Supabase (callback `code`/recovery)
   y un flujo propio con `PasswordResetToken` + `admin.updateUserById`. Ambos
   coexisten; documentar cuál es el vigente (a verificar).
8. **Roles desde metadata no confiables** — `mapSupabaseUserToEntity` castea
   `rol` a mayúsculas sin validar contra el enum; un metadata corrupto podría
   producir un rol inválido. Solo `identity.service.resolveSafeRole` protege el
   lado servidor.
9. **Store y sesión desacoplados** — `isAuthenticated` puede quedar `true` en
   `localStorage` sin cookie de Supabase válida; por eso `app/login/page.tsx`
   re-verifica con `getSession()` antes de redirigir (`login/page.tsx:18-21`).

---

**Siguiente**: `03-checkout.md`.
