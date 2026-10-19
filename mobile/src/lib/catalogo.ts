import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Catálogo de productos frecuentes (tabla catalog_products) y sus precios oficiales en las tiendas
// (tabla product_prices, que llena la función mercado-barato con los catálogos públicos de cada supermercado).

export type Categoria = { id: string; name: string; emoji: string };
export type Producto = { name: string; query: string; emoji: string; image_url: string | null; category: string; unit: string };
export type Precio = { store: string; product: string; price: number; list_price: number; url: string; image_url: string | null; updated_at: string };

export const CATEGORIAS: Categoria[] = [
  { id: 'despensa', name: 'Despensa', emoji: '🍚' },
  { id: 'frutas', name: 'Frutas y verduras', emoji: '🥑' },
  { id: 'lacteos', name: 'Lácteos y huevos', emoji: '🥛' },
  { id: 'carnes', name: 'Carnes', emoji: '🍗' },
  { id: 'panaderia', name: 'Panadería', emoji: '🍞' },
  { id: 'bebidas', name: 'Bebidas', emoji: '🧃' },
  { id: 'aseo', name: 'Aseo del hogar', emoji: '🧽' },
  { id: 'personal', name: 'Cuidado personal', emoji: '🧴' },
  { id: 'mascotas', name: 'Mascotas', emoji: '🐾' },
  { id: 'otros', name: 'Otros', emoji: '🛒' },
];

export const TIENDA: Record<string, string> = {
  exito: 'Éxito', carulla: 'Carulla', jumbo: 'Jumbo', olimpica: 'Olímpica', megatiendas: 'Megatiendas', mercaldas: 'Mercaldas', d1: 'D1',
};

/** Igual a norm() de supabase/functions/mercado-barato/precios.ts: es la llave de los precios. */
export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

export const categoria = (id: string | null | undefined) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];

/** "2" → 2, "3 kg" → 3, "" → 1. Las cantidades escritas a mano sin número cuentan como 1. */
export const cantidad = (q: string | null) => Math.max(1, parseInt(q ?? '', 10) || 1);

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState<Producto[]>([]);
  useEffect(() => {
    supabase.from('catalog_products').select('name, query, emoji, image_url, category, unit').eq('active', true).order('sort').then(({ data }) => { if (data) setCatalogo(data); });
  }, []);
  return catalogo;
}

/** Precios oficiales de esos nombres; lo que aún no tiene precio se consulta en las tiendas (una vez por nombre). */
export function usePrecios(nombres: string[], catalogo: Producto[]) {
  const [precios, setPrecios] = useState<Map<string, Precio[]>>(new Map());
  const [consultando, setConsultando] = useState(false);
  const pedidos = useRef(new Set<string>());

  const leer = useCallback(async (queries: string[]) => {
    if (!queries.length) return;
    const { data } = await supabase.from('product_prices').select('query, store, product, price, list_price, url, image_url, updated_at').in('query', queries);
    setPrecios((prev) => {
      const m = new Map(prev);
      for (const q of queries) m.delete(q);
      for (const r of data ?? []) m.set(r.query, [...(m.get(r.query) ?? []), r].sort((a, b) => a.price - b.price));
      return m;
    });
    return new Set((data ?? []).map((r) => r.query));
  }, []);

  const clave = nombres.map(norm).sort().join('|');
  useEffect(() => {
    (async () => {
      const qs = [...new Set(clave.split('|').filter(Boolean))];
      const conPrecio = await leer(qs);
      const faltan = qs.filter((q) => !conPrecio?.has(q) && !pedidos.current.has(q));
      if (!faltan.length) return;
      faltan.forEach((q) => pedidos.current.add(q));
      setConsultando(true);
      await supabase.functions.invoke('mercado-barato', { body: { mode: 'prices', names: faltan } });
      setConsultando(false);
      leer(faltan);
    })();
  }, [clave, leer]);

  const delCatalogo = useCallback((name: string) => {
    const n = norm(name);
    return catalogo.find((x) => x.query === n) ?? catalogo.find((x) => n.startsWith(x.query + ' '));
  }, [catalogo]);
  /** El más barato hoy entre las tiendas para ese nombre. */
  const masBarato = useCallback((name: string) => {
    const n = norm(name);
    return (precios.get(n) ?? precios.get(delCatalogo(name)?.query ?? ''))?.[0];
  }, [precios, delCatalogo]);

  return { masBarato, delCatalogo, consultando };
}
