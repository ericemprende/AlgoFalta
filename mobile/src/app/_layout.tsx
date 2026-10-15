import {
  Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/lib/session';
import { font, useColors } from '@/lib/theme';

function Gate() {
  const { session, ready } = useSession();
  const c = useColors();
  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}><ActivityIndicator color={c.accent} /></View>;
  }
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: c.bg }, headerTintColor: c.fg, headerShadowVisible: false,
      headerTitleStyle: { fontFamily: font.extra }, contentStyle: { backgroundColor: c.bg },
    }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ title: 'AlgoFalta' }} />
        <Stack.Screen name="hogar/[id]" options={{ title: '' }} />
        <Stack.Screen name="perfil" options={{ title: 'Perfil' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="auto" />
        <Gate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
