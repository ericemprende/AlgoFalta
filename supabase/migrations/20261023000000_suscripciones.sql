-- AlgoFalta · Suscripciones de Plus Hogar y Pro Hogar
-- Un solo registro de derechos (entitlements), venga el pago de la web (Mercado Pago), de Google Play o
-- de App Store (vía RevenueCat) o de una activación manual. profiles.plan se calcula a partir de aquí:
-- nadie lo cambia a mano y la app no necesita saber de dónde vino el pago.

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('plus', 'pro', 'negocio', 'empresa', 'corporativo')),
  source text not null check (source in ('mercadopago', 'play', 'appstore', 'manual')),
  external_id text not null,              -- id de la suscripción en la pasarela o en RevenueCat
  status text not null check (status in ('pending', 'active', 'cancelled', 'expired', 'paused')),
  cycle text check (cycle in ('monthly', 'yearly')),
  amount bigint,                          -- en unidades de la moneda (COP sin centavos)
  currency text not null default 'COP',
  expires_at timestamptz,                 -- hasta cuándo tiene el plan (aunque haya cancelado la renovación)
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, external_id)
);
create index on public.entitlements (user_id);
alter table public.entitlements enable row level security;
create policy "veo mis suscripciones" on public.entitlements for select using (user_id = auth.uid() or public.is_admin());

-- Plan vigente: el mayor entre los derechos que no han vencido. Cancelar la renovación no quita el plan
-- hasta que vence lo pagado.
create or replace function public.refresh_plan(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare best text; old text;
begin
  select plan into best from public.entitlements
   where user_id = p_user and status in ('active', 'cancelled') and (expires_at is null or expires_at > now())
   order by array_position(array['corporativo', 'empresa', 'negocio', 'pro', 'plus'], plan) limit 1;
  select plan into old from public.profiles where id = p_user;
  update public.profiles set plan = coalesce(best, 'free'),
         plan_renews_at = (select max(expires_at) from public.entitlements
                            where user_id = p_user and plan = best and status in ('active', 'cancelled'))
   where id = p_user;
  -- Correo de bienvenida al plan cuando sube de nivel.
  if best is not null and best is distinct from old then
    perform public.enqueue_email(u.email, 'plan_activated', 'plan:' || p_user || ':' || best || ':' || current_date,
      jsonb_build_object('plan', best)) from auth.users u where u.id = p_user and u.email is not null;
  end if;
  return coalesce(best, 'free');
end $$;
revoke all on function public.refresh_plan(uuid) from public, anon, authenticated;

create or replace function public.entitlements_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_plan(coalesce(new.user_id, old.user_id));
  return null;
end $$;
create trigger on_entitlement_change after insert or update or delete on public.entitlements
  for each row execute function public.entitlements_changed();

-- Cada hora: quien venció vuelve a su plan (si un webhook se perdió, el plan no queda abierto para siempre).
select cron.schedule('vencer-planes', '15 * * * *', $$
  update public.entitlements set status = 'expired', updated_at = now()
   where status in ('active', 'cancelled') and expires_at < now() - interval '3 days';
$$);
