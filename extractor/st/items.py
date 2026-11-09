"""Itens (projetos) -> dataset `items`."""
import re

from .common import lbl, LBL, TYPE_KEYS, fmt_num, num, split, stat_effects, type_name

CATEGORIES = {
    "weapon": "ws wa wd wm wp wb wt ww wc wg wi w2 wy wh",
    "armor": "ah am al hh hm hl hk gh gl bh bl",
    "accessory": "xs xq xc xi xr xa xf xx",
    "consumable": "uh up us fm fd xu xm",
    "enchant": "z m",
    "other": "ma",
}
CAT_OF = {c: k for k, codes in CATEGORIES.items() for c in codes.split()}


def build_items(tables, T):
    L = lbl(T.lang)
    lang = T.lang
    items = tables["items"]
    skills = tables["skills"]
    item_types = tables["itemTypes"]

    def name_of(uid, kind="item"):
        if not uid:
            return None
        order = {
            "item": ["{}_name", "resource_{}"],
            "resource": ["resource_{}", "{}_name"],
            "worker": ["worker_{}", "{}_name"],
            "chest": ["chest_{}_name", "{}_name"],
        }[kind]
        return T.first(*[p.format(uid) for p in order], default=uid)

    refs = {}

    def ref(uid, kind="item"):
        if uid:
            refs[uid] = {"name": name_of(uid, kind), "kind": kind}
        return uid

    def effect(s, it):
        if not s:
            return None
        if s.startswith("bp:"):
            target = s[3:]
            return {"text": L["eff.bp"].format(name_of(target)), "bp": target}
        if s.startswith("item:"):
            uid, _, qty = s[5:].partition(",")
            ref(uid)
            return {"text": L["eff.reward"].format(qty or 1, name_of(uid))}
        m = re.match(r"^([A-Za-z]+?)(\d?)([*+\-])([\d.]+)$", s)
        if not m:
            return {"text": s}
        key, idx, op, val = m.group(1), m.group(2), m.group(3), float(m.group(4))
        out = {"key": key + idx, "op": op, "v": val}
        pct = lambda f: fmt_num(abs(f - 1) * 100, lang) + "%"
        if key in ("resource", "component"):
            target = it.get(f"{key}{idx}")
            nm = name_of(target, "resource" if key == "resource" else "item") or key + idx
            if op == "-":
                out["text"] = f"-{fmt_num(val, lang)} {nm}"
            else:
                out["text"] = f"{nm} -{pct(val)}" if val < 1 else f"{nm} x{fmt_num(val, lang)}"
            return out
        if key == "cquality":
            out["text"] = L["eff.cquality"].format(idx, fmt_num(val, lang))
        elif key == "multi":
            out["text"] = L["eff.multi"].format(fmt_num(val * 100, lang))
        elif key == "quality":
            out["text"] = L["eff.quality"].format(fmt_num(val, lang))
        elif key in ("atk", "def", "hp", "eva", "crit", "shieldHp"):
            suffix = "%" if key in ("eva", "crit") else ""
            out["text"] = f"{L[key]} +{fmt_num(val, lang)}{suffix}"
        elif op == "*":
            out["text"] = f"{L.get(key, key)} {'+' if val >= 1 else '-'}{pct(val)}"
        else:
            out["text"] = f"{L.get(key, key)} {op}{fmt_num(val, lang)}"
        return out

    def skill_info(uid):
        if not uid:
            return None
        sk = skills.get(uid) or {}
        return {
            "uid": uid,
            "name": T.first(f"skill_{uid}_name", f"{uid}_name", default=uid),
            "desc": T.get(f"skill_{uid}_desc"),
            "effects": stat_effects(sk, T) if sk else [],
            "icon": f"icon_global_skill_{sk.get('family') or uid}",
        }

    type_info = {}
    for code, key in TYPE_KEYS.items():
        type_info[code] = {
            "name": T.get(f"item_type_{key}", code),
            "plural": T.first(f"item_type_plural_{key}", f"item_type_{key}", default=code),
            "effect": T.get(f"item_type_effect_{code}"),
            "slot": (item_types.get(code) or {}).get("slot"),
            "cat": CAT_OF.get(code, "other"),
        }

    src = {None: L["src.none"], "pack": L["src.pack"], "chest": L["src.chest"], "special": L["src.special"]}
    out = []
    for uid, it in items.items():
        if it.get("prohibited"):
            continue
        if it["tier"] == 0 and not it["value"]:  # marcadores de qualidade, não são itens
            continue
        code = it["type"]
        components = []
        for i in (1, 2):
            c = it[f"component{i}"]
            if c:
                components.append({"id": ref(c), "qty": it[f"c{i}Qty"], "quality": it.get(f"c{i}Tags"),
                                   "isItem": c in items})
        trade = None
        if it.get("tradeMinMaxValue"):
            try:
                lo, hi = it["tradeMinMaxValue"].split(";")
                trade = {"min": [num(x) for x in lo.split(",")], "max": [num(x) for x in hi.split(",")]}
            except ValueError:
                pass
        elements = []
        for part in split(it.get("elements")):
            m = re.match(r"(\w+)\+(\d+)", part)
            if m:
                elements.append({"id": m.group(1), "name": T.get(f"element_{m.group(1)}", m.group(1)),
                                 "value": int(m.group(2))})
        out.append({
            "uid": uid, "name": name_of(uid), "desc": T.get(f"{uid}_desc"),
            "type": code, "cat": CAT_OF.get(code, "other"), "tier": it["tier"], "level": it["level"],
            "value": it["value"], "xp": it["xp"], "craftXp": it["craftXp"], "favor": it["favor"], "time": it["time"],
            "stats": {k: num(it[k]) for k in ("atk", "def", "hp", "eva", "crit", "shieldHp")},
            "energy": {k: it[k] for k in ("discount", "surcharge", "suggest", "speedup")},
            "workers": [{"id": ref(it[f"worker{i}"], "worker"), "lvl": it[f"w{i}BuildingReq"]}
                        for i in (1, 2, 3) if it[f"worker{i}"]],
            "resources": [{"id": ref(it[f"resource{i}"], "resource"), "qty": it[f"r{i}Qty"]}
                          for i in (1, 2, 3) if it[f"resource{i}"]],
            "components": components,
            "milestones": [{"req": it[f"u{i}Req"], **effect(it[f"upgrade{i}"], it)}
                           for i in range(1, 6) if it[f"upgrade{i}"]],
            "starforged": [{"req": it[f"us{i}Req"], **effect(it[f"upgradeShiny{i}"], it)}
                           for i in range(1, 6) if it[f"upgradeShiny{i}"]],
            # 6 melhorias especiais: 1-3 = Ascensão (Estilhaços), 4-6 = Transcendência (Selos; atributos)
            "ascension": [{"cost": it[f"su{i}Cost"], **effect(it[f"supgrade{i}"], it)}
                          for i in range(1, 4) if it.get(f"supgrade{i}")],
            "transcendence": [{"cost": it[f"su{i}Cost"], **effect(it[f"supgrade{i}"], it)}
                              for i in range(4, 7) if it.get(f"supgrade{i}")],
            "elements": elements,
            "elementAffinity": [{"id": e, "name": T.get(f"element_{e}", e)} for e in split(it.get("elementAffinity"))],
            "spiritAffinity": [{"id": s, "name": T.first(f"{s}_name_o", f"{s}_name", default=s)}
                               for s in split(it.get("spiritAffinity"))],
            "skill": skill_info(it.get("skill")),
            "multiType": [type_name(T, c) for c in split(it.get("multiType"))],
            "source": src.get(it.get("excl"), it.get("excl")),
            "chest": {"id": it["chest"], "name": name_of(it["chest"], "chest")} if it.get("chest") else None,
            "trade": trade,
            "titan": bool(it.get("isTitanItem")),
            "nonCraftable": bool(it.get("nonCraftable")),
            "releaseAt": it.get("releaseAt"),
        })
    order = list(CATEGORIES)
    out.sort(key=lambda x: (order.index(x["cat"]), x["type"], x["tier"], x["level"], x["name"]))
    data = {
        "categories": {k: L["cat." + k] for k in CATEGORIES},
        "types": type_info,
        "refs": refs,
        "items": out,
    }
    icons = {i["uid"] for i in out} | set(refs) | {i["skill"]["icon"] for i in out if i["skill"]} \
        | {f"chest_{i['chest']['id']}" for i in out if i["chest"]} \
        | {f"icon_global_element_{e['id']}" for i in out for e in i["elementAffinity"] + i["elements"]}
    return data, icons
