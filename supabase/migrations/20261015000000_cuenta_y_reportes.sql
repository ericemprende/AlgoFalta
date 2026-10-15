-- AlgoFalta · eliminar cuenta desde la app y reportar contenido (requisitos de Google Play).

-- ─────────────────────────── Compras de usuarios eliminados ───────────────────────────
-- Al borrar una cuenta, sus compras quedan en el grupo como "Usuario eliminado" (paid_by nulo)
-- para no alterar las cuentas de los demás.
alter table public.purchases alter column paid_by drop not null;
alter table public.purchases alter column created_by drop not null;
alter table public.purchases drop constraint purchases_paid_by_fkey,
  add constraint purchases_paid_by_fkey foreign key (paid_by) references public.profiles (id) on delete set null;
alter table public.purchases drop constraint purchases_created_by_fkey,
  add constraint purchases_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null;

-- ─────────────────────────── Ver el nombre de quienes comparten hogar ───────────────────────────
create policy "veo perfiles de mis hogares" on public.profiles for select using (
  exists (select 1 from public.household_members a join public.household_members b on b.household_id = a.household_id
           where a.user_id = auth.uid() and b.user_id = profiles.id)
);

-- ─────────────────────────── Eliminar mi cuenta ───────────────────────────
-- Hogares que comparto: pasan al miembro más antiguo. Hogares donde estoy solo: se borran.
-- Después se borra el usuario de auth y, en cascada, su perfil y membresías.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h record; heir uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  for h in select id from public.households where owner_id = me loop
    select user_id into heir from public.household_members
      where household_id = h.id and user_id <> me order by joined_at limit 1;
    if heir is null then
      delete from public.households where id = h.id;
    else
      update public.households set owner_id = heir where id = h.id;
      update public.household_members set role = 'owner' where household_id = h.id and user_id = heir;
    end if;
  end loop;
  update public.items set added_by = null where added_by = me;
  update public.items set checked_by = null where checked_by = me;
  delete from public.invitations where invited_by = me;
  delete from auth.users where id = me;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ─────────────────────────── Reportes ───────────────────────────
-- Reportar a un miembro, un producto o una respuesta de la IA. Solo los admins los leen.
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null default auth.uid(),
  household_id uuid references public.households (id) on delete set null,
  target_kind text not null check (target_kind in ('member', 'item', 'ai_reply', 'other')),
  target_id text check (char_length(target_id) <= 80),
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reporto" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and (household_id is null or public.is_member(household_id)));
create policy "admins ven reportes" on public.reports for select using (public.is_admin());
create policy "admins gestionan reportes" on public.reports for update using (public.is_admin());
