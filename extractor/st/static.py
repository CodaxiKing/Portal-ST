"""Páginas estáticas (uma por item, classe, campeão e área de missão), imagens de prévia e sitemap.

O site principal usa rotas com '#', que buscadores não indexam. Estas páginas têm o conteúdo em HTML puro,
título e descrição próprios, prévia para Discord/WhatsApp (Open Graph) e um botão para abrir no portal.
"""
import hashlib
import json
import os
from html import escape as h

from .common import log

PAGE_LANGS = ("pt", "en")  # idiomas com interface traduzida
UI = {
    "pt": {"open": "Abrir no portal", "home": "Portal Shop Titans", "stats": "Atributos", "recipe": "Receita",
           "econ": "Economia", "value": "Valor", "time": "Tempo de fabricação", "tier": "Tier", "level": "Nível",
           "workers": "Trabalhadores", "upgrades": "Marcos do projeto", "atk": "Ataque", "def": "Defesa", "hp": "Vida",
           "eva": "Evasão", "crit": "Crítico", "xp": "XP do comerciante", "levels": "Níveis", "power": "Poder",
           "drops": "Drops", "boss": "Chefe", "element": "Elemento", "classes": "Classes", "items": "Itens",
           "desc_item": "{name}: {type} tier {tier} do Shop Titans. Atributos, receita, valor e melhorias.",
           "desc_class": "{name}: classe de herói do Shop Titans. Atributos, equipamentos e habilidades.",
           "desc_champ": "{name}: campeão do Shop Titans. Atributos, habilidade de líder e ranks.",
           "desc_zone": "{name}: área de missão do Shop Titans. Poder exigido, chefe e drops.",
           "lang": "pt-BR", "fan": "Portal de fãs, sem afiliação com a Kabam. Desenvolvido por <b>Drácula</b>.",
           "hm": "Hypermax: o build mais forte", "hm_rank": "{rank}º de {of} classes no ranking Hypermax", "rune": "Runa", "spirit": "Espírito",
           "skills": "Habilidades", "profile": "Poder no perfil", "board": "Poder no placar", "crit_dmg": "Dano crítico",
           "hm_note": "Calculado só com os dados do jogo: qualidade Lendária, Forjado nas Estrelas, Ascensão e Transcendência, nível {lv}.",
           "hm_open": "Ver no Hypermax"},
    "en": {"open": "Open in the portal", "home": "Shop Titans Portal", "stats": "Stats", "recipe": "Recipe",
           "econ": "Economy", "value": "Value", "time": "Crafting time", "tier": "Tier", "level": "Level",
           "workers": "Workers", "upgrades": "Blueprint milestones", "atk": "Attack", "def": "Defense", "hp": "Health",
           "eva": "Evasion", "crit": "Critical", "xp": "Merchant XP", "levels": "Levels", "power": "Power",
           "drops": "Drops", "boss": "Boss", "element": "Element", "classes": "Classes", "items": "Items",
           "desc_item": "{name}: tier {tier} {type} in Shop Titans. Stats, recipe, value and upgrades.",
           "desc_class": "{name}: Shop Titans hero class. Stats, equipment and skills.",
           "desc_champ": "{name}: Shop Titans champion. Stats, leader skill and ranks.",
           "desc_zone": "{name}: Shop Titans quest area. Required power, boss and drops.",
           "lang": "en", "fan": "Fan-made portal, not affiliated with Kabam. Developed by <b>Drácula</b>.",
           "hm": "Hypermax: the strongest build", "hm_rank": "#{rank} of {of} classes in the Hypermax ranking", "rune": "Rune", "spirit": "Spirit",
           "skills": "Skills", "profile": "Profile power", "board": "Leaderboard power", "crit_dmg": "Crit damage",
           "hm_note": "Computed only from game data: Legendary quality, Starforged, Ascension and Transcendence, level {lv}.",
           "hm_open": "Open in Hypermax"},
}
FONT_BOLD = [r"C:\Windows\Fonts\segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
FONT_REG = [r"C:\Windows\Fonts\segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]


def _num(n, lang):
    s = f"{round(n):,}"
    return s.replace(",", ".") if lang == "pt" else s


def _dur(sec):
    sec = int(sec or 0)
    d, h_, m = sec // 86400, sec % 86400 // 3600, sec % 3600 // 60
    parts = [f"{d}d" if d else "", f"{h_}h" if h_ else "", f"{m}min" if m and not d else ""]
    return " ".join(p for p in parts if p) or f"{sec}s"


def _page(lang, title, desc, body, rel, canonical, alternates, og_image, base):
    """rel = caminho relativo até a raiz do site (ex.: '../../../')."""
    U = UI[lang]
    abs_ = (lambda p: base.rstrip("/") + "/" + p) if base else (lambda p: rel + p)
    alt = "".join(f'<link rel="alternate" hreflang="{UI[l]["lang"]}" href="{h(abs_(p))}">' for l, p in alternates.items())
    return f"""<!doctype html>
<html lang="{U['lang']}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{h(title)} · {U['home']}</title><meta name="description" content="{h(desc)}">
<link rel="canonical" href="{h(abs_(canonical))}">{alt}
<meta property="og:type" content="article"><meta property="og:site_name" content="{U['home']}">
<meta property="og:title" content="{h(title)}"><meta property="og:description" content="{h(desc)}">
<meta property="og:image" content="{h(abs_(og_image))}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#101012">
<link rel="icon" type="image/png" sizes="32x32" href="{rel}icons/favicon-32.png"><link rel="icon" type="image/png" sizes="64x64" href="{rel}icons/favicon-64.png"><link rel="manifest" href="{rel}manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{rel}assets/style.css"><link rel="stylesheet" href="{rel}assets/static.css">
</head><body class="static">
<header class="topbar"><div class="topbar-inner"><a class="brand" href="{rel}index.html?lang={lang}#/"><img class="brand-logo" src="{rel}img/brand/logo-sm.webp" alt="Portal ST" width="72" height="48"><span>{U['home']}</span></a></div></header>
<main class="static-main">{body}</main>
<footer class="foot">{U['fan']}</footer>
</body></html>"""


def _stats_rows(stats, U, lang):
    rows = [(U[k], stats.get(k)) for k in ("atk", "def", "hp", "eva", "crit") if stats.get(k)]
    return "".join(f'<div class="stat"><div class="k">{h(k)}</div><div class="v s-{key}">{_num(v * 100, lang) + "%" if key in ("eva", "crit") else _num(v, lang)}</div></div>'
                   for (k, v), key in zip(rows, [k for k in ("atk", "def", "hp", "eva", "crit") if stats.get(k)]))


def item_page(lang, it, items, base):
    U = UI[lang]
    refs, types = items["refs"], items["types"]
    by = {x["uid"]: x for x in items["items"]}
    ty = types.get(it["type"], {}).get("name") or it["type"]
    rel = "../../../"
    name = lambda i: (by.get(i) or {}).get("name") or (refs.get(i) or {}).get("name") or i
    link = lambda i: f'<a href="{h(i)}.html">{h(name(i))}</a>' if i in by else h(name(i))
    # recursos sem ícone com o próprio nome (ex.: stardust) usam o ícone de recurso do jogo, se existir
    def imgsrc(i):
        for n in (i, f"icon_global_resource_{i}", f"icon_global_{i}"):
            if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "site", "img", "items", n + ".webp")):
                return f'{rel}img/items/{h(n)}.webp'
        return f'{rel}img/items/{h(i)}.webp'
    recipe = "".join(f'<div class="row"><img src="{imgsrc(r["id"])}" alt="" loading="lazy" onerror="this.remove()"><div class="grow">{h(name(r["id"]))}</div><div class="r">× {_num(r["qty"], lang)}</div></div>' for r in it["resources"])
    recipe += "".join(f'<div class="row"><img src="{imgsrc(c["id"])}" alt="" loading="lazy" onerror="this.remove()"><div class="grow">{link(c["id"])}</div><div class="r">× {_num(c["qty"], lang)}</div></div>' for c in it["components"])
    ms = "".join(f'<div class="row"><span class="req">{m["req"]}</span><div class="grow">{h(m["text"])}</div></div>' for m in it["milestones"])
    workers = ", ".join(f'{h(name(w["id"]))} {w["lvl"]}' for w in it["workers"])
    stats = _stats_rows(it["stats"], U, lang)
    body = f"""<article class="static-card">
<div class="d-head"><div class="thumb"><img src="{imgsrc(it['uid'])}" alt="{h(it['name'])}"></div>
<div><h1 class="d-title">{h(it['name'])}</h1><div class="d-sub">{h(ty)} · {U['tier']} {it['tier']} · {U['level']} {it['level']}</div></div></div>
{f'<p class="d-desc">{h(it["desc"])}</p>' if it.get('desc') else ''}
<p><a class="btn primary" href="{rel}index.html?lang={lang}#/item/{h(it['uid'])}">{U['open']}</a></p>
{f'<section class="sec"><h2>{U["stats"]}</h2><div class="stat-grid">{stats}</div></section>' if stats else ''}
<section class="sec"><h2>{U['econ']}</h2><div class="stat-grid">
<div class="stat"><div class="k">{U['value']}</div><div class="v gold">{_num(it['value'], lang)}</div></div>
{f'<div class="stat"><div class="k">{U["time"]}</div><div class="v">{_dur(it["time"])}</div></div>' if it.get('time') else ''}
{f'<div class="stat"><div class="k">{U["xp"]}</div><div class="v">{_num(it["xp"], lang)}</div></div>' if it.get('xp') else ''}
</div>{f'<p class="note">{U["workers"]}: {workers}</p>' if workers else ''}</section>
{f'<section class="sec"><h2>{U["recipe"]}</h2><div class="list">{recipe}</div></section>' if recipe else ''}
{f'<section class="sec"><h2>{U["upgrades"]}</h2><div class="list">{ms}</div></section>' if ms else ''}
</article>"""
    desc = U["desc_item"].format(name=it["name"], type=ty.lower(), tier=it["tier"])
    if it.get("desc"):
        desc += " " + it["desc"]
    return _page(lang, it["name"], desc[:300], body, rel, f"p/{lang}/item/{it['uid']}.html",
                 {l: f"p/{l}/item/{it['uid']}.html" for l in PAGE_LANGS}, f"og/{it['uid']}.jpg", base)


