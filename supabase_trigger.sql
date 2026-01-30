-- 1. Función para manejar nuevos usuarios
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public."User" (id, email, nombre, rol, activo, "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', 'Nuevo Usuario'),
    coalesce((new.raw_user_meta_data->>'rol')::"UserRole", 'CLIENTE'), -- Asegura que el rol exista en el Enum
    true,
    now(),
    now()
  );
  return new;
end;
$$;

-- 2. Trigger que se dispara después de insertar en auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
