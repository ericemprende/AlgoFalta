# AlgoFalta — Funciones inteligentes: despensa, vencimientos y ahorro

*4-oct-2026 · Propuesta y estudio de viabilidad. **Aprobada** el 4-oct-2026: Pro Hogar a $19.900 COP (precios por país en la tabla de abajo, ya cargados en la landing y en el panel admin).*

## Resumen

| Función | ¿Se puede? | Dificultad | Costo por usuario | Dónde ponerla |
|---|---|---|---|---|
| A. Historial de compras y «se te va a acabar» | **Sí**, con lo que ya registra la app | Baja | Casi cero | **Plus Hogar** |
| B. Aviso de productos por vencer | **Sí, pero solo de forma estimada o con ayuda del usuario** (ver abajo) | Media | Bajo | **Plus Hogar** |
| C. Carrito más barato (dónde comprar cada cosa) | **Sí**, con una condición legal sobre la fuente de precios | Media-alta | Bajo (el costo es fijo, no por usuario) | **Pro Hogar** (plan nuevo) |
| D. Alertas de descuentos | **Sí**, para productos que el usuario sigue | Media | Bajo | **Pro Hogar** |

## A. Historial y «se te va a acabar»

**Cómo funciona.** Cada vez que alguien marca un producto como comprado, AlgoFalta guarda producto, cantidad, fecha, tienda y precio. Con 2 o 3 compras del mismo producto calcula cada cuánto se compra y estima cuándo se acaba.

- Ejemplo: «Compras leche cada 6 días. La última fue el 28-sep. Probablemente se acabe hoy → ¿la agregamos a la lista?»
- Es por hogar, no por persona: el grupo comparte la despensa. Si alguien compra por su cuenta, se puede ver por persona.
- Fórmula simple: mediana de los días entre compras (resiste a las compras raras) más un margen. No necesita IA, solo una consulta en la base de datos y una notificación push.
- Pantallas: «Mi despensa» (qué hay y para cuántos días), «Lo que sueles comprar cada mes» y gasto por categoría.
- Para arrancar con datos desde el primer día: **foto de la factura** (la IA lee los productos) cuesta entre USD 0,01 y 0,02 por factura. Puede ser un beneficio de Plus.

**Qué hay que construir:** tabla `purchases` (producto, cantidad, precio, fecha, quién, tienda), un proceso diario que recalcula la frecuencia por producto, y la notificación.

**Privacidad:** son hábitos de consumo del hogar. Hay que decirlo en la política de privacidad (uso de datos para recordatorios y sugerencias) y no usarlos para publicidad de terceros.

## B. Productos por vencer: lo que sí y lo que no se puede

La fecha de vencimiento está impresa en cada empaque, y **no se sabe al comprar** ni viene en los catálogos de las tiendas ni en Open Food Facts. Por eso no se puede «calcular» con exactitud. Hay tres formas, de menos a más precisa:

1. **Estimado por categoría (automático).** AlgoFalta asume una vida útil típica desde que se compra: leche fresca ~7 días, pan ~4, huevos ~21, carne fresca ~3, frutas ~5 a 7, yogur ~14, enlatados ~365. Avisa «esto probablemente se dañe pronto». Es una **guía, no una garantía**, y así debe decirlo la app.
2. **El usuario escribe la fecha (opcional).** Al marcar como comprado: «¿Fecha de vencimiento?» con selector rápido (+3 días, +1 semana, +1 mes, fecha exacta).
3. **Foto de la fecha.** La IA lee la fecha del empaque. Más cómodo, con un costo bajo por foto (centavos de dólar); se podría limitar por plan.

**Aviso:** cuando falten 2 días: «La leche del jueves vence el sábado. ¿La usan o la congelan?». Esto además ayuda a **evitar el desperdicio de comida**, un buen argumento de marketing.

**Recomendación:** lanzar con (1) + (2) y dejar (3) para después. No prometer seguridad alimentaria: el usuario debe revisar el empaque siempre.

## C. Carrito más barato

