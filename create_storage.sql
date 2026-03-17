-- 1. Crear el bucket 'case-files' si no existe
insert into storage.buckets (id, name, public)
values ('case-files', 'case-files', false)
on conflict (id) do nothing;

-- 2. Políticas de Seguridad (RLS) para el bucket
-- Permitir subir archivos solo si el usuario es parte de la orden (metadata: order_id)
DROP POLICY IF EXISTS "Usuarios pueden subir archivos de sus casos" ON storage.objects;
CREATE POLICY "Usuarios pueden subir archivos de sus casos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-files' AND
  (
    -- Validamos que el usuario tiene acceso a la orden referenciada en el path o metadata
    -- Supabase permite extraer info del path. Asumimos path: orderId/filename
    EXISTS (
      SELECT 1 FROM public."Order"
      WHERE "Order".id = (storage.foldername(name))[1] -- Extrae el primer segmento del path
      AND (
        "Order"."userId" = auth.uid()::text OR 
        "Order"."lawyerId" = auth.uid()::text OR
        EXISTS (SELECT 1 FROM public."User" WHERE id = auth.uid()::text AND rol = 'ADMIN')
      )
    )
  )
);

DROP POLICY IF EXISTS "Usuarios pueden ver archivos de sus casos" ON storage.objects;
CREATE POLICY "Usuarios pueden ver archivos de sus casos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'case-files' AND
  EXISTS (
    SELECT 1 FROM public."Order"
    WHERE "Order".id = (storage.foldername(name))[1]
    AND (
      "Order"."userId" = auth.uid()::text OR 
      "Order"."lawyerId" = auth.uid()::text OR
      EXISTS (SELECT 1 FROM public."User" WHERE id = auth.uid()::text AND rol = 'ADMIN')
    )
  )
);
