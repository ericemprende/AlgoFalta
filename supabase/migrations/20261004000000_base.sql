-- AlgoFalta · esquema base
-- Hogares (grupos) con listas compartidas, "Cuentas claras" y planes.
-- Regla de oro: cada persona solo ve los hogares de los que es miembro (RLS en todas las tablas).

-- ─────────────────────────── Perfiles ───────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  country text not null default 'CO' check (country ~ '^[A-Z]{2}$'),
  plan text not null default 'free' check (plan in ('free', 'plus', 'negocio', 'empresa', 'corporativo')),
  plan_renews_at timestamptz,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "leo mi perfil" on public.profiles for select using (id = auth.uid() or public.is_admin());
-- Solo el nombre es editable por el usuario; plan y rol los cambia el servidor.
create policy "edito mi perfil" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name, country) on public.profiles to authenticated;

-- ─────────────────────────── Hogares ───────────────────────────
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  currency text not null default 'COP' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index on public.household_members (user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create or replace function public.is_member(h uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members where household_id = h and user_id = auth.uid());
$$;

create policy "veo mis hogares" on public.households for select using (public.is_member(id) or public.is_admin());
create policy "dueño edita hogar" on public.households for update using (owner_id = auth.uid());
create policy "dueño borra hogar" on public.households for delete using (owner_id = auth.uid());
create policy "veo miembros de mis hogares" on public.household_members for select using (public.is_member(household_id) or public.is_admin());
-- Salir de un hogar: uno mismo. Sacar a otro: el dueño.
create policy "salgo o el dueño me saca" on public.household_members for delete using (
  user_id = auth.uid() or exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid())
);

