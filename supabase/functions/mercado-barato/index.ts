// AlgoFalta · Edge Function «mercado-barato»
// Arma el mercado más barato de la lista de un hogar comparando precios de supermercados (catálogo público VTEX).
//
// POST { household_id, stores: string[] }            (usuario autenticado)
// POST { mode: "prices", names: string[] }          (usuario autenticado: precio oficial por producto, para la lista)
// POST { mode: "refresh" } + header x-cron-secret    (cron nocturno: refresca el catálogo y las búsquedas más usadas)
//
// Precios: se consultan en vivo y se guardan 6 h en price_cache; cada precio visto queda en price_history
// (base de las alertas de ofertas). Consulta prudente: pocas peticiones, con caché, mostrando la tienda y
// enlazando a su página (ver docs/funciones-inteligentes-despensa-ahorro.md).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { compare, fetchStore, norm, type Product, relevant, STORES } from "./precios.ts";

const FRESH_MS = 6 * 3600_000;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function getProducts(store: string, query: string, force = false): Promise<{ products: Product[]; at: string }> {
  const { data } = await admin.from("price_cache").select("results, fetched_at, hits").eq("store", store).eq("query", query).maybeSingle();
  // Resultados guardados antes de que se guardara la foto se vuelven a consultar para traerla.
  const conFoto = (data?.results ?? []).every((p: Product) => "image" in p);
  if (data && !force && conFoto && Date.now() - new Date(data.fetched_at).getTime() < FRESH_MS) {
    admin.from("price_cache").update({ hits: data.hits + 1 }).eq("store", store).eq("query", query).then();
    return { products: data.results, at: data.fetched_at };
  }
  try {
    const products = await fetchStore(store, query);
    const at = new Date().toISOString();
    await admin.from("price_cache").upsert({ store, query, results: products, fetched_at: at, hits: (data?.hits ?? 0) + 1 });
    if (products.length) {
      await admin.from("price_history").upsert(products.map((p) => ({ store, product: p.name, url: p.url, price: p.price, list_price: p.list })),
        { onConflict: "store,url,day" });
    }
    return { products, at };
  } catch {
    // Si la tienda no responde, usamos el último precio guardado aunque esté viejo.
    return { products: data?.results ?? [], at: data?.fetched_at ?? new Date(0).toISOString() };
  }
}

// Deja en product_prices lo elegido en cada tienda: la tabla que la app lee para mostrar precios reales.
// La foto del más barato queda como foto del producto en el catálogo (si aún no tiene).
async function savePrices(query: string, byStore: Record<string, { product: string; price: number; list: number; url: string; image?: string | null; at: string } | null>) {
  const rows = Object.entries(byStore).filter(([, v]) => v)
    .map(([store, v]) => ({ query, store, product: v!.product, price: v!.price, list_price: v!.list, url: v!.url, image_url: v!.image ?? null, updated_at: v!.at }));
  if (!rows.length) return;
  await admin.from("product_prices").upsert(rows, { onConflict: "query,store" });
  const foto = rows.filter((r) => r.image_url).sort((a, b) => a.price - b.price)[0]?.image_url;
  if (foto) await admin.from("catalog_products").update({ image_url: foto }).eq("query", query).is("image_url", null);
}

// Precio oficial de un producto en todas las tiendas.
async function priceFor(query: string, force = false) {
  const per = await Promise.all(Object.keys(STORES).map(async (s) => {
    const r = await getProducts(s, query, force);
    return { s, at: r.at, products: relevant(query, r.products) };
  }));
  const { byStore } = compare(null, per);
  await savePrices(query, byStore);
  return byStore;
}

