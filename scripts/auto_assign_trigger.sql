-- ==========================================
-- SOLUCIÓN 1: TRIGGER DE POSTGRESQL (Supabase)
-- ==========================================

-- 1. Función para la asignación automática
CREATE OR REPLACE FUNCTION public.fn_auto_assign_order()
RETURNS TRIGGER AS $$
DECLARE
    unique_lawyer_id TEXT;
    lawyer_count INTEGER;
BEGIN
    -- Contar cuántos abogados activos existen (Usando el enum ABOGADO del esquema)
    SELECT COUNT(*), MAX(id) INTO lawyer_count, unique_lawyer_id
    FROM public."User"
    WHERE rol = 'ABOGADO' AND activo = true;

    -- Si hay exactamente un abogado, asignar la orden
    IF lawyer_count = 1 THEN
        NEW."lawyerId" := unique_lawyer_id;
        NEW.status := 'EN_PROGRESO'; -- Cambiar a EN_PROGRESO automáticamente
        NEW."assignedAt" := NOW();
        
        -- Opcional: Log o notificación de sistema (opcional)
        RAISE NOTICE 'Asignación automática a abogado: %', unique_lawyer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger que se ejecuta ANTES de insertar un nuevo caso
-- Eliminamos uno previo para asegurarnos de que la versión sea la última.
DROP TRIGGER IF EXISTS tr_auto_assign_order ON public."Order";
CREATE TRIGGER tr_auto_assign_order
BEFORE INSERT ON public."Order"
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_assign_order();

-- ==========================================
-- INSTRUCCIONES DE APLICACIÓN
-- ==========================================
-- 1. Copia todo este código.
-- 2. Ve a tu Dashboard de Supabase → SQL Editor.
-- 3. Pega este script y haz clic en 'Run'.
-- 4. ¡Listo! A partir de ahora los casos se gestionan solos si hay un único abogado.
