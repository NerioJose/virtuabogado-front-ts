-- 1. Crear el bucket 'case-files' si no existe
insert into storage.buckets (id, name, public)
values ('case-files', 'case-files', false)
on conflict (id) do nothing;

-- 2. Políticas de Seguridad (RLS) para el bucket
-- Permitir acceso a usuarios autenticados (Idealmente deberíamos filtrar por orderId, pero por ahora Auth es el primer paso)
create policy "Usuarios autenticados pueden subir archivos"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'case-files' );

create policy "Usuarios autenticados pueden ver archivos"
on storage.objects for select
to authenticated
using ( bucket_id = 'case-files' );
