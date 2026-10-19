// AlgoFalta · Edge Function «pagos»
//
// POST /pagos                      { plan: "plus"|"pro", cycle: "monthly"|"yearly" }  (usuario con sesión)
//   → crea una suscripción de Mercado Pago y devuelve { url } para pagar (tarjeta, PSE, Nequi…).
// POST /pagos?origen=mercadopago   aviso (webhook) de Mercado Pago: suscripción creada, cobrada, cancelada…
// POST /pagos?origen=revenuecat    aviso (webhook) de RevenueCat: compras de Google Play y App Store.
//
// Los avisos solo dicen «algo cambió»: el estado real se consulta de vuelta a Mercado Pago, y el de
// RevenueCat viene firmado con un secreto propio. Todo termina en public.entitlements (ver migración
// 20261023000000_suscripciones.sql), que recalcula profiles.plan solo.
//
// Secretos: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, REVENUECAT_WEBHOOK_SECRET (ver docs/pagos.md).
import { createClient } from "jsr:@supabase/supabase-js@2";

// Precios en COP. Deben coincidir con la sección Planes de landing/index.html.
export const PRECIOS = {
  plus: { name: "Plus Hogar", monthly: 12900, yearly: 129000 },
  pro: { name: "Pro Hogar", monthly: 19900, yearly: 199000 },
} as const;
type Plan = keyof typeof PRECIOS;

const WEB = "https://www.algofalta.com";
const MP = "https://api.mercadopago.com";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const mp = (path: string, init: RequestInit = {}) =>
  fetch(MP + path, { ...init, headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`, "Content-Type": "application/json", ...init.headers } });

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Mercado Pago: estado de la suscripción → entitlement ──
async function syncPreapproval(id: string) {
  const r = await mp(`/preapproval/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(`mp ${r.status}`);
  const s = await r.json();
  const [userId, plan, cycle] = String(s.external_reference ?? "").split(":");
  if (!userId || !(plan in PRECIOS)) return;
  const status = { authorized: "active", pending: "pending", paused: "paused", cancelled: "cancelled" }[s.status as string] ?? "pending";
  // Vigente hasta el próximo cobro. Al cancelar, conserva lo ya pagado.
  const expires = s.next_payment_date ?? null;
  await admin.from("entitlements").upsert({
    user_id: userId, plan, source: "mercadopago", external_id: s.id, status, cycle,
    amount: Math.round(s.auto_recurring?.transaction_amount ?? 0), currency: s.auto_recurring?.currency_id ?? "COP",
    expires_at: expires, updated_at: new Date().toISOString(),
  }, { onConflict: "source,external_id" });
}

async function webhookMercadoPago(req: Request, url: URL, body: Record<string, unknown>) {
  const data = body.data as { id?: string } | undefined;
  const id = String(data?.id ?? url.searchParams.get("data.id") ?? "");
  // Firma: x-signature = "ts=...,v1=..." sobre "id:<id>;request-id:<x-request-id>;ts:<ts>;"
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (secret) {
    const parts = Object.fromEntries((req.headers.get("x-signature") ?? "").split(",").map((p) => p.trim().split("=")));
    const manifest = `id:${id.toLowerCase()};request-id:${req.headers.get("x-request-id") ?? ""};ts:${parts.ts};`;
    if (!parts.v1 || (await hmacHex(secret, manifest)) !== parts.v1) return json({ error: "bad_signature" }, 401);
  }
  const type = String(body.type ?? url.searchParams.get("type") ?? "");
  if (type === "subscription_preapproval") await syncPreapproval(id);
  if (type === "subscription_authorized_payment") {
    // Un cobro mensual o anual: refrescamos la suscripción para mover la fecha de vencimiento.
    const r = await mp(`/authorized_payments/${encodeURIComponent(id)}`);
    if (r.ok) { const p = await r.json(); if (p.preapproval_id) await syncPreapproval(p.preapproval_id); }
  }
  return json({ ok: true });
}

// ── RevenueCat (Google Play y App Store) ──
// En RevenueCat: entitlements con identificador «plus» y «pro»; app_user_id = id del usuario en Supabase.
async function webhookRevenueCat(req: Request, body: Record<string, unknown>) {
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("REVENUECAT_WEBHOOK_SECRET")}`) return json({ error: "forbidden" }, 403);
  const e = body.event as Record<string, unknown> | undefined;
  if (!e) return json({ ok: true });
  const userId = String(e.app_user_id ?? "");
  const plans = ((e.entitlement_ids as string[]) ?? []).filter((p) => p in PRECIOS);
  if (!/^[0-9a-f-]{36}$/.test(userId) || !plans.length) return json({ ok: true });
  const status = ({
    INITIAL_PURCHASE: "active", RENEWAL: "active", UNCANCELLATION: "active", PRODUCT_CHANGE: "active",
    NON_RENEWING_PURCHASE: "active", CANCELLATION: "cancelled", EXPIRATION: "expired", BILLING_ISSUE: "active",
  } as Record<string, string>)[String(e.type)];
  if (!status) return json({ ok: true });
  for (const plan of plans) {
    await admin.from("entitlements").upsert({
      user_id: userId, plan, source: e.store === "APP_STORE" ? "appstore" : "play",
      external_id: `${e.original_transaction_id ?? e.transaction_id}:${plan}`, status,
      cycle: /year|anual|annual/i.test(String(e.product_id)) ? "yearly" : "monthly",
      amount: e.price_in_purchased_currency ? Math.round(Number(e.price_in_purchased_currency)) : null,
      currency: String(e.currency ?? "COP"),
      expires_at: e.expiration_at_ms ? new Date(Number(e.expiration_at_ms)).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "source,external_id" });
  }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  try {
    if (url.searchParams.get("origen") === "mercadopago") return await webhookMercadoPago(req, url, body);
    if (url.searchParams.get("origen") === "revenuecat") return await webhookRevenueCat(req, body);

    // ── Usuario: iniciar el pago web ──
    const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user: me } } = await user.auth.getUser();
    if (!me?.email) return json({ error: "not_authenticated" }, 401);
    const plan = body.plan as Plan, cycle = body.cycle === "yearly" ? "yearly" : "monthly";
    if (!(plan in PRECIOS)) return json({ error: "bad_plan" }, 400);
    const p = PRECIOS[plan];

    const r = await mp("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: `AlgoFalta ${p.name} (${cycle === "yearly" ? "anual" : "mensual"})`,
        external_reference: `${me.id}:${plan}:${cycle}`,
        payer_email: me.email,
        auto_recurring: { frequency: cycle === "yearly" ? 12 : 1, frequency_type: "months", transaction_amount: p[cycle], currency_id: "COP" },
        back_url: `${WEB}/suscribirme?listo=1`,
        status: "pending",
      }),
    });
    const s = await r.json();
    if (!r.ok || !s.init_point) return json({ error: "mp_error", detail: s.message ?? null }, 502);
    return json({ url: s.init_point });
  } catch (e) {
    console.error(e);
    return json({ error: "server_error" }, 500);
  }
});
