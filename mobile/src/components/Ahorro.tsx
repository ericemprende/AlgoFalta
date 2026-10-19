import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { Btn, Card, Empty, T, styles } from '@/components/ui';
import { supabase, WEB } from '@/lib/supabase';
import { font, useColors } from '@/lib/theme';
import { TIENDAS_POR_PAIS } from '@/lib/tiendas';

const PAISES: Record<string, string> = {
  CO: 'Colombia', MX: 'México', PE: 'Perú', CL: 'Chile', EC: 'Ecuador', AR: 'Argentina',
  PA: 'Panamá', CR: 'Costa Rica', GT: 'Guatemala', DO: 'Rep. Dominicana', ES: 'España',
};
const PRINCIPALES = 4;
const MONEDA: Record<string, string> = { PE: 'S/', DO: 'RD$', CR: '₡', GT: 'Q', ES: '€' };
// Precio en la moneda del país, con centavos solo donde se usan.
const dinero = (n: number, pais: string) =>
  `${MONEDA[pais] ?? '$'} ${n.toLocaleString('es-CO', { maximumFractionDigits: ['CO', 'CL', 'AR', 'MX'].includes(pais) ? 0 : 2 })}`;

// Supermercados del país: los que tienen catálogo en línea se pueden comparar; los demás se muestran sin precios.
// Si dos marcas comparten catálogo (Jumbo y Metro) se muestran juntas.
function tiendasDe(pais: string) {
  const lista = TIENDAS_POR_PAIS[pais] ?? [];
  const alias = (id: string) => lista.filter((t) => t.alias && t.id === id).map((t) => t.name);
  const conPrecios = lista.filter((t) => t.precios && !t.alias).map((t) => ({ id: t.id, name: [t.name, ...alias(t.id)].join(' / ') }));
  const sinPrecios = lista.filter((t) => !t.precios).map((t) => t.name);
  return { conPrecios, sinPrecios };
}
const PLAN: Record<string, string> = { free: 'Gratis', plus: 'Plus Hogar', pro: 'Pro Hogar' };

type Pick = { cost: number; product: string; price: number; list: number; url: string; at: string } | null;
type Resultado = {
  plan: string; limit: number | null; total_items: number; optimized: number; locked: number;
  items: { id: string; name: string; quantity: string | null; best: string | null; byStore: Record<string, Pick> }[];
  totals: { store: string; name: string; total: number; found: number }[];
  combo: number; best_single: { store: string; name: string; total: number; items: number } | null; savings: number;
};

const hace = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600_000);
  return h < 1 ? 'hace menos de 1 hora' : `hace ${h} h`;
};

