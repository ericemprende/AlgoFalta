import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Btn, Card, Field, Screen, T } from '@/components/ui';
import { useSession } from '@/lib/session';
import { errorText, supabase, WEB } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

export default function Perfil() {
  const { session } = useSession();
  const c = useColors();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data }) => data && setName(data.display_name));
  }, [session]);

  const save = async () => {
    setErr(null);
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', session!.user.id);
    if (error) return setErr(errorText(error));
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  const deleteAccount = () => Alert.alert(
    'Eliminar tu cuenta',
    'Se borran tu perfil, tus hogares donde estás solo y tus datos. En hogares compartidos tus compras quedan como "Usuario eliminado". No se puede deshacer.\n\nSi pagas una suscripción en Google Play, cancélala también allí.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setBusy(true); setErr(null);
          const { error } = await supabase.rpc('delete_my_account');
          setBusy(false);
          if (error) return setErr(errorText(error));
          await supabase.auth.signOut({ scope: 'local' });
        },
      },
    ],
  );

  return (
    <Screen>
      <Card>
        <T kind="muted">{session?.user.email}</T>
        <Field label="Tu nombre (lo ve tu hogar)" value={name} onChangeText={setName} maxLength={80} placeholder="Ej: Laura" />
        <Btn title={saved ? 'Guardado ✓' : 'Guardar'} onPress={save} disabled={!name.trim()} />
      </Card>

      <Card>
        <T kind="h2">Ayuda y legal</T>
        <Btn title="Soporte" kind="link" onPress={() => Linking.openURL(`${WEB}/soporte`)} style={{ alignItems: 'flex-start', paddingHorizontal: 0 }} />
        <Btn title="Política de privacidad" kind="link" onPress={() => Linking.openURL(`${WEB}/privacidad`)} style={{ alignItems: 'flex-start', paddingHorizontal: 0 }} />
        <Btn title="Términos y condiciones" kind="link" onPress={() => Linking.openURL(`${WEB}/terminos`)} style={{ alignItems: 'flex-start', paddingHorizontal: 0 }} />
        <Btn title="Seguridad infantil" kind="link" onPress={() => Linking.openURL(`${WEB}/seguridad-infantil`)} style={{ alignItems: 'flex-start', paddingHorizontal: 0 }} />
      </Card>

      <Btn title="Cerrar sesión" kind="ghost" onPress={() => supabase.auth.signOut()} />
      <Btn title="Eliminar cuenta" kind="danger" onPress={deleteAccount} loading={busy} />
      {err ? <T style={{ color: c.danger }}>{err}</T> : null}
      <T kind="muted" style={{ textAlign: 'center' }}>AlgoFalta 1.0.0</T>
    </Screen>
  );
}
