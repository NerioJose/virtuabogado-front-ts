-- EJECUTAR ESTO EN EL SQL EDITOR DE SUPABASE PARA ARREGLAR REALTIME
-- ═══════════════════════════════════════════════════════════════

-- 1. Asegurar que la tabla Service está en la publicación de Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'Service'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE "Service";
    END IF;
END $$;

-- 2. Habilitar Replicación Completa (para recibir valores anteriores si fuera necesario)
ALTER TABLE "Service" REPLICA IDENTITY FULL;

-- 3. Asegurar que los perfiles públicos puedan ver los cambios via Realtime
-- Si RLS está habilitado, necesitamos una política para que el rol 'anon' pueda leer
-- de lo contrario Realtime no enviará eventos a usuarios no logueados.

ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;

-- Borrar política existente si existe para evitar duplicados
DROP POLICY IF EXISTS "Permitir lectura pública de servicios" ON "Service";

-- Crear política de lectura pública
CREATE POLICY "Permitir lectura pública de servicios" 
ON "Service" FOR SELECT 
TO anon, authenticated
USING (true);

-- 4. Verificar estado
SELECT 
    schemaname, 
    tablename, 
    (SELECT relreplident FROM pg_class WHERE oid = ('public."' || tablename || '"')::regclass) as replica_identity
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
