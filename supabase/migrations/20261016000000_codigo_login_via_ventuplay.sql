-- AlgoFalta · el código para entrar a la app también sale por VentuPlay (Send Email Hook de Supabase).
-- Se activa en el panel: Authentication → Auth Hooks → Send Email → Postgres → public.send_auth_email.
-- Usa los mismos secretos del vault que dispatch_emails: ventuplay_email_key y ventuplay_email_url.
-- No pasa por la cola: el código tiene que llegar en segundos, no en el próximo minuto.

create or replace function public.send_auth_email(event jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  k text := (select decrypted_secret from vault.decrypted_secrets where name = 'ventuplay_email_key');
  u text := (select decrypted_secret from vault.decrypted_secrets where name = 'ventuplay_email_url');
  d jsonb := event -> 'email_data';
  act text := d ->> 'email_action_type';
  to_email text := event -> 'user' ->> 'email';
  new_email text := event -> 'user' ->> 'new_email';
begin
  if k is null or u is null then
    return jsonb_build_object('error', jsonb_build_object('http_code', 500, 'message', 'Correo no configurado'));
  end if;
  -- Avisos informativos (cambió la clave, se vinculó una cuenta, etc.): por ahora no se envían.
  if act like '%_notification' then return '{}'::jsonb; end if;

  if coalesce(d ->> 'token', '') <> '' and to_email is not null then
    perform net.http_post(
      url := u,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || k,
                                    'Idempotency-Key', 'login:' || (d ->> 'token_hash')),
      body := jsonb_build_object('to', to_email, 'kind', 'login_code', 'data', jsonb_build_object('code', d ->> 'token')),
      timeout_milliseconds := 10000);
  end if;
  -- Cambio de correo: el segundo código va a la dirección nueva.
  if act = 'email_change' and coalesce(d ->> 'token_new', '') <> '' and new_email is not null then
    perform net.http_post(
      url := u,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || k,
                                    'Idempotency-Key', 'login:' || (d ->> 'token_hash_new')),
      body := jsonb_build_object('to', new_email, 'kind', 'login_code', 'data', jsonb_build_object('code', d ->> 'token_new')),
      timeout_milliseconds := 10000);
  end if;
  return '{}'::jsonb;
end $$;

revoke all on function public.send_auth_email(jsonb) from public, anon, authenticated;
grant execute on function public.send_auth_email(jsonb) to supabase_auth_admin;