async function pool<T>(tasks: (() => Promise<T>)[], n = 4): Promise<T[]> {
  const out: T[] = new Array(tasks.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); } }));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));

  // ── Cron nocturno: refresca las 200 búsquedas más usadas con más de 12 h ──
  if (body.mode === "refresh") {
    if (!Deno.env.get("CRON_SECRET") || req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return json({ error: "forbidden" }, 403);
    const { data } = await admin.from("price_cache").select("store, query")
      .lt("fetched_at", new Date(Date.now() - 12 * 3600_000).toISOString()).order("hits", { ascending: false }).limit(200);
    await pool((data ?? []).filter((r) => STORES[r.store]).map((r) => () => getProducts(r.store, r.query, true)), 3);
    // Catálogo de la lista: todos sus productos con precio fresco cada mañana (usa la caché recién refrescada).
    const { data: cat } = await admin.from("catalog_products").select("query").eq("active", true);
    await pool((cat ?? []).map((c) => () => priceFor(c.query)), 3);
    return json({ refreshed: data?.length ?? 0, catalog: cat?.length ?? 0 });
  }

  // ── Usuario: armar el mercado más barato ──
  const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user: me } } = await user.auth.getUser();
  if (!me) return json({ error: "not_authenticated" }, 401);

  // ── Usuario: precios oficiales de productos sueltos (la lista los pide cuando aún no los tiene) ──
  if (body.mode === "prices") {
    const names: string[] = [...new Set<string>((Array.isArray(body.names) ? body.names : []).map((n: unknown) => norm(String(n)).slice(0, 60)))]
      .filter((n) => n.length >= 2).slice(0, 20);
    const out = await pool(names.map((q) => async () => ({ query: q, byStore: await priceFor(q) })), 3);
    return json({ prices: out });
  }

  const household = String(body.household_id ?? "");
  const stores: string[] = [...new Set<string>(Array.isArray(body.stores) ? body.stores : [])].filter((s) => STORES[s]);
  if (stores.length < 1) return json({ error: "no_stores" }, 400);

  // RLS: si no es miembro del hogar, no ve sus ítems.
  const [{ data: items }, { data: profile }] = await Promise.all([
    user.from("items").select("id, name, quantity").eq("household_id", household).is("checked_at", null).order("created_at"),
    user.from("profiles").select("plan").eq("id", me.id).single(),
  ]);
  if (!items) return json({ error: "not_member" }, 403);
  const plan = profile?.plan ?? "free";
  const { data: limit } = await admin.rpc("cheapest_cart_limit", { p_plan: plan });
  const used = limit == null ? items : items.slice(0, limit);

  const rows = await pool(used.map((it) => async () => {
    const query = norm(it.name).slice(0, 60);
    const per = await Promise.all(stores.map(async (s) => {
      const r = await getProducts(s, query);
      return { s, at: r.at, products: relevant(query, r.products) };
    }));
    const r = compare(it.quantity, per);
    await savePrices(query, r.byStore);
    return { id: it.id, name: it.name, quantity: it.quantity, ...r };
  }), 3);

  const cost = (r: (typeof rows)[number], s: string) => r.byStore[s]?.cost ?? 0;
  const totals = stores.map((s) => {
    const have = rows.filter((r) => r.byStore[s]);
    return { store: s, name: STORES[s].name, total: have.reduce((t, r) => t + cost(r, s), 0), found: have.length };
  });
  // Ahorro: comprar cada cosa donde está más barata frente a todo en la tienda más barata (sobre lo que venden todas).
  const comparable = rows.filter((r) => stores.every((s) => r.byStore[s]));
  const single = stores.map((s) => ({ s, t: comparable.reduce((t, r) => t + cost(r, s), 0) })).sort((a, b) => a.t - b.t)[0];
  const comboComparable = comparable.reduce((t, r) => t + cost(r, r.best!), 0);

  return json({
    plan, limit, total_items: items.length, optimized: used.length, locked: items.length - used.length,
    stores: stores.map((s) => ({ id: s, name: STORES[s].name })),
    items: rows, totals,
    combo: rows.filter((r) => r.best).reduce((t, r) => t + cost(r, r.best!), 0),
    best_single: comparable.length ? { store: single.s, name: STORES[single.s].name, total: single.t, items: comparable.length } : null,
    savings: comparable.length ? single.t - comboComparable : 0,
  });
});
