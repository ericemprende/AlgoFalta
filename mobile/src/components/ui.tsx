import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errorText, supabase } from '@/lib/supabase';
import { font, useColors } from '@/lib/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const c = useColors();
  const body = <View style={{ padding: 20, gap: 16, flexGrow: 1 }}>{children}</View>;
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>{body}</ScrollView> : body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function T({ children, style, kind = 'body' }: { children: ReactNode; style?: TextStyle; kind?: 'h1' | 'h2' | 'body' | 'muted' | 'label' }) {
  const c = useColors();
  const s: Record<string, TextStyle> = {
    h1: { fontFamily: font.black, fontSize: 30, lineHeight: 36, color: c.fg },
    h2: { fontFamily: font.extra, fontSize: 19, color: c.fg },
    body: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: c.fg },
    muted: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: c.muted },
    label: { fontFamily: font.extra, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: c.accentInk },
  };
  return <Text style={[s[kind], style]}>{children}</Text>;
}

export function Btn({ title, onPress, kind = 'primary', loading, disabled, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'link'; loading?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.btn : kind === 'danger' ? c.danger : 'transparent';
  const fg = kind === 'primary' ? c.btnFg : kind === 'danger' ? '#FFFFFF' : kind === 'link' ? c.accentInk : c.fg;
  return (
    <Pressable
      accessibilityRole="button" onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [{
        minHeight: kind === 'link' ? 36 : 52, borderRadius: 999, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg, borderWidth: kind === 'ghost' ? 2 : 0, borderColor: c.fg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ fontFamily: font.extra, fontSize: 16, color: fg }}>{title}</Text>}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      {props.label ? <Text style={{ fontFamily: font.bold, color: c.fg, fontSize: 14 }}>{props.label}</Text> : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[{ backgroundColor: c.soft, borderRadius: 12, paddingHorizontal: 14, minHeight: 50, fontFamily: font.regular, fontSize: 16, color: c.fg }, props.style]}
      />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.bg, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 16, gap: 10 }, style]}>{children}</View>;
}

export function Empty({ text }: { text: string }) {
  return <T kind="muted" style={{ textAlign: 'center', paddingVertical: 24 }}>{text}</T>;
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

/** Hoja para reportar contenido o personas (política de contenido generado por usuarios e IA de Google Play). */
export function ReportSheet({ visible, onClose, householdId, targetKind, targetId, subject }: {
  visible: boolean; onClose: () => void; householdId?: string; targetKind: 'member' | 'item' | 'ai_reply' | 'other'; targetId?: string; subject: string;
}) {
  const c = useColors();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const send = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('reports').insert({ household_id: householdId ?? null, target_kind: targetKind, target_id: targetId ?? null, reason: reason.trim() });
    setBusy(false);
    if (error) return setMsg(errorText(error));
    setReason(''); setMsg('Gracias. Revisaremos tu reporte.');
    setTimeout(() => { setMsg(null); onClose(); }, 1400);
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.35)' }} onPress={onClose} />
      <View style={{ backgroundColor: c.bg, padding: 20, gap: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <T kind="h2">Reportar</T>
        <T kind="muted">{subject}</T>
        <Field placeholder="¿Qué pasó?" value={reason} onChangeText={setReason} multiline maxLength={500} style={{ minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }} />
        {msg ? <T>{msg}</T> : null}
        <Btn title="Enviar reporte" onPress={send} loading={busy} disabled={!reason.trim()} />
        <Btn title="Cancelar" kind="link" onPress={onClose} />
      </View>
    </Modal>
  );
}
