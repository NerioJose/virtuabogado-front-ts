# VirtuAbogado Front — Contexto permanente

Frontend Next.js. El backend real vive en `../virtuabogado-backend` (repo principal
de la refactorización). Aquí solo se trabaja en integración cuando la fase del
backend lo requiera.

## Stack

- Next.js 15 (App Router) + React 19.
- Supabase Auth (cliente) y API del backend NestJS.
- Socket.IO contra el backend para tiempo real.
- Zustand + TanStack Query.
- Prisma/Supabase solo para features aún no migradas (se irán eliminando por fase).

## Workflow Git (OBLIGATORIO)

- Ramas:
  - `main` → producción.
  - `develop` → integración.
  - Rama de integración de fase en el front: nombre descriptivo,
    p. ej. `f2-backend-integration` (no `f2`; `f2` es la rama del backend).
- Ciclo:
  1. `git checkout develop && git pull origin develop`
  2. `git checkout -b f2-backend-integration`
  3. trabajar y commitear solo en esa rama (Conventional Commits:
     `feat(f2): ...`, `fix(f2): ...`, `chore: ...`)
  4. `tsc --noEmit`, lint de archivos migrados, `build` y smoke
  5. aprobación → merge a `develop` y push
  6. OK final → merge `develop` a `main` y push
  7. eliminar la rama de integración local y remota
- Prohibido commitear directo a `main` o subir `.env`, `.env.local` o secretos.
- Avisar al usuario siempre que se toque este repo.

## Reglas de integración

- El front NO usa Supabase Realtime para lógica de negocio: usa Socket.IO del
  backend NestJS.
- Las rutas ya migradas usan `NEXT_PUBLIC_API_URL` (`apiFetch`/`apiClient`).
- No borrar una API route de Next hasta que su equivalente en el backend esté
  `e2e-verde` en `MIGRATION_INVENTORY.md`.
- Tipado fuerte: no usar `any` en archivos migrados.

## Documentación relacionada

- `../virtuabogado-backend/AGENTS.md`
- `../virtuabogado-backend/docs/contexto/09-git-workflow.md`
- `../virtuabogado-backend/MIGRATION_INVENTORY.md`
