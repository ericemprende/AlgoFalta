import { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { Btn, Card, Empty, T, styles } from '@/components/ui';
import { cop, supabase, WEB } from '@/lib/supabase';
import { font, useColors } from '@/lib/theme';

// Deben coincidir con STORES en supabase/functions/mercado-barato/precios.ts
const TIENDAS = [
  { id: 'exito', name: 'Éxito' }, { id: 'olimpica', name: 'Olímpica' }, { id: 'jumbo', name: 'Jumbo / Metro' }, { id: 'd1', name: 'D1' },
  { id: 'carulla', name: 'Carulla' }, { id: 'megatiendas', name: 'Megatiendas' }, { id: 'mercaldas', name: 'Mercaldas' },
];
const PRINCIPALES = 4;
// Cadenas sin tienda en línea con catálogo público: no hay de dónde sacar sus precios.
const SIN_CATALOGO = 'Ísimo, Ara y Makro';
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
  const [stores, setStores] = useState(['exito', 'olimpica', 'jumbo']);
  const [res, setRes] = useState<Resultado | null>(null);
  const [busy, setBusy] = useState(false);
  const [todas, setTodas] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nombre = (s: string) => TIENDAS.find((t) => t.id === s)?.name ?? s;

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
          {!todas ? (
            <Pressable onPress={() => setTodas(true)} accessibilityRole="button"
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: c.line }}>
              <Text style={{ fontFamily: font.bold, color: c.accentInk }}>+ Más supermercados</Text>
            </Pressable>
          ) : null}
        </View>
        {todas ? <T kind="muted" style={{ fontSize: 12 }}>{SIN_CATALOGO} todavía no venden en línea, así que no podemos consultar sus precios.</T> : null}
        <Btn title={busy ? 'Consultando precios…' : 'Armar mi mercado más barato'} onPress={armar} loading={busy} disabled={stores.length === 0} />
        {err ? <T style={{ color: c.danger }}>{err}</T> : null}
      </Card>

      {res ? (
        <>
          {res.items.length === 0 ? <Empty text="Tu lista está vacía. Agrega productos en la pestaña Lista." /> : (
            <Card style={{ backgroundColor: c.accent, borderColor: c.accent }}>
              <Text style={{ color: '#fff', fontFamily: font.bold }}>Comprando cada cosa donde está más barata</Text>
              <Text style={{ color: '#fff', fontFamily: font.black, fontSize: 28 }}>{cop(res.combo)}</Text>
              {res.savings > 0 && res.best_single ? (
                <Text style={{ color: '#fff', fontFamily: font.bold }}>
                  Ahorras {cop(res.savings)} frente a comprar todo en {res.best_single.name}
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
                  <T style={{ fontFamily: font.extra, minWidth: 90, textAlign: 'right' }}>{cop(t.total)}</T>
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
                  {b ? <T style={{ fontFamily: font.extra }}>{cop(b.cost)}</T> : null}
                </View>
                {b ? (
                  <>
                    <T style={{ color: c.accentInk, fontFamily: font.extra }}>{nombre(it.best!)}{b.list > b.price ? ' · en oferta' : ''}</T>
                    <T kind="muted" style={{ fontSize: 12 }}>{b.product} · {cop(b.price)} · precio consultado {hace(b.at)}</T>
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
