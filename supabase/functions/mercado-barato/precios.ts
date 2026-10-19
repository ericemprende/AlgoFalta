// Lógica pura de precios: consultar tiendas VTEX, leer tamaños y elegir el más barato por kilo/litro/unidad.
// Sin base de datos, para poder probarla sola (ver docs/mercado-barato.md).

import { STORES } from "./tiendas.ts";
// Supermercados con catálogo público por país: generados por docs/tiendas/generar.py.
export { STORES };

// Con centavos: en Perú, Panamá o Rep. Dominicana los precios no son enteros.
const r2 = (n: number) => Math.round(n * 100) / 100;

export type Product = { name: string; price: number; list: number; size: number | null; unit: string | null; url: string; image: string | null };
export type Pick = { cost: number; product: string; price: number; list: number; url: string; image: string | null; at: string } | null;

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9. ]+/g, " ").replace(/\s+/g, " ").trim();

// "Arroz Diana x 2500 g" → 2500 g · "Aceite 3 L" → 3000 ml · "Huevos x 30 und" → 30 un · "2 lb" → 1000 g
export function parseSize(s: string): { size: number; unit: string } | null {
  const t = norm(s.replace(/(\d),(\d)/g, "$1.$2").replace(/(\d)\.(\d{3})\b/g, "$1$2"));
  const m = t.match(/(\d+(?:\.\d+)?)\s*(kg|kilos?|grs?|g|gramos|ml|cc|lts?|l|litros?|lb|libras?)\b/);
  if (m) {
    const n = parseFloat(m[1]), u = m[2];
    const base = /^(kg|kilos?)$/.test(u) ? { size: n * 1000, unit: "g" } : /^(lb|libras?)$/.test(u) ? { size: n * 500, unit: "g" }
      : /^(grs?|g|gramos)$/.test(u) ? { size: n, unit: "g" } : /^(lts?|l|litros?)$/.test(u) ? { size: n * 1000, unit: "ml" } : { size: n, unit: "ml" };
    // "900 ml x6" = 6 leches. Pero "11,35 kg x25 unds" ya es el total.
    const mult = t.slice((m.index ?? 0) + m[0].length).match(/^\s*x\s*(\d+)\b(?!\s*(und|unds|un|unidades|uds))/);
    if (mult) base.size *= parseInt(mult[1], 10);
    return base;
  }
  const u = t.match(/(\d+)\s*(und|unds|un|unidades|unidad|uds|rollos?)\b/);
  if (u && parseInt(u[1], 10) > 1) return { size: parseInt(u[1], 10), unit: "un" };
  return null;
}

export async function fetchStore(store: string, query: string): Promise<Product[]> {
  const { base } = STORES[store];
  const url = `${base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=9`;
  const r = await fetch(url, { headers: { "User-Agent": "AlgoFalta/1.0 (+https://www.algofalta.com)" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${store} ${r.status}`);
  const data = await r.json();
  const site = base.replace(/\/io$/, "");
  const out: Product[] = [];
  for (const p of data ?? []) {
    const offer = p.items?.[0]?.sellers?.[0]?.commertialOffer;
    if (!offer || !offer.Price || offer.AvailableQuantity <= 0) continue;
    const sz = parseSize(`${p.productName} ${p.items?.[0]?.name ?? ""}`);
    out.push({ name: p.productName, price: r2(offer.Price), list: r2(offer.ListPrice || offer.Price),
      size: sz?.size ?? null, unit: sz?.unit ?? null, url: `${site}/${p.linkText}/p`, image: p.items?.[0]?.images?.[0]?.imageUrl ?? null });
  }
  return out;
}

// Palabras que convierten el producto en otro (si el usuario no las escribió, se descarta).
const OTRO_PRODUCTO = ["codorniz", "humedo", "phillips", "condensada", "magnesia", "mascota", "perro", "gato", "bebe", "juguete"];

// Solo productos que contienen todas las palabras importantes de la búsqueda (y que empiezan por ella si es una sola).
export function relevant(query: string, ps: Product[]) {
  const words = norm(query).split(" ").filter((w) => w.length > 2 && !/^\d/.test(w)).map((w) => w.replace(/(es|s)$/, ""));
  const q = norm(query);
  return ps.filter((p) => {
    const n = norm(p.name);
    return words.every((w) => n.includes(w)) && (words.length > 1 || n.startsWith(words[0] ?? ""))
      && !OTRO_PRODUCTO.some((x) => n.includes(x) && !q.includes(x));
  });
}

// Elige en cada tienda el producto más barato por kilo/litro/unidad y lo lleva al tamaño de referencia.
export function compare(quantity: string | null, perStore: { s: string; products: Product[]; at: string }[]) {
  const want = quantity ? parseSize(quantity) : null;
  let unit = want?.unit ?? null, ref = want?.size ?? null;
  if (!ref) {
    const sized = perStore.flatMap((x) => x.products.filter((p) => p.size));
    const units = sized.reduce<Record<string, number[]>>((a, p) => ((a[p.unit!] ??= []).push(p.size!), a), {});
    const top = Object.entries(units).sort((a, b) => b[1].length - a[1].length)[0];
    if (top) { unit = top[0]; const v = top[1].sort((a, b) => a - b); ref = v[Math.floor(v.length / 2)]; }
  }
  // Descartes: tamaños muy distintos al de referencia (más de 4 veces) y precios por kilo sospechosamente
  // bajos frente a la mediana (suelen ser otro producto: huevos de codorniz, atún precocido para restaurante…).
  const ok = (p: Product) => !ref || (p.size != null && p.unit === unit && p.size >= ref / 4 && p.size <= ref * 4);
  const perUnit = perStore.flatMap((x) => x.products.filter(ok).map((p) => (ref ? p.price / p.size! : p.price))).sort((a, b) => a - b);
  const median = perUnit[Math.floor(perUnit.length / 2)] ?? 0;
  const byStore: Record<string, Pick> = {};
  for (const x of perStore) {
    let best: { p: Product; cost: number } | null = null;
    for (const p of x.products.filter(ok)) {
      const u = ref ? p.price / p.size! : p.price;
      if (u < median * 0.45 || u > median * 3) continue;
      const cost = ref ? r2((p.price / p.size!) * ref) : p.price;
      if (cost != null && (!best || cost < best.cost)) best = { p, cost };
    }
    byStore[x.s] = best ? { cost: best.cost, product: best.p.name, price: best.p.price, list: best.p.list, url: best.p.url, image: best.p.image ?? null, at: x.at } : null;
  }
  const found = Object.entries(byStore).filter(([, v]) => v) as [string, NonNullable<Pick>][];
  const best = found.sort((a, b) => a[1].cost - b[1].cost)[0]?.[0] ?? null;
  return { ref: ref ? { size: ref, unit } : null, byStore, best };
}
