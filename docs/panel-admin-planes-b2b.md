# Panel administrador — Planes Negocio / Empresa por la web

*Decisión 3-oct-2026: Plus Hogar se vende dentro de la app (Google Play / App Store). Negocio, Empresa y Corporativo se venden por la web o por ventas directas y se activan desde el panel.*

## ¿Las tiendas lo permiten?

**Sí, con condiciones.**

| | Apple App Store | Google Play |
|---|---|---|
| Regla | Guía **3.1.3(c) "Enterprise Services"**: si el servicio se vende directamente a organizaciones para sus empleados o equipos, puede cobrarse fuera de la compra dentro de la app. | La facturación de Play es obligatoria solo para lo que se **compra dentro de la app**. Una app puede dar acceso a algo comprado fuera ("solo consumo") si la app no dirige al usuario a pagar fuera. |
| Qué NO hacer en la app | Botones, enlaces o textos tipo "Paga más barato en la web" (Guía 3.1.1). En la tienda de EE. UU. ya se permiten enlaces externos, pero en Colombia y el resto no. | Enlaces o botones a Wompi / Mercado Pago, o mostrar precios de planes pagados fuera. |
| Qué SÍ se puede | Mostrar "Plan Empresa — gestionado por tu organización" a quien ya lo tiene. Iniciar sesión con una cuenta activada en la web. | Lo mismo. |
| Riesgo | Si se vendiera Negocio a personas sueltas (no a empresas), Apple podría exigir la compra dentro de la app. Mantenerlo como producto para equipos (con factura a NIT, varios usuarios). | Bajo, siempre que la app no anuncie el pago externo. |

**Reglas para la app:**
1. Dentro de la app, la pantalla de planes muestra **solo Gratis y Plus Hogar** (compra dentro de la app).
2. Negocio y Empresa no aparecen con precio ni con botón de compra en la app. Como mucho, un texto neutro en el perfil: "¿Eres una empresa? Escríbenos a ventas@algofalta.com" (aceptado como contacto, sin enlace de pago). Por seguridad, ese texto puede ocultarse en la versión iOS hasta pasar la primera revisión.
3. Los planes y precios B2B se muestran en la **landing** (`algofalta.com/empresas`) y en el panel.

## Funciones del panel

### 1. Organizaciones
- Crear empresa: razón social, NIT / RUC / RFC según país, país, moneda, contacto, correo de facturación.
- Miembros: invitar por correo o celular, roles (dueño, aprobador, comprador, miembro), límite de cupos según plan.

### 2. Activar plan (dos formas)

**A. Manual** (transferencia, consignación, pago por fuera, convenio, cortesía):
- Campos: plan (Negocio / Empresa / Corporativo / Plus Hogar cortesía), cupos, fecha de inicio, fecha de fin, precio pactado, moneda, medio de pago, referencia del pago, nota, archivo del comprobante.
- Botón "Activar" → se crea el derecho de uso y los miembros lo ven al instante en la app.
- Botón "Generar factura" → Alegra (factura electrónica DIAN) cuando sea Colombia.

**B. Enlace de pago** (recomendado para no conciliar a mano):
- Botón "Crear enlace de pago" → genera un link de **Wompi** (CO) o **Mercado Pago** (MX, PE, CL, AR) con el monto y la referencia de la organización.
- Se envía al cliente por correo o WhatsApp (fuera de la app).
- Cuando el pago se aprueba, el webhook de la pasarela activa el plan solo y emite la factura.
- Para cobro recurrente: suscripción con tarjeta tokenizada (Wompi y Mercado Pago lo permiten) o enlace nuevo cada mes / año.

### 3. Seguimiento
- Estado: activo, por vencer (7 días), vencido (periodo de gracia 5 días), suspendido, cancelado.
- Recordatorios automáticos de renovación por correo/WhatsApp con el enlace de pago.
- Historial y bitácora: quién activó, cambió o canceló cada plan y cuándo (auditoría).
- Métricas: ingresos mensuales recurrentes (MRR) por plan y país, cupos usados, créditos del bot consumidos vs. margen ≥ 30 %.

## Modelo de datos (Supabase)

```sql
organizations (id, name, tax_id, country, currency, billing_email, created_at)
org_members   (org_id, user_id, role, invited_at, joined_at)
entitlements  (id, owner_type /* user | org */, owner_id, plan, seats,
               source /* play | appstore | web_wompi | web_mp | manual */,
               starts_at, ends_at, status, external_ref, price, currency, notes,
               created_by, created_at)
payments      (id, entitlement_id, provider, provider_ref, amount, currency,
               status, paid_at, invoice_id /* Alegra */)
admin_audit   (id, admin_id, action, target, before, after, at)
```

La app consulta solo `entitlements` vigentes del usuario o de sus organizaciones: no le importa si el plan vino de Google, Apple, la web o una activación manual. Las compras dentro de la app (Plus Hogar) llegan por RevenueCat o por las notificaciones del servidor de Google y Apple y se guardan en la misma tabla con `source = play | appstore`.

## Seguridad
- El panel está separado de la app (p. ej. `admin.algofalta.com`), con acceso por roles y doble factor.
- Las activaciones manuales requieren referencia de pago o motivo y quedan en `admin_audit`.
- Los webhooks de las pasarelas se validan con su firma antes de activar nada.

## Prototipo

`admin/index.html` (abrir en el navegador). Tiene tres pestañas:
- **Precios por país:** tabla editable de precios por país (Plus mensual y anual, Negocio, Empresa, IVA y tasa de cambio) y cuánto queda por cliente, con alerta si el margen baja de 30 %.
- **Activar plan:** activación manual, enlace de Wompi o enlace de Mercado Pago, con envío por WhatsApp o correo.
- **Planes activos:** estados activo / por vencer / pendiente / vencido / cancelado.

Los datos se guardan solo en el navegador; los enlaces de pago son simulados hasta conectar el backend (Wompi `/payment_links`, Mercado Pago `/checkout/preferences`).

### Menú lateral y sección Correos

El menú del prototipo ahora está en una barra lateral izquierda (Planes y precios · Comunicación). La sección **Correos** (`admin/correos.js`) incluye 31 plantillas editables: autenticación (6), cuenta y grupos (4), suscripción y pagos (8), empresas (4), ciclo de vida/marketing (7) y legales (2), más los ajustes de envío (proveedor, remitentes, horario de marketing, pie legal y registros DNS: SPF, DKIM, DMARC). Los correos de autenticación se copian a *Supabase Auth → Email Templates*; el resto sale por Resend / Postmark / SES con un proceso diario para los recordatorios por días.