-- Crear hogar pasa por una función: crea el hogar y mete al creador como dueño, en un solo paso.
create or replace function public.create_household(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.households (name, owner_id) values (trim(p_name), auth.uid()) returning id into h;
  insert into public.household_members (household_id, user_id, role) values (h, auth.uid(), 'owner');
  return h;
end $$;
revoke all on function public.create_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;

-- ─────────────────────────── Invitaciones ───────────────────────────
-- Plan gratis: hasta 8 personas por hogar (mismo límite que los grupos de WhatsApp).
create table public.invitations (
  token text primary key default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  household_id uuid not null references public.households (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  email text check (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.invitations enable row level security;
create policy "miembros ven invitaciones" on public.invitations for select using (public.is_member(household_id));

create or replace function public.invite_to_household(p_household uuid, p_email text default null)
returns text language plpgsql security definer set search_path = public as $$
declare t text; inviter text; hname text;
begin
  if not public.is_member(p_household) then raise exception 'not_member'; end if;
  if (select count(*) from public.household_members where household_id = p_household) >= 8 then raise exception 'household_full'; end if;
  insert into public.invitations (household_id, invited_by, email) values (p_household, auth.uid(), nullif(lower(trim(p_email)), ''))
    returning token into t;
  if p_email is not null and trim(p_email) <> '' then
    select display_name into inviter from public.profiles where id = auth.uid();
    select name into hname from public.households where id = p_household;
    perform public.enqueue_email(lower(trim(p_email)), 'group_invite', 'invite:' || t,
      jsonb_build_object('inviter', inviter, 'group', hname, 'url', 'https://algofalta.com/unirme/' || t));
  end if;
  return t;
end $$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.invitations;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into inv from public.invitations where token = p_token for update;
  if inv is null or inv.used_at is not null or inv.expires_at < now() then raise exception 'invalid_invitation'; end if;
  if (select count(*) from public.household_members where household_id = inv.household_id) >= 8 then raise exception 'household_full'; end if;
  insert into public.household_members (household_id, user_id) values (inv.household_id, auth.uid()) on conflict do nothing;
  update public.invitations set used_at = now() where token = p_token;
  return inv.household_id;
end $$;
revoke all on function public.invite_to_household(uuid, text) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.invite_to_household(uuid, text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;

-- ─────────────────────────── Listas e ítems ───────────────────────────
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null default 'Mercado' check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);
create index on public.lists (household_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  quantity text check (char_length(quantity) <= 30),
  category text check (char_length(category) <= 30),
  added_by uuid references public.profiles (id) on delete set null,
  source text not null default 'app' check (source in ('app', 'whatsapp')),
  checked_at timestamptz,
  checked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.items (list_id) where checked_at is null;

alter table public.lists enable row level security;
alter table public.items enable row level security;
create policy "miembros usan listas" on public.lists for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "miembros usan ítems" on public.items for all using (public.is_member(household_id))
  with check (public.is_member(household_id) and exists (select 1 from public.lists l where l.id = list_id and l.household_id = items.household_id));

-- ─────────────────────────── Cuentas claras ───────────────────────────
-- Cada compra guarda quién pagó y cuánto. Montos en unidades enteras de la moneda (COP no usa centavos).
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  paid_by uuid not null references public.profiles (id) on delete restrict,
  amount bigint not null check (amount > 0),
  store text check (char_length(store) <= 60),
  note text check (char_length(note) <= 200),
  purchased_at date not null default current_date,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.purchases (household_id, purchased_at desc);
alter table public.purchases enable row level security;
create policy "miembros ven compras" on public.purchases for select using (public.is_member(household_id));
create policy "miembros registran compras" on public.purchases for insert with check (
  public.is_member(household_id) and created_by = auth.uid()
  and exists (select 1 from public.household_members m where m.household_id = purchases.household_id and m.user_id = paid_by)
);
create policy "quien la registró la corrige" on public.purchases for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "quien la registró la borra" on public.purchases for delete using (created_by = auth.uid());

-- Balance por persona: lo que pagó menos su parte en partes iguales. Positivo = le deben.
create or replace view public.household_balances with (security_invoker = true) as
select m.household_id, m.user_id,
       coalesce(p.paid, 0) as paid,
       round(t.total::numeric / t.members) as fair_share,
       coalesce(p.paid, 0) - round(t.total::numeric / t.members) as balance
  from public.household_members m
  join lateral (
    select coalesce(sum(amount), 0) as total,
           (select count(*) from public.household_members x where x.household_id = m.household_id) as members
      from public.purchases where household_id = m.household_id
  ) t on true
  left join lateral (
    select sum(amount) as paid from public.purchases where household_id = m.household_id and paid_by = m.user_id
  ) p on true;

-- ─────────────────────────── Correos (vía VentuPlay) ───────────────────────────
-- AlgoFalta no envía correos: los deja en esta cola y un proceso los entrega a VentuPlay.
-- Si VentuPlay o Resend fallan, el correo espera y se reintenta (1 min, 5 min, 30 min, 6 h). Nunca bloquea al usuario.
create table public.email_outbox (
  id bigint generated always as identity primary key,
  to_email text not null,
  kind text not null check (kind in ('welcome', 'group_invite', 'plan_activated')),
  idempotency_key text not null unique,
  data jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index on public.email_outbox (next_attempt_at) where status = 'pending';
alter table public.email_outbox enable row level security;
create policy "admins ven correos" on public.email_outbox for select using (public.is_admin());

create or replace function public.enqueue_email(p_to text, p_kind text, p_key text, p_data jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.email_outbox (to_email, kind, idempotency_key, data)
  values (p_to, p_kind, p_key, coalesce(p_data, '{}'))
  on conflict (idempotency_key) do nothing;
$$;
revoke all on function public.enqueue_email(text, text, text, jsonb) from public, anon, authenticated;

-- ─────────────────────────── Alta de usuario ───────────────────────────
-- Al registrarse: perfil + correo de bienvenida en la cola.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare n text := left(coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', ''), 80);
begin
  insert into public.profiles (id, display_name) values (new.id, n) on conflict do nothing;
  if new.email is not null then
    perform public.enqueue_email(new.email, 'welcome', 'welcome:' || new.id, jsonb_build_object('name', n));
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Tiempo real para que la lista se actualice en todos los teléfonos.
alter publication supabase_realtime add table public.items, public.purchases;
