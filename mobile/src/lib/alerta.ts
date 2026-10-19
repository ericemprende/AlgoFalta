import { Alert, type AlertButton, Platform } from 'react-native';

/** Alert.alert en el teléfono. En el navegador Alert no hace nada, así que se usa confirm (una acción) o prompt (varias). */
export function alerta(title: string, message?: string, buttons: AlertButton[] = [{ text: 'OK' }]) {
  if (Platform.OS !== 'web') return Alert.alert(title, message, buttons);
  const acciones = buttons.filter((b) => b.style !== 'cancel');
  const texto = [title, message].filter(Boolean).join('\n\n');
  if (acciones.length <= 1) {
    if (acciones.length === 0 || window.confirm(acciones[0].text ? `${texto}\n\n¿${acciones[0].text}?` : texto)) acciones[0]?.onPress?.();
    return;
  }
  const elegido = window.prompt(`${texto}\n\n${acciones.map((b, k) => `${k + 1}. ${b.text}`).join('\n')}\n\nEscribe el número:`);
  acciones[parseInt(elegido ?? '', 10) - 1]?.onPress?.();
}