def _hm_section(b, U, lang):
    rel = "../../../"
    stats = [(U["board"], _num(b["power"], lang)), (U["profile"], _num(b["profile"], lang)), (U["atk"], _num(b["atk"], lang)),
             (U["def"], _num(b["def"], lang)), (U["hp"], _num(b["hp"], lang)), (U["crit"], f'{round(b["crit"] * 100)}%'),
             (U["crit_dmg"], f'×{b["cm"]}'), (U["element"], str(b["E"]))]
    grid = "".join(f'<div class="stat"><div class="k">{h(k)}</div><div class="v">{h(v)}</div></div>' for k, v in stats)
    gear = "".join(
        f'<div class="row"><img src="{rel}img/items/{h(g["uid"])}.webp" alt="" width="40" height="40" onerror="this.remove()">'
        f'<div class="grow"><b>{h(g["name"])}</b> <span class="small muted">T{g["tier"]}</span>'
        f'<div class="small muted">{U["rune"]}: {h(g["rune"] or "—")} · {U["spirit"]}: {h(g["spirit"] or "—")}</div></div></div>'
        for g in b["gear"] if g)
    skills = ", ".join(f'{h(s["name"])}{" T" + str(s["tier"]) if s["tier"] else ""}' for s in b["skills"])
    return (f'<p><b>{h(U["hm_rank"].format(rank=b["rank"], of=b["of"]))}</b></p><div class="stat-grid">{grid}</div>'
            f'<div class="list" style="margin-top:12px">{gear}</div><p><b>{U["skills"]}:</b> {skills}</p>'
            f'<p class="small muted">{h(U["hm_note"].format(lv=b["lv"]))}</p>'
            f'<p><a class="btn" href="{rel}index.html?lang={lang}#/{b["link"]}">{U["hm_open"]}</a></p>')


