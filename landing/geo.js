/* AlgoFalta — adapta la landing al país del visitante.
   Orden: ?pais=MX  →  elección guardada  →  IP (ipapi.co)  →  idioma del navegador  →  Colombia.
   Colombia es el contenido por defecto del HTML; los demás países se pintan desde COUNTRIES.
   Precios y totales son referenciales; ajustar cuando se definan precios reales por tienda. */
(function () {
  var COUNTRIES = {
    CO: { name: "Colombia", u: 10000, loc: "es-CO", pre: "$ ", suf: "", pay: "Nequi · Daviplata · Bre-B", city: "Bogotá", basket: "$ 86.400", cur: "COP", plus: "$12.900", pro: "$19.900", neg: "$49.900", emp: "$149.900", anual: "$129.000" },
    MX: { name: "México", u: 100, loc: "es-MX", pre: "$ ", suf: "", pay: "SPEI · CoDi · Mercado Pago", city: "CDMX", basket: "$ 420", cur: "MXN", plus: "$69", pro: "$109", neg: "$249", emp: "$699", anual: "$690",
      supers: ["Walmart", "Bodega Aurrera", "Soriana", "Chedraui", "La Comer", "Costco", "H-E-B", "Oxxo"], hogar: ["The Home Depot", "Ferreterías de barrio"], farma: ["Farmacias Guadalajara", "Farmacias del Ahorro", "Similares"] },
    PE: { name: "Perú", u: 10, loc: "es-PE", pre: "S/ ", suf: "", pay: "Yape · Plin", city: "Lima", basket: "S/ 85", cur: "PEN", plus: "S/ 11,90", pro: "S/ 18,90", neg: "S/ 44,90", emp: "S/ 129", anual: "S/ 119",
      supers: ["Plaza Vea", "Tottus", "Metro", "Wong", "Mass", "Makro"], hogar: ["Sodimac", "Promart", "Ferreterías de barrio"], farma: ["Inkafarma", "Mifarma"] },
    CL: { name: "Chile", u: 2500, loc: "es-CL", pre: "$ ", suf: "", pay: "Transferencia · MACH · Mercado Pago", city: "Santiago", basket: "$ 21.500", cur: "CLP", plus: "$3.490", pro: "$5.490", neg: "$12.990", emp: "$39.990", anual: "$34.900",
      supers: ["Líder", "Jumbo", "Santa Isabel", "Unimarc", "Tottus", "aCuenta"], hogar: ["Sodimac", "Easy", "Construmart"], farma: ["Cruz Verde", "Salcobrand", "Ahumada"] },
    EC: { name: "Ecuador", u: 5, loc: "es-EC", pre: "$ ", suf: "", pay: "Deuna · PayPhone · Transferencia", city: "Quito", basket: "$ 24,80", cur: "USD", plus: "$2,99", pro: "$4,99", neg: "$11,99", emp: "$34,99", anual: "$29,99",
      supers: ["Supermaxi", "Megamaxi", "Mi Comisariato", "Tía", "Akí", "Santa María"], hogar: ["Kywi", "Ferreterías de barrio"], farma: ["Fybeca", "Sana Sana", "Pharmacys"] },
    AR: { name: "Argentina", u: 5000, loc: "es-AR", pre: "$ ", suf: "", pay: "Mercado Pago · Cuenta DNI · Transferencia", city: "Buenos Aires", basket: "$ 28.900", cur: "ARS", plus: "$3.990", pro: "$6.290", neg: "$14.990", emp: "$44.990", anual: "$39.900",
      supers: ["Carrefour", "Coto", "Día", "Jumbo", "Disco", "ChangoMás"], hogar: ["Easy", "Blaisten", "Ferreterías de barrio"], farma: ["Farmacity"] },
    PA: { name: "Panamá", u: 5, loc: "es-PA", pre: "$ ", suf: "", pay: "Yappy · Nequi · ACH", city: "Ciudad de Panamá", basket: "$ 22,50", cur: "USD", plus: "$3,49", pro: "$5,49", neg: "$12,99", emp: "$39,99", anual: "$34,99",
      supers: ["Super 99", "Rey", "Riba Smith", "El Machetazo", "Xtra", "PriceSmart"], hogar: ["Novey", "Do it Center", "Cochez"], farma: ["Arrocha", "Metro Plus"] },
    CR: { name: "Costa Rica", u: 1500, loc: "es-CR", pre: "₡", suf: "", pay: "SINPE Móvil", city: "San José", basket: "₡12.800", cur: "CRC", plus: "₡1.790", pro: "₡2.790", neg: "₡6.490", emp: "₡19.900", anual: "₡17.900",
      supers: ["Walmart", "Más x Menos", "Automercado", "Palí", "Megasuper", "PriceSmart"], hogar: ["EPA", "El Lagar", "Construplaza"], farma: ["Fischel", "La Bomba", "Sucre"] },
    GT: { name: "Guatemala", u: 25, loc: "es-GT", pre: "Q ", suf: "", pay: "Zigi · Transferencia", city: "Ciudad de Guatemala", basket: "Q 190", cur: "GTQ", plus: "Q 22,90", pro: "Q 35,90", neg: "Q 89", emp: "Q 259", anual: "Q 229",
      supers: ["Paiz", "Walmart", "La Torre", "Despensa Familiar", "PriceSmart"], hogar: ["Cemaco", "Ferreterías de barrio"], farma: ["Cruz Verde", "Meykos", "Galeno"] },
    DO: { name: "República Dominicana", u: 150, loc: "es-DO", pre: "RD$ ", suf: "", pay: "tPago · Transferencia", city: "Santo Domingo", basket: "RD$ 1.450", cur: "DOP", plus: "RD$ 179", pro: "RD$ 279", neg: "RD$ 690", emp: "RD$ 1.990", anual: "RD$ 1.790",
      supers: ["Supermercado Nacional", "La Sirena", "Jumbo", "Bravo", "Olé", "PriceSmart"], hogar: ["Ferretería Americana", "Ochoa"], farma: ["Farmacia Carol", "Los Hidalgos"] },
    ES: { name: "España", u: 5, loc: "es-ES", pre: "", suf: " €", pay: "Bizum", city: "Madrid", basket: "32,40 €", cur: "EUR", plus: "2,99 €", pro: "4,99 €", neg: "12,99 €", emp: "39,99 €", anual: "19,99 €",
      supers: ["Mercadona", "Carrefour", "Lidl", "Dia", "Alcampo", "Aldi", "Eroski"], hogar: ["Leroy Merlin", "Bricomart", "Bauhaus"], farma: ["Farmacias de barrio"] }
  };
  var KEY = "af-pais";
  var sel = document.getElementById("pais");
  if (!sel) return;

  Object.keys(COUNTRIES).forEach(function (code) {
    var o = document.createElement("option");
    o.value = code; o.textContent = COUNTRIES[code].name;
    sel.appendChild(o);
  });

  var supersBox = document.getElementById("supers");
  var supersCO = supersBox ? supersBox.innerHTML : "";

  function set(name, text) {
    document.querySelectorAll('[data-geo="' + name + '"]').forEach(function (el) { el.textContent = text; });
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function chips(title, list) {
    var h = '<span class="group-t">' + title + "</span>";
    list.forEach(function (it) {
      h += it.img
        ? '<span class="logo" title="' + esc(it.n) + '"><img src="' + esc(it.img) + '" alt="' + esc(it.n) + '" loading="lazy"><em>' + esc(it.n) + "</em></span>"
        : '<span class="logo txt">' + esc(it.n) + "</span>";
    });
    return h;
  }
  function paintSupers(code) {
    var data = window.AF_COMERCIOS && window.AF_COMERCIOS[code];
    if (!supersBox || !data) return false;
    supersBox.innerHTML = chips("Supermercados", data["super"]) + chips("Hogar y ferretería", data.hogar) + chips("Droguerías y farmacias", data.farma);
    return true;
  }

  function money(units, c) {
    var v = units * c.u;
    // es-ES no agrupa miles en números de 4 cifras; forzamos agrupación siempre
    return c.pre + v.toLocaleString(c.loc, { maximumFractionDigits: 2, useGrouping: "always" }) + c.suf;
  }

  function apply(code) {
    var c = COUNTRIES[code] || COUNTRIES.CO;
    code = COUNTRIES[code] ? code : "CO";
    sel.value = code;
    document.documentElement.setAttribute("data-pais", code);
    set("basket", c.basket);
    set("basketc", c.basket + " " + c.cur);
    document.querySelectorAll("[data-amt]").forEach(function (el) { el.textContent = money(+el.getAttribute("data-amt"), c); });
    set("pay", c.pay);
    set("evento", code === "ES" ? "Barbacoa del sábado" : code === "MX" ? "Carne asada del sábado" : "Asado del sábado");
    set("p-plus", c.plus); set("p-pro", c.pro); set("p-neg", c.neg); set("p-emp", c.emp); set("p-anual", c.anual);
    if (code === "CO") {
      set("chip", "D1 · Bogotá"); set("store1", "D1"); set("stores3", "D1, Ara, Éxito");
      set("supers-lead", "Empezamos con D1, Ara y Éxito en Bogotá. Las demás cadenas llegan por fases.");
      if (!paintSupers("CO") && supersBox) supersBox.innerHTML = supersCO;
    } else {
      set("chip", c.supers[0] + " · " + c.city); set("store1", c.supers[0]);
      set("stores3", c.supers.slice(0, 3).join(", "));
      set("supers-lead", "Pronto en " + c.name + ". Estas son las cadenas que vamos a sumar primero en " + c.city + ".");
      paintSupers(code);
    }
  }

  function save(code) { try { localStorage.setItem(KEY, code); } catch (e) {} }
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  sel.addEventListener("change", function () { save(sel.value); apply(sel.value); });

  var q = (new URLSearchParams(location.search).get("pais") || "").toUpperCase();
  if (COUNTRIES[q]) { apply(q); return; }
  var s = saved();
  if (COUNTRIES[s]) { apply(s); return; }

  var lang = ((navigator.language || "").split("-")[1] || "").toUpperCase();
  apply(COUNTRIES[lang] ? lang : "CO");

  // Detección por IP. ipapi.co gratis: ~1.000 consultas/día; en producción usar el header
  // de país del hosting (Cloudflare CF-IPCountry, Vercel x-vercel-ip-country) sin costo.
  var ctrl = window.AbortController ? new AbortController() : null;
  if (ctrl) setTimeout(function () { ctrl.abort(); }, 2500);
  fetch("https://ipapi.co/country/", ctrl ? { signal: ctrl.signal } : {})
    .then(function (r) { return r.ok ? r.text() : ""; })
    .then(function (t) { t = (t || "").trim().toUpperCase(); if (COUNTRIES[t]) apply(t); })
    .catch(function () {});
})();
