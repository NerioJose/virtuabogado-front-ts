# 13 — Plan de Refactor (accionable y priorizado)

Síntesis de toda la serie. Cada punto incluye **problema**, **evidencia**,
**impacto**, **acción** y **verificación**. Las fases están ordenadas por riesgo:
primero seguridad y dinero, luego arquitectura, y al final limpieza.

> ⚠️ **Verificación obligatoria**: `next.config.ts` tiene
> `typescript.ignoreBuildErrors: true` y `eslint.ignoreDuringBuilds: true`. El
> build **no** detecta errores. Hay que ejecutar explícitamente:
> `npx tsc --noEmit`, `pnpm lint`, `pnpm build`.

---

## Fase A — Seguridad (CRÍTICO, hacer primero)

### A1. `PATCH /api/orders/[id]` sin autorización de rol ni pertenencia
- **Evidencia**: `src/app/api/orders/[id]/route.ts:88` solo `if (!user)`;
  líneas 112-122 asignan/reasignan `lawyerId` y cambian `status`.
- **Impacto**: cualquier usuario autenticado puede reasignar casos, cambiar
  estados, disparar pagos/notificaciones. **Escalada de privilegios.**
- **Acción**: validar `rol` (ADMIN para asignar/reasignar y cambiar status) y
  que ABOGADO solo actualice sus propias órdenes. Reutilizar un helper
  `requireAdmin`/`assertOrderAccess`.
- **Verificación**: tests de acceso con token CLIENTE/ABOGADO/ADMIN.

### A2. `PATCH /api/settings/financial` sin rol ADMIN (verificado)
- **Evidencia**: `src/app/api/settings/financial/route.ts:110` solo `if (!user)`.
- **Impacto**: cualquier usuario cambia comisiones, impuestos, **tasa USD/PEN** y
  `show_usd_prices` → fraude/precios.
- **Acción**: exigir `dbUser.rol === 'ADMIN'` (igual que el GET en la línea ~20).
- **Verificación**: PATCH con no-admin → 403.

### A3. `GET /api/documents` IDOR (verificado)
- **Evidencia**: `src/app/api/documents/route.ts:21-31` filtra por
  `orderId`/`lawyerId` sin comprobar pertenencia del solicitante.
- **Impacto**: lectura de documentos legales de terceros.
- **Acción**: verificar que el usuario sea `userId`/`lawyerId`/ADMIN de la orden.

### A4. `senderId` spoofeable en mensajes (verificado)
- **Evidencia**: `src/app/api/messages/[orderId]/route.ts:36,48` usan `senderId`
  del **body**; solo se valida acceso a la orden (línea 44).
- **Impacto**: suplantación de otro participante en el chat.
- **Acción**: forzar `senderId = auth.user.id` (ignorar el body), salvo usuarios
  de sistema legítimos.

### A5. `GET /api/payments/status` IDOR
- **Evidencia**: `docs/codebase/04-api-payments.md` (IDOR en status de pago).
- **Acción**: validar que la orden consultada pertenezca al usuario; no exponer
  estado de pagos ajenos.

### A6. Webhook Telegram fail-open y `/telegram/chat` sin rol
- **Evidencia**: `src/app/api/notifications/telegram/chat/route.ts:15,35` solo
  `if (!user)` pese al comentario "Solo ADMIN y ABOGADO"; webhook sin secret
  estricto (`04-api-payments.md`).
- **Acción**: exigir rol ADMIN/ABOGADO y **fail-closed** cuando falte el secret
  del webhook.

### A7. `storage/upload` sin restricción de tipo/bucket
- **Evidencia**: `docs/codebase/03-documents-storage.md` (subida arbitraria;
  bucket `case-files` privado pero se usa `getPublicUrl`).
- **Acción**: whitelist MIME/tamaño, validar orden de destino, usar URLs firmadas
  para privados.

### A8. Firma de webhooks sin comparación timing-safe
- **Evidencia**: `docs/codebase/08-pagos.md` (HMAC MercadoPago; Svix Zenobank).
- **Acción**: usar comparación en tiempo constante y verificar firma siempre.

---

## Fase B — Integridad financiera

### B1. `netProfitAmount = platformFee` (verificado)
- **Evidencia**: `src/features/checkout/actions/processPaymentAction.ts:125-126`
  asigna `netProfit: platformFee`, mientras `/api/orders` (línea 185) y
  `admin-create` (139) usan `split.netoPlataforma`.
- **Impacto**: utilidad mal calculada en el camino de pago real.
- **Acción**: usar un único helper `calculateOrderFinances()` en los 3 puntos.

### B2. Doble camino de creación de `LawyerPayout`
- **Evidencia**: `events/handlers/orderHandlers.ts` crea payout PENDIENTE sin
  ligar órdenes; `features/finance/actions/payoutActions.ts:createPayout` agrupa
  y nace COMPLETADO.
- **Impacto**: **pago duplicado** al abogado.
- **Acción**: una sola vía (agrupar órdenes completadas → payout PENDIENTE) e
  idempotencia por `(lawyerId, rango)`.

