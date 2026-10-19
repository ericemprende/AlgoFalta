"""Prueba qué supermercados de landing/comercios.js tienen catálogo público VTEX (con precios)
y genera la lista de tiendas por país para la función mercado-barato y para la app.

Uso:  python docs/tiendas/generar.py
Salida: supabase/functions/mercado-barato/tiendas.ts y mobile/src/lib/tiendas.ts
"""
import json, re, unicodedata, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRUEBA = {"ES": "leche", "default": "leche"}
UA = {"User-Agent": "AlgoFalta/1.0 (+https://www.algofalta.com)"}


def slug(t):
    t = unicodedata.normalize("NFD", t.lower())
    return re.sub(r"[^a-z0-9]+", "-", "".join(c for c in t if not unicodedata.combining(c))).strip("-")


def vtex(domain, query):
    """Devuelve la base que responde con productos y precio, o None."""
    hosts = [domain] if domain.startswith("www.") else ["www." + domain, domain]
    for h in hosts:
        for suf in ("", "/io"):
            url = f"https://{h}{suf}/api/catalog_system/pub/products/search?ft={query}&_from=0&_to=2"
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15) as r:
                    data = json.loads(r.read().decode("utf-8", "ignore"))
                    final = r.geturl().split("/api/")[0]
                if isinstance(data, list) and data and data[0]["items"][0]["sellers"][0]["commertialOffer"]["Price"] > 0:
                    return final.replace(":443", "")
            except Exception:
                pass
    return None


def main():
    s = (ROOT / "landing" / "comercios.js").read_text(encoding="utf-8")
    paises = json.loads(s[s.index("{"):s.rindex("}") + 1])
    trabajos = [(cc, t) for cc, p in paises.items() for t in p.get("super", [])]
    with ThreadPoolExecutor(12) as ex:
        bases = list(ex.map(lambda x: vtex(x[1]["d"], PRUEBA.get(x[0], PRUEBA["default"])), trabajos))

    por_pais, stores, vistos = {}, {}, {}
    for (cc, t), base in zip(trabajos, bases):
        # Colombia conserva los ids originales (exito, d1…): ya hay precios guardados con ellos.
        id_ = slug(t["n"]) if cc == "CO" else f"{cc.lower()}-{slug(t['n'])}"
        # Varias marcas pueden compartir catálogo (Jumbo y Metro en Colombia): se consultan una sola vez.
        if base and base in vistos:
            stores[vistos[base]]["name"] += f" / {t['n']}"
            por_pais.setdefault(cc, []).append({"id": vistos[base], "name": t["n"], "precios": True, "alias": True})
            continue
        if base:
            vistos[base] = id_
            stores[id_] = {"name": t["n"], "base": base, "country": cc}
        por_pais.setdefault(cc, []).append({"id": id_, "name": t["n"], "precios": bool(base)})
        print(f"{cc} {t['n']:<28} {'✓ ' + base if base else '—'}")

    aviso = "// Generado por docs/tiendas/generar.py desde landing/comercios.js. No editar a mano.\n"
    (ROOT / "supabase/functions/mercado-barato/tiendas.ts").write_text(
        aviso + "export const STORES: Record<string, { name: string; base: string; country: string }> = "
        + json.dumps(stores, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    (ROOT / "mobile/src/lib/tiendas.ts").write_text(
        aviso + "export type Tienda = { id: string; name: string; precios: boolean; alias?: boolean };\n"
        "export const TIENDAS_POR_PAIS: Record<string, Tienda[]> = "
        + json.dumps(por_pais, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print(f"\n{len(stores)} catálogos con precios de {len(trabajos)} supermercados")


if __name__ == "__main__":
    main()
