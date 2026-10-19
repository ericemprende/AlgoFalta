-- Precios con centavos: en Perú (S/), Panamá (USD) o Rep. Dominicana los precios no son enteros.
-- El Mercado más barato ya compara supermercados de 7 países (ver docs/tiendas/generar.py).
alter table public.price_history alter column price type numeric(14, 2), alter column list_price type numeric(14, 2);
alter table public.product_prices alter column price type numeric(14, 2), alter column list_price type numeric(14, 2);
