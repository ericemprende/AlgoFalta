-- AlgoFalta · Foto real de cada producto
-- Las tiendas VTEX devuelven la foto del producto: se guarda con cada precio y, en el catálogo, la del
-- producto más barato encontrado. El emoji queda como respaldo mientras no haya foto.

alter table public.product_prices add column image_url text;
alter table public.catalog_products add column image_url text;
