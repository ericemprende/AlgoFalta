import { useColorScheme } from 'react-native';

const light = {
  bg: '#FFFFFF', soft: '#FFF4F7', fg: '#302036', muted: '#6E5F73', line: '#F1E3E9',
  accent: '#E83E75', accentInk: '#C42A5D', btn: '#302036', btnFg: '#FFFFFF', danger: '#B3261E',
};
const dark: typeof light = {
  bg: '#1E1423', soft: '#2F2136', fg: '#FBEFF4', muted: '#C2AFC7', line: '#3E2D45',
  accent: '#FF6E9C', accentInk: '#FF8DB0', btn: '#E83E75', btnFg: '#FFFFFF', danger: '#FFB4AB',
};
export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const font = {
  regular: 'Nunito_400Regular',
  bold: 'Nunito_700Bold',
  extra: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};
