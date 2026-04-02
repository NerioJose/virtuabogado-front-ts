-- ==========================================
-- OPTIMIZACIÓN DE BASE DE DATOS (ÍNDICES)
-- ==========================================

-- 1. Índices B-Tree para Filtrado Rápido y Relaciones (Foreign Keys)
-- Estos aceleran las consultas por estado, abogado, cliente y servicio.
CREATE INDEX IF NOT EXISTS idx_order_status ON public."Order"(status);
CREATE INDEX IF NOT EXISTS idx_order_lawyer_id ON public."Order"("lawyerId");
CREATE INDEX IF NOT EXISTS idx_order_user_id ON public."Order"("userId");
CREATE INDEX IF NOT EXISTS idx_order_service_id ON public."Order"("serviceId");

-- 2. Índice para Ordenamiento Temporal
-- Crucial para que el historial se ordene por fecha de forma instantánea.
CREATE INDEX IF NOT EXISTS idx_order_created_at ON public."Order"("createdAt" DESC);

-- 3. Búsqueda de Texto (GIN Index)
-- Nota: En el esquema actual, el 'asunto' reside en la tabla Service.
-- Creamos un índice GIN en Service para búsquedas globales por título/descripción.
CREATE INDEX IF NOT EXISTS idx_service_titulo_gin ON public."Service" USING gin (to_tsvector('spanish', titulo));
CREATE INDEX IF NOT EXISTS idx_service_descripcion_gin ON public."Service" USING gin (to_tsvector('spanish', descripcion));

/*
RECOMENDACIÓN DBA:
Si deseas permitir búsquedas por "Notas del Caso" específicas de cada orden (no del servicio general),
deberíamos añadir una columna 'notes' o 'title' a la tabla Order y crear un índice GIN allí.
*/

-- 4. Índice compuesto para filtros frecuentes (Lawyer + Status)
-- Optimiza el Dashboard del Abogado que filtra por su ID y estado activamente.
CREATE INDEX IF NOT EXISTS idx_order_lawyer_status ON public."Order"("lawyerId", status);
