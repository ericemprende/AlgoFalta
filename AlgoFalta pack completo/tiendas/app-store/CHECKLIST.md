# Apple App Store — Checklist de publicación

## 1. Cuenta
- [ ] Apple Developer Program (USD 99/año) — como **Organización** (requiere D-U-N-S y sitio web con dominio propio).
- [ ] Acuerdo de **Apps de pago** firmado en App Store Connect, datos bancarios y fiscales (formulario W-8BEN-E).
- [ ] Declarar estado de **comerciante (Trader)** si aplica para la UE (solo si se distribuye allá).

## 2. App técnica
- [ ] Bundle ID: `com.algofalta.app`
- [ ] Compilar con el Xcode/SDK vigente exigido (`eas build -p ios`) y subir con `eas submit` o Transporter.
- [ ] Icono: `graficos/icono-appstore-1024.png` (1024×1024, RGB sin canal alfa, sin esquinas redondeadas) ✅
- [ ] **Archivo de privacidad** `PrivacyInfo.xcprivacy` (Privacy Manifest) incluyendo APIs de "razón requerida" (Expo lo genera; revisar).
- [ ] Textos de permisos en `Info.plist` (en español):
  - `NSMicrophoneUsageDescription`: "AlgoFalta usa el micrófono para dictar productos a tu lista." (solo si se dicta en la app)
  - `NSLocationWhenInUseUsageDescription`: "Usamos tu ubicación aproximada para mostrar precios de tiendas cercanas."
  - `NSPhotoLibraryUsageDescription`: "Para elegir tu foto de perfil."
  - `NSUserTrackingUsageDescription`: **no incluir** (no rastreamos).
- [ ] **Eliminar cuenta dentro de la app** (Guía 5.1.1(v)) — obligatorio.
- [ ] **Iniciar sesión con Apple** si existe login con Google/Facebook (Guía 4.8).
- [ ] Notificaciones push: certificado/clave APNs configurada en Expo.
- [ ] Declaración de cifrado de exportación: `ITSAppUsesNonExemptEncryption = false` (solo HTTPS estándar).

## 3. Ficha (ver `ficha-tienda.md`)
- [ ] Nombre (≤30) · Subtítulo (≤30) · Texto promocional (≤170) · Descripción (≤4000) · Palabras clave (≤100)
- [ ] URL de soporte → `legal/soporte.html` (obligatoria)
- [ ] URL de marketing → https://algofalta.com (opcional)
- [ ] URL de política de privacidad → `legal/privacidad.html` (obligatoria)
- [ ] Categoría principal: **Compras** · Secundaria: **Productividad**
- [ ] Copyright: "2026 [RAZÓN SOCIAL]"
- [ ] Capturas (ver `capturas/LEEME.md`): iPhone 6.9" obligatorias; iPad 13" solo si la app soporta iPad.
- [ ] Vista previa en video (opcional, 15–30 s).

## 4. Clasificación por edad (cuestionario nuevo)
- Sin violencia, sexo, drogas, apuestas → todo "Ninguno".
- "Contenido generado por usuarios / mensajería": **Sí** (grupos). Requiere tener: reportar contenido, bloquear usuarios y contacto publicado (Guía 1.2).
- Resultado esperado: **13+** o **4+** según el cuestionario; recomendado declarar 13+ por la interacción entre usuarios.

## 5. Privacidad de la app
- [ ] Completar "App Privacy" → ver `privacidad-app.md`.

## 6. Suscripciones (In-App Purchase)
- [ ] Grupo de suscripción "AlgoFalta Planes" con `plus_hogar_mensual`, `negocio_mensual`, `empresa_mensual` (elegir precio equivalente a COP en la tabla de Apple).
- [ ] Nombre visible, descripción y captura de revisión de cada suscripción.
- [ ] Paywall con: precio, duración, renovación automática, enlaces a **Términos (EULA)** y **Privacidad**, y botón **Restaurar compras** (Guía 3.1.2).
- [ ] Inscribirse al **App Store Small Business Program** (comisión 15 %).
- [ ] No mencionar ni enlazar pagos por Wompi/Nequi dentro de la app iOS para planes de consumo (Guía 3.1.1).
- [ ] En la descripción de la tienda añadir el enlace a Términos de uso (o usar el EULA estándar de Apple).

## 7. Revisión
- [ ] Notas para el revisor y cuenta demo → `notas-revision.md`.
- [ ] TestFlight interno → envío a revisión (24–48 h típicas).