**Qué hace.** El usuario tiene su lista. AlgoFalta calcula cuánto costaría en cada supermercado cercano y dice cuál conviene, o cuál es la mejor combinación («Compra esto en D1 y esto en Éxito, ahorras $18.400»).

**De dónde salen los precios.** Es lo que más define la viabilidad:

| Fuente | Qué tan viable | Comentario |
|---|---|---|
| Catálogo web de la tienda (API pública de VTEX en Éxito, Carulla, Jumbo, Olímpica y otras) | **Técnicamente fácil.** VTEX expone en cada tienda un endpoint de búsqueda sin clave que devuelve precio, precio de lista y stock | Ver advertencia legal abajo |
| Acuerdo comercial o de afiliados con la cadena | **La mejor opción a largo plazo**: datos oficiales y permiso | Tarda y suele pedir tracción antes |
| Colaborativo (los usuarios registran el precio pagado y foto del tiquete) | Viable, mejora con la escala | Sirve para tiendas sin web (D1, Ara, tiendas de barrio) |
| Open Food Facts / Open Prices | Útil para códigos de barras y nombres, **no** como fuente de precios en Colombia | Cobertura baja allí |

**Advertencia legal (no es asesoría jurídica).** Que una API sea técnicamente pública no significa que usarla masivamente esté permitido. Los términos de uso de cada sitio pueden prohibir la extracción automática, y en Colombia un uso abusivo puede discutirse como competencia desleal (Ley 256 de 1996) o por los términos de uso. Practicar con prudencia:
- Consultar pocas veces (una o dos al día por producto, con caché), nunca saturar los servidores.
- Mostrar siempre el nombre de la tienda y llevar al usuario a su página para comprar.
- No copiar imágenes ni contenidos protegidos; los precios y nombres de producto sí son datos de uso común en comparadores.
- **Abogado antes de lanzar** y buscar acuerdos con las cadenas en paralelo.
- Decir en la app: «Precios de referencia, pueden variar en la tienda».

**D1 y Ara** (las más baratas del país) venden por tienda física y por domicilios con catálogos limitados; sus precios dependen de la sucursal. Para ellas, el camino realista es **precios colaborativos + acuerdos**.

**Qué hay que construir:**
- Un «recolector» de precios con horario (servidor barato, una vez al día) y tabla `price_history` (producto, tienda, ciudad, precio, fecha).
- Emparejar cada producto de la lista con su equivalente en cada tienda (por código de barras, o nombre más tamaño). Es la parte más difícil; la IA ayuda a emparejar.
- El optimizador: calcular el total por tienda y la mejor combinación (con un costo mínimo por desplazamiento para que no recomiende ir a 4 tiendas por ahorrar $500).

## D. Alertas de descuentos

**Qué hace.** El usuario marca productos como «Seguir» (o AlgoFalta sigue automáticamente los que más compra, por A). Si el precio baja de su precio habitual (por ejemplo 15 % o más) o aparece una promoción, llega una notificación: «El aceite que compras está 22 % más barato en Éxito hasta el domingo».

- **Se puede rastrear** con el mismo recolector de C: el precio de lista (`ListPrice`) frente al precio actual muestra el descuento, y el historial de precios (`price_history`) dice si el descuento es real o si el precio venía subido.
- Límite por plan para controlar costos: por ejemplo hasta 30 productos seguidos.
- **Detalle útil:** con el historial se puede mostrar «mínimo de los últimos 90 días», que genera confianza.

## Plan nuevo: Pro Hogar

Propuesta: **Plus Hogar** pasa a incluir A y B (despensa, «se te acaba», vencimientos estimados). **Pro Hogar** incluye todo Plus más C y D (carrito más barato y alertas de descuento). El argumento de venta: *«Pro se paga solo: te ahorra más de lo que cuesta»*. Un ahorro del 5 % en un mercado de $600.000 al mes son $30.000, más que el precio de Pro.

