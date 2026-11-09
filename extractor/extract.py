"""
Extrator do Portal Shop Titans (PC/Steam).

Lê as tabelas JSON de `ShopTitan_Data/resources.assets` e os sprites dos bundles em
`StreamingAssets`, e gera para o site:

  site/data/meta.js              versão, data, idiomas
  site/data/icons.js             lista de ícones disponíveis
  site/data/<lang>/<seção>.js    itens, campeões, classes, missões, baús, ...
  site/data/<lang>/search.js     índice da busca global
  site/img/items/<nome>.webp     ícones
  site/p/<pt|en>/...             páginas estáticas (buscadores e prévias de link)
  site/og/<uid>.jpg              imagens de prévia
  site/sitemap.xml, robots.txt   quando houver --base-url (ou "baseUrl" em config.json)

Opções extras: --base-url https://...  --no-pages  --force-og

Uso:
  python -m venv .venv
  .venv\\Scripts\\pip install -r requirements.txt
  .venv\\Scripts\\python extract.py [--game "C:\\...\\ShopTitan"] [--no-icons] [--force-icons]
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from st.common import DEFAULT_GAME, LANGS, Texts, game_version, load_tables, log, write_js
from st.icons import export_icons
from st.items import build_items
from st.search import build_search
from st.sections import SECTIONS
from st.static import PAGE_LANGS, build_app_icons, build_og, build_pages
from st.snapshots import save_and_diff

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, "..", "site"))
DATA = os.path.join(SITE, "data")
ICONS = os.path.join(SITE, "img", "items")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", default=DEFAULT_GAME)
    ap.add_argument("--no-icons", action="store_true")
    ap.add_argument("--force-icons", action="store_true", help="reexporta mesmo os ícones já existentes")
    ap.add_argument("--icon-size", type=int, default=128)
    ap.add_argument("--base-url", default=None, help="endereço público do site (para sitemap e prévias)")
    ap.add_argument("--no-pages", action="store_true", help="não gera páginas estáticas nem imagens de prévia")
    ap.add_argument("--force-og", action="store_true", help="refaz todas as imagens de prévia")
    a = ap.parse_args()
    try:
        cfg = json.load(open(os.path.join(HERE, "config.json"), encoding="utf-8"))
    except (OSError, ValueError):
        cfg = {}
    base_url = a.base_url if a.base_url is not None else cfg.get("baseUrl", "")

    tables = load_tables(a.game)
    version = game_version(a.game)
    log("versão do jogo:", version)

    wanted = set()
    items_by_lang = {}
    pages_data = {}
    for lang in LANGS:
        T = Texts(tables, lang)
        items, icons = build_items(tables, T)
        items_by_lang[lang] = items
        wanted |= icons
        write_js(os.path.join(DATA, lang, "items.js"), "items", items)
        sec = {}
        for name, fn in SECTIONS.items():
            data, icons = fn(tables, T)
            wanted |= icons
            sec[name] = data
            write_js(os.path.join(DATA, lang, f"{name}.js"), name, data)
        write_js(os.path.join(DATA, lang, "search.js"), "search", build_search(items, sec))
        if lang in PAGE_LANGS:
            pages_data[lang] = {"items": items, "classes": sec.get("classes") or [], "champions": sec.get("champions") or [],
                                "quests": sec.get("quests") or []}
        log(f"[{lang}] {len(items['items'])} itens + {len(SECTIONS)} seções")

    diff = save_and_diff(os.path.join(HERE, "snapshots"), items_by_lang, version)
    write_js(os.path.join(DATA, "diff.js"), "diff", diff)

    # ícones usados na página inicial
    wanted |= {"img_collectionbook_book_quality_epic_big", "img_player_titles_01", "icon_global_upgrade_rareresregen",
               "icon_achievements_gold04", "icon_event_reward_dialog", "custom_handheld_wallacehammer",
               "img_shop_item_sitems_gold1", "icon_global_quality_legendary", "icon_global_quality_epic",
               "icon_global_quality_flawless", "icon_global_quality_uncommon", "icon_global_quality_common"}
    wanted.discard("")
    if not a.no_icons:
        export_icons(a.game, wanted, ICONS, a.icon_size, a.force_icons)
    have = sorted(f[:-5] for f in os.listdir(ICONS) if f.endswith(".webp")) if os.path.isdir(ICONS) else []
    write_js(os.path.join(DATA, "icons.js"), "icons", have)
    write_js(os.path.join(DATA, "meta.js"), "meta", {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "gameVersion": version, "langs": list(LANGS), "baseUrl": base_url,
    })
    build_app_icons(SITE)
    if not a.no_pages:
        build_pages(SITE, pages_data, base_url)
        build_og(SITE, items_by_lang["en"], a.force_og)
    log("pronto:", DATA)


if __name__ == "__main__":
    main()
