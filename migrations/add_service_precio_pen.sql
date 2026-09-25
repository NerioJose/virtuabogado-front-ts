-- Permite que un servicio tenga precio canónico en soles (precio_pen) además del
-- USD. Si precio_pen es NULL, el precio es canónico en USD y el S/ se deriva de la
-- tasa vigente. Si precio_pen está fijado, el S/ es el canónico (exacto) y el USD
-- se deriva de la tasa vigente.
-- Aplicado manualmente a producción vía pooler (2026-09-24).

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "precio_pen" DECIMAL(10, 2) NULL;