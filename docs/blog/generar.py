"""Genera el blog estático en landing/blog/ a partir de docs/blog/articulos/*.md,
más landing/sitemap.xml y landing/robots.txt.

Uso:  python docs/blog/generar.py

Formato de cada artículo: front matter (clave: valor) entre líneas '---', y
markdown mínimo: ## / ### títulos, párrafos, listas '- ' y '1. ', '> ' destacado,
**negrita** y [texto](url). Los ### bajo '## Preguntas frecuentes' se publican
también como FAQPage en JSON-LD.
"""
import html, json, re
from datetime import date
from pathlib import Path

SITE = "https://www.algofalta.com"
ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).parent / "articulos"
OUT = ROOT / "landing" / "blog"
IMGS = json.loads((Path(__file__).parent / "ilustraciones" / "imagenes.json").read_text(encoding="utf-8"))
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]

LOGO = ('<svg viewBox="0 0 256 312" aria-hidden="true"><path d="M76 92 A52 52 0 0 1 180 92" fill="none" '
        'stroke="currentColor" stroke-width="30"/><path fill="currentColor" d="M0 116q0-20 20-20H136V164q0 4 4 4'
        'H204q4 0 4-4V96H236q20 0 20 20V246q0 66-66 66H66Q0 312 0 246Z"/></svg>')


def fecha(iso):
    d = date.fromisoformat(iso)
    return f"{d.day} de {MESES[d.month - 1]} de {d.year}"


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    return re.sub(r"\[(.+?)\]\((.+?)\)", r'<a href="\2">\1</a>', t)


def parse(path):
    raw = path.read_text(encoding="utf-8")
    _, fm, body = raw.split("---", 2)
    meta = dict(l.split(":", 1) for l in fm.strip().splitlines())
    meta = {k.strip(): v.strip() for k, v in meta.items()}
    out, faq, lst, in_faq, q = [], [], None, False, None

    def close():
        nonlocal lst
        if lst:
            out.append(f"</{lst}>")
            lst = None

    for block in re.split(r"\n\s*\n", body.strip()):
        for line in block.splitlines():
            line = line.rstrip()
            if line.startswith("## "):
                close(); in_faq = line[3:].lower().startswith("preguntas frecuentes")
                out.append(f'<h2 id="{slugify(line[3:])}">{inline(line[3:])}</h2>')
            elif line.startswith("### "):
                close(); out.append(f"<h3>{inline(line[4:])}</h3>")
                if in_faq:
                    q = line[4:]
            elif re.match(r"^(- |\d+\. )", line):
                tag = "ul" if line.startswith("- ") else "ol"
                if lst != tag:
                    close(); out.append(f"<{tag}>"); lst = tag
                out.append(f"<li>{inline(re.sub(r'^(- |\d+\. )', '', line))}</li>")
            elif line.startswith("> "):
                close(); out.append(f'<div class="card">{inline(line[2:])}</div>')
            else:
                close(); out.append(f"<p>{inline(line)}</p>")
                if in_faq and q:
                    faq.append((q, re.sub(r"\*\*|\[|\]\(.+?\)", "", line))); q = None
        close()
    meta["html"] = "\n".join(out)
    meta["faq"] = faq
    meta["words"] = len(re.findall(r"\w+", body))
    return meta


def slugify(t):
    t = t.lower()
    for a, b in zip("áéíóúñü", "aeiounu"):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def head(title, desc, url, extra=""):
    return f"""<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article"><meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta property="og:locale" content="es_CO">
<link rel="alternate" type="application/rss+xml" title="Blog de AlgoFalta" href="{SITE}/blog/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap">
<link rel="stylesheet" href="/legal-assets/legal.css"><link rel="stylesheet" href="/blog/blog.css">{extra}</head><body>
<header><div class="wrap"><a class="brand" href="/">{LOGO}AlgoFalta</a><span class="hdr"><a href="/blog">Blog</a><button id="theme" type="button">Modo oscuro</button></span></div></header>
"""


FOOT = """<footer><div class="wrap"><span>© 2026 AlgoFalta · Hecho en Colombia</span><div class="links"><a href="/">Inicio</a><a href="/blog">Blog</a><a href="/privacidad">Privacidad</a><a href="/terminos">Términos</a><a href="/soporte">Soporte</a></div></div></footer>
<script src="/legal-assets/legal.js"></script></body></html>
"""

CTA = """<div class="cta"><b>¿Y si la lista se armara sola?</b><p>AlgoFalta es la lista de mercado compartida de la casa: todos ven lo que falta en tiempo real, con precios de referencia de supermercados colombianos, cuentas claras de quién pagó qué y un bot de WhatsApp al que le escribes «se acabó el café».</p><a class="btn" href="/#descargar">Crear mi lista gratis</a></div>"""


def figura(slug, n, img, lazy=True):
    load = ' loading="lazy"' if lazy else ' fetchpriority="high"'
    return (f'<figure><img src="/blog/img/{slug}-{n}.jpg" width="1200" height="675"{load} decoding="async" '
            f'alt="{html.escape(img["alt"])}"></figure>')


def con_imagenes(a):
    """Portada tras el primer párrafo; las demás antes del ## indicado en 'antes'."""
    body = a["html"]
    for n, img in enumerate(IMGS.get(a["slug"], []), 1):
        if "antes" not in img:
            body = body.replace("</p>", "</p>\n" + figura(a["slug"], n, img, lazy=False), 1)
            continue
        h2 = f'<h2 id="{slugify(img["antes"])}">'
        if h2 not in body:
            raise SystemExit(f"{a['slug']}: no existe la sección «{img['antes']}»")
        body = body.replace(h2, figura(a["slug"], n, img) + "\n" + h2, 1)
    return body


