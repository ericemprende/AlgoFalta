import { Link, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Btn, Card, Empty, Field, Screen, T } from '@/components/ui';
import { errorText, supabase } from '@/lib/supabase';
import { font, useColors } from '@/lib/theme';

type Household = { id: string; name: string };

export default function Hogares() {
  const c = useColors();
  const [homes, setHomes] = useState<Household[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    supabase.from('households').select('id, name').order('created_at').then(({ data, error }) => {
      if (error) setErr(errorText(error)); else setHomes(data);
    });
  }, []);
  useFocusEffect(load);

  const create = async () => {
    setBusy('create'); setErr(null);
    const { data: id, error } = await supabase.rpc('create_household', { p_name: name.trim() });
    if (!error) await supabase.from('lists').insert({ household_id: id, name: 'Mercado' });
    setBusy(null);
    if (error) return setErr(errorText(error));
    setName('');
    router.push({ pathname: '/hogar/[id]', params: { id } });
  };

  const join = async () => {
    setBusy('join'); setErr(null);
    // Acepta el código solo o el enlace completo algofalta.com/unirme/<código>.
    const token = code.trim().split('/').pop() ?? '';
    const { data: id, error } = await supabase.rpc('accept_invitation', { p_token: token });
    setBusy(null);
    if (error) return setErr(errorText(error));
    setCode('');
    router.push({ pathname: '/hogar/[id]', params: { id } });
  };

  return (
    <Screen>
      <Stack.Screen options={{
        headerRight: () => <Link href="/perfil" style={{ fontFamily: font.extra, color: c.accentInk, fontSize: 16 }}>Perfil</Link>,
      }} />
      <T kind="h1">Tus hogares</T>
      {homes === null ? null : homes.length === 0 ? <Empty text="Todavía no tienes hogares. Crea uno o únete con un código." /> : homes.map((h) => (
        <Pressable key={h.id} onPress={() => router.push({ pathname: '/hogar/[id]', params: { id: h.id } })}>
          <Card style={{ backgroundColor: c.soft, borderColor: c.soft }}>
            <T kind="h2">{h.name}</T>
            <T kind="muted">Ver lista y cuentas</T>
          </Card>
        </Pressable>
      ))}

      <Card>
        <T kind="h2">Crear un hogar</T>
        <Field placeholder="Ej: Casa Pérez, Apto 402, Asado" value={name} onChangeText={setName} maxLength={60} />
        <Btn title="Crear" onPress={create} loading={busy === 'create'} disabled={!name.trim()} />
      </Card>
      <Card>
        <T kind="h2">Unirme con un código</T>
        <Field placeholder="Pega el código o el enlace" value={code} onChangeText={setCode} autoCapitalize="none" />
        <Btn title="Unirme" kind="ghost" onPress={join} loading={busy === 'join'} disabled={!code.trim()} />
      </Card>
      {err ? <T style={{ color: c.danger }}>{err}</T> : null}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
