# Armar mi mercado más barato

*19-oct-2026 · Primera versión.*

## Qué hace

En la pestaña **Ahorro** de cada hogar, el usuario elige supermercados y toca «Armar mi mercado más barato». AlgoFalta busca cada producto pendiente de la lista en esas tiendas, compara por **kilo, litro o unidad** (las tiendas venden tamaños distintos) y muestra:

- dónde comprar cada cosa y el producto exacto (con enlace a la tienda),
- el total comprando cada cosa donde está más barata,
- el total si compra todo en un solo lugar,
- cuánto ahorra frente a la tienda más barata.

## Límites por plan

| Plan | Productos optimizados por consulta |
|---|---|
| Gratis | 5 |
| Plus Hogar | 15 |
| Pro Hogar, Negocio, Empresa, Corporativo | Sin límite |

Se cambian en `public.cheapest_cart_limit()` (migración `20261019000000_mercado_barato.sql`). Los productos que pasan el límite aparecen como «quedaron por fuera», con invitación a ver los planes.

## Tiendas

Catálogo público VTEX: **Éxito, Carulla, Jumbo / Metro, Olímpica, Megatiendas, Mercaldas**. Makro no responde por esa vía. **D1 y Ara no tienen catálogo en línea**: para ellas el camino son precios colaborativos (lo que pagan los usuarios) o acuerdos.

Para agregar una tienda VTEX: probar `https://<dominio>/api/catalog_system/pub/products/search?ft=arroz` y sumarla a `STORES` en `supabase/functions/mercado-barato/precios.ts` y a `TIENDAS` en `mobile/src/components/Ahorro.tsx`.

## Cómo se mantienen los precios al día

1. **En vivo:** cada consulta pregunta a la tienda si el precio guardado tiene más de **6 horas**.
2. **Caché (`price_cache`):** evita consultar la tienda en cada uso. Si la tienda no responde, se usa el último precio guardado.
3. **Cron nocturno (03:00 Colombia):** refresca las 200 búsquedas más usadas con más de 12 h, para que casi siempre estén frescas.
4. **Historial (`price_history`):** guarda cada precio visto (precio actual y precio de lista) por tienda y día. Es la base de la fase siguiente.

La app muestra «precio consultado hace X h» y el aviso «precios de referencia, pueden variar en tu sede».

## Precios oficiales en la lista (base de precios)

*18-oct-2026.* La pestaña **Lista** muestra junto a cada producto el precio más barato hoy en las tiendas en línea y en cuál. No hay precios escritos a mano: todos salen de los catálogos públicos de las tiendas.

- **`catalog_products`**: productos frecuentes (nombre, categoría, emoji, presentación). Es la cuadrícula para agregar con un toque. Para sumar productos basta con insertar filas.
- **`product_prices`**: por producto y tienda, el producto exacto elegido (comparado por kilo, litro o unidad), su precio, el precio antes de descuento, el enlace y la fecha. La leen todos los usuarios con sesión y solo la escribe la función.
- **Cómo crece:** cada consulta de Ahorro guarda lo encontrado. La lista pide `{ mode: "prices", names }` para lo que aún no tiene precio (máximo 20 por llamada). El cron nocturno refresca todo el catálogo. Cada nombre nuevo que escriben los usuarios queda en la base.
- Lo que no se vende en línea (tienda de barrio, D1, Ara) queda «sin precio en tiendas» y no suma al total.

Para activarlo: aplicar `20261020000000_precios_oficiales.sql` y volver a desplegar la función `mercado-barato`.

## Siguiente fase: alertas de ofertas

Con `price_history` ya guardándose:

- **Oferta:** `price < list_price` (la tienda lo marca en descuento).
- **Bajó de verdad:** precio de hoy por debajo del mínimo o del promedio de los últimos 30 a 90 días (evita los «descuentos» sobre precios inflados).
- Alertas para los productos que el hogar o la empresa sigue: **Pro Hogar** (hasta 30 productos) y **Negocio / Empresa** (sus insumos y proveedores).
- Notificación push y resumen semanal por correo.

## Puesta en marcha (una vez)

Requiere la CLI de Supabase con sesión iniciada (`npx supabase login`) y el proyecto enlazado (`npx supabase link --project-ref zsnxudrexkvakkhsjicx`).

```bash
npx supabase db push                                  # aplica la migración
npx supabase functions deploy mercado-barato
npx supabase secrets set CRON_SECRET=<una clave larga al azar>
```

En el editor SQL de Supabase, para el cron nocturno:

```sql
select vault.create_secret('https://zsnxudrexkvakkhsjicx.supabase.co', 'project_url');
select vault.create_secret('<la misma clave de CRON_SECRET>', 'cron_secret');
```

Para probar el plan Pro con una cuenta: `update profiles set plan = 'pro' where id = '<uuid>';`

## Riesgos (ver `funciones-inteligentes-despensa-ahorro.md`)

- **Legal:** que la API sea pública no significa que su uso esté permitido. Consulta prudente (caché de 6 h, pocas tiendas a la vez, enlace a la tienda) y **revisión con un abogado antes de lanzar**; buscar acuerdos con las cadenas en paralelo.
- **Emparejar productos:** «arroz» puede dar marcas y tamaños muy distintos. La primera versión filtra por palabras de la búsqueda, tamaño parecido y precios fuera de rango. Mejora si el usuario escribe marca y tamaño («Arroz Diana 2,5 kg»).
- **Mantenimiento:** si una tienda cambia su sitio, deja de responder; la app sigue con el último precio guardado.
