-- AlgoFalta · Precios oficiales de las tiendas para la lista
-- El catálogo de productos frecuentes vive aquí (no en la app) y cada precio sale de los catálogos públicos
-- de los supermercados (función mercado-barato). product_prices guarda, por producto y tienda, el más barato
-- encontrado: se llena con cada consulta de los usuarios y con el cron nocturno, así la base crece sola.

create table public.catalog_products (
  name text primary key,
  query text not null unique,          -- búsqueda normalizada, igual a norm() de la función
  category text not null,
  emoji text not null,
  unit text not null,                  -- presentación de referencia que se muestra (kg, L, 30 und…)
  sort int not null default 0,
  active boolean not null default true
);
alter table public.catalog_products enable row level security;
create policy "todos ven el catálogo" on public.catalog_products for select to authenticated using (active or public.is_admin());

create table public.product_prices (
  query text not null,                 -- búsqueda normalizada (nombre del producto en la lista)
  store text not null,
  product text not null,               -- producto exacto en la tienda
  price bigint not null,               -- precio de ese producto hoy
  list_price bigint not null,          -- precio antes de descuento
  url text not null,
  updated_at timestamptz not null default now(),
  primary key (query, store)
);
create index on public.product_prices (query, price);
alter table public.product_prices enable row level security;
-- Son precios públicos de las tiendas: cualquiera con sesión los lee; solo la función (service role) escribe.
create policy "todos ven precios de tiendas" on public.product_prices for select to authenticated using (true);

insert into public.catalog_products (name, query, category, emoji, unit, sort) values
  ('Arroz', 'arroz', 'despensa', '🍚', 'kg', 0),
  ('Fríjol', 'frijol', 'despensa', '🫘', '500 g', 1),
  ('Lenteja', 'lenteja', 'despensa', '🫘', '500 g', 2),
  ('Pasta', 'pasta', 'despensa', '🍝', '500 g', 3),
  ('Aceite', 'aceite', 'despensa', '🫒', 'L', 4),
  ('Sal', 'sal', 'despensa', '🧂', 'kg', 5),
  ('Azúcar', 'azucar', 'despensa', '🍬', 'kg', 6),
  ('Panela', 'panela', 'despensa', '🟫', 'und', 7),
  ('Café', 'cafe', 'despensa', '☕', '500 g', 8),
  ('Chocolate', 'chocolate', 'despensa', '🍫', '500 g', 9),
  ('Harina de maíz', 'harina de maiz', 'despensa', '🌽', 'kg', 10),
  ('Atún', 'atun', 'despensa', '🥫', 'lata', 11),
  ('Banano', 'banano', 'frutas', '🍌', 'kg', 12),
  ('Tomate', 'tomate', 'frutas', '🍅', 'kg', 13),
  ('Cebolla', 'cebolla', 'frutas', '🧅', 'kg', 14),
  ('Papa', 'papa', 'frutas', '🥔', 'kg', 15),
  ('Aguacate', 'aguacate', 'frutas', '🥑', 'und', 16),
  ('Limón', 'limon', 'frutas', '🍋', 'kg', 17),
  ('Zanahoria', 'zanahoria', 'frutas', '🥕', 'kg', 18),
  ('Manzana', 'manzana', 'frutas', '🍎', 'kg', 19),
  ('Plátano', 'platano', 'frutas', '🟢', 'kg', 20),
  ('Leche', 'leche', 'lacteos', '🥛', 'L', 21),
  ('Huevos', 'huevos', 'lacteos', '🥚', '30 und', 22),
  ('Queso', 'queso', 'lacteos', '🧀', '500 g', 23),
  ('Mantequilla', 'mantequilla', 'lacteos', '🧈', '250 g', 24),
  ('Yogur', 'yogur', 'lacteos', '🥣', 'L', 25),
  ('Kumis', 'kumis', 'lacteos', '🥄', 'L', 26),
  ('Pollo', 'pollo', 'carnes', '🍗', 'kg', 27),
  ('Carne de res', 'carne de res', 'carnes', '🥩', 'kg', 28),
  ('Cerdo', 'cerdo', 'carnes', '🐖', 'kg', 29),
  ('Salchichas', 'salchichas', 'carnes', '🌭', 'paq', 30),
  ('Jamón', 'jamon', 'carnes', '🥓', '250 g', 31),
  ('Pescado', 'pescado', 'carnes', '🐟', 'kg', 32),
  ('Pan tajado', 'pan tajado', 'panaderia', '🍞', 'und', 33),
  ('Arepas', 'arepas', 'panaderia', '🫓', 'paq', 34),
  ('Galletas', 'galletas', 'panaderia', '🍪', 'paq', 35),
  ('Agua', 'agua', 'bebidas', '💧', 'L', 36),
  ('Jugo', 'jugo', 'bebidas', '🧃', 'L', 37),
  ('Gaseosa', 'gaseosa', 'bebidas', '🥤', '1,5 L', 38),
  ('Cerveza', 'cerveza', 'bebidas', '🍺', 'und', 39),
  ('Papel higiénico', 'papel higienico', 'aseo', '🧻', '12 rollos', 40),
  ('Detergente', 'detergente', 'aseo', '🧼', 'kg', 41),
  ('Lavaloza', 'lavaloza', 'aseo', '🍽️', 'und', 42),
  ('Suavizante', 'suavizante', 'aseo', '🧴', 'L', 43),
  ('Cloro', 'cloro', 'aseo', '🫧', 'L', 44),
  ('Esponjas', 'esponjas', 'aseo', '🧽', 'paq', 45),
  ('Bolsas de basura', 'bolsas de basura', 'aseo', '🗑️', 'paq', 46),
  ('Limpiapisos', 'limpiapisos', 'aseo', '🧹', 'L', 47),
  ('Jabón de baño', 'jabon de bano', 'personal', '🧼', '3 und', 48),
  ('Champú', 'champu', 'personal', '🧴', 'und', 49),
  ('Crema dental', 'crema dental', 'personal', '🪥', 'und', 50),
  ('Desodorante', 'desodorante', 'personal', '🌸', 'und', 51),
  ('Toallas higiénicas', 'toallas higienicas', 'personal', '🩲', 'paq', 52),
  ('Pañales', 'panales', 'personal', '👶', 'paq', 53),
  ('Comida para perro', 'comida para perro', 'mascotas', '🐶', '4 kg', 54),
  ('Comida para gato', 'comida para gato', 'mascotas', '🐱', '3 kg', 55),
  ('Arena para gato', 'arena para gato', 'mascotas', '🪨', '4 kg', 56);
