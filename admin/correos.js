/* Panel admin — sección Correos.
   Prototipo: plantillas y ajustes se guardan en localStorage. En producción:
   - Autenticación (confirmar, código, restablecer…): Supabase Auth → Email Templates (SMTP propio).
   - Resto: tabla email_templates + cola de envíos con Resend / Postmark / Amazon SES y un cron diario
     para los recordatorios por días. Usa las funciones globales $, esc, load, store de index.html. */
(function () {
  var G = [["todos", "Todos"], ["auth", "Autenticación"], ["cuenta", "Cuenta y grupos"], ["pagos", "Suscripción y pagos"], ["b2b", "Empresas"], ["vida", "Ciclo de vida"], ["legal", "Legal y datos"]];
  var VARS = [["nombre", "Nombre"], ["correo", "Correo"], ["enlace", "Enlace del botón"], ["codigo", "Código"], ["plan", "Plan"], ["precio", "Precio"], ["fecha", "Fecha"], ["dias", "Días"], ["grupo", "Grupo"], ["quien", "Quién"], ["organizacion", "Organización"], ["cupos", "Cupos"], ["dispositivo", "Dispositivo"], ["pais", "País"]];
  var SAMPLE = { nombre: "Laura", correo: "laura@correo.com", enlace: "#", codigo: "482 913", plan: "Plus Hogar", precio: "$ 12.900", fecha: "4 de noviembre de 2026", dias: "7", grupo: "Casa Pérez", quien: "Andrés", organizacion: "Constructora Andes", cupos: "9 de 10", dispositivo: "iPhone 15 · Safari", pais: "Colombia" };

  // t(id, grupo, nombre, disparador, tipo T|M, obligatorio, asunto, preheader, cuerpo, botón, días, etiqueta días)
  function t(id, g, n, w, tipo, req, s, p, b, cta, d, dl) { return { id: id, g: g, n: n, w: w, tipo: tipo, req: !!req, on: true, s: s, p: p, b: b, cta: cta || "", d: d == null ? null : d, dl: dl || "" }; }
  var DEF = [
    t("auth-confirmar", "auth", "Confirmar correo", "Al registrarse con correo", "T", 1, "Confirma tu correo para empezar en AlgoFalta", "Un clic y listo", "Hola {{nombre}},\n\nGracias por unirte a AlgoFalta. Confirma tu correo para activar tu cuenta y empezar a armar la lista de mercado.\n\nEste enlace vence en 24 horas. Si no creaste la cuenta, ignora este mensaje.", "Confirmar mi correo"),
    t("auth-codigo", "auth", "Código de acceso (OTP)", "Al iniciar sesión sin contraseña", "T", 1, "Tu código de AlgoFalta: {{codigo}}", "Vence en 10 minutos", "Hola {{nombre}},\n\nTu código para entrar es {{codigo}}. Vence en 10 minutos.\n\nNo lo compartas con nadie: AlgoFalta nunca te lo pedirá por WhatsApp ni por llamada.", ""),
    t("auth-reset", "auth", "Restablecer contraseña", "Al pedir «Olvidé mi contraseña»", "T", 1, "Crea una nueva contraseña", "El enlace vence en 1 hora", "Hola {{nombre}},\n\nRecibimos una solicitud para cambiar tu contraseña. Usa el botón para crear una nueva. El enlace vence en 1 hora.\n\nSi no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.", "Crear nueva contraseña"),
    t("auth-pass-ok", "auth", "Contraseña cambiada", "Tras cambiar la contraseña", "T", 1, "Cambiaste tu contraseña", "Aviso de seguridad", "Hola {{nombre}},\n\nTu contraseña de AlgoFalta se cambió el {{fecha}}.\n\nSi no fuiste tú, escríbenos de inmediato a soporte para proteger tu cuenta.", "Contactar soporte"),
    t("auth-dispositivo", "auth", "Inicio de sesión en dispositivo nuevo", "Al entrar desde un dispositivo no reconocido", "T", 1, "Nuevo inicio de sesión en tu cuenta", "Revisa que hayas sido tú", "Hola {{nombre}},\n\nDetectamos un inicio de sesión desde {{dispositivo}} ({{pais}}) el {{fecha}}.\n\nSi fuiste tú, no tienes que hacer nada. Si no, asegura tu cuenta ahora.", "Asegurar mi cuenta"),
    t("auth-cambio-correo", "auth", "Confirmar cambio de correo", "Al cambiar el correo de la cuenta", "T", 1, "Confirma tu nuevo correo", "Un último paso", "Hola {{nombre}},\n\nPediste cambiar tu correo a {{correo}}. Confírmalo con el botón para que sea el nuevo correo de tu cuenta.", "Confirmar nuevo correo"),

    t("cta-bienvenida", "cuenta", "Bienvenida", "Tras verificar el correo", "T", 0, "Bienvenido a AlgoFalta, {{nombre}}", "Que en la casa nunca falte nada", "Hola {{nombre}},\n\nYa puedes armar la lista de mercado de tu casa. Crea tu primer grupo, invita a quien comparte el mercado con ti y empieza a agregar lo que falta.\n\nLo que alguien agregue, todos lo ven al instante.", "Crear mi primer grupo"),
    t("cta-invitacion", "cuenta", "Invitación a un grupo", "Cuando alguien te invita a un grupo", "T", 1, "{{quien}} te invitó al grupo {{grupo}}", "Únete a la lista compartida", "Hola,\n\n{{quien}} te invitó a la lista de mercado «{{grupo}}» en AlgoFalta. Únete para ver lo que falta y marcar lo que compres.", "Unirme al grupo"),
    t("cta-union", "cuenta", "Alguien se unió a tu grupo", "Cuando alguien acepta tu invitación", "T", 0, "{{quien}} se unió a {{grupo}}", "Ya son más en la lista", "Hola {{nombre}},\n\n{{quien}} aceptó tu invitación y ya hace parte de «{{grupo}}».", "Ver el grupo"),
    t("cta-eliminar", "cuenta", "Eliminación de cuenta", "Al solicitar eliminar la cuenta", "T", 1, "Confirmamos la eliminación de tu cuenta", "Se borrará en máximo 30 días", "Hola {{nombre}},\n\nRecibimos tu solicitud. Tus datos se borrarán en máximo 30 días; las facturas se conservan 5 años por obligación tributaria.\n\nSi fue un error, entra antes del {{fecha}} para cancelar la eliminación.", "Cancelar eliminación"),

    t("pag-activa", "pagos", "Suscripción activada", "Al activarse un plan de pago", "T", 1, "Tu plan {{plan}} está activo", "Gracias por apoyar a AlgoFalta", "Hola {{nombre}},\n\nTu plan {{plan}} ya está activo.\n\nValor: {{precio}}\nPróxima renovación: {{fecha}}\n\nPuedes cancelarlo cuando quieras desde la tienda donde lo compraste o desde Perfil → Plan.", "Abrir AlgoFalta"),
    t("pag-recordatorio-7", "pagos", "Recordatorio de renovación", "Antes del próximo cobro", "T", 1, "Tu plan {{plan}} se renueva en {{dias}} días", "Revisa tu plan antes del cobro", "Hola {{nombre}},\n\nEl {{fecha}} se renovará tu plan {{plan}} por {{precio}}.\n\nSi compraste en Google Play o App Store, el cobro lo hace la tienda. Si pagas por la web, usa el botón para renovar o cambiar tu plan.", "Ver mi plan", 7, "días antes del cobro"),
    t("pag-recordatorio-1", "pagos", "Último aviso de renovación", "Último aviso antes del cobro", "T", 1, "Mañana se renueva tu plan {{plan}}", "Último aviso", "Hola {{nombre}},\n\nMañana, {{fecha}}, se renueva tu plan {{plan}} por {{precio}}. Si no quieres continuar, cancélalo hoy.", "Administrar mi plan", 1, "día antes del cobro"),
    t("pag-fallido", "pagos", "Pago fallido", "Cuando el cobro no se pudo realizar", "T", 1, "No pudimos cobrar tu plan {{plan}}", "Actualiza tu medio de pago", "Hola {{nombre}},\n\nIntentamos cobrar tu plan {{plan}} ({{precio}}) y no fue posible. Actualiza tu medio de pago para no perder tus beneficios.", "Actualizar medio de pago", 1, "día después del fallo"),
    t("pag-gracia", "pagos", "Plan vencido (periodo de gracia)", "Plan vencido sin renovar", "T", 1, "Tu plan venció: te quedan {{dias}} días para renovar", "Mantén tus beneficios", "Hola {{nombre}},\n\nTu plan {{plan}} venció. Tienes {{dias}} días de gracia antes de pasar al plan Gratis. No perderás tus listas, pero algunas funciones se limitarán.", "Renovar ahora", 5, "días de gracia"),
    t("pag-cancelado", "pagos", "Plan cancelado", "Al cancelar la suscripción", "T", 1, "Cancelaste tu plan {{plan}}", "Seguirás con acceso hasta que termine el periodo", "Hola {{nombre}},\n\nTu suscripción quedó cancelada. Seguirás con acceso hasta el {{fecha}}; después pasarás al plan Gratis y conservarás tus listas.\n\nSi cambias de opinión, puedes reactivarlo cuando quieras.", "Volver a activarlo"),
    t("pag-recibo", "pagos", "Recibo / factura electrónica", "Después de cada cobro", "T", 1, "Tu factura de AlgoFalta ({{precio}})", "Factura electrónica adjunta", "Hola {{nombre}},\n\nGracias por tu pago de {{precio}} por el plan {{plan}}. Adjuntamos tu factura electrónica (PDF y XML).\n\nGuárdala: la necesitarás si declaras renta o IVA."),
    t("pag-cambio", "pagos", "Cambio de plan", "Al subir o bajar de plan", "T", 1, "Cambiaste a {{plan}}", "Resumen de tu cambio", "Hola {{nombre}},\n\nTu plan ahora es {{plan}} ({{precio}}). El cambio aplica desde hoy y el próximo cobro será el {{fecha}}.", "Ver mi plan"),

    t("b2b-enlace", "b2b", "Enlace de pago para empresas", "Desde el panel: Activar plan → Enlace de pago", "T", 1, "Pago de AlgoFalta {{plan}} para {{organizacion}}", "Enlace seguro de pago", "Hola {{nombre}},\n\nEste es el enlace para pagar el plan {{plan}} de {{organizacion}} ({{precio}}). Cuando se confirme el pago, activamos el plan al instante y te enviamos la factura electrónica.", "Pagar ahora"),
    t("b2b-activado", "b2b", "Plan empresarial activado", "Al activar un plan Negocio / Empresa", "T", 1, "{{organizacion}} ya tiene AlgoFalta {{plan}}", "Invita a tu equipo", "Hola {{nombre}},\n\nEl plan {{plan}} de {{organizacion}} está activo con {{cupos}} cupos. Invita a tu equipo y define quién aprueba y quién compra.", "Invitar a mi equipo"),
    t("b2b-invitacion", "b2b", "Invitación a la organización", "Al invitar a un miembro de la empresa", "T", 1, "{{quien}} te invitó a {{organizacion}}", "Únete al equipo en AlgoFalta", "Hola,\n\n{{quien}} te invitó a unirte a {{organizacion}} en AlgoFalta para coordinar pedidos y compras.", "Unirme al equipo"),
    t("b2b-cupos", "b2b", "Cupos casi agotados", "Al usar el 90 % de los cupos", "T", 0, "Usaste {{cupos}} cupos de tu plan", "Amplía tu plan a tiempo", "Hola {{nombre}},\n\n{{organizacion}} está usando {{cupos}} cupos. Para que nadie del equipo se quede por fuera, amplía tu plan o escríbenos.", "Hablar con ventas"),

    t("vid-d1", "vida", "Día 1: crea tu primera lista", "Días después del registro, si no ha creado lista", "M", 0, "{{nombre}}, arma tu primera lista de mercado", "Tarda menos de un minuto", "Hola {{nombre}},\n\nTe cuento cómo empezar: crea un grupo para tu casa, agrega lo que falta y listo. Puedes buscar productos con precio de referencia de los supermercados de tu ciudad.", "Crear mi lista", 1, "día después del registro"),
    t("vid-d3", "vida", "Día 3: invita a tu grupo", "Días después del registro, si está solo en su grupo", "M", 0, "El mercado es más fácil entre varios", "Invita a tu familia o roommates", "Hola {{nombre}},\n\nAlgoFalta brilla cuando todos ven la misma lista. Invita a quien comparte el mercado contigo con un enlace por WhatsApp.", "Invitar a mi grupo", 3, "días después del registro"),
    t("vid-d7", "vida", "Día 7: cuentas claras", "Días después del registro", "M", 0, "Cuentas claras: quién pagó y cuánto", "Que todos paguen lo justo", "Hola {{nombre}},\n\nCada vez que marcas un producto como comprado, queda anotado quién lo pagó. AlgoFalta suma todo y les dice quién le transfiere a quién para quedar a paz y salvo.", "Ver cuentas claras", 7, "días después del registro"),
    t("vid-inactivo", "vida", "Reactivación", "Días sin abrir la app", "M", 0, "Te extrañamos, {{nombre}}: ¿qué falta en la casa?", "Tu lista te está esperando", "Hola {{nombre}},\n\nHace un tiempo que no pasas por AlgoFalta. Tu lista de «{{grupo}}» sigue ahí; revisa qué falta antes de ir al súper.", "Abrir mi lista", 14, "días sin entrar"),
    t("vid-upsell", "vida", "Límite del plan Gratis", "Al tocar el límite de grupos o productos", "M", 0, "Pasa a Plus Hogar y usa el bot en WhatsApp", "Más grupos, estadísticas y bot con voz", "Hola {{nombre}},\n\nLlegaste al límite del plan Gratis. Con Plus Hogar ({{precio}} al mes) tienes grupos ilimitados, el bot de WhatsApp con voz y estadísticas de gastos.", "Conocer Plus Hogar"),
    t("vid-resumen", "vida", "Resumen mensual de cuentas claras", "El primer día de cada mes", "M", 0, "Así les fue en {{grupo}} este mes", "Quién puso más y cuánto gastaron", "Hola {{nombre}},\n\nEste es el resumen de gastos de «{{grupo}}» del mes pasado: cuánto gastaron, quién puso más y si hay cuentas por saldar.", "Ver el resumen"),
    t("vid-novedades", "vida", "Novedades de AlgoFalta", "Envío manual (campaña)", "M", 0, "Novedades de AlgoFalta", "Lo nuevo de este mes", "Hola {{nombre}},\n\nEstas son las novedades de AlgoFalta: nuevos supermercados, mejoras en el bot y más.", "Ver novedades"),

    t("leg-cambio", "legal", "Cambio de términos o privacidad", "Antes de que apliquen cambios legales", "T", 1, "Actualizamos nuestros términos y política de privacidad", "Cambios que entran en vigor el {{fecha}}", "Hola {{nombre}},\n\nActualizamos los términos y condiciones y la política de privacidad de AlgoFalta. Los cambios aplican desde el {{fecha}}. Puedes leerlos con el botón.", "Leer los cambios", 15, "días de aviso antes"),
    t("leg-habeas", "legal", "Respuesta a solicitud de datos (Habeas Data)", "Al recibir una consulta o reclamo sobre datos", "T", 1, "Respuesta a tu solicitud de datos personales", "Radicado {{codigo}}", "Hola {{nombre}},\n\nRecibimos tu solicitud sobre tus datos personales (radicado {{codigo}}). La responderemos dentro del plazo legal: 10 días hábiles para consultas y 15 días hábiles para reclamos (Ley 1581 de 2012).", "", 10, "días hábiles máximo")
  ];

  var CFG0 = { proveedor: "Resend", nomT: "AlgoFalta", mailT: "no-responder@algofalta.com", nomM: "AlgoFalta", mailM: "hola@algofalta.com", reply: "soporte@algofalta.com", domain: "algofalta.com", pie: "© 2026 [RAZÓN SOCIAL] · NIT [NIT] · [DIRECCIÓN]", horaIni: 9, horaFin: 19 };
  var S = load("af-admin-correos", null) || {};
  var cfg = Object.assign({}, CFG0, S.cfg || {});
  var items = DEF.map(function (d) { return Object.assign({}, d, (S.items || {})[d.id] || {}); });
  var filtro = "todos", sel = null;

  function persist() {
    var o = {}; items.forEach(function (i) { o[i.id] = { on: i.on, s: i.s, p: i.p, b: i.b, cta: i.cta, d: i.d }; });
    store("af-admin-correos", { cfg: cfg, items: o });
  }
  function fill(str, vars) { return String(str || "").replace(/\{\{(\w+)\}\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }
  function disp(i) { return i.w + (i.d != null ? " · " + i.d + " " + i.dl : ""); }
  function gname(g) { return (G.filter(function (x) { return x[0] === g; })[0] || [0, g])[1]; }

  function renderSeg() {
    $("cSeg").innerHTML = G.map(function (g) {
      var n = g[0] === "todos" ? items.length : items.filter(function (i) { return i.g === g[0]; }).length;
      return '<button data-g="' + g[0] + '" aria-pressed="' + (filtro === g[0]) + '">' + g[1] + " (" + n + ")</button>";
    }).join("");
    $("cSeg").querySelectorAll("button").forEach(function (b) { b.onclick = function () { filtro = b.dataset.g; renderSeg(); renderTabla(); }; });
  }
  function renderTabla() {
    var list = items.filter(function (i) { return filtro === "todos" || i.g === filtro; });
    var h = "<tr><th>Correo</th><th>Cuándo se envía</th><th>Tipo</th><th>Activo</th><th></th></tr>";
    list.forEach(function (i) {
      h += '<tr' + (sel === i.id ? ' style="background:var(--bg)"' : "") + "><td><b>" + esc(i.n) + '</b><br><span class="note">' + esc(gname(i.g)) + "</span></td><td style='white-space:normal;min-width:200px'>" + esc(disp(i)) + "</td><td>" +
        (i.tipo === "M" ? '<span class="pill warn">Marketing</span>' : '<span class="pill web">Transaccional</span>') + "</td><td>" +
        '<label class="sw"><input type="checkbox" data-on="' + i.id + '"' + (i.on ? " checked" : "") + (i.req ? " disabled" : "") + '><span></span></label>' + (i.req ? ' <span class="note">obligatorio</span>' : "") +
        '</td><td><button class="btn ghost" data-ed="' + i.id + '">Editar</button></td></tr>';
    });
    $("cTabla").innerHTML = h;
    $("cTabla").querySelectorAll("[data-on]").forEach(function (c) { c.onchange = function () { byId(c.dataset.on).on = c.checked; persist(); }; });
    $("cTabla").querySelectorAll("[data-ed]").forEach(function (b) { b.onclick = function () { sel = b.dataset.ed; renderTabla(); renderEditor(); $("cEditor").scrollIntoView({ behavior: "smooth", block: "start" }); }; });
  }
  function byId(id) { return items.filter(function (i) { return i.id === id; })[0]; }
  function def(id) { return DEF.filter(function (i) { return i.id === id; })[0]; }

  function emailHtml(i) {
    var m = i.tipo === "M";
    var paras = fill(i.b, SAMPLE).split("\n\n").map(function (p) { return "<p style='margin:0 0 14px'>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("");
    return "<!doctype html><meta charset='utf-8'><body style='margin:0;background:#FFF4F7;font-family:Nunito,Arial,sans-serif;color:#302036'>" +
      "<div style='display:none;max-height:0;overflow:hidden'>" + esc(fill(i.p, SAMPLE)) + "</div>" +
      "<table width='100%' cellpadding='0' cellspacing='0'><tr><td align='center' style='padding:24px 12px'><table width='560' style='max-width:100%;background:#fff;border-radius:16px;overflow:hidden'>" +
      "<tr><td style='background:linear-gradient(135deg,#E83E75,#D9366B);padding:20px 28px;color:#fff;font-weight:900;font-size:22px'>AlgoFalta</td></tr>" +
      "<tr><td style='padding:28px;font-size:16px;line-height:1.6'>" + paras +
      (i.cta ? "<p style='margin:22px 0 4px'><a href='#' style='background:#302036;color:#fff;text-decoration:none;font-weight:800;padding:13px 22px;border-radius:14px;display:inline-block'>" + esc(i.cta) + "</a></p>" : "") + "</td></tr>" +
      "<tr><td style='padding:16px 28px 24px;font-size:12px;color:#6b5a70;border-top:1px solid #f1dce4'>" + esc(cfg.pie) + "<br>¿Dudas? Escríbenos a " + esc(cfg.reply) +
      (m ? "<br>Recibes este correo porque te registraste en AlgoFalta. <a href='#' style='color:#D9366B'>Darme de baja</a> · <a href='#' style='color:#D9366B'>Preferencias</a>" : "") +
      "</td></tr></table></td></tr></table></body>";
  }

  function renderEditor() {
    var i = byId(sel), box = $("cEditor");
    if (!i) { box.hidden = true; return; }
    box.hidden = false;
    var origin = i.tipo === "M" ? cfg.nomM + " &lt;" + esc(cfg.mailM) + "&gt;" : cfg.nomT + " &lt;" + esc(cfg.mailT) + "&gt;";
    box.innerHTML = '<div class="row" style="justify-content:space-between"><h2 style="margin:0">' + esc(i.n) + "</h2><button class='btn ghost' id='eCerrar'>Cerrar</button></div>" +
      '<p class="note">' + esc(disp(i)) + " · " + (i.tipo === "M" ? "Marketing: se envía solo a quien aceptó recibirlo y siempre lleva enlace de baja." : "Transaccional: no necesita consentimiento de marketing.") + " · Se envía desde " + origin + "</p>" +
      (i.g === "auth" ? '<p class="warnbox">En producción este correo lo envía Supabase Auth: copia el asunto y el texto en <i>Authentication → Email Templates</i> usando sus variables (<code>{{ .ConfirmationURL }}</code>, <code>{{ .Token }}</code>).</p>' : "") +
      '<div class="grid" style="margin-top:12px">' +
      '<label style="grid-column:1/-1">Asunto<input id="eS" value="' + esc(i.s) + '"></label>' +
      '<label style="grid-column:1/-1">Texto de vista previa (preheader)<input id="eP" value="' + esc(i.p) + '"></label>' +
      '<label style="grid-column:1/-1">Mensaje<textarea id="eB" rows="9">' + esc(i.b) + "</textarea></label>" +
      '<label>Texto del botón (vacío = sin botón)<input id="eC" value="' + esc(i.cta) + '"></label>' +
      (i.d != null ? '<label>' + esc(i.dl.charAt(0).toUpperCase() + i.dl.slice(1)) + '<input id="eD" type="number" min="0" value="' + i.d + '"></label>' : "") + "</div>" +
      '<p class="note" style="margin:10px 0 4px">Variables (clic para insertar):</p><div class="row" id="eVars">' + VARS.map(function (v) { return '<button class="chipv" data-v="' + v[0] + '" type="button">{{' + v[0] + "}}</button>"; }).join("") + "</div>" +
      '<div class="row" style="margin-top:14px"><button class="btn pink" id="eGuardar">Guardar</button><button class="btn ghost" id="eRest">Restaurar texto original</button>' +
      '<input id="ePrueba" type="email" placeholder="Enviar prueba a…" style="min-width:220px"><button class="btn ghost" id="ePruebaBtn">Enviar prueba</button><span class="note" id="eMsg"></span></div>' +
      '<h2 style="margin-top:18px">Vista previa</h2><iframe id="ePrev" sandbox="" title="Vista previa del correo" style="width:100%;height:520px;border:1px solid var(--line);border-radius:12px;background:#fff"></iframe>';
    function leer() { i.s = $("eS").value; i.p = $("eP").value; i.b = $("eB").value; i.cta = $("eC").value; if ($("eD")) i.d = parseInt($("eD").value, 10) || 0; }
    function prev() { leer(); $("ePrev").srcdoc = emailHtml(i); }
    ["eS", "eP", "eB", "eC", "eD"].forEach(function (id) { if ($(id)) $(id).oninput = prev; });
    $("eVars").querySelectorAll("button").forEach(function (b) {
      b.onclick = function () { var ta = document.activeElement && /^(eS|eP|eB|eC)$/.test(document.activeElement.id) ? document.activeElement : $("eB"); var s = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, s) + "{{" + b.dataset.v + "}}" + ta.value.slice(ta.selectionEnd || s); ta.focus(); prev(); };
    });
    $("eGuardar").onclick = function () { leer(); persist(); renderTabla(); $("eMsg").textContent = "Guardado " + new Date().toLocaleTimeString("es-CO"); };
    $("eRest").onclick = function () { var d = def(i.id); i.s = d.s; i.p = d.p; i.b = d.b; i.cta = d.cta; i.d = d.d; persist(); renderEditor(); };
    $("ePruebaBtn").onclick = function () { var a = $("ePrueba").value.trim(); $("eMsg").textContent = a ? "Prueba enviada a " + a + " (simulado en el prototipo)" : "Escribe un correo para la prueba"; };
    $("eCerrar").onclick = function () { sel = null; renderTabla(); renderEditor(); };
    prev();
  }

  function renderCfg() {
    var map = { cfgProv: "proveedor", cfgNomT: "nomT", cfgMailT: "mailT", cfgNomM: "nomM", cfgMailM: "mailM", cfgReply: "reply", cfgDom: "domain", cfgPie: "pie", cfgIni: "horaIni", cfgFin: "horaFin" };
    Object.keys(map).forEach(function (id) { $(id).value = cfg[map[id]]; $(id).oninput = $(id).onchange = function () { cfg[map[id]] = $(id).value; persist(); if (sel) $("ePrev") && ($("ePrev").srcdoc = emailHtml(byId(sel))); }; });
    var d = cfg.domain || "algofalta.com";
    $("cDns").innerHTML = "<tr><th>Registro</th><th>Host</th><th>Para qué sirve</th></tr>" +
      "<tr><td>SPF (TXT)</td><td>" + esc(d) + "</td><td>Autoriza a " + esc(cfg.proveedor) + " a enviar en tu nombre</td></tr>" +
      "<tr><td>DKIM (CNAME/TXT)</td><td>el proveedor te da el host</td><td>Firma digital: evita que caigan en spam</td></tr>" +
      "<tr><td>DMARC (TXT)</td><td>_dmarc." + esc(d) + "</td><td>Política contra suplantación; empezar con <code>p=none</code> y subir a <code>quarantine</code></td></tr>" +
      "<tr><td>Subdominio de marketing</td><td>mail." + esc(d) + "</td><td>Separa marketing de transaccionales para proteger la reputación</td></tr>";
  }

  var tabEl = document.querySelector('nav [data-tab="correos"]');
  if (!tabEl) return;
  renderSeg(); renderTabla(); renderEditor(); renderCfg();
})();