def simple_page(lang, kind, uid, title, sub, desc_key, desc_extra, art, sections, route, base, hm_desc=""):
    U = UI[lang]
    rel = "../../../"
    secs = "".join(f'<section class="sec"><h2>{h(t)}</h2>{b}</section>' for t, b in sections if b)
    body = f"""<article class="static-card">
<div class="d-head"><div class="thumb">{f'<img src="{rel}img/items/{h(art)}.webp" alt="{h(title)}" onerror="this.remove()">' if art else ''}</div>
<div><h1 class="d-title">{h(title)}</h1><div class="d-sub">{h(sub)}</div></div></div>
{f'<p class="d-desc">{h(desc_extra)}</p>' if desc_extra else ''}
<p><a class="btn primary" href="{rel}index.html?lang={lang}#/{route}">{U['open']}</a></p>{secs}</article>"""
    desc = (U[desc_key].format(name=title) + (" " + hm_desc if hm_desc else "") + (" " + desc_extra if desc_extra else ""))[:300]
    return _page(lang, title, desc, body, rel, f"p/{lang}/{kind}/{uid}.html",
                 {l: f"p/{l}/{kind}/{uid}.html" for l in PAGE_LANGS}, "og/default.jpg", base)


def _write(path, html):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)


# Robôs de IA e de raspagem que não podem entrar (buscadores normais, como Google e Bing, continuam liberados).
BLOCKED_BOTS = ("GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
                "CCBot", "Google-Extended", "PerplexityBot", "Perplexity-User", "Bytespider", "Amazonbot", "Applebot-Extended",
                "meta-externalagent", "meta-webindexer", "FacebookBot", "cohere-ai", "Diffbot", "ImagesiftBot", "Omgilibot",
                "Timpibot", "YouBot", "MJ12bot", "AhrefsBot", "SemrushBot", "DotBot", "DataForSeoBot", "PetalBot")


