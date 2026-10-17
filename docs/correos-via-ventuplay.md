# Correos de AlgoFalta salen desde VentuPlay

AlgoFalta no tiene su propio envío de correos ni su llave de Resend. Le pide a VentuPlay que envíe, con el remitente `AlgoFalta <hola@algofalta.com>` (dominio verificado en Resend).

## Contrato

```
POST https://<dominio-de-ventuplay>/api/partner/email
Authorization: Bearer <ALGOFALTA_EMAIL_KEY>
Idempotency-Key: <único por correo, ej. "welcome:<user_id>">
Content-Type: application/json

{ "to": "ana@correo.com", "kind": "welcome", "data": { "name": "Ana" } }
```

| `kind` | `data` |
| --- | --- |
| `welcome` | `name`, `url` (opcional) |
| `group_invite` | `name`, `inviter`, `group`, `url` (enlace de invitación en algofalta.com) |
| `plan_activated` | `name`, `plan`, `url` (opcional) |

- `url` solo se acepta si es `https://algofalta.com/...` o un subdominio; si no, el botón apunta a la home.
- La misma `Idempotency-Key` no envía el correo dos veces (Resend la recuerda 24 h).

## Respuestas y qué hace AlgoFalta

| Código | Significado | Acción |
| --- | --- | --- |
| 200 | Enviado | Marcar como enviado |
| 400 | Petición mal hecha | No reintentar; revisar el código |
| 401 | Llave incorrecta | No reintentar; revisar la variable |
| 429 / 503 | Resend o VentuPlay no disponibles | **Dejar el correo en la cola y reintentar** (1 min, 5 min, 30 min, 6 h) |

Regla de resiliencia: AlgoFalta nunca bloquea al usuario por un correo. Guarda el correo pendiente en una tabla (`email_outbox`) y un proceso lo reintenta. Si VentuPlay se cae, solo se retrasa el correo.

## Variables

Misma clave en los dos proyectos (32+ caracteres, inventada por ti, nunca en el repo):

- VentuPlay (Vercel): `ALGOFALTA_EMAIL_KEY`, y `RESEND_API_KEY` que ya tiene.
- AlgoFalta: `VENTUPLAY_EMAIL_URL` y `VENTUPLAY_EMAIL_KEY` (el mismo valor).

## Correos de login (confirmar cuenta, recuperar clave)

**Actualizado 2026-10-16:** también salen por VentuPlay. La función `public.send_auth_email` (Send Email Hook de Supabase, migración `20261016000000`) manda el código con `kind: "login_code"` y `data.code`. No hace falta SMTP. Lo de abajo queda solo como alternativa.

Antes: esos los envía Supabase, no el código. En el proyecto Supabase de AlgoFalta: Authentication → SMTP → Resend (`smtp.resend.com`, puerto 465, usuario `resend`, contraseña = una llave de Resend) con remitente `hola@algofalta.com`. Las plantillas con la marca AlgoFalta se agregan después.