### B3. Tasa fresca en webhook MercadoPago + `idempotencyKey` no persistida
- **Evidencia**: `docs/codebase/08-pagos.md`.
- **Impacto**: monto cobrado ≠ monto mostrado; reintentos de webhook pueden
  reprocesar.
- **Acción**: usar la tasa/orden ya persistida (`exchangeRateUsed`) y persistir
  `idempotencyKey` (o dedupe por `paymentId`).

### B4. Fórmula de resumen duplicada en SQL
- **Evidencia**: `features/finance/actions/getFinancialSummary.ts` reimplementa
  `calculateOrderFinances` en SQL.
- **Acción**: unificar en una función TS reutilizada.

### B5. Caché de 10 s sin invalidación en mutaciones
- **Evidencia**: `/api/clients`, `/api/lawyers` usan `lib/cache` (TTL 10 s) pero
  no `clearCache` en POST/PATCH/DELETE.
- **Impacto**: paneles con datos obsoletos tras crear/editar.
- **Acción**: invalidar caché + `broadcast*Update` en cada mutación (patrón que
  ya usan services/display-settings).

---

## Fase C — Fuentes de verdad duplicadas (arquitectura de datos)

### C1. RLS duplicado y contradictorio
- **Evidencia**: `migrations/security_rls.sql` vs `supabase/rls_policies.sql`
  (mismos tables, policies con nombres y semánticas distintos).
- **Acción**: consolidar en **un** archivo versionado y documentar el flujo de
  `prisma migrate`. Verificar cuál está aplicada en producción.

### C2. Doble creación de usuario
- **Evidencia**: trigger `handle_new_user` (`scripts/supabase_trigger.sql`) vs
  `/api/auth/sync` (`services/identity.service.ts`).
- **Acción**: elegir un solo responsable (preferible trigger para no depender del
  cliente) o convertir el sync en idempotente explícito.

### C3. Auto-asignación de abogado triplicada
- **Evidencia**: trigger SQL `fn_auto_assign_order` + `events/handlers/orderHandlers`
  + `admin-create`.
- **Acción**: una sola implementación (backend, testable); el trigger solo si se
  documenta como la fuente canónica.

### C4. Enums duplicados Prisma ↔ TS
- **Evidencia**: `OrderStatus`/`UserRole` en `prisma/schema.prisma` y en
  `shared/types/entities.types.ts`.
- **Acción**: reexportar/generar desde Prisma para eliminar deriva.

### C5. Migraciones/SQL en 3 lugares
- **Evidencia**: `prisma/migrations/`, `migrations/*.sql`, `scripts/*.sql`.
- **Acción**: unificar el flujo; marcar los SQL manuales como aplicados o
  migrarlos a `prisma migrate`.

---

## Fase D — Estado y reactividad

### D1. Doble `QueryClient`
- **Evidencia**: `src/components/providers/Providers.tsx:70` crea uno inline;
  `src/lib/queryClient.ts` exporta otro (usado en `authStore.ts:106`).
- **Impacto**: invalidaciones en uno no afectan al otro → datos stale.
- **Acción**: un único `queryClient` importado desde `lib/queryClient`.

### D2. Doble motor realtime / suscripciones múltiples
- **Evidencia**: `GlobalChatListener` + `useRealtimeSubscription`/
  `RealtimeSubscription` montados globalmente; múltiples instancias.
- **Acción**: un solo orquestador de suscripciones; consolidar canales.

### D3. Canales/eventos huérfanos y listener faltante
- **Evidencia**: `payment-method-updated`, `message_deleted`, `new_message`
  huérfanos; `BroadcastChannel('services-update')` **sin listener**;
  `PaymentMethod`/`LawyerPayouts` fuera de la publicación.
- **Acción**: eliminar emisores sin listener o añadir listener; añadir tablas
  faltantes a `supabase_realtime` si se necesitan.

### D4. Stores y estados muertos
- **Evidencia**: ~60% de `chatStore` muerto; `clientsStore`/`lawyersStore`
  (Zustand) sin consumidores reales; campo `read` obsoleto (hoy `readBy`).
- **Acción**: eliminar stores muertos o migrar el estado a TanStack.

---

## Fase E — Limpieza de código muerto (36 archivos, ver `12-DEPENDENCIAS.md` §6)

**Borrado directo (verificado sin uso):**
- [ ] `src/lib/api.ts`, `src/lib/auth.ts` (0 bytes)
- [ ] `src/lib/resend.ts`
- [ ] `src/features/finance/actions/paymentActions.ts`
- [ ] `src/features/checkout/services/mercadopago.types.ts`
- [ ] `src/features/checkout/components/PaymentSelectorModal.tsx`
- [ ] `src/features/auth/components/{RegisterForm.tsx,index.ts}`, `hooks/useRegisterForm.ts`, `hooks/useAuthGuard.ts`
- [ ] `src/hooks/{useApi,useAuth,useLocalStorage,useAbogadoData}.ts`
- [ ] `src/store/userStore.ts`, `src/types/{api,auth}.ts`, `src/shared/types/common.types.ts`
- [ ] `src/infrastructure/api/client.ts`, `src/infrastructure/storage/localStorage.adapter.ts`
- [ ] `src/shared/components/ui/Card/Card.tsx`, `src/shared/components/ui/index.ts`
- [ ] barrels `features/chat/index.ts`, `features/storage/index.ts`
- [ ] `src/components/ui/{LoadingSpinner,SecundaryButton}.tsx`

