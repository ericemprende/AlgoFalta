# App Privacy (etiquetas de privacidad) — App Store Connect

**¿Recolectas datos?** Sí. **¿Rastreo (tracking)?** No — no se combinan datos con terceros para publicidad.

| Tipo (Apple) | Vinculado al usuario | Uso para rastreo | Finalidad |
|---|---|---|---|
| Información de contacto → Nombre | Sí | No | Funcionalidad de la app |
| Información de contacto → Correo electrónico | Sí | No | Funcionalidad de la app |
| Información de contacto → Número de teléfono | Sí | No | Funcionalidad de la app |
| Compras → Historial de compras | Sí | No | Funcionalidad de la app |
| Información financiera → Otra información financiera (montos de Cuentas claras) | Sí | No | Funcionalidad de la app |
| Contenido del usuario → Otro contenido del usuario (listas, grupos) | Sí | No | Funcionalidad de la app |
| Contenido del usuario → Datos de audio (notas de voz al bot) | Sí | No | Funcionalidad de la app |
| Contenido del usuario → Fotos (perfil) | Sí | No | Funcionalidad de la app |
| Ubicación → Ubicación aproximada | No | No | Funcionalidad de la app |
| Identificadores → ID del usuario | Sí | No | Funcionalidad de la app |
| Identificadores → ID del dispositivo | Sí | No | Funcionalidad de la app |
| Uso → Interacción con el producto | Sí | No | Análisis |
| Diagnóstico → Datos de fallos, Rendimiento | No | No | Análisis |

Si se agregan SDKs (Sentry, PostHog, Firebase Analytics, RevenueCat), revisar que sus datos estén reflejados aquí y en `PrivacyInfo.xcprivacy`.
