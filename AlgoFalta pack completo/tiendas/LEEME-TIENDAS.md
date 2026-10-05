# AlgoFalta — Publicación en tiendas

```
tiendas/
├── LEEME-TIENDAS.md          ← este archivo (requisitos comunes)
├── google-play/
│   ├── CHECKLIST.md          ← todo lo que pide Play Console, paso a paso
│   ├── ficha-tienda.md       ← textos listos para pegar (título, descripciones)
│   ├── seguridad-datos.md    ← respuestas del formulario "Seguridad de los datos"
│   ├── graficos/             ← icono 512 y gráfico destacado 1024x500 (listos)
│   └── capturas/LEEME.md     ← tamaños y guion de capturas
└── app-store/
    ├── CHECKLIST.md          ← todo lo que pide App Store Connect
    ├── ficha-tienda.md       ← nombre, subtítulo, palabras clave, descripción
    ├── privacidad-app.md     ← respuestas de "App Privacy" (etiquetas nutricionales)
    ├── notas-revision.md     ← texto para el equipo revisor de Apple
    ├── graficos/             ← icono 1024 sin transparencia (listo)
    └── capturas/LEEME.md     ← tamaños y guion de capturas
legal/                         ← páginas web que AMBAS tiendas exigen (publicarlas)
```

## Requisitos comunes a las dos tiendas

| Requisito | Estado | Dónde |
|---|---|---|
| Política de privacidad en URL pública | Borrador listo | `legal/privacidad.html` |
| Términos y condiciones (obligatorio en Apple si hay suscripciones) | Borrador listo | `legal/terminos.html` |
| Página web para eliminar la cuenta (Google obligatorio; Apple pide borrado en la app) | Borrador listo | `legal/eliminar-cuenta.html` |
| URL de soporte / contacto | Borrador listo | `legal/soporte.html` |
| Icono de la app | Listo | carpetas `graficos/` |
| Capturas de pantalla | **Falta** — requieren la app funcionando | `capturas/LEEME.md` |
| Cuenta de prueba para revisores | **Falta** — crear cuando exista backend | ver checklists |
| Botón "Eliminar cuenta" dentro de la app | **Falta** — implementar en la app | Perfil → Configuración |

## Antes de publicar `legal/`

1. Reemplazar todos los `[CORCHETES]`: razón social, NIT, dirección, teléfono, fecha.
2. Crear los correos `soporte@algofalta.com` y `privacidad@algofalta.com` (o cambiarlos).
3. Hacer revisar los textos por un abogado colombiano (son borradores basados en Ley 1581/2012, Decreto 1377/2013 y Ley 1480/2011, no asesoría legal).
4. Publicar en el dominio, p. ej. `https://algofalta.com/legal/privacidad.html`. Si se suben solo las páginas, copiar también `fonts/`, `favicon/` y `logos/` o ajustar las rutas `../`.
5. Registrar la base de datos en el **RNBD de la SIC** si la empresa supera los activos que exige la norma (verificar con el contador).

## Decisiones de negocio que afectan a las tiendas

- **Pagos dentro de la app:** Google y Apple exigen su sistema de facturación para suscripciones digitales (Plus Hogar, etc.) vendidas *dentro* de la app (comisión 15 % el primer millón USD/año con los programas para pequeños desarrolladores). Wompi / Mercado Pago / Nequi solo pueden usarse en la web, o para planes empresariales B2B facturados fuera de la app. Recomendación: usar RevenueCat o `expo-in-app-purchases` para unificar. **Decidido:** en la app solo se vende Plus Hogar; Negocio/Empresa/Corporativo se venden por la web y se activan desde el panel admin (Apple 3.1.3(c)). Ver `docs/panel-admin-planes-b2b.md`.
- **Inicio de sesión:** si se ofrece "Iniciar con Google" en iOS, Apple exige también "Iniciar sesión con Apple".
- **Cuenta de desarrollador:** se recomienda registrarse como **organización** (requiere número D-U-N-S gratuito, tarda ~1–2 semanas). Google exige a las cuentas personales nuevas una prueba cerrada con 12 testers durante 14 días antes de producción.
