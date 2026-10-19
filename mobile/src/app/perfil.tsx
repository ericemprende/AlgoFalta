import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, Text, View } from 'react-native';
import { alerta } from '@/lib/alerta';
import { Avatar } from '@/components/Avatar';
import { Btn, Card, Field, Screen, T } from '@/components/ui';
import { useSession } from '@/lib/session';
import { errorText, supabase, WEB } from '@/lib/supabase';
import { useColors } from '@/lib/theme';

export default function Perfil() {
  const { session } = useSession();
  const c = useColors();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase.from('profiles').select('display_name, bio, avatar_url').eq('id', session.user.id).single()
      .then(({ data }) => { if (data) { setName(data.display_name); setBio(data.bio ?? ''); setFoto(data.avatar_url); } });
  }, [session]);

  const save = async () => {
    setErr(null);
    const { error } = await supabase.from('profiles').update({ display_name: name.trim(), bio: bio.trim() }).eq('id', session!.user.id);
    if (error) return setErr(errorText(error));
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  // Foto cuadrada y liviana; queda en avatars/<mi id>/ y reemplaza la anterior.
  const elegirFoto = async () => {
    setErr(null);
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
    if (r.canceled || !r.assets[0]?.base64) return;
    setSubiendo(true);
    const me = session!.user.id;
    const path = `${me}/${Date.now()}.jpg`;
    const bytes = Uint8Array.from(atob(r.assets[0].base64), (ch) => ch.charCodeAt(0));
    const up = await supabase.storage.from('avatars').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (up.error) { setSubiendo(false); return setErr('No se pudo subir la foto. Intenta de nuevo.'); }
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', me);
    setSubiendo(false);
    if (error) return setErr(errorText(error));
    const viejas = (await supabase.storage.from('avatars').list(me)).data?.map((f) => `${me}/${f.name}`).filter((f) => f !== path) ?? [];
    if (viejas.length) supabase.storage.from('avatars').remove(viejas);
    setFoto(url);
  };
  const quitarFoto = async () => {
    const me = session!.user.id;
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', me);
    const todas = (await supabase.storage.from('avatars').list(me)).data?.map((f) => `${me}/${f.name}`) ?? [];
    if (todas.length) await supabase.storage.from('avatars').remove(todas);
    setFoto(null);
  };

  const deleteAccount = () => alerta(
    'Eliminar tu cuenta',
    'Se borran tu perfil, tus hogares donde estás solo y tus datos. En hogares compartidos tus compras quedan como "Usuario eliminado". No se puede deshacer.\n\nSi pagas una suscripción en Google Play, cancélala también allí.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setBusy(true); setErr(null);
          if (foto) await quitarFoto();
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
      <Card style={{ alignItems: 'stretch' }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Pressable onPress={elegirFoto} accessibilityRole="button" accessibilityLabel="Cambiar foto" disabled={subiendo}>
            <Avatar name={name} url={foto} size={104} />
            <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.bg }}>
              <Text style={{ fontSize: 14 }}>📷</Text>
            </View>
          </Pressable>
          <Btn title={subiendo ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Poner mi foto'} kind="link" onPress={elegirFoto} loading={subiendo} />
          {foto ? <Btn title="Quitar foto" kind="link" onPress={quitarFoto} /> : null}
          <T kind="muted">{session?.user.email}</T>
        </View>
        <Field label="Tu nombre (lo ve tu hogar)" value={name} onChangeText={setName} maxLength={80} placeholder="Ej: Laura" />
        <Field label="Algo sobre ti (opcional)" value={bio} onChangeText={setBio} maxLength={120} placeholder="Ej: La mamá de Sofi · hago el mercado los sábados" />
        <T kind="muted" style={{ fontSize: 12 }}>Tu foto, nombre y esta frase solo los ven las personas de tus hogares.</T>
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