def write_robots(site, base=""):
    """robots.txt: bloqueia robôs de IA/raspagem e libera o resto (com o sitemap quando há URL pública)."""
    lines = []
    for bot in BLOCKED_BOTS:
        lines += [f"User-agent: {bot}", "Disallow: /", ""]
    lines += ["User-agent: *", "Allow: /"]
    if base:
        lines.append(f"Sitemap: {base.rstrip('/')}/sitemap.xml")
    _write(os.path.join(site, "robots.txt"), "\n".join(lines) + "\n")


def build_pages(site, by_lang, base):
    """by_lang[lang] = {"items": ..., "classes": [...], "champions": [...], "quests": [...]}"""
    urls = []
    for lang in PAGE_LANGS:
        D = by_lang[lang]
        U = UI[lang]
        root = os.path.join(site, "p", lang)
        items = D["items"]
        for it in items["items"]:
            _write(os.path.join(root, "item", it["uid"] + ".html"), item_page(lang, it, items, base))
            urls.append(f"p/{lang}/item/{it['uid']}.html")
        for c in D["classes"]:
            st = c.get("stats") or {}
            rows = "".join(f'<div class="stat"><div class="k">{U[k]} (100)</div><div class="v s-{k}">{_num((st.get(k) or {}).get("100") or 0, lang)}</div></div>'
                           for k in ("atk", "def", "hp") if isinstance(st.get(k), dict))
            slots = ", ".join(s.get("name", "") for s in c.get("slots") or [] if isinstance(s, dict))
            hmb = (D.get("hm") or {}).get(c["uid"])
            hm_html = _hm_section(hmb, U, lang) if hmb else ""
            _write(os.path.join(root, "class", c["uid"] + ".html"), simple_page(
                lang, "class", c["uid"], c["name"], c.get("typeName") or "", "desc_class", c.get("desc") or "", c.get("icon"),
                [(U["stats"], f'<div class="stat-grid">{rows}</div>' if rows else ""), (U["hm"], hm_html), (U["items"], h(slots))], f"classes/{c['uid']}", base,
                hm_desc=(U["hm_rank"].format(rank=hmb["rank"], of=hmb["of"]) + ". " + U["board"] + " " + _num(hmb["power"], lang) + ".") if hmb else ""))
            urls.append(f"p/{lang}/class/{c['uid']}.html")
        for c in D["champions"]:
            st = c.get("stats") or {}
            rows = "".join(f'<div class="stat"><div class="k">{U[k]} (100)</div><div class="v s-{k}">{_num((st.get(k) or {}).get("100") or 0, lang)}</div></div>'
                           for k in ("atk", "def", "hp") if isinstance(st.get(k), dict))
            _write(os.path.join(root, "champion", c["uid"] + ".html"), simple_page(
                lang, "champion", c["uid"], c["name"], " · ".join(x for x in (c.get("className"), c.get("elementName")) if x),
                "desc_champ", (c.get("quote") or "").strip('"'), c.get("icon") or c.get("card"),
                [(U["stats"], f'<div class="stat-grid">{rows}</div>' if rows else "")], f"campeoes/{c['uid']}", base))
            urls.append(f"p/{lang}/champion/{c['uid']}.html")
        for z in D["quests"]:
            lv = z.get("levels") or []
            rows = "".join(f'<div class="row"><span class="req">{i + 1}</span><div class="grow">{U["power"]} {_num(l.get("power") or 0, lang)}'
                           f'{" · " + U["boss"] if l.get("boss") else ""}</div><div class="r">{h(", ".join(c["name"] for c in l.get("comps") or []))}</div></div>'
                           for i, l in enumerate(lv))
            _write(os.path.join(root, "zone", z["id"] + ".html"), simple_page(
                lang, "zone", z["id"], z["name"], f'{U["boss"]}: {z.get("boss") or "—"}', "desc_zone", z.get("desc") or "", z.get("icon"),
                [(U["levels"], f'<div class="list">{rows}</div>')], f"missoes/{z['id']}", base))
            urls.append(f"p/{lang}/zone/{z['id']}.html")
    # sitemap e robots (precisam de URL absoluta)
    if base:
        b = base.rstrip("/") + "/"
        sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
              f"<url><loc>{h(b)}</loc></url>"] + [f"<url><loc>{h(b + u)}</loc></url>" for u in urls] + ["</urlset>"]
        _write(os.path.join(site, "sitemap.xml"), "\n".join(sm))
        write_robots(site, base)
    log(f"páginas estáticas: {len(urls)}")
    return urls


