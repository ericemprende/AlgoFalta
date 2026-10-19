import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { alerta } from '@/lib/alerta';
import { Btn, Empty, T, styles } from '@/components/ui';
import { CATEGORIAS, type Producto, TIENDA, cantidad, norm, useCatalogo, usePrecios } from '@/lib/catalogo';
import { cop, supabase } from '@/lib/supabase';
import { font, useColors } from '@/lib/theme';

export type Item = { id: string; name: string; quantity: string | null; category: string | null; added_by: string | null; checked_at: string | null };

export function Lista({ id, listId, items, name, me, onChange, onReport, onAhorro }: {
  id: string; listId: string; items: Item[]; name: (u: string | null) => string; me?: string;
  onChange: () => void; onReport: (i: Item) => void; onAhorro: () => void;
}) {
  const c = useColors();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(CATEGORIAS[0].id);
  const pending = items.filter((i) => !i.checked_at);
  const done = items.filter((i) => i.checked_at);
  const enLista = new Map(pending.map((i) => [norm(i.name), i]));
  const catalogo = useCatalogo();

  // Buscando: productos del catálogo que coinciden. Sin buscar: los de la categoría elegida.
  const sugeridos = useMemo(() => {
    const n = norm(q);
    return n ? catalogo.filter((x) => x.query.includes(n)).slice(0, 12) : catalogo.filter((x) => x.category === cat);
  }, [q, cat, catalogo]);
  const exacto = !!q.trim() && sugeridos.some((x) => x.query === norm(q));

  // Precios oficiales de lo que está en pantalla: lo pendiente y los productos sugeridos.
  const precios = usePrecios([...pending.map((i) => i.name), ...sugeridos.map((x) => x.name)], catalogo);
  const { masBarato, delCatalogo } = precios;

  const precio = (i: Item) => { const b = masBarato(i.name); return b ? b.price * cantidad(i.quantity) : null; };
  const total = pending.reduce((s, i) => s + (precio(i) ?? 0), 0);
  const conPrecio = pending.filter((i) => precio(i) != null).length;

  const agregar = async (nombre: string, categoriaId: string) => {
    const ya = enLista.get(norm(nombre));
    setQ('');
    if (ya) return cambiar(ya, 1);
    await supabase.from('items').insert({ list_id: listId, household_id: id, name: nombre, category: categoriaId, quantity: '1', added_by: me });
    onChange();
  };
  // Lo escrito a mano (tienda de barrio, marca específica…) se guarda tal cual.
  const agregarTexto = () => { const n = q.trim(); if (n) agregar(n.charAt(0).toUpperCase() + n.slice(1), delCatalogo(n)?.category ?? 'otros'); };
  const cambiar = async (i: Item, d: number) => {
    const n = cantidad(i.quantity) + d;
    if (n < 1) await supabase.from('items').delete().eq('id', i.id);
    else await supabase.from('items').update({ quantity: String(n) }).eq('id', i.id);
    onChange();
  };
  const toggle = async (i: Item) => {
    await supabase.from('items').update(i.checked_at ? { checked_at: null, checked_by: null } : { checked_at: new Date().toISOString(), checked_by: me }).eq('id', i.id);
    onChange();
  };
  const menu = (i: Item) => alerta(i.name, undefined, [
    { text: 'Borrar', style: 'destructive', onPress: async () => { await supabase.from('items').delete().eq('id', i.id); onChange(); } },
    { text: 'Reportar', onPress: () => onReport(i) },
    { text: 'Cancelar', style: 'cancel' },
  ]);
  const clearDone = async () => { await supabase.from('items').delete().eq('list_id', listId).not('checked_at', 'is', null); onChange(); };

  const grupos = CATEGORIAS.map((k) => ({ k, items: pending.filter((i) => (i.category ?? delCatalogo(i.name)?.category ?? 'otros') === k.id) })).filter((g) => g.items.length);

  // Foto real del producto (del catálogo o de su precio más barato). Mientras no hay foto, la inicial del nombre.
  const Foto = ({ uri, name, size }: { uri?: string | null; name: string; size: number }) => uri
    ? <Image source={{ uri }} accessibilityIgnoresInvertColors style={{ width: size, height: size, borderRadius: 8, backgroundColor: '#fff' }} resizeMode="contain" />
    : <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: font.black, fontSize: size / 2.4, color: c.muted }}>{name.charAt(0).toUpperCase()}</Text>
      </View>;

  const Tile = ({ x }: { x: Producto }) => {
    const ya = enLista.get(x.query);
    const b = masBarato(x.name);
    return (
      <Pressable onPress={() => agregar(x.name, x.category)} accessibilityRole="button" accessibilityLabel={`Agregar ${x.name}`}
        style={({ pressed }) => [{ width: '31.5%', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 2,
          backgroundColor: ya ? c.accent : c.soft, opacity: pressed ? 0.7 : 1 }]}>
        <Foto uri={x.image_url ?? b?.image_url} name={x.name} size={48} />
        <Text numberOfLines={1} style={{ fontFamily: font.extra, fontSize: 13, color: ya ? '#fff' : c.fg }}>{x.name}</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 11, color: ya ? '#fff' : c.muted }}>{ya ? `✓ ${cantidad(ya.quantity)} en lista` : b ? `desde ${cop(b.price)}` : x.unit}</Text>
      </Pressable>
    );
  };

  const Row = ({ i }: { i: Item }) => {
    const ref = delCatalogo(i.name);
    const b = masBarato(i.name);
    const v = precio(i);
    return (
      <View style={[styles.row, { paddingVertical: 10, borderBottomWidth: 1, borderColor: c.line }]}>
        <Pressable onPress={() => toggle(i)} onLongPress={() => menu(i)} accessibilityRole="checkbox" accessibilityState={{ checked: !!i.checked_at }}
          style={[styles.row, { flex: 1 }]}>
          <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: c.accent, backgroundColor: i.checked_at ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {i.checked_at ? <Text style={{ color: '#fff', fontFamily: font.black }}>✓</Text> : null}
          </View>
          <Foto uri={ref?.image_url ?? b?.image_url} name={i.name} size={40} />
          <View style={{ flex: 1 }}>
            <T style={i.checked_at ? { textDecorationLine: 'line-through', color: c.muted } : { fontFamily: font.extra }}>{i.name}</T>
            <T kind="muted" style={{ fontSize: 12 }}>{[v != null && b ? `${cop(v)} en ${TIENDA[b.store] ?? b.store}` : precios.consultando ? 'buscando precio…' : 'sin precio en tiendas', name(i.added_by)].join(' · ')}</T>
          </View>
        </Pressable>
        {!i.checked_at ? (
          <View style={[styles.row, { gap: 0, backgroundColor: c.soft, borderRadius: 999 }]} accessibilityLabel={`Cantidad ${cantidad(i.quantity)}`}>
            <Pressable onPress={() => cambiar(i, -1)} accessibilityLabel="Quitar uno" hitSlop={6} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font.black, fontSize: 18, color: c.accentInk }}>−</Text>
            </Pressable>
            <Text style={{ fontFamily: font.black, minWidth: 18, textAlign: 'center', color: c.fg }}>{cantidad(i.quantity)}</Text>
            <Pressable onPress={() => cambiar(i, 1)} accessibilityLabel="Agregar uno" hitSlop={6} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font.black, fontSize: 18, color: c.accentInk }}>+</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Resumen: cuánto falta y cuánto costaría, con salto a la comparación real de precios. */}
      <View style={{ backgroundColor: c.btn, borderRadius: 20, padding: 16, gap: 10 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={{ fontFamily: font.bold, color: c.btnFg, opacity: 0.8 }}>Faltan {pending.length} {pending.length === 1 ? 'producto' : 'productos'}</Text>
            <Text style={{ fontFamily: font.black, fontSize: 28, color: c.btnFg }}>{conPrecio ? cop(total) : '—'}</Text>
          </View>
          <Text style={{ fontSize: 40 }}>🛍️</Text>
        </View>
        {conPrecio < pending.length ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: c.btnFg, opacity: 0.8 }}>Con precio oficial: {conPrecio} de {pending.length}. Lo que no venden en línea (tienda de barrio) no suma.</Text> : null}
        {pending.length ? (
          <Pressable onPress={onAhorro} style={{ backgroundColor: c.accent, borderRadius: 999, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ fontFamily: font.extra, color: '#fff' }}>Ver dónde sale más barato →</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Buscador: muestra productos mientras escribe; si no existe, se agrega tal cual. */}
      <View style={[styles.row, { backgroundColor: c.soft, borderRadius: 999, paddingLeft: 16, paddingRight: 4, minHeight: 52 }]}>
        <Text style={{ fontSize: 18 }}>🔍</Text>
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={agregarTexto} returnKeyType="done" maxLength={80}
          placeholder="Buscar o escribir lo que hace falta" placeholderTextColor={c.muted} accessibilityLabel="Buscar producto"
          style={{ flex: 1, fontFamily: font.bold, fontSize: 16, color: c.fg, paddingVertical: 12 }} />
        {q ? <Pressable onPress={() => setQ('')} accessibilityLabel="Borrar búsqueda" style={{ padding: 10 }}><Text style={{ color: c.muted, fontSize: 16 }}>✕</Text></Pressable> : null}
      </View>

      {!q ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIAS.filter((k) => k.id !== 'otros').map((k) => (
            <Pressable key={k.id} onPress={() => setCat(k.id)} accessibilityRole="tab" accessibilityState={{ selected: cat === k.id }}
              style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: cat === k.id ? c.btn : c.soft }}>
              <Text style={{ fontFamily: font.extra, color: cat === k.id ? c.btnFg : c.fg }}>{k.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {sugeridos.map((x) => <Tile key={x.name} x={x} />)}
      </View>
      {q.trim() && !exacto ? (
        <Btn title={`Agregar "${q.trim()}" tal cual`} kind="ghost" onPress={agregarTexto} />
      ) : null}
      {q.trim() && sugeridos.length === 0 ? <T kind="muted" style={{ textAlign: 'center' }}>No está en el catálogo. Agrégalo así, por ejemplo algo de la tienda del barrio.</T> : null}

      <T kind="label" style={{ marginTop: 6 }}>Lo que falta · {pending.length}</T>
      {pending.length === 0 ? <Empty text="No falta nada. Toca un producto de arriba para agregarlo." /> : grupos.map((g) => (
        <View key={g.k.id}>
          <T style={{ fontFamily: font.extra, color: c.muted, fontSize: 13 }}>{g.k.name}</T>
          {g.items.map((i) => <Row key={i.id} i={i} />)}
        </View>
      ))}
      {done.length > 0 ? (
        <>
          <T kind="label" style={{ marginTop: 8 }}>En el carrito · {done.length}</T>
          {done.map((i) => <Row key={i.id} i={i} />)}
          <Btn title="Quitar lo comprado" kind="link" onPress={clearDone} />
        </>
      ) : null}
      <T kind="muted" style={{ textAlign: 'center', fontSize: 12 }}>Toca para marcar como comprado. Mantén presionado para borrar o reportar. Precio más barato hoy en las tiendas en línea, por la presentación de referencia. Compara por kilo o litro en Ahorro.</T>
    </View>
  );
}
