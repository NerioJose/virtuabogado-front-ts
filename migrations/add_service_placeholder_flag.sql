-- Marcar servicios-placeholder creados por "caso manual" (admin-create) para
-- excluirlos del catálogo administrado por el admin (listado /api/services?all=true).
-- Aplicado manualmente a producción vía pooler (2026-09-24).

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "is_manual_case_placeholder" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: los placeholders ya existentes se identifican por su descripción fija.
-- (En prod: 7 filas marcadas, ids 8-14, todas activo=false)
UPDATE "Service"
SET "is_manual_case_placeholder" = true
WHERE "descripcion" = 'Servicio creado por admin para caso manual'
  AND "is_manual_case_placeholder" = false;