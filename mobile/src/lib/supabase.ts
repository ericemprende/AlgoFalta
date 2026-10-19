import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// En el teléfono la sesión se guarda con expo-sqlite; en el navegador, en el localStorage normal.
if (Platform.OS !== 'web') require('expo-sqlite/localStorage/install');

// Valores públicos (la clave publishable es segura en la app; los datos los protege RLS).
const SUPABASE_URL = 'https://zsnxudrexkvakkhsjicx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_4Mf6w8HUX5wQpqJTfuYndg_dIT7MVU9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export const WEB = 'https://www.algofalta.com';

export function errorText(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  const known: Record<string, string> = {
    household_full: 'Ese hogar ya está lleno (máximo 8 personas).',
    invalid_invitation: 'El código no es válido o ya venció.',
    not_member: 'No haces parte de ese hogar.',
    'Token has expired or is invalid': 'El código no es correcto o ya venció.',
  };
  for (const k in known) if (m.includes(k)) return known[k];
  return 'Algo salió mal. Revisa tu conexión e inténtalo de nuevo.';
}

export function cop(n: number): string {
  return '$ ' + Math.round(n).toLocaleString('es-CO');
}