**Revisar antes de borrar (layout legacy):**
- [ ] `src/components/abogado/{AbogadoAuthGuard,AbogadoLayout,AbogadoMainContent,AbogadoSidebar,ContentRenderer,EstadisticasCards}.tsx`
- [ ] `src/components/admin/Dashboard.tsx` + `hooks/useDashboard.ts`
- [ ] `src/components/nosotros/NuestroEquipoSection.tsx`

---

## Fase F — Duplicaciones y contratos

### F1. Cliente HTTP duplicado
- `lib/apiClient.ts` (usado, 9) vs `lib/api.ts` (vacío) vs
  `infrastructure/api/client.ts`. **Acción**: quedarse con uno y borrar el resto.

### F0. ✅ RESUELTO — Mapper `toServiceJson` duplicado
- `app/api/services/[id]/route.ts` redefinía `toServiceJson` inline (devolvía
  `precioPen` como string/Decimal) en vez de importarlo. **Fix aplicado**:
  ahora importa `@/features/services/mappers/serviceJson`. Verificado con
  `tsc --noEmit` y `next build`.

### F2. Proveedores de email
- Nodemailer (activo) vs Resend (muerto). **Acción**: uno solo.

### F3. `createClient` x2 (server/client Supabase)
- Misma firma semántica, distinto retorno. **Acción**: renombrar a
  `createServerSupabase`/`createBrowserSupabase`.

### F4. Mismatch `PUT` vs `PATCH`
- `clients.service.update` y `lawyersService` apuntan a métodos/endpoints
  inexistentes. **Acción**: alinear verbo y ruta; `getById` sin endpoint → crear
  o eliminar.

### F5. Acceso a Prisma con `(prisma as any)`
- `lib/exchangeRate.ts:47` y `api/settings/financial` usan casts por nombres de
  modelo (`FinancialSettings`/`financialSettings`). **Acción**: corregir la
  generación del cliente y eliminar los casts.

### F6. Contrato de `Servicio`
- `shared/types/entities.types.ts` mezcla `nombre?`/`titulo?` y
  `precio?`/`precioPen?`. **Acción**: unificar el modelo de precio.

### F7. `servicePrice` con solo 2 importadores
- Riesgo de que UI derive precios por fuera del resolver único (origen del
  `.01`). **Acción**: auditar todo render de precio y forzar el resolver.

### F8. Páginas y rutas legacy
- `/compra-exitosa` y `/error-pago` legacy; `/register` **no existe** pero el
  middleware lo matchea. **Acción**: decidir si se retiran o se reconcilian.

---

## Orden recomendado (roadmap)

| Orden | Fase | Razón |
|------:|------|-------|
| 1 | **A (seguridad)** | Evita explotación; bajo esfuerzo |
| 2 | **B (dinero)** | Evita pagos incorrectos/duplicados |
| 3 | **D1 (QueryClient)** | Bug transversal de datos stale, fix simple |
| 4 | **C3/C2 (doble asignación/creación)** | Consistencia de datos |
| 5 | **E (código muerto)** | Reduce ruido antes de refactors grandes |
| 6 | **F (duplicaciones/contratos)** | Limpieza de interfaces |
| 7 | **C1/C5 (RLS/migraciones)** | Consolida esquema |
| 8 | **D2/D3 (realtime)** | Consolidación arquitectónica |
| 9 | **C4, F6 (tipos/enums)** | Unificación de contratos |
| 10 | **Romper ciclos** (`12-DEPENDENCIAS.md` §5) | Refactor estructural |

---

## Checklist de verificación (tras cada cambio)

```bash
npx tsc --noEmit          # tipos (el build NO los chequea)
pnpm lint                 # eslint
pnpm build                # build de Next
```

- [ ] `tsc --noEmit` sin errores nuevos
- [ ] `lint` sin errores nuevos
- [ ] `build` correcto
- [ ] Para cambios de seguridad: probar con token CLIENTE / ABOGADO / ADMIN
- [ ] Para pagos: probar flujo MP tarjeta, Yape y Zenobank end-to-end en TEST
- [ ] Para realtime: verificar en dos dispositivos
- [ ] Regenerar `graphify-out/` (`graphify update .`) tras refactors grandes

---

## Referencias cruzadas

- Fundacionales (RLS, Prisma, Supabase, middleware): `01-fundacionales.md`
- Librerías y muertos de `lib`: `02-lib.md`
- Features (deuda por dominio): `03-*.md`
- API (gaps de auth): `04-api.md`, `04-api-payments.md`
- Páginas legacy: `05-pages.md`
- Eventos/realtime/pagos/notif/auth/precios: `06`–`11`
- Grafo y muertos: `12-DEPENDENCIAS.md`
