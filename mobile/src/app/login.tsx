import * as Linking from 'expo-linking';
import { useState } from 'react';
import { View } from 'react-native';
import { Btn, Field, Screen, T } from '@/components/ui';
import { errorText, supabase, WEB } from '@/lib/supabase';

// Entrar con código de 6 dígitos al correo: sin contraseñas que olvidar.
export default function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendCode = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setErr(errorText(error));
    setSent(true);
  };

  const verify = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setErr(errorText(error));
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        <T kind="label">Lista de mercado compartida</T>
        <T kind="h1">Que en la casa nunca falte nada.</T>
        <T kind="muted">Una sola lista para la familia, la pareja o los roommates.</T>
        {!sent ? (
          <>
            <Field label="Tu correo" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="tucorreo@gmail.com" />
            <Btn title="Enviarme un código" onPress={sendCode} loading={busy} disabled={!valid} />
          </>
        ) : (
          <>
            <T>Te enviamos un código a <T style={{ fontFamily: 'Nunito_800ExtraBold' }}>{email.trim()}</T>.</T>
            <Field label="Código" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={8} autoComplete="one-time-code" placeholder="123456" />
            <Btn title="Entrar" onPress={verify} loading={busy} disabled={code.length < 6} />
            <Btn title="Usar otro correo" kind="link" onPress={() => { setSent(false); setCode(''); }} />
          </>
        )}
        {err ? <T style={{ color: '#B3261E' }}>{err}</T> : null}
        <T kind="muted" style={{ textAlign: 'center' }}>Al continuar aceptas los Términos y la Política de privacidad.</T>
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn title="Términos" kind="link" onPress={() => Linking.openURL(`${WEB}/terminos`)} />
          <Btn title="Privacidad" kind="link" onPress={() => Linking.openURL(`${WEB}/privacidad`)} />
        </View>
      </View>
    </Screen>
  );
}
