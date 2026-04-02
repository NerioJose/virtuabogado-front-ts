-- Sincronización Realtime Total - VirtuAbogado
-- Este script habilita Realtime para todas las tablas clave de forma segura y repetible.

BEGIN;
  -- Paso 1: Recrear la publicación para asegurar que incluya todas las tablas sin errores de duplicación
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;

  -- Paso 2: Añadir todas las tablas necesarias a la publicación
  ALTER PUBLICATION supabase_realtime ADD TABLE "User";
  ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
  ALTER PUBLICATION supabase_realtime ADD TABLE "Service";
  ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
  ALTER PUBLICATION supabase_realtime ADD TABLE "FinancialSettings";

  -- Paso 3: Configurar REPLICA IDENTITY FULL
  -- Esto garantiza que los eventos de Realtime contengan todos los datos (útil para actualizaciones parciales)
  ALTER TABLE "User" REPLICA IDENTITY FULL;
  ALTER TABLE "Order" REPLICA IDENTITY FULL;
  ALTER TABLE "Service" REPLICA IDENTITY FULL;
  ALTER TABLE "Message" REPLICA IDENTITY FULL;
  ALTER TABLE "FinancialSettings" REPLICA IDENTITY FULL;
COMMIT;
