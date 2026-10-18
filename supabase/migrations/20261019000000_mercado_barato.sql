-- AlgoFalta · «Armar mi mercado más barato»
-- Los precios se consultan en vivo a las tiendas (función mercado-barato) y se guardan 6 h en price_cache.
-- Cada noche un cron refresca las búsquedas más usadas para que casi siempre estén frescas.

-- Plan Pro Hogar (aprobado el 4-oct-2026) no estaba en la lista de planes.
alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'plus', 'pro', 'negocio', 'empresa', 'corporativo'));

-- Productos que cada plan puede optimizar por consulta. null = ilimitado.
create or replace function public.cheapest_cart_limit(p_plan text)
returns int language sql immutable as $$
  select case p_plan when 'free' then 5 when 'plus' then 15 else null end;
$$;

-- Caché de resultados por tienda y búsqueda normalizada. Solo la usa la función (service role).
create table public.price_cache (
  store text not null,
  query text not null,
  results jsonb not null default '[]',
  hits int not null default 1,
  fetched_at timestamptz not null default now(),
  primary key (store, query)
);
create index on public.price_cache (fetched_at);
alter table public.price_cache enable row level security;
create policy "admins ven precios" on public.price_cache for select using (public.is_admin());

-- Supermercados que el hogar eligió para comparar (lo recuerda la app).
alter table public.households add column cheap_stores text[] not null default '{exito,olimpica,jumbo}';

-- Refresco nocturno (03:00 hora Colombia = 08:00 UTC): llama a la función en modo «refresh».
-- Requiere en Vault los secretos 'project_url' y 'cron_secret' (ver docs/mercado-barato.md).
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('refrescar-precios', '0 8 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/mercado-barato',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"mode":"refresh"}'::jsonb,
    timeout_milliseconds := 120000);
$$);

-- Historial de precios desde el primer día: base de las alertas de ofertas y «bajó de precio»
-- (Pro Hogar, Negocio y Empresa). Una fila por producto, tienda y día.
create table public.price_history (
  store text not null,
  product text not null,
  url text not null,
  price bigint not null,
  list_price bigint not null,
  day date not null default current_date,
  primary key (store, url, day)
);
create index on public.price_history (store, product);
alter table public.price_history enable row level security;
create policy "admins ven historial" on public.price_history for select using (public.is_admin());
