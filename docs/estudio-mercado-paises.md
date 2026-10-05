# AlgoFalta — Estudio preliminar de expansión por país

*Octubre 2026 · Estudio de escritorio con cifras aproximadas (población, penetración de WhatsApp y estructura del comercio). Validar con datos actualizados antes de invertir.*

## Criterios

1. **Encaje del producto:** idioma español, hogares compartidos (familias extendidas, roommates), mercado semanal en supermercado.
2. **WhatsApp:** el bot es el diferencial; se necesita que WhatsApp sea el mensajero dominante.
3. **Disponibilidad de precios:** cadenas con tienda online o catálogo público para extraer precios de referencia.
4. **Disposición a pagar y pasarelas** locales para la web / B2B.
5. **Costo de entrada:** moneda, facturación electrónica, ley de datos.

## Ranking

| # | País | Población | WhatsApp | Precios online | Pago | Por qué |
|---|---|---|---|---|---|---|
| 1 | **México** | ~130 M | Muy alto | Alto (Walmart, Soriana, Chedraui, La Comer) | Medio-alto | El mercado hispano más grande; cadenas con catálogo online; buen ingreso medio. Facturación CFDI. |
| 2 | **Perú** | ~34 M | Muy alto | Alto (Plaza Vea, Tottus, Wong, Metro) | Medio | Cultura de mercado familiar muy parecida a Colombia; Yape/Plin para cobros. |
| 3 | **Chile** | ~20 M | Muy alto | Muy alto (Líder, Jumbo, Unimarc) | Alto | Mayor ingreso de la región y compra online madura; mercado pequeño. |
| 4 | **Ecuador** | ~18 M | Muy alto | Medio (Supermaxi, Tía) | Medio | Dolarizado (precios estables, sin cambio de moneda); cercano a Colombia. |
| 5 | **Panamá / Costa Rica** | ~4 M / ~5 M | Muy alto | Medio | Alto | Pequeños pero con buen poder adquisitivo; Panamá es dolarizado. Buenos para el plan B2B. |
| 6 | **Rep. Dominicana / Guatemala** | ~11 M / ~18 M | Muy alto | Bajo | Medio-bajo | Interés alto pero pocos precios online; empezar sin catálogo de precios. |
| 7 | **Argentina** | ~46 M | Muy alto | Alto | Bajo-medio | Inflación hace que los precios de referencia caduquen rápido; cobrar en USD o esperar. |
| 8 | **España** | ~48 M | Muy alto | Muy alto (Mercadona, Carrefour) | Alto | Ingreso alto, pero ya existen apps similares (incluida QuéFalta, que inspiró a AlgoFalta) y aplica el RGPD. |
| — | EE. UU. (hispanos) | ~65 M | Medio | Alto | Alto | WhatsApp es menos dominante; dejar para después. |

## Tabla de precios por país

Base: Colombia, Plus Hogar **$12.900 COP** (≈ USD 3,1). Los demás países se ajustan según su ingreso y poder de compra, a un nivel equivalente a USD 2,8–3,7, con precios terminados en 9/90 de cada país. Negocio ≈ 3,5–4× Plus; Empresa ≈ 11–12× Plus; anual ≈ 10 meses (2 meses gratis), excepto España.

| País | Moneda | Gratis | Plus Hogar /mes | Plus anual | Negocio /mes | Empresa /mes | ≈ USD Plus |
|---|---|---|---|---|---|---|---|
| Colombia | COP | 0 | **$12.900** | $129.000 | $49.900 | $149.900 | 3,1 |
| México | MXN | 0 | $69 | $690 | $249 | $699 | 3,7 |
| Perú | PEN | 0 | S/ 11,90 | S/ 119 | S/ 44,90 | S/ 129 | 3,2 |
| Chile | CLP | 0 | $3.490 | $34.900 | $12.990 | $39.990 | 3,7 |
| Ecuador | USD | 0 | $2,99 | $29,99 | $11,99 | $34,99 | 3,0 |
| Panamá | USD | 0 | $3,49 | $34,99 | $12,99 | $39,99 | 3,5 |
| Costa Rica | CRC | 0 | ₡1.790 | ₡17.900 | ₡6.490 | ₡19.900 | 3,5 |
| Guatemala | GTQ | 0 | Q 22,90 | Q 229 | Q 89 | Q 259 | 3,0 |
| Rep. Dominicana | DOP | 0 | RD$ 179 | RD$ 1.790 | RD$ 690 | RD$ 1.990 | 2,9 |
| Argentina | ARS | 0 | $3.990 | $39.900 | $14.990 | $44.990 | ≈2,8 (revisar cada trimestre) |
| España | EUR | 0 | **2,99 €** | **19,99 €** | 12,99 € | 39,99 € | 3,4 |

