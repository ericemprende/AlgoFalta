import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { alerta } from '@/lib/alerta';
import { Ahorro } from '@/components/Ahorro';
import { Avatar } from '@/components/Avatar';
import { type Item, Lista } from '@/components/Lista';
import { Btn, Card, Empty, Field, ReportSheet, Screen, T, styles } from '@/components/ui';
import { useSession } from '@/lib/session';
import { cop, errorText, supabase } from '@/lib/supabase';
import { font, useColors } from '@/lib/theme';

type Member = { user_id: string; role: string; name: string; avatar: string | null; bio: string };
type Purchase = { id: string; amount: number; store: string | null; paid_by: string | null; created_by: string | null; purchased_at: string };
type Balance = { user_id: string; paid: number; fair_share: number; balance: number };
type Tab = 'lista' | 'ahorro' | 'cuentas' | 'miembros';
const TABS: Record<Tab, string> = { lista: 'Lista', ahorro: 'Ahorro', cuentas: 'Cuentas', miembros: 'Miembros' };

export default function Hogar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const me = session?.user.id;
  const c = useColors();
  const [tab, setTab] = useState<Tab>('lista');
  const [home, setHome] = useState<{ name: string; owner_id: string } | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<{ kind: 'member' | 'item'; id: string; subject: string } | null>(null);

  const loadItems = useCallback(async (lid: string) => {
    const { data } = await supabase.from('items').select('id, name, quantity, category, added_by, checked_at').eq('list_id', lid).order('created_at');
    if (data) setItems(data);
  }, []);
  const loadMoney = useCallback(async () => {
    const [p, b] = await Promise.all([
      supabase.from('purchases').select('id, amount, store, paid_by, created_by, purchased_at').eq('household_id', id).order('purchased_at', { ascending: false }).limit(50),
      supabase.from('household_balances').select('user_id, paid, fair_share, balance').eq('household_id', id),
    ]);
    if (p.data) setPurchases(p.data); if (b.data) setBalances(b.data);
  }, [id]);
  const loadMembers = useCallback(async () => {
    const { data: m } = await supabase.from('household_members').select('user_id, role').eq('household_id', id).order('joined_at');
    if (!m) return;
    const { data: pr } = await supabase.from('profiles').select('id, display_name, avatar_url, bio').in('id', m.map((x) => x.user_id));
    const byId = new Map((pr ?? []).map((p) => [p.id, p]));
    setMembers(m.map((x) => { const p = byId.get(x.user_id); return { ...x, name: p?.display_name || 'Sin nombre', avatar: p?.avatar_url ?? null, bio: p?.bio ?? '' }; }));
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: h, error } = await supabase.from('households').select('name, owner_id').eq('id', id).single();
      if (error) return setErr(errorText(error));
      setHome(h);
      let { data: l } = await supabase.from('lists').select('id').eq('household_id', id).order('created_at').limit(1).maybeSingle();
      if (!l) ({ data: l } = await supabase.from('lists').insert({ household_id: id, name: 'Mercado' }).select('id').single());
      if (l) { setListId(l.id); loadItems(l.id); }
      loadMembers(); loadMoney();
    })();
  }, [id, loadItems, loadMembers, loadMoney]);

  // Tiempo real: la lista y las compras se actualizan en todos los teléfonos.
  useEffect(() => {
    if (!listId) return;
    const ch = supabase.channel(`hogar-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `household_id=eq.${id}` }, () => loadItems(listId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: `household_id=eq.${id}` }, () => loadMoney())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, listId, loadItems, loadMoney]);

  const name = (uid: string | null) => (uid ? members.find((m) => m.user_id === uid)?.name ?? 'Usuario eliminado' : 'Usuario eliminado');

  return (
    <Screen>
      <Stack.Screen options={{ title: home?.name ?? '' }} />
      <View style={[styles.row, { backgroundColor: c.soft, borderRadius: 999, padding: 4 }]}>
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center', backgroundColor: tab === t ? c.btn : 'transparent' }}>
            <Text style={{ fontFamily: font.extra, color: tab === t ? c.btnFg : c.fg }}>{TABS[t]}</Text>
          </Pressable>
        ))}
      </View>
      {err ? <T style={{ color: c.danger }}>{err}</T> : null}
      {tab === 'lista' && listId ? <Lista id={id} listId={listId} items={items} name={name} me={me} onChange={() => loadItems(listId)} onReport={(i) => setReport({ kind: 'item', id: i.id, subject: `Producto: ${i.name}` })} onAhorro={() => setTab('ahorro')} /> : null}
      {tab === 'ahorro' ? <Ahorro id={id} /> : null}
      {tab === 'cuentas' ? <Cuentas id={id} me={me} members={members} purchases={purchases} balances={balances} name={name} onChange={loadMoney} /> : null}
      {tab === 'miembros' && home ? <Miembros id={id} me={me} ownerId={home.owner_id} members={members} onChange={loadMembers}
        onReport={(m) => setReport({ kind: 'member', id: m.user_id, subject: `Miembro: ${m.name}` })} /> : null}
      <ReportSheet visible={!!report} onClose={() => setReport(null)} householdId={id} targetKind={report?.kind ?? 'other'} targetId={report?.id} subject={report?.subject ?? ''} />
    </Screen>
  );
}

function Cuentas({ id, me, members, purchases, balances, name, onChange }: {
  id: string; me?: string; members: Member[]; purchases: Purchase[]; balances: Balance[]; name: (u: string | null) => string; onChange: () => void;
}) {
  const c = useColors();
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState('');
  const [payer, setPayer] = useState<string | undefined>(me);
  const [err, setErr] = useState<string | null>(null);
  const total = purchases.reduce((s, p) => s + p.amount, 0);

  // Menor número de transferencias: el que más debe le paga al que más le deben.
  const settle = useMemo(() => {
    const debt = balances.filter((b) => b.balance < 0).map((b) => ({ u: b.user_id, v: -b.balance })).sort((a, b) => b.v - a.v);
    const cred = balances.filter((b) => b.balance > 0).map((b) => ({ u: b.user_id, v: b.balance })).sort((a, b) => b.v - a.v);
    const out: { from: string; to: string; v: number }[] = [];
    let i = 0, j = 0;
    while (i < debt.length && j < cred.length) {
      const v = Math.min(debt[i].v, cred[j].v);
      if (v > 0) out.push({ from: debt[i].u, to: cred[j].u, v });
      debt[i].v -= v; cred[j].v -= v;
      if (debt[i].v <= 0) i++; if (cred[j].v <= 0) j++;
    }
    return out;
  }, [balances]);

  const add = async () => {
    setErr(null);
    const v = parseInt(amount.replace(/\D/g, ''), 10);
    if (!v || !payer) return;
    const { error } = await supabase.from('purchases').insert({ household_id: id, amount: v, store: store.trim() || null, paid_by: payer });
    if (error) return setErr(errorText(error));
    setAmount(''); setStore(''); onChange();
  };
  const remove = (p: Purchase) => alerta('Borrar compra', `${cop(p.amount)}${p.store ? ' · ' + p.store : ''}`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Borrar', style: 'destructive', onPress: async () => { await supabase.from('purchases').delete().eq('id', p.id); onChange(); } },
  ]);

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ backgroundColor: c.accent, borderColor: c.accent }}>
        <Text style={{ color: '#fff', fontFamily: font.bold }}>Total gastado</Text>
        <Text style={{ color: '#fff', fontFamily: font.black, fontSize: 28 }}>{cop(total)}</Text>
      </Card>

      <Card>
        <T kind="h2">Para quedar a paz y salvo</T>
        {settle.length === 0 ? <T kind="muted">Todos están al día.</T> : settle.map((s, k) => (
          <View key={k} style={[styles.row, { justifyContent: 'space-between' }]}>
            <T style={{ flex: 1 }}>{name(s.from)} → {name(s.to)}</T>
            <T style={{ fontFamily: font.extra }}>{cop(s.v)}</T>
          </View>
        ))}
      </Card>

      <Card>
        <T kind="h2">Registrar una compra</T>
        <Field label="¿Cuánto?" placeholder="45000" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
        <Field label="¿Dónde? (opcional)" placeholder="D1, Ara, tienda" value={store} onChangeText={setStore} maxLength={60} />
        <T kind="muted">¿Quién pagó?</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {members.map((m) => (
            <Pressable key={m.user_id} onPress={() => setPayer(m.user_id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: payer === m.user_id ? c.btn : c.soft }}>
              <Text style={{ fontFamily: font.bold, color: payer === m.user_id ? c.btnFg : c.fg }}>{m.user_id === me ? 'Yo' : m.name}</Text>
            </Pressable>
          ))}
        </View>
        <Btn title="Guardar compra" onPress={add} disabled={!amount.replace(/\D/g, '') || !payer} />
        {err ? <T style={{ color: c.danger }}>{err}</T> : null}
      </Card>

      <T kind="label">Compras</T>
      {purchases.length === 0 ? <Empty text="Aún no hay compras registradas." /> : purchases.map((p) => (
        <Pressable key={p.id} onLongPress={p.created_by === me ? () => remove(p) : undefined}
          style={[styles.row, { paddingVertical: 10, borderBottomWidth: 1, borderColor: c.line }]}>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: font.bold }}>{name(p.paid_by)}{p.store ? ` · ${p.store}` : ''}</T>
            <T kind="muted" style={{ fontSize: 12 }}>{p.purchased_at}</T>
          </View>
          <T style={{ fontFamily: font.extra }}>{cop(p.amount)}</T>
        </Pressable>
      ))}
    </View>
  );
}

function Miembros({ id, me, ownerId, members, onChange, onReport }: {
  id: string; me?: string; ownerId: string; members: Member[]; onChange: () => void; onReport: (m: Member) => void;
}) {
  const c = useColors();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isOwner = me === ownerId;

  const invite = async () => {
    setBusy(true); setErr(null);
    const { data: token, error } = await supabase.rpc('invite_to_household', { p_household: id });
    setBusy(false);
    if (error) return setErr(errorText(error));
    await Share.share({ message: `Únete a mi lista en AlgoFalta. Abre la app → "Unirme con un código" y pega: ${token}\n\nhttps://www.algofalta.com` });
  };
  const kick = (m: Member) => alerta(`Sacar a ${m.name}`, 'Ya no verá la lista ni las cuentas de este hogar.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sacar', style: 'destructive', onPress: async () => { await supabase.from('household_members').delete().eq('household_id', id).eq('user_id', m.user_id); onChange(); } },
  ]);
  const leave = () => alerta('Salir del hogar', 'Dejarás de ver esta lista.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Salir', style: 'destructive', onPress: async () => { await supabase.from('household_members').delete().eq('household_id', id).eq('user_id', me!); router.back(); } },
  ]);
  const menu = (m: Member) => alerta(m.name, undefined, [
    ...(isOwner ? [{ text: 'Sacar del hogar', style: 'destructive' as const, onPress: () => kick(m) }] : []),
    { text: 'Reportar', onPress: () => onReport(m) },
    { text: 'Cancelar', style: 'cancel' as const },
  ]);

  return (
    <View style={{ gap: 12 }}>
      <Btn title="Invitar a alguien" onPress={invite} loading={busy} />
      {err ? <T style={{ color: c.danger }}>{err}</T> : null}
      {members.map((m) => (
        <View key={m.user_id} style={[styles.row, { paddingVertical: 10, borderBottomWidth: 1, borderColor: c.line }]}>
          <Avatar name={m.name} url={m.avatar} size={48} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: font.bold }}>{m.name}{m.user_id === me ? ' (tú)' : ''}</T>
            {m.bio ? <T kind="muted" style={{ fontSize: 13 }}>{m.bio}</T> : null}
            <T kind="muted" style={{ fontSize: 12 }}>{m.user_id === ownerId ? 'Dueño' : 'Miembro'}</T>
          </View>
          {m.user_id !== me ? <Btn title="⋯" kind="link" onPress={() => menu(m)} /> : null}
        </View>
      ))}
      {!isOwner ? <Btn title="Salir de este hogar" kind="link" onPress={leave} /> : null}
      <T kind="muted" style={{ textAlign: 'center' }}>Hasta 8 personas por hogar.</T>
    </View>
  );
}
