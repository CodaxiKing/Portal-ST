"""Exporta sprites dos AssetBundles para WebP."""
import os

import UnityPy
from UnityPy.export import SpriteHelper

from .common import log

BUNDLES = ["ui", "ui_shop_furnitures", "ui_card_champions", "ui_card_heroes", "ui_card_workers",
           "ui_card_premiumworkers", "ui_card_resourceworkers", "ui_card_cityfolks"]


def export_icons(game, wanted, dest, size=128, force=False):
    os.makedirs(dest, exist_ok=True)
    have = {f[:-5] for f in os.listdir(dest) if f.endswith(".webp")}
    todo = set(wanted) if force else set(wanted) - have
    if not todo:
        log("ícones: nada novo para exportar")
        return have
    log(f"ícones: {len(todo)} para exportar")
    for bundle in BUNDLES:
        if not todo:
            break
        path = os.path.join(game, "ShopTitan_Data", "StreamingAssets", bundle)
        if not os.path.exists(path):
            continue
        log("  lendo", bundle)
        env = UnityPy.load(path)
        # O UnityPy procura o SpriteAtlas varrendo o bundle inteiro a cada sprite (muito lento no
        # bundle `ui`); indexamos os atlas uma vez só.
        atlases, sprites = {}, []
        for o in env.objects:
            t = o.type.name
            if t == "SpriteAtlas":
                atlases[o.peek_name()] = o
            elif t == "Sprite":
                sprites.append(o)
        parsed = {}
        for o in sprites:
            try:
                nm = o.peek_name()
            except Exception:
                continue
            if nm not in todo:
                continue
            try:
                sp = o.read()
                if not sp.m_SpriteAtlas and sp.m_AtlasTags:
                    tag = sp.m_AtlasTags[0]
                    if tag not in parsed:
                        parsed[tag] = atlases[tag].parse_as_object() if tag in atlases else None
                    atlas = parsed[tag]
                    if atlas is not None:
                        data = next(v for k, v in atlas.m_RenderDataMap if k == sp.m_RenderDataKey)
                        sp.m_AtlasTags = []
                        for k in ("texture", "alphaTexture", "textureRect", "settingsRaw"):
                            if hasattr(data, k):
                                setattr(sp.m_RD, k, getattr(data, k))
                img = SpriteHelper.get_image_from_sprite(sp)
            except Exception as e:
                log("    falhou", nm, e)
                continue
            img.thumbnail((size, size))
            img.save(os.path.join(dest, f"{nm}.webp"), "WEBP", quality=82, method=6)
            todo.discard(nm)
            have.add(nm)
    log(f"ícones: {len(set(wanted) & have)}/{len(set(wanted))} disponíveis")
    return have
