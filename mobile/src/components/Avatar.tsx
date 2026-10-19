import { Image, Text, View } from 'react-native';
import { font, useColors } from '@/lib/theme';

/** Foto de la persona; si no tiene, la inicial de su nombre. */
export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const c = useColors();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {url ? <Image source={{ uri: url }} style={{ width: size, height: size }} accessibilityLabel={`Foto de ${name}`} />
        : <Text style={{ fontFamily: font.black, fontSize: size * 0.42, color: c.accentInk }}>{(name.trim().charAt(0) || '?').toUpperCase()}</Text>}
    </View>
  );
}
