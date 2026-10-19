-- AlgoFalta · Perfil con foto
-- Para que en cada hogar se sepa quién está del otro lado: foto y una frase corta, además del nombre.
-- Los ven solo las personas que comparten hogar contigo (política "veo perfiles de mis hogares").

alter table public.profiles
  add column avatar_url text check (char_length(avatar_url) <= 500),
  add column bio text not null default '' check (char_length(bio) <= 120);

grant update (display_name, country, avatar_url, bio) on public.profiles to authenticated;

-- Fotos: carpeta por usuario (avatars/<id>/...). Lectura pública por enlace; cada quien sube y borra solo las suyas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "subo mi foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cambio mi foto" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borro mi foto" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