def article_page(a, all_posts):
    url = f"{SITE}/blog/{a['slug']}"
    portada = f"{SITE}/blog/img/{a['slug']}-1.jpg"
    ld = [{"@context": "https://schema.org", "@type": "BlogPosting", "headline": a["title"],
           "description": a["description"], "datePublished": a["date"], "dateModified": a["date"],
           "inLanguage": "es-CO", "mainEntityOfPage": url, "keywords": a["keyword"], "image": portada,
           "author": {"@type": "Organization", "name": "AlgoFalta", "url": SITE},
           "publisher": {"@type": "Organization", "name": "AlgoFalta", "url": SITE,
                         "logo": {"@type": "ImageObject", "url": f"{SITE}/favicon.svg"}}},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Inicio", "item": SITE},
              {"@type": "ListItem", "position": 2, "name": "Blog", "item": f"{SITE}/blog"},
              {"@type": "ListItem", "position": 3, "name": a["title"], "item": url}]}]
    if a["faq"]:
        ld.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": r}} for q, r in a["faq"]]})
    extra = (f'\n<meta property="og:image" content="{portada}"><meta property="og:image:width" content="1200">'
             f'<meta property="og:image:height" content="675"><meta name="twitter:card" content="summary_large_image">')
    extra += "".join(f'\n<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    related = [p for p in all_posts if p["category"] == a["category"] and p["slug"] != a["slug"]]
    related += [p for p in all_posts if p not in related and p["slug"] != a["slug"]]
    rel = "".join(f'<li><a href="/blog/{p["slug"]}">{html.escape(p["title"])}</a></li>' for p in related[:3])
    mins = max(3, round(a["words"] / 200))
    return (head(f"{a['title']} | AlgoFalta", a["description"], url, extra)
            + f"""<main class="wrap"><article>
<nav class="crumbs"><a href="/">Inicio</a> › <a href="/blog">Blog</a> › {html.escape(a['category'])}</nav>
<h1>{html.escape(a['title'])}</h1><p class="meta">{fecha(a['date'])} · {mins} min de lectura</p>
{con_imagenes(a)}
{CTA}
</article><aside class="rel"><h2>Sigue leyendo</h2><ul>{rel}</ul></aside></main>
""" + FOOT)


def index_page(posts):
    cards = "".join(f"""<a class="post" href="/blog/{p['slug']}"><img src="/blog/img/{p['slug']}-1.jpg" width="1200" height="675" loading="lazy" alt=""><span class="cat">{html.escape(p['category'])}</span>
<h2>{html.escape(p['title'])}</h2><p>{html.escape(p['description'])}</p><span class="meta">{fecha(p['date'])}</span></a>""" for p in posts)
    ld = {"@context": "https://schema.org", "@type": "Blog", "name": "Blog de AlgoFalta", "url": f"{SITE}/blog",
          "inLanguage": "es-CO", "blogPost": [{"@type": "BlogPosting", "headline": p["title"],
                                                "url": f"{SITE}/blog/{p['slug']}", "datePublished": p["date"]} for p in posts]}
    return (head("Blog de AlgoFalta: mercado, ahorro y cuentas claras en casa",
                 "Listas de mercado, consejos para ahorrar en el supermercado, presupuesto familiar y cómo dividir gastos en casa, pensado para Colombia.",
                 f"{SITE}/blog", f'\n<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>')
            + f"""<main class="wrap wide"><h1>Blog de AlgoFalta</h1>
<p class="meta">Mercado, ahorro y cuentas claras para la casa, la oficina y el negocio en Colombia.</p>
<div class="grid">{cards}</div></main>
""" + FOOT)


def main():
    posts = sorted((parse(p) for p in SRC.glob("*.md")), key=lambda p: (p["date"], p["slug"]), reverse=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for a in posts:
        (OUT / f"{a['slug']}.html").write_text(article_page(a, posts), encoding="utf-8")
    (OUT / "index.html").write_text(index_page(posts), encoding="utf-8")

    urls = [(SITE + "/", "2026-10-18"), (SITE + "/blog", posts[0]["date"])]
    urls += [(f"{SITE}/{p}", "2026-10-08") for p in ["privacidad", "terminos", "soporte"]]
    urls += [(f"{SITE}/blog/{p['slug']}", p["date"]) for p in posts]
    (ROOT / "landing" / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>\n" for u, d in urls) + "</urlset>\n",
        encoding="utf-8")
    (ROOT / "landing" / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\nDisallow: /app\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    items = "".join(f"<item><title>{html.escape(p['title'])}</title><link>{SITE}/blog/{p['slug']}</link>"
                    f"<guid>{SITE}/blog/{p['slug']}</guid><description>{html.escape(p['description'])}</description></item>"
                    for p in posts)
    (OUT / "rss.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog de AlgoFalta</title>'
        f"<link>{SITE}/blog</link><description>Mercado, ahorro y cuentas claras en casa</description>"
        f"<language>es-co</language>{items}</channel></rss>\n", encoding="utf-8")
    print(f"{len(posts)} artículos generados en {OUT}")


if __name__ == "__main__":
    main()
