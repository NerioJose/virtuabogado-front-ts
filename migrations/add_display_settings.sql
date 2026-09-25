-- DisplaySettings: configuración global de visualización de precios (fila única)
-- Aplicado manualmente a producción vía pooler (2026-09-24). Si se re-crea la BD,
-- ejecutar este bloque completo en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS "DisplaySettings" (
    id TEXT PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000002',
    show_usd_prices BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
);

INSERT INTO "DisplaySettings" (id, show_usd_prices)
VALUES ('00000000-0000-0000-0000-000000000002', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE "DisplaySettings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read display settings" ON "DisplaySettings"
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage display settings" ON "DisplaySettings"
    FOR ALL
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'ADMIN');

GRANT SELECT ON "DisplaySettings" TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "DisplaySettings" TO service_role;

ALTER TABLE "DisplaySettings" REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE "DisplaySettings";