-- ==========================================
-- OPTIMIZACIÓN DE BÚSQUEDA (FULL TEXT SEARCH)
-- ==========================================

-- 1. Crear extensión si no existe (normalmente ya está en Supabase)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índice GIN para búsqueda en español en la tabla Service
-- Usamos 'spanish' para ignorar tildes, plurales y palabras comunes (stop words)
CREATE INDEX IF NOT EXISTS idx_service_search_gin ON public."Service" 
USING gin (to_tsvector('spanish', coalesce(titulo, '') || ' ' || coalesce(descripcion, '')));

-- 3. Ejemplo de consulta SQL Cruda para aprovechar el índice:
/*
SELECT * 
FROM "Service" 
WHERE to_tsvector('spanish', titulo || ' ' || descripcion) @@ to_tsquery('spanish', 'abogado & penal');
*/

-- 4. Explicación para Prisma:
-- Para usar esto desde Prisma, debes usar queryRaw o queryRawUnsafe:
/*
const search = 'abogado penal';
const query = search.split(' ').join(' & ');
const results = await prisma.$queryRaw`
  SELECT * FROM "Service" 
  WHERE to_tsvector('spanish', titulo || ' ' || descripcion) @@ to_tsquery('spanish', ${query})
`;
*/