Notas:
- En las tiendas de apps se fijan estos precios a mano por país (Google y Apple permiten precio por país).
- Argentina: por la inflación, revisar el precio cada trimestre o cobrar en USD por la web.
- Los créditos del bot (IA + WhatsApp) cuestan casi lo mismo en todos los países: comprobar que el margen ≥30 % se cumple en los países más baratos (RD, Guatemala, Argentina) antes de lanzar.

## Cuánto queda por suscriptor (Plus Hogar)

Cuánto le queda a AlgoFalta por cada suscriptor de Plus Hogar en un mes, antes del impuesto de renta y de los gastos fijos (salarios, marketing, contador). Supuestos:

- **IVA / impuesto digital:** Google y Apple lo cobran al usuario dentro del precio y lo pagan al país, así que se resta primero. Tasas usadas: CO 19 %, MX 16 %, PE 18 %, CL 19 %, EC 15 %, PA 7 %, CR 13 %, GT 12 %, RD 18 %, AR 21 %, ES 21 %.
- **Comisión de la tienda: 15 %** sobre el precio sin IVA (programas para pequeños desarrolladores de Google y Apple, hasta USD 1 M/año; las suscripciones también pagan 15 % en Google desde el día 1). Si se superara USD 1 M sería 30 % en Apple el primer año de cada suscriptor.
- **Costo variable estimado: USD 0,60 por hogar Plus al mes** = IA del bot por barridos (~USD 0,40) + WhatsApp (mensajes de servicio gratis en la ventana de 24 h; plantillas de utilidad ~USD 0,05) + servidor, base de datos y notificaciones (~USD 0,15). Medir el valor real en la beta.
- **Tasas de cambio aproximadas (oct. 2026), por 1 USD:** COP 4.100 · MXN 18,5 · PEN 3,7 · CLP 940 · CRC 510 · GTQ 7,7 · DOP 62 · ARS 1.400 · EUR 0,88.

### Plan mensual

| País | Precio | − IVA | − Tienda 15 % | − Costo bot/servidor | **Te queda** | **≈ USD** | % del precio |
|---|---|---|---|---|---|---|---|
| Colombia | $12.900 | $2.060 | $1.626 | $2.460 | **$6.754** | **1,65** | 52 % |
| México | $69 | $9,52 | $8,92 | $11,10 | **$39,46** | **2,13** | 57 % |
| Perú | S/ 11,90 | S/ 1,82 | S/ 1,51 | S/ 2,22 | **S/ 6,35** | **1,72** | 53 % |
| Chile | $3.490 | $557 | $440 | $564 | **$1.929** | **2,05** | 55 % |
| Ecuador | $2,99 | $0,39 | $0,39 | $0,60 | **$1,61** | **1,61** | 54 % |
| Panamá | $3,49 | $0,23 | $0,49 | $0,60 | **$2,17** | **2,17** | 62 % |
| Costa Rica | ₡1.790 | ₡206 | ₡238 | ₡306 | **₡1.040** | **2,04** | 58 % |
| Guatemala | Q 22,90 | Q 2,45 | Q 3,07 | Q 4,62 | **Q 12,76** | **1,66** | 56 % |
| Rep. Dominicana | RD$ 179 | RD$ 27 | RD$ 23 | RD$ 37 | **RD$ 92** | **1,48** | 51 % |
| Argentina | $3.990 | $692 | $495 | $840 | **$1.963** | **1,40** | 49 % |
| España | 2,99 € | 0,52 € | 0,37 € | 0,53 € | **1,57 €** | **1,79** | 53 % |

### Plan anual (por mes)

| País | Precio anual | Equivale /mes | **Te queda /mes** | ≈ USD | % |
|---|---|---|---|---|---|
| Colombia | $129.000 | $10.750 | **$5.219** | 1,27 | 49 % |
| México | $690 | $57,50 | **$31,03** | 1,68 | 54 % |
| Perú | S/ 119 | S/ 9,92 | **S/ 4,92** | 1,33 | 50 % |
| Chile | $34.900 | $2.908 | **$1.513** | 1,61 | 52 % |
| Ecuador | $29,99 | $2,50 | **$1,25** | 1,25 | 50 % |
| Panamá | $34,99 | $2,92 | **$1,72** | 1,72 | 59 % |
| Costa Rica | ₡17.900 | ₡1.492 | **₡816** | 1,60 | 55 % |
| Guatemala | Q 229 | Q 19,08 | **Q 9,86** | 1,28 | 52 % |
| Rep. Dominicana | RD$ 1.790 | RD$ 149 | **RD$ 70** | 1,13 | 47 % |
| Argentina | $39.900 | $3.325 | **$1.496** | 1,07 | 45 % |
| España | 19,99 € | 1,67 € | **0,64 €** | 0,73 | 39 % |

