# Google Play — Checklist de publicación

## 1. Cuenta
- [ ] Cuenta Google Play Console (pago único USD 25) — preferible tipo **Organización** con D-U-N-S.
- [ ] Verificación de identidad y de teléfono/correo de contacto público.
- [ ] Perfil de pagos (si hay suscripciones) con cuenta bancaria colombiana.
- [ ] Si es cuenta personal nueva: prueba cerrada con **mínimo 12 testers durante 14 días** antes de pedir producción.

## 2. App técnica
- [ ] Paquete: `com.algofalta.app` (no se puede cambiar después).
- [ ] Formato **AAB** (Android App Bundle), firmado con Play App Signing (`eas build -p android`).
- [ ] `targetSdkVersion` = el exigido vigente (API 35 a 2026; revisar cada agosto).
- [ ] Icono adaptativo: `../../android/` (foreground + background ya listos).
- [ ] Permisos mínimos y justificados: INTERNET, POST_NOTIFICATIONS, (opcional) ubicación aproximada. Evitar `READ_CONTACTS` salvo que se use para invitar.
- [ ] Botón **Eliminar cuenta** dentro de la app.

## 3. Ficha de Play Store (ver `ficha-tienda.md`)
- [ ] Nombre (máx. 30)  · Descripción breve (máx. 80) · Descripción completa (máx. 4000)
- [ ] Icono 512×512 PNG 32-bit → `graficos/icono-play-512.png` ✅
- [ ] Gráfico destacado 1024×500 JPG/PNG sin transparencia → `graficos/feature-graphic-1024x500.png` ✅
- [ ] Capturas teléfono: 2–8, mínimo 320 px, máximo 3840 px, proporción 16:9 o 9:16 (recomendado 1080×1920). Para aparecer en recomendaciones: al menos 4 de 1080 px+.
- [ ] Capturas tablet 7" y 10" (opcionales, recomendadas)
- [ ] Video YouTube (opcional)
- [ ] Categoría: **Compras** · Etiquetas: lista de compras, hogar
- [ ] Correo de contacto, sitio web, URL de privacidad

## 4. Contenido de la app (Política de la app)
- [ ] **Política de privacidad**: https://algofalta.com/privacidad
- [ ] **Acceso a la app**: credenciales de prueba (usuario demo con grupo y lista ya creados)
- [ ] **Anuncios**: No contiene anuncios
- [ ] **Clasificación de contenido** (cuestionario IARC): categoría "Utilidad/Productividad/Comunicación"; contesta *Sí* a "los usuarios pueden interactuar/compartir contenido" (grupos). Resultado esperado: Apto para todos / PEGI 3 con aviso "Los usuarios interactúan".
- [ ] **Público objetivo**: 18+ (evita la política de Familias)
- [ ] **Seguridad de los datos**: ver `seguridad-datos.md`
- [ ] **Eliminación de cuenta**: https://algofalta.com/eliminar-cuenta
- [ ] **Apps gubernamentales / financieras**: No (Cuentas claras no mueve dinero; si en el futuro se integran pagos entre usuarios, declarar como app financiera)
- [ ] **Salud**: No · **Noticias**: No
- [ ] **Permisos de ubicación en segundo plano**: No usar

## 5. Monetización
- [ ] Crear productos de suscripción en Play Console: `plus_hogar_mensual` (COP 12.900), `plus_hogar_anual` (129.000), `pro_hogar_mensual` (19.900), `negocio_mensual` (49.900), `empresa_mensual` (149.900).
- [ ] Inscribirse al programa de tarifa de servicio del 15 %.
- [ ] Mostrar en el paywall: precio, periodo, renovación automática y cómo cancelar.

## 6. Lanzamiento
- [ ] Prueba interna → Prueba cerrada → Producción (país: Colombia primero)
- [ ] Revisión típica: 1 a 7 días.

## 7. Páginas públicas (publicadas en la web)
- Privacidad: https://algofalta.com/privacidad
- Términos y suscripciones: https://algofalta.com/terminos
- Eliminar cuenta: https://algofalta.com/eliminar-cuenta
- Estándares de seguridad infantil (CSAE): https://algofalta.com/seguridad-infantil
- Soporte: https://algofalta.com/soporte
- [ ] Reemplazar `[TITULAR]`, `[NIT o C.C.]`, `[DIRECCIÓN]`, `[CIUDAD]` con el nombre EXACTO de la cuenta de Play Console.
- [ ] Crear buzones privacidad@, soporte@ y seguridad@algofalta.com.
- [ ] La app debe tener lo que las páginas prometen: Perfil → Configuración → Eliminar cuenta; Reportar miembro/contenido y reportar respuestas de la IA (política de contenido generado por IA); paywall con precio, periodo, renovación y cómo cancelar.
- [ ] Agregar enlace a la política de privacidad también dentro de la app.