# ---------------------------------------------------------------- imagens de prévia (Open Graph)
def _font(paths, size):
    from PIL import ImageFont
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


BG, CARD, LINE, TEXT, MUTED, GOLD = (16, 16, 18), (26, 26, 29), (39, 39, 43), (242, 242, 244), (154, 154, 165), (215, 162, 74)
COLORS = {"atk": (226, 118, 106), "def": (121, 163, 220), "hp": (108, 191, 138), "eva": (173, 145, 214), "crit": (224, 154, 90)}


def _base_canvas():
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (1200, 630), BG)
    d = ImageDraw.Draw(im)
    for r in range(380, 0, -6):  # brilho dourado suave atrás do ícone
        a = int(26 * (1 - r / 380) ** 2)
        d.ellipse([300 - r, 315 - r, 300 + r, 315 + r], fill=tuple(min(255, c + int(a * g / 255)) for c, g in zip(BG, GOLD)))
    d.rounded_rectangle([40, 40, 1160, 590], 36, outline=LINE, width=2)
    return im, d


def _brand(d):
    d.rounded_rectangle([600, 512, 640, 552], 10, fill=(42, 34, 22))
    d.polygon([(620, 520), (632, 526), (632, 536), (620, 545), (608, 536), (608, 526)], outline=GOLD, width=3)
    d.text((654, 516), "Portal Shop Titans", font=_font(FONT_BOLD, 28), fill=MUTED)


def og_item(icon_path, it, out):
    from PIL import Image
    im, d = _base_canvas()
    if os.path.exists(icon_path):
        ic = Image.open(icon_path).convert("RGBA")
        ic = ic.resize((340, 340), Image.LANCZOS)
        im.paste(ic, (130, 145), ic)
    d.rounded_rectangle([600, 96, 708, 146], 14, fill=(42, 34, 22))
    d.text((616, 102), f"T{it['tier']}", font=_font(FONT_BOLD, 34), fill=GOLD)
    d.text((726, 106), f"Lv {it['level']}", font=_font(FONT_REG, 30), fill=MUTED)
    y = 182
    big, lab = _font(FONT_BOLD, 54), _font(FONT_BOLD, 26)
    shown = [(k, it["stats"].get(k)) for k in ("atk", "def", "hp", "eva", "crit") if it["stats"].get(k)][:3]
    for k, v in shown:
        d.text((600, y + 18), k.upper(), font=lab, fill=COLORS[k])
        txt = f"{v * 100:.0f}%" if k in ("eva", "crit") else f"{v:,}"
        d.text((700, y), txt, font=big, fill=TEXT)
        y += 78
    d.ellipse([602, y + 14, 638, y + 50], outline=GOLD, width=5)
    d.ellipse([612, y + 24, 628, y + 40], outline=GOLD, width=3)
    d.text((660, y), f"{it['value']:,}", font=big, fill=GOLD)
    _brand(d)
    im.save(out, "JPEG", quality=80, optimize=True, progressive=True)


def _logo(site):
    """Logo do portal (site/img/brand/logo.webp), ou None se o arquivo não existir."""
    from PIL import Image
    path = os.path.join(site, "img", "brand", "logo.webp")
    return Image.open(path).convert("RGBA") if os.path.exists(path) else None


def _fit(logo, w, h):
    from PIL import Image
    k = min(w / logo.width, h / logo.height)
    return logo.resize((max(1, round(logo.width * k)), max(1, round(logo.height * k))), Image.LANCZOS)