export function Ahorro({ id }: { id: string }) {
  const c = useColors();
  const [pais, setPais] = useState('CO');
  const [cambiarPais, setCambiarPais] = useState(false);
  const { conPrecios: TIENDAS, sinPrecios } = useMemo(() => tiendasDe(pais), [pais]);
  const [stores, setStores] = useState<string[]>([]);
  const money = (n: number) => dinero(n, pais);
  const [res, setRes] = useState<Resultado | null>(null);
  const [busy, setBusy] = useState(false);
  const [todas, setTodas] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nombre = (s: string) => TIENDAS.find((t) => t.id === s)?.name ?? s;

  // País del perfil: define qué supermercados se muestran.
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from('profiles').select('country').eq('id', data.user.id).single();
      if (p?.country && TIENDAS_POR_PAIS[p.country]) setPais(p.country);
    });
  }, []);
  useEffect(() => { setStores(TIENDAS.slice(0, 3).map((t) => t.id)); setRes(null); }, [TIENDAS]);
  const elegirPais = async (cc: string) => {
    setPais(cc); setCambiarPais(false);
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from('profiles').update({ country: cc }).eq('id', data.user.id);
  };

  const toggle = (s: string) => setStores((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]));
  const armar = async () => {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.functions.invoke('mercado-barato', { body: { household_id: id, stores } });
    setBusy(false);
    if (error || !data) return setErr('No pudimos consultar los precios. Inténtalo de nuevo en un momento.');
    setRes(data as Resultado);
  };

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <T kind="h2">Armar mi mercado más barato</T>
        <T kind="muted">Elige los supermercados y te decimos dónde comprar cada cosa de tu lista para pagar menos.</T>
        <Pressable onPress={() => setCambiarPais((v) => !v)} accessibilityRole="button">
          <T style={{ fontFamily: font.bold }}>Supermercados de {PAISES[pais]} <Text style={{ color: c.accentInk }}>· Cambiar país</Text></T>
        </Pressable>
        {cambiarPais ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(PAISES).map(([cc, n]) => (
              <Pressable key={cc} onPress={() => elegirPais(cc)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: cc === pais ? c.btn : c.soft }}>
                <Text style={{ fontFamily: font.bold, color: cc === pais ? c.btnFg : c.fg }}>{n}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {TIENDAS.length === 0 ? <T kind="muted">Todavía no hay supermercados de {PAISES[pais]} con precios en línea. Estamos trabajando en sumarlos.</T> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIENDAS.filter((t, i) => todas || i < PRINCIPALES || stores.includes(t.id)).map((t) => {
            const on = stores.includes(t.id);
            return (
              <Pressable key={t.id} onPress={() => toggle(t.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? c.btn : c.soft }}>
                <Text style={{ fontFamily: font.bold, color: on ? c.btnFg : c.fg }}>{on ? '✓ ' : ''}{t.name}</Text>
              </Pressable>
            );
          })}
          {!todas && (TIENDAS.length > PRINCIPALES || sinPrecios.length) ? (
            <Pressable onPress={() => setTodas(true)} accessibilityRole="button"
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: c.line }}>
              <Text style={{ fontFamily: font.bold, color: c.accentInk }}>+ Más supermercados</Text>
            </Pressable>
          ) : null}
        </View>
        {(todas || TIENDAS.length <= PRINCIPALES) && sinPrecios.length ? (
          <View style={{ gap: 6 }}>
            <T kind="label">Sin precios en línea todavía</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {sinPrecios.map((n) => (
                <View key={n} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: c.line }}>
                  <Text style={{ fontFamily: font.bold, color: c.muted }}>{n}</Text>
                </View>
              ))}
            </View>
            <T kind="muted" style={{ fontSize: 12 }}>No tienen catálogo público en internet, así que aún no podemos consultar sus precios.</T>
          </View>
        ) : null}
        <Btn title={busy ? 'Consultando precios…' : 'Armar mi mercado más barato'} onPress={armar} loading={busy} disabled={stores.length === 0} />
        {err ? <T style={{ color: c.danger }}>{err}</T> : null}
      </Card>

      {res ? (
        <>
          {res.items.length === 0 ? <Empty text="Tu lista está vacía. Agrega productos en la pestaña Lista." /> : (
            <Card style={{ backgroundColor: c.accent, borderColor: c.accent }}>
              <Text style={{ color: '#fff', fontFamily: font.bold }}>Comprando cada cosa donde está más barata</Text>
              <Text style={{ color: '#fff', fontFamily: font.black, fontSize: 28 }}>{money(res.combo)}</Text>
              {res.savings > 0 && res.best_single ? (
                <Text style={{ color: '#fff', fontFamily: font.bold }}>
                  Ahorras {money(res.savings)} frente a comprar todo en {res.best_single.name}
                </Text>
              ) : null}
            </Card>
          )}

          {res.locked > 0 ? (
            <Card style={{ borderColor: c.accent }}>
              <T style={{ fontFamily: font.extra }}>
                Tu plan {PLAN[res.plan] ?? res.plan} optimiza {res.limit} productos. {res.locked} {res.locked === 1 ? 'quedó' : 'quedaron'} por fuera.
              </T>
              <T kind="muted">Plus Hogar optimiza hasta 15 productos y Pro Hogar toda la lista, sin límite.</T>
              {/* Google y Apple no permiten enlazar al pago web desde la app: el botón solo existe en la versión web. */}
              {Platform.OS === 'web' ? <Btn title="Ver planes" kind="ghost" onPress={() => Linking.openURL(`${WEB}/suscribirme`)} /> : null}
            </Card>
          ) : null}

          {res.totals.length > 1 ? (
            <Card>
              <T kind="h2">Si compras todo en un solo lugar</T>
              {[...res.totals].sort((a, b) => a.total - b.total).map((t) => (
                <View key={t.store} style={[styles.row, { justifyContent: 'space-between' }]}>
                  <T style={{ flex: 1 }}>{t.name}</T>
                  <T kind="muted">{t.found}/{res.items.length} productos</T>
                  <T style={{ fontFamily: font.extra, minWidth: 90, textAlign: 'right' }}>{money(t.total)}</T>
                </View>
              ))}
            </Card>
          ) : null}

          <T kind="label">Dónde comprar cada cosa</T>
          {res.items.map((it) => {
            const b = it.best ? it.byStore[it.best] : null;
            return (
              <Pressable key={it.id} onPress={b ? () => Linking.openURL(b.url) : undefined}
                style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.line, gap: 2 }}>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <T style={{ fontFamily: font.bold, flex: 1 }}>{it.name}{it.quantity ? ` · ${it.quantity}` : ''}</T>
                  {b ? <T style={{ fontFamily: font.extra }}>{money(b.cost)}</T> : null}
                </View>
                {b ? (
                  <>
                    <T style={{ color: c.accentInk, fontFamily: font.extra }}>{nombre(it.best!)}{b.list > b.price ? ' · en oferta' : ''}</T>
                    <T kind="muted" style={{ fontSize: 12 }}>{b.product} · {money(b.price)} · precio consultado {hace(b.at)}</T>
                  </>
                ) : <T kind="muted" style={{ fontSize: 12 }}>No lo encontramos en esos supermercados. Prueba con otro nombre o agrega la marca.</T>}
              </Pressable>
            );
          })}
          <T kind="muted" style={{ textAlign: 'center', fontSize: 12 }}>
            Precios de referencia de las tiendas en línea; pueden variar en tu sede. Comparamos por kilo, litro o unidad. Toca un producto para verlo en la tienda.
          </T>
        </>
      ) : null}
    </View>
  );
}
