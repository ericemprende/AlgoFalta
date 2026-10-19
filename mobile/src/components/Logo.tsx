import { Image, Text, View } from 'react-native';
import { font, useColors } from '@/lib/theme';

/** Marca para el encabezado: la bolsita de AlgoFalta con el nombre. */
export function Logo() {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityRole="header" accessibilityLabel="AlgoFalta">
      <Image source={require('../../assets/logo-simbolo.png')} style={{ width: 24, height: 29 }} resizeMode="contain" />
      <Text style={{ fontFamily: font.black, fontSize: 20, color: c.fg }}>Algo<Text style={{ color: c.accent }}>Falta</Text></Text>
    </View>
  );
}
