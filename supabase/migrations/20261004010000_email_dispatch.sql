-- AlgoFalta · entrega de correos a VentuPlay desde la propia base de datos.
-- Cada minuto: revisa las respuestas de los envíos anteriores y manda los pendientes.
-- Requiere (una sola vez, en el SQL Editor, sin guardar la llave en el repo):
--   select vault.create_secret('<la misma ALGOFALTA_EMAIL_KEY de VentuPlay>', 'ventuplay_email_key');
--   select vault.create_secret('https://ventuplay.com/api/partner/email', 'ventuplay_email_url');

create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.email_outbox add column if not exists request_id bigint;

create or replace function public.dispatch_emails(p_limit int default 20)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  k text := (select decrypted_secret from vault.decrypted_secrets where name = 'ventuplay_email_key');
  u text := (select decrypted_secret from vault.decrypted_secrets where name = 'ventuplay_email_url');
  r record;
  backoff interval[] := array['1 minute', '5 minutes', '30 minutes', '6 hours']::interval[];
begin
  if k is null or u is null then return; end if;

  -- 1) Resultado de los envíos en curso.
  for r in
    select o.id, o.attempts, h.status_code, h.timed_out, h.error_msg, h.content
      from public.email_outbox o
      join net._http_response h on h.id = o.request_id
     where o.status = 'pending' and o.request_id is not null
  loop
    if r.status_code = 200 then
      update public.email_outbox set status = 'sent', sent_at = now(), request_id = null, last_error = null where id = r.id;
    elsif r.status_code in (400, 401) or r.attempts >= 5 then
      -- Error nuestro (datos o llave): no tiene sentido reintentar.
      update public.email_outbox set status = 'failed', request_id = null,
             last_error = coalesce(r.status_code::text, 'timeout') || ' ' || left(coalesce(r.content, r.error_msg, ''), 200)
       where id = r.id;
    else
      -- VentuPlay o Resend caídos: esperar y reintentar.
      update public.email_outbox set request_id = null,
             next_attempt_at = now() + backoff[least(r.attempts, array_length(backoff, 1))],
             last_error = coalesce(r.status_code::text, 'timeout') || ' ' || left(coalesce(r.content, r.error_msg, ''), 200)
       where id = r.id;
    end if;
  end loop;

  -- Peticiones que nunca respondieron (pg_net borra respuestas viejas): volver a intentar.
  update public.email_outbox set request_id = null, next_attempt_at = now()
   where status = 'pending' and request_id is not null and next_attempt_at < now() - interval '15 minutes'
     and not exists (select 1 from net._http_response h where h.id = request_id);

  -- 2) Enviar los que tocan.
  for r in
    select id, to_email, kind, idempotency_key, data from public.email_outbox
     where status = 'pending' and request_id is null and next_attempt_at <= now()
     order by next_attempt_at limit p_limit
     for update skip locked
  loop
    update public.email_outbox set attempts = attempts + 1, next_attempt_at = now(),
           request_id = net.http_post(
             url := u,
             headers := jsonb_build_object('authorization', 'Bearer ' || k, 'idempotency-key', r.idempotency_key, 'content-type', 'application/json'),
             body := jsonb_build_object('to', r.to_email, 'kind', r.kind, 'data', r.data),
             timeout_milliseconds := 15000)
     where id = r.id;
  end loop;
end $$;
revoke all on function public.dispatch_emails(int) from public, anon, authenticated;

select cron.schedule('algofalta-dispatch-emails', '* * * * *', 'select public.dispatch_emails()');