**Lectura:**
- Todos los países superan el margen mínimo de 30 % del plan. El que más deja por usuario es Panamá (dolarizado, IVA 7 %), seguido de México.
- **España anual:** se subió a 19,99 € (decisión 3-oct-2026), igual que QuéFalta; sigue siendo el más ajustado (39 %), así que conviene limitar créditos del bot en el anual.
- Si el usuario Plus casi no usa el bot, el costo baja a ~USD 0,15 y el margen sube unos 10–15 puntos.
- **Planes Negocio/Empresa vendidos por la web** (Wompi, Mercado Pago, etc.) no pagan el 15 % de la tienda: solo la pasarela (~3–4 % + tarifa fija), así que dejan proporcionalmente más.
- Ejemplo de escala en Colombia: **1.000 hogares Plus mensuales ≈ $6,75 M COP/mes** de contribución, para cubrir gastos fijos.

## España: competir con QuéFalta

QuéFalta (quefalta.es) cobra **3,99 €/mes o 19,99 €/año** por su plan Plus e incluye catálogos de unos 19 supermercados con precios de referencia.

| | QuéFalta Plus | AlgoFalta Plus Hogar |
|---|---|---|
| Mensual | 3,99 € | **2,99 €** (-25 %) |
| Anual | 19,99 € | **19,99 €** (mismo precio, más funciones) |
| Lista compartida y grupos gratis | Sí | Sí |
| Precios de supermercados | ~19 cadenas | Mercadona, Carrefour, Lidl, Dia, Alcampo, Aldi, Eroski para empezar |
| Bot en WhatsApp (texto y voz) | No | **Sí** |
| Cuentas claras (quién pagó y saldar cuentas) | No | **Sí** |
| Planes para negocios | No | **Sí** |

El argumento de venta en España: *"Lo mismo que QuéFalta, más barato al mes, y además con bot de WhatsApp y cuentas claras entre compañeros de piso."* Hay que tener en cuenta que en España ya conocen la app, que su catálogo es más amplio y que aplica el RGPD (privacidad por país, representante en la UE).

## Recomendación

- **Fase 2 (después de validar Colombia):** México y Perú. México por tamaño, Perú por parecido cultural y costo bajo de entrada.
- **Fase 3:** Chile y Ecuador (Ecuador se puede atender desde Colombia sin cambio de moneda).
- **Oportunista:** Centroamérica y República Dominicana con la versión sin precios (solo lista compartida + cuentas claras + bot).
- **España:** entrar a competir con QuéFalta con precio menor + bot + cuentas claras (ver arriba); se puede lanzar en paralelo a la fase 2 porque los catálogos online de Mercadona/Carrefour/Lidl son fáciles de obtener.
- **Esperar:** Argentina (inflación).

## Qué cambia por país (checklist técnico)

- Catálogo y precios: scraper o convenio por cadena; mientras tanto, "precio aproximado" escrito por el usuario.
- Moneda y formato de números (`Intl.NumberFormat`), impuestos incluidos en el precio.
- Precios de suscripción en las tiendas de apps (Google/Apple ya los convierten por país; ajustar manualmente).
- Vocabulario: "mercado" (CO), "súper" (MX), "compras" (ES/AR), "plata/lana/pasta"…
- Ley de datos: México (LFPDPPP), Perú (Ley 29733), Chile (Ley 21.719, vigente desde dic. 2026), Ecuador (LOPDP), España (RGPD). Adaptar `legal/privacidad.html` por país.
- Pasarelas: México (Mercado Pago, Conekta, OXXO Pay), Perú (Yape, Niubiz), Chile (Webpay), Ecuador (PayPhone).
- Facturación electrónica local solo para clientes B2B o pagos fuera de las tiendas de apps.
- WhatsApp: el mismo número de la API oficial sirve para todos los países; plantillas de mensaje por idioma/país.

## Landing

`landing/geo.js` ya adapta la landing a 11 países (CO, MX, PE, CL, EC, AR, PA, CR, GT, DO, ES). Detecta el país con `?pais=MX`, luego la elección guardada, luego la IP y luego el idioma del navegador. Muestra las cadenas como texto, sin logos (para no usar marcas sin permiso), con precios de planes y totales de referencia en moneda local. **Los precios fuera de Colombia son provisionales.**

## Venta de Negocio / Empresa por la web

Decisión (3-oct-2026): Negocio, Empresa y Corporativo se venden **solo por la web o por ventas directas**, nunca dentro de la app. Ver `docs/panel-admin-planes-b2b.md`.
