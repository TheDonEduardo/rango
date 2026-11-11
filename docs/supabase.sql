-- Rango: tabla de progreso para las cuentas (ver src/sync.js y docs/persistencia.md).
-- Ejecútalo una vez en el editor SQL del proyecto de Supabase (región de Frankfurt).

create table if not exists public.progreso (
  user_id uuid primary key references auth.users (id) on delete cascade,
  estado jsonb not null,
  actualizado timestamptz not null default now()
);

-- Cada usuario solo puede leer y escribir su propia fila.
alter table public.progreso enable row level security;
drop policy if exists "progreso propio" on public.progreso;
create policy "progreso propio" on public.progreso
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Borrado de cuenta desde la app (RGPD): elimina el usuario y, en cascada, su progreso.
create or replace function public.borrar_cuenta()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.borrar_cuenta() from public, anon;
grant execute on function public.borrar_cuenta() to authenticated;