def og_default(out, logo=None):
    im, d = _base_canvas()
    if logo:
        lg = _fit(logo, 760, 470)
        im.paste(lg, ((1200 - lg.width) // 2, 40), lg)
        txt = "Shop Titans · Items · Heroes · Quests · Calculators"
        f = _font(FONT_REG, 30)
        d.text(((1200 - d.textlength(txt, font=f)) / 2, 548), txt, font=f, fill=MUTED)
        im.save(out, "JPEG", quality=85, optimize=True)
        return
    d.polygon([(300, 170), (420, 230), (420, 330), (300, 460), (180, 330), (180, 230)], outline=GOLD, width=10)
    d.line([(300, 250), (300, 390)], fill=GOLD, width=10)
    d.line([(245, 305), (355, 305)], fill=GOLD, width=10)
    d.text((560, 220), "Portal", font=_font(FONT_REG, 56), fill=MUTED)
    d.text((560, 284), "Shop Titans", font=_font(FONT_BOLD, 92), fill=TEXT)
    d.text((562, 400), "Items · Heroes · Quests · Calculators", font=_font(FONT_REG, 30), fill=MUTED)
    im.save(out, "JPEG", quality=82, optimize=True)


def build_og(site, items, force=False):
    """Uma imagem 1200x630 por item, sem texto de idioma (o título vem das meta tags). Só refaz o que mudou."""
    folder = os.path.join(site, "og")
    os.makedirs(folder, exist_ok=True)
    sig_path = os.path.join(folder, "_sig.json")
    try:
        sig = json.load(open(sig_path, encoding="utf-8"))
    except (OSError, ValueError):
        sig = {}
    default, logo_path = os.path.join(folder, "default.jpg"), os.path.join(site, "img", "brand", "logo.webp")
    if force or not os.path.exists(default) or (os.path.exists(logo_path) and os.path.getmtime(logo_path) > os.path.getmtime(default)):
        og_default(default, _logo(site))
    made = 0
    for it in items["items"]:
        key = hashlib.sha1(json.dumps([it["tier"], it["level"], it["value"], it["stats"]], sort_keys=True).encode()).hexdigest()[:10]
        out = os.path.join(folder, it["uid"] + ".jpg")
        if not force and sig.get(it["uid"]) == key and os.path.exists(out):
            continue
        og_item(os.path.join(site, "img", "items", it["uid"] + ".webp"), it, out)
        sig[it["uid"]] = key
        made += 1
    json.dump(sig, open(sig_path, "w", encoding="utf-8"))
    log(f"imagens de prévia: {made} novas/alteradas")


# ---------------------------------------------------------------- ícones do app (PWA)
def build_app_icons(site):
    from PIL import Image, ImageDraw
    folder = os.path.join(site, "icons")
    os.makedirs(folder, exist_ok=True)
    logo = _logo(site)
    if logo:  # ícone da aba: miolo da logo (sem as pontas da faixa), fundo transparente, para ficar legível em 16–32 px
        w = min(logo.width, round(logo.height * 1.2))
        core = logo.crop(((logo.width - w) // 2, 0, (logo.width + w) // 2, logo.height))
        for size in (32, 64):
            lg = _fit(core, size, size)
            fav = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            fav.paste(lg, ((size - lg.width) // 2, (size - lg.height) // 2), lg)
            fav.save(os.path.join(folder, f"favicon-{size}.png"), "PNG", optimize=True)
    for size, pad in ((192, 0), (512, 0), (512, 0.12)):
        im = Image.new("RGB", (size, size), BG)
        name = f"icon-{size}{'-maskable' if pad else ''}.png"
        if logo:  # logo centralizada no fundo escuro (a versão maskable tem mais margem)
            lg = _fit(logo, size * (0.74 if pad else 0.94), size * (0.74 if pad else 0.94))
            im.paste(lg, ((size - lg.width) // 2, (size - lg.height) // 2), lg)
            im.save(os.path.join(folder, name), "PNG", optimize=True)
            continue
        d = ImageDraw.Draw(im)
        s = size / 512
        inset = int(size * pad)
        if not pad:
            d.rounded_rectangle([0, 0, size - 1, size - 1], int(112 * s), fill=(42, 34, 22))
        k = (size - 2 * inset) / 512
        P = lambda x, y: (inset + x * k, inset + y * k)
        w = max(4, int(30 * k))
        d.polygon([P(256, 96), P(400, 170), P(400, 282), P(256, 420), P(112, 282), P(112, 170)], outline=GOLD, width=w)
        d.line([P(256, 180), P(256, 340)], fill=GOLD, width=w)
        d.line([P(190, 245), P(322, 245)], fill=GOLD, width=w)
        name = f"icon-{size}{'-maskable' if pad else ''}.png"
        im.save(os.path.join(folder, name), "PNG", optimize=True)
