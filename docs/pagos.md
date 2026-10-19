# Pagos: Plus Hogar y Pro Hogar

*19-oct-2026 · Primera versión.*

## Cómo se cobra

| Dónde paga la persona | Pasarela | Comisión aprox. | Estado |
|---|---|---|---|
| Web `algofalta.com/suscribirme` | **Mercado Pago** (tarjeta, PSE, Nequi), suscripción con cobro automático | ~3,3 % + IVA | Construido, falta configurar llaves |
| App Android | **Google Play** vía **RevenueCat** | 15 % | Servidor listo; falta la compra dentro de la app |
| App iPhone | **App Store** vía RevenueCat | 15 % | Pendiente cuenta Apple Developer |
| Negocio / Empresa | Enlace de pago o manual (ver `panel-admin-planes-b2b.md`) | — | Pendiente |

Todo termina en una sola tabla, **`entitlements`** (migración `20261023000000_suscripciones.sql`): quién, qué plan, de dónde vino el pago y hasta cuándo. Un disparador recalcula `profiles.plan` solo, así que la app y los límites (por ejemplo, «Mercado más barato»: Gratis 5, Plus 15, Pro sin límite) no necesitan saber de dónde vino el pago.

- Cancelar la renovación no quita el plan: dura hasta `expires_at`.
- Cada hora, lo vencido hace más de 3 días pasa a `expired` y el usuario vuelve a Gratis (por si se pierde un aviso de la pasarela).
- Al subir de plan se encola el correo `plan_activated`.

## Precios (COP, IVA incluido)

| Plan | Mensual | Anual |
|---|---|---|
| Plus Hogar | $12.900 | $129.000 (2 meses gratis) |
| Pro Hogar | $19.900 | **$199.000** (2 meses gratis; propuesto, no estaba en la landing) |

Se cambian en `PRECIOS` de `supabase/functions/pagos/index.ts` y en `landing/suscribirme.html`. El cobro web es solo en pesos colombianos; para otros países se agrega la moneda de Mercado Pago de cada uno.

## Configurar Mercado Pago (una vez)

1. En [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel/app), crea una aplicación. Producto: **Suscripciones**.
2. Copia el **Access Token** (primero el de prueba, `TEST-...`; al lanzar, el de producción).
3. En la app de Mercado Pago → **Webhooks**: URL `https://zsnxudrexkvakkhsjicx.supabase.co/functions/v1/pagos?origen=mercadopago`, eventos **Planes y suscripciones**. Copia la **clave secreta** de la firma.
4. En la terminal:

```bash
npx supabase login
npx supabase link --project-ref zsnxudrexkvakkhsjicx
npx supabase db push
npx supabase secrets set MP_ACCESS_TOKEN=TEST-xxxx MP_WEBHOOK_SECRET=xxxx
npx supabase functions deploy pagos --no-verify-jwt
```

`--no-verify-jwt` es necesario porque Mercado Pago y RevenueCat avisan sin sesión de usuario. La función revisa la sesión ella misma cuando un usuario inicia un pago y verifica la firma de cada aviso.

**Probar:** abre `https://www.algofalta.com/suscribirme?plan=pro`, entra con tu correo y paga con una [tarjeta de prueba de Mercado Pago](https://www.mercadopago.com.co/developers/es/docs/subscriptions/additional-content/your-integrations/test/cards). Luego en Supabase: `select * from entitlements;` y `select plan from profiles where id = '<tu id>';` deben mostrar `pro`.

## Configurar Google Play + RevenueCat (para la app Android)

1. En Play Console → **Monetización → Suscripciones**: crea `plus_mensual`, `plus_anual`, `pro_mensual`, `pro_anual` con los mismos precios.
2. Crea una cuenta gratis en [RevenueCat](https://www.revenuecat.com), conecta Google Play (cuenta de servicio) y crea dos **entitlements** con identificador exacto `plus` y `pro`; asigna los productos.
3. En RevenueCat → **Integrations → Webhooks**: URL `https://zsnxudrexkvakkhsjicx.supabase.co/functions/v1/pagos?origen=revenuecat` y en *Authorization header* `Bearer <una clave larga al azar>`.
4. `npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=<esa misma clave>`
5. Falta en la app: instalar `react-native-purchases`, identificar al usuario con su id de Supabase (`Purchases.logIn(userId)`) y una pantalla «Mejorar plan». Requiere un *development build* (no funciona en Expo Go). **Pendiente** hasta tener la cuenta de RevenueCat.

## Reglas de las tiendas

- En la **app** no puede haber enlaces ni botones al pago web (Google y Apple lo prohíben para suscripciones digitales). En Android se paga con Google Play; la web es para quien entra por algofalta.com.
- Quien pagó en la web ve su plan activo en la app (mismo correo), y eso sí está permitido.
- La app sí puede mostrar el plan actual y sus límites (por ejemplo, «Tu plan Gratis optimiza 5 productos»).