| Plan | Qué trae para el hogar |
|---|---|
| Gratis | Listas compartidas, cuentas claras, catálogo con precios de referencia |
| **Plus Hogar** | + Bot de WhatsApp con voz, estadísticas, **despensa y «se te acaba»**, **vencimientos estimados**, foto de factura (límite mensual) |
| **Pro Hogar** *(nuevo)* | + **Carrito más barato**, **alertas de descuentos**, historial de precios, más productos seguidos |
| Negocio / Empresa | Como hasta ahora (por web) |

**Precios sugeridos de Pro Hogar** (≈ 1,55 a 1,65 veces el Plus de cada país, con la misma comisión del 15 % de las tiendas, y un costo variable de USD 0,80 por hogar al mes: USD 0,60 del bot más USD 0,20 de notificaciones, almacenamiento y lectura de facturas):

| País | Pro Hogar /mes | Te queda /mes | ≈ USD | % del precio |
|---|---|---|---|---|
| Colombia | **$19.900** | $10.934 | 2,67 | 55 % |
| México | $109 | $65,07 | 3,52 | 60 % |
| Perú | S/ 18,90 | S/ 10,65 | 2,88 | 56 % |
| Chile | $5.490 | $3.169 | 3,37 | 58 % |
| Ecuador | $4,99 | $2,89 | 2,89 | 58 % |
| Argentina | $6.290 | $3.299 | 2,36 | 52 % |
| Panamá | $5,49 | $3,56 | 3,56 | 65 % |
| Costa Rica | ₡2.790 | ₡1.691 | 3,32 | 61 % |
| Guatemala | Q 35,90 | Q 21,09 | 2,74 | 59 % |
| Rep. Dominicana | RD$ 279 | RD$ 151 | 2,44 | 54 % |
| España | 4,99 € | 2,80 € | 3,18 | 56 % |

En España, Pro a 4,99 € queda cerca del Plus de QuéFalta (3,99 €), pero con bot, cuentas claras y alertas: se puede mantener el 2,99 € de Plus como gancho.

**Costos fijos que hay que sumar (no dependen del número de usuarios):** servidor del recolector y base de datos de precios, estimados en USD 50 a 150 al mes al inicio, más el tiempo de mantenimiento: las tiendas cambian sus sitios y el recolector se rompe con frecuencia.

## Orden recomendado

1. **Fase 1 (ya):** guardar el historial de compras desde el primer día, aunque la función se lance después. Cada día sin guardar es información perdida.
2. **Fase 2:** A + B (Plus): despensa, «se te acaba», vencimientos por categoría y por fecha escrita.
3. **Fase 3:** recolector de precios en Éxito, Carulla y Jumbo (VTEX) + precios colaborativos para D1 y Ara. Lanzar C + D en **Pro Hogar** solo en Bogotá.
4. **Fase 4:** foto de factura y de fecha de vencimiento; acuerdos con cadenas; replicar en otros países.

## Riesgos

- **Legal:** términos de uso de las cadenas. Mitigación: consulta prudente, caché, enlaces a la tienda, abogado y acuerdos.
- **Mantenimiento:** los recolectores se rompen cuando cambian las páginas.
- **Precios por sucursal:** un mismo producto puede costar distinto según la ciudad o el local. Al registrarse, pedir ciudad (y barrio, para D1 y Ara).
- **Expectativas de vencimiento:** repetir que el estimado no reemplaza revisar el empaque.
- **Datos personales:** documentar el uso de los hábitos de compra en la política de privacidad (ya hay un borrador en `AlgoFalta pack completo/legal/`).

Fuentes consultadas: [API pública de catálogo de VTEX](https://dev.to/antonio_fernandorincond/a-api-publica-de-catalogo-da-vtex-que-quase-ninguem-usa-40li), [Éxito/Carulla en VTEX (scraper)](https://apify.com/knowten/carulla-scraper), [implicaciones jurídicas del web scraping (Universidad Externado)](https://bdigital.uexternado.edu.co/server/api/core/bitstreams/5abd583d-ae25-453d-b1d8-2a4803049694/content), [Open Food Facts](https://world.openfoodfacts.org/data).
