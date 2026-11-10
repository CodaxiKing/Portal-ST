"""Demais seções do portal. Cada build_* devolve (dados, conjunto_de_ícones)."""
import re

from .common import lbl, LBL, num, split, stat_effects, table_rows, type_name

TAG = re.compile(r"<[^>]+>")


def clean(s):
    return TAG.sub("", s).strip() if s else s


def item_name(T, uid):
    return T.first(f"{uid}_name", f"resource_{uid}", default=uid)


def stat_levels(r):
    """Atributos-base por nível (1/40/50/100), como estão nas tabelas."""
    out = {}
    for s, key in (("hp", "Hp"), ("atk", "Atk"), ("def", "Def")):
        out[s] = {"1": r.get(s, 0), "40": r.get(f"max{key}40") or r.get(f"max{key}", 0),
                  "50": r.get(f"max{key}50", 0), "100": r.get(f"max{key}100", 0)}
    return out


# ------------------------------------------------------------------ campeões
def build_champions(tables, T):
    L = lbl(T.lang)
    qm = tables.get("qmodifiers", {})
    out, icons = [], set()
    for uid, h in tables.get("heroes", {}).items():
        skills = []
        for i in range(1, 6):
            sid = h.get(f"skill{i}")
            if not sid:
                continue
            effects = [clean(T.get(f"hero_skill_{sid}_effect_{k}")) for k in range(6)]
            effects = [e for e in effects if e] or [clean(T.get(f"hero_skill_{sid}_effect"))]
            skills.append({
                "uid": sid, "rank": i, "name": T.get(f"hero_skill_{sid}_name", sid),
                "desc": clean(T.get(f"hero_skill_{sid}_desc")),
                "effects": [e for e in effects if e] or stat_effects(qm.get(sid, {}), T),
                "icon": f"icon_global_skill_hero_{sid}",
            })
            icons.add(f"icon_global_skill_hero_{sid}")
        tokens = [num(x) for x in split(h.get("tokens"))]
        upgrades = []
        for k in range(1, 12):
            u = h.get(f"upg{k:02d}")
            if not u:
                continue
            m = re.match(r"(stat|skl)\+([\d.]+)", u)
            if m:
                txt = L["upg.stat"].format(round(float(m.group(2)) * 100, 1)) if m.group(1) == "stat" \
                    else L["upg.skl"].format(m.group(2))
            else:
                txt = u
            upgrades.append({"rank": k, "tokens": tokens[k - 1] if k - 1 < len(tokens) else None, "text": txt})
        out.append({
            "uid": uid, "name": T.get(f"{uid}_name", uid), "quote": clean(T.get(f"collection_card_{uid}_desc")),
            "class": h.get("class"), "className": T.get(f"class_{h.get('class')}_name", h.get("class")),
            "element": h.get("element"), "elementName": T.get(f"element_{h.get('element')}", h.get("element")),
            "gender": h.get("gender"), "unlockedAt": h.get("unlockedAt"),
            "stats": stat_levels(h), "evasion": num(h.get("evasion")), "critical": num(h.get("critical")),
            "critMult": num(h.get("critMult")), "aggro": h.get("aggro"),
            "equip": [{"code": c, "name": type_name(T, c)} for c in split(h.get("bulkTypes"))],
            "skills": skills, "upgrades": upgrades,
            "icon": f"icon_global_{uid}", "card": f"cc_{uid}",
        })
        icons |= {f"icon_global_{uid}", f"cc_{uid}", f"icon_global_element_{h.get('element')}"}
    return out, icons


# ------------------------------------------------------------------ classes
_CARD_CACHE = {}


def _card_bonus(tables):
    if "v" in _CARD_CACHE:
        return _CARD_CACHE["v"]
    out = {}
    for n in tables.get("skillTreeNodes", {}).values():
        if n.get("mods") != "HeroStatsIncrease":
            continue
        val = num(n.get("modsValues"))
        for f in split(n.get("modsFilters")):
            parts = f.split(":")
            if len(parts) == 3:
                lst = out.setdefault(parts[1], [])
                if val not in lst:
                    lst.append(val)
    for v in out.values():
        v.sort()
    _CARD_CACHE["v"] = out
    return out


def build_classes(tables, T):
    classes = tables.get("classes", {})
    promoted_from = {c["titanClass"]: uid for uid, c in classes.items() if c.get("titanClass")}
    out, icons = [], set()
    for uid, c in classes.items():
        innate = c.get("innate")
        innate_ranks = [T.get(f"skill_{innate}{k}_name") for k in range(1, 5)]
        slots = []
        for k in range(1, 7):
            codes = split(c.get(f"slot{k}"))
            if codes:
                slots.append([{"code": x, "name": type_name(T, x)} for x in codes])
        out.append({
            "uid": uid, "name": T.get(f"class_{uid}_name", uid), "desc": clean(T.get(f"class_{uid}_desc")),
            "type": c.get("type"), "typeName": T.get(f"classtype_{c.get('type')}", c.get("type")),
            "element": c.get("element"), "elementName": T.get(f"element_{c.get('element')}", c.get("element")),
            "stats": stat_levels(c), "evasion": num(c.get("evasion")), "critical": num(c.get("critical")),
            "critMult": num(c.get("critMult")), "aggro": c.get("aggro"),
            "stars": {k: c.get(f"{k}stars", 0) for k in ("hp", "atk", "def", "eva", "skill")},
            "innate": {"uid": innate, "names": [n for n in innate_ranks if n],
                       "effect": clean(T.get(f"skill_{innate}_effect")), "icon": f"icon_global_skill_{innate}"}
            if innate else None,
            "hire": {"gold": c.get("hireCost"), "gems": c.get("hireGems"), "level": c.get("hireReqLevel"),
                     "isHire": c.get("isHire")},
            "promotesTo": c.get("titanClass"), "promotedFrom": promoted_from.get(uid),
            "skillSlots": [c.get(f"skl{k}Lv") for k in range(1, 6) if c.get(f"skl{k}Lv")],
            # Livro de Coleção: cartas da classe aumentam ATQ/DEF/PV (o jogo usa o melhor valor desbloqueado)
            "cardBonus": _card_bonus(tables).get(uid, []),
            "slots": slots,
            "startItems": [{"id": x, "name": item_name(T, x)} for x in split(c.get("hireItems"))],
            "icon": f"icon_global_class_{uid}_128", "card": f"cc_{uid}",
        })
        icons |= {f"icon_global_class_{uid}_128", f"icon_global_class_{uid}", f"cc_{uid}",
                  f"icon_global_skill_{innate}"}
    return out, icons


# ------------------------------------------------------------------ habilidades
SKILL_MODS = ("airshipDonationPowerMultiplier", "characterAirshipPowerMultiplier", "atk", "def", "hp", "shieldHp", "atkAbs", "defAbs", "hpAbs", "evasion", "critical", "critMult", "aggro",
             "item", "eleAtk", "championStatBonusMultiplier", "elementalItemCoreStatMultiplier")
SKILL_KIND = {"p": "hero", "s": "mastery", "c": "innate", "i": "spirit", "a": "artifact", "q": "item"}


def build_skills(tables, T):
    fams = {}
    for uid, s in tables.get("skills", {}).items():
        fam = s.get("family") or uid
        f = fams.get(fam)
        if not f:
            classes = split(s.get("classes"))
            f = fams[fam] = {
                "family": fam, "name": None, "kind": SKILL_KIND.get(uid.split("_")[0], "other"),
                "category": s.get("category"),
                "classes": [{"id": x, "name": T.first(f"classtype_{x}", f"class_{x}_name", default=x)} for x in classes],
                "icon": f"icon_global_skill_{fam}", "tiers": [],
            }
        mods = {k: num(s.get(k)) for k in SKILL_MODS if num(s.get(k))}
        f["tiers"].append({"uid": uid, "tier": s.get("tier"), "rank": s.get("rank"), "rarity": s.get("rarity"),
                           "name": T.get(f"skill_{uid}_name"), "effects": stat_effects(s, T),
                           # números usados pelo Hypermax: % (0.6 = +60%), valores fixos (*Abs), elemento exigido, tipos de item
                           "mods": mods, "req": num(s.get("elements")), "classes": split(s.get("classes")),
                           "itemTypes": split(s.get("itemTypes")), "secStat": bool(s.get("affectSecStat")),
                           "self": bool(s.get("affectItselfOnly")), "quest": s.get("questRestriction") or None})
    out = []
    for f in fams.values():
        f["tiers"].sort(key=lambda x: x["tier"] or 0)
        f["name"] = next((t["name"] for t in f["tiers"] if t["name"]), f["family"])
        out.append(f)
    out.sort(key=lambda f: (f["kind"], f["name"]))
    return out, {f["icon"] for f in out}


# ------------------------------------------------------------------ missões
def build_quests(tables, T):
    L = lbl(T.lang)
    zones, icons = {}, set()
    unlocks = {}
    for r in tables.get("questslvls", {}).values():
        unlocks.setdefault(r["quest"], []).append(
            {"level": r["level"], "xp": r["xp"], "type": r.get("type"), "value": r.get("value")})
    for uid, q in tables.get("quests", {}).items():
        fam = q["family"]
        z = zones.get(fam)
        if not z:
            z = zones[fam] = {
                "id": fam, "name": T.get(f"{fam}_name", fam), "desc": clean(T.get(f"{fam}_name_desc")),
                "boss": T.get(f"{fam}_boss_name"), "icon": f"{fam}_boss", "levels": [],
                "progress": sorted(unlocks.get(fam, []), key=lambda x: x["level"]),
            }
            icons.add(f"{fam}_boss")
        comps = []
        for k in (1, 2, 3):
            c = q.get(f"comp{k}")
            if c:
                comps.append({"id": c, "name": item_name(T, c), "qty": q.get(f"comp{k}Qty")})
                icons.add(c)
        z["levels"].append({
            "uid": uid, "difficulty": q.get("difficultyLvl"), "boss": bool(q.get("isBoss")),
            "titan": bool(q.get("isTitan")), "party": q.get("party"), "time": q.get("time"), "rest": q.get("rest"),
            "heal": q.get("heal"), "xp": q.get("xp"), "monsterHp": q.get("monsterHp"), "dmg": q.get("dmg"),
            "tdef": q.get("tdef"), "power": q.get("mpwr"), "crit": num(q.get("crit")),
            "critMult": num(q.get("critMult")), "aoe": q.get("aoe"), "aoeOdds": num(q.get("aoeOdds")),
            "accuracy": num(q.get("accuracy")), "element": q.get("element"),
            "elementName": T.get(f"element_{q.get('element')}") if q.get("element") else None,
            "barrier": q.get("barrierPower"), "itemBreaks": q.get("itemBreaks"),
            "unlock": {"gold": q.get("unlockGold"), "gems": q.get("unlockGems"), "level": q.get("unlockLevel")},
            "comps": comps, "itemLevel": [q.get("itemLevelMin"), q.get("itemLevelMax")],
            "chest": {"id": q["chest"], "name": T.get(f"{q['chest']}_name", q["chest"]), "odds": num(q.get("chestOdds"))}
            if q.get("chest") else None,
            "keyOdds": num(q.get("keyOdds")),
        })
    out = [z for z in zones.values() if len(z["levels"]) >= 8]
    for z in out:
        z["levels"].sort(key=lambda x: (x["boss"], x["difficulty"] or 0, x["uid"]))
    return out, icons


# ------------------------------------------------------------------ baús
def build_chests(tables, T):
    out, icons = [], set()
    quests = tables.get("quests", {})
    for uid, c in tables.get("chestodds", {}).items():
        zone = c.get("quest")
        zq = quests.get(f"{zone}01") or {}
        comps = [{"id": zq.get(f"comp{k}"), "name": item_name(T, zq.get(f"comp{k}")), "qty": c.get(f"comp{k}Qty")}
                 for k in (1, 2, 3) if zq.get(f"comp{k}") and c.get(f"comp{k}Qty")]
        consumables = []
        for part in split(c.get("consumables")):
            cid, _, w = part.partition(";")
            consumables.append({"id": cid, "name": item_name(T, cid)})
        def rng(v):
            cid, _, q = (v or "").partition(";")
            return {"id": cid, "name": item_name(T, cid), "qty": q} if cid else None
        bps = [{"id": b, "name": item_name(T, b)} for b in split(c.get("exclBps"))]
        out.append({
            "uid": uid, "name": T.get(f"{uid}_name", uid), "desc": clean(T.get(f"{uid}_desc")),
            "zone": zone, "zoneName": T.get(f"{zone}_name", zone),
            "key": c.get("key"), "keyName": T.get(f"{c.get('key')}_name", c.get("key")),
            "contentSize": c.get("contentSize"), "gemsSize": c.get("gemsSize"),
            "itemLevel": [c.get("itemLevelMin"), c.get("itemLevelMax")],
            "quality": {q: num(c.get(f"itemQ{i}")) for i, q in enumerate(("uncommon", "flawless", "epic", "legendary"), 2)},
            "comps": comps, "consumables": consumables,
            "runestones": rng(c.get("runestones")), "moonstones": rng(c.get("moonstones")),
            "blueprints": bps, "bpUnlocks": c.get("bpUnlocksCount"),
            "champions": [{"id": x, "name": T.get(f"{x}_name", x)} for x in split(c.get("champions"))],
            "championsCount": c.get("championsCount"), "shinyTier": c.get("shinyTier"),
            "icon": uid, "keyIcon": c.get("key"),
        })
        icons |= {uid, c.get("key") or ""} | {b["id"] for b in bps} | {x["id"] for x in consumables} \
            | {x["id"] for x in comps}
    return out, icons


# ------------------------------------------------------------------ trabalhadores
def build_workers(tables, T):
    bl = {}
    for r in tables.get("blevels", {}).values():
        bl.setdefault(r["family"], []).append({
            "level": r["level"], "userLevel": r.get("minLevel"), "cityLevel": r.get("minCityLevel"),
            "gold": r.get("gold"), "gems": r.get("gems"),
            "unlock": {"id": r["extra"], "name": item_name(T, r["extra"])} if r.get("extra") else None,
        })
    workers, icons = [], set()
    for uid, w in tables.get("workers", {}).items():
        workers.append({
            "uid": uid, "name": T.get(f"worker_{uid}", uid), "npc": T.get(f"{uid}_name"),
            "desc": clean(T.get(f"worker_{uid}_desc")), "building": T.get(f"building_{uid}"),
            "levels": sorted(bl.get(uid, []), key=lambda x: x["level"]),
            "icon": f"{uid}_head", "card": f"cc_{uid}",
        })
        icons |= {f"{uid}_head", f"cc_{uid}", uid}
    res = []
    for uid, r in tables.get("resourceworkers", {}).items():
        res.append({"uid": uid, "name": T.get(f"resource_{uid}", uid), "desc": clean(T.get(f"resource_{uid}_desc")),
                    "tier": r.get("tier"), "icon": uid})
        icons.add(uid)
    wl = [{"level": r["level"], "xp": r["xp"], "craftingTime": r["craftingTime"]}
          for r in table_rows(tables, "wlevels")]
    return {"workers": workers, "resources": res, "wlevels": wl}, icons


# ------------------------------------------------------------------ móveis
def build_furniture(tables, T):
    fams, icons = {}, set()
    for uid, f in tables.get("furniture", {}).items():
        if f.get("prohibited"):
            continue
        fam = f.get("family") or uid
        g = fams.get(fam)
        if not g:
            g = fams[fam] = {
                "family": fam, "type": f.get("type"),
                "name": T.first(f"{uid}_name", f"{fam}_name", default=fam),
                "desc": clean(T.first(f"{uid}_desc", f"{fam}_desc")),
                "slots": [{"code": c, "name": type_name(T, c)} for c in split(f.get("slots"))],
                "special": bool(f.get("isSpecial")), "event": f.get("events") or f.get("excl"),
                "releaseAt": f.get("releaseAt"), "levels": [], "icon": uid,
            }
        g["levels"].append({
            "uid": uid, "level": f.get("level"), "reqLevel": num(f.get("reqLevel")),
            "size": [f.get("length"), f.get("width")], "energyCap": f.get("energyCap"),
            "energyBonus": f.get("energyBonus"), "maxItems": f.get("maxItems"),
            "storageBase": [num(x) for x in split(f.get("storageBase"))],
            "storagePerLevel": [num(x) for x in split(f.get("storagePerLevel"))],
            "resourceTier": f.get("resourceTier"), "prestige": f.get("prestige"),
            "costs": [{"gold": f.get(f"gold{k}"), "gems": f.get(f"gems{k}"), "time": f.get(f"time{k}")}
                      for k in range(1, 6)],
        })
        icons.add(uid)
    out = list(fams.values())
    for g in out:
        g["levels"].sort(key=lambda x: x["level"] or 0)
        g["icon"] = g["levels"][-1]["uid"]
    return out, icons


# ------------------------------------------------------------------ talentos / pesquisa / estandarte
def _camel(s):
    return re.sub(r"(?<!^)(?=[A-Z])", " ", s or "").strip()


def build_skilltree(tables, T):
    nodes = tables.get("skillTreeNodes", {})
    icons = set()

    def fmt(txt, val):
        return clean(txt).replace("{0}", str(val)) if txt else None

    # Árvore de Talentos (bartering / crafting / questing)
    trees = {}
    research = {}
    banner = {}
    cards = []
    for uid, n in nodes.items():
        typ = n.get("type")
        mods = n.get("mods") or ""
        rank = {"uid": uid, "index": n.get("nodeIndex"), "value": n.get("displayValue"),
                "empowered": n.get("empoweredDisplayValue"), "gold": n.get("goldCost"), "gems": n.get("gemsCost"),
                "bp": n.get("bpUnlockCost"), "emblems": n.get("emblemCost"), "spendReq": n.get("spendReq")}
        if typ == "skills":
            tf = n.get("treeFamily")
            t = trees.setdefault(tf, {"id": tf, "name": T.get(f"skill_tree_{tf}_tab", tf),
                                      "desc": clean(T.get(f"skill_start_node_{tf}_desc")), "nodes": {}})
            nf = n.get("nodeFamily") or uid
            node = t["nodes"].setdefault(nf, {
                "family": nf, "title": T.get(f"skill_node_{nf}_title", _camel(nf)),
                "desc": clean(T.get(f"skill_node_{nf}_desc")), "epic": bool(n.get("isEpic")),
                "icon": f"icon_skilltree_{nf}", "ranks": [], "neighbours": split(n.get("neighbours"))})
            node["ranks"].append(rank)
            icons.add(f"icon_skilltree_{nf}")
        elif typ == "worker":
            wf = n.get("treeFamily")
            w = research.setdefault(wf, {"id": wf, "name": T.get(f"worker_{wf}", wf), "icon": f"{wf}_head",
                                         "branches": {}})
            br = n.get("branchFamily") or "?"
            b = w["branches"].setdefault(br, {"type": br, "name": type_name(T, br), "nodes": []})
            key = mods.lower()
            b["nodes"].append({**rank, "mod": mods,
                               "title": T.get(f"advanced_research_node_{key}_title", _camel(mods)),
                               "label": clean(T.get(f"advanced_research_node_{key}01_desc"))})
            icons.add(f"{wf}_head")
        elif typ == "emblem":
            br = n.get("branchFamily") or "?"
            b = banner.setdefault(br, {"type": br, "nodes": []})
            key = mods.lower()
            b["nodes"].append({**rank, "mod": mods,
                               "title": T.get(f"banner_upgrades_node_{key}_title", _camel(mods)),
                               "desc": fmt(T.get(f"banner_upgrades_node_{key}_desc"), "")})
        elif typ == "cards":
            key = mods.split(",")[0].lower()
            base = re.sub(r"\d+$", "", uid)
            if base.startswith("mastered"):
                base = base[len("mastered"):].lower()
            fams = [base, n.get("branchFamily"), n.get("nodeFamily"), n.get("treeFamily")]
            txt = T.first(*[f"collection_card_node_{f}_{key}_desc" for f in fams if f],
                          f"collection_card_node_{key}_desc")
            who = next((f for f in fams if f and T.get(f"collection_card_{f}_name")), fams[0])
            if key == "duplicatecardshardmult":
                txt = lbl(T.lang)["card.dupe"].format(n.get("modsValues"))
            elif key == "herostatsincrease" and txt:
                txt = txt.replace("{1}", T.get(f"class_{who}_name") or T.get(f"collection_card_{who}_name", who))
            cards.append({"uid": uid, "family": who, "name": T.get(f"collection_card_{who}_name", who),
                          "mod": mods, "value": n.get("displayValue"),
                          "text": fmt(txt, n.get("displayValue") or "") or f"{_camel(mods)} {n.get('displayValue') or ''}"})
    for t in trees.values():
        t["nodes"] = list(t["nodes"].values())
        for nd in t["nodes"]:
            nd["ranks"].sort(key=lambda r: r["index"] or 0)
    for w in research.values():
        w["branches"] = list(w["branches"].values())
    from .common import type_name as _tn
    for code, b in banner.items():
        b["name"] = _tn(T, code)
        b["nodes"].sort(key=lambda r: r["index"] or 0)
    return {"trees": list(trees.values()), "research": list(research.values()), "banner": list(banner.values()),
            "cards": cards, "points": table_rows(tables, "skillTreePoints")}, icons


# ------------------------------------------------------------------ pets
def build_pets(tables, T):
    out, icons = [], set()
    for uid, p in tables.get("pet", {}).items():
        if p.get("prohibited"):
            continue
        out.append({
            "uid": uid, "name": T.get(f"pet_family_{uid}", uid.capitalize()), "house": p.get("furnitureUid"),
            "houseName": T.get(f"{p.get('furnitureUid')}_name"), "levelReq": p.get("levelReq"),
            "gold": p.get("goldPrice"), "gems": p.get("gemsPrice"), "size": p.get("size"),
            "event": p.get("event") or p.get("excl"), "feedFreq": p.get("feedFreq"),
            "unlocks": [{"id": p.get(f"unlockUid{k}"), "req": p.get(f"unlockReq{k}")}
                        for k in range(1, 5) if p.get(f"unlockUid{k}")],
            "icon": p.get("furnitureUid"),
        })
        icons.add(p.get("furnitureUid") or "")
    food = [{"uid": k, "name": T.get(f"img_global_pet_food_{k}", k), "xp": v.get("xp")}
            for k, v in tables.get("petFood", {}).items()]
    return {"pets": out, "levels": table_rows(tables, "petLevels"), "food": food}, icons


# ------------------------------------------------------------------ coleção / títulos / conquistas
def build_collection(tables, T):
    sets, icons = {}, set()
    for uid, c in tables.get("collectionCards", {}).items():
        s = sets.setdefault(c.get("setFamily"), [])
        fam = c.get("family")
        icons |= {f"cc_{fam}", f"icon_global_{fam}", f"{fam}_head", f"icon_global_class_{fam}_128"}
        s.append({"uid": uid, "family": fam, "name": T.get(f"collection_card_{fam}_name", fam),
                  "desc": clean(T.get(f"collection_card_{fam}_desc")), "quality": c.get("quality"),
                  "score": c.get("score"), "deck": c.get("deckFamily"), "chase": bool(c.get("isChase"))})
    rewards = []
    for r in tables.get("collectionBookRewards", {}).values():
        typ, _, val = (r.get("reward") or "").partition(":")
        if typ == "item":
            iid, _, qty = val.partition(",")
            rewards.append({"points": r.get("pointsReq"), "type": "item", "id": iid, "value": qty or "1",
                            "name": item_name(T, iid)})
        else:
            rewards.append({"points": r.get("pointsReq"), "type": typ, "value": val, "name": None})
    return {"sets": [{"id": k, "cards": v} for k, v in sets.items()], "rewards": rewards}, icons


def build_titles(tables, T):
    titles = []
    for uid, t in tables.get("titles", {}).items():
        fam = t.get("family") or ""
        desc = clean(T.first(f"{uid}_desc", f"{fam}_title_desc"))
        if desc and "{0}" in desc:
            desc = desc.replace("{0}", f"{t.get('threshold') or 0:,}".replace(",", "."))
        titles.append({"uid": uid, "name": T.first(f"{uid}_name", f"{fam}_title_m_name", default=uid), "desc": desc,
                       "family": t.get("family"), "tier": t.get("tier"), "threshold": t.get("threshold"),
                       "hidden": bool(t.get("isHidden")), "achievement": bool(t.get("isAchievement"))})
    ach = []
    for uid, a in tables.get("achievements", {}).items():
        ach.append({"uid": uid, "name": T.get(f"{uid}_name", uid), "desc": clean(T.get(f"{uid}_desc")),
                    "family": a.get("family"), "level": a.get("level"), "threshold": a.get("threshold"),
                    "reward": a.get("reward"), "rewardVal": a.get("rewardVal")})
    return {"titles": titles, "achievements": ach}, set()


# ------------------------------------------------------------------ guilda / cidade
def build_city(tables, T):
    fams = {}
    for uid, u in tables.get("cityupgrades", {}).items():
        fam = u.get("family")
        if fam == "level":
            continue
        f = fams.setdefault(fam, {"family": fam, "name": T.get(f"city_upgrade_{fam}_title", fam),
                                  "desc": clean(T.get(f"city_upgrade_{fam}_desc")), "boost": bool(u.get("isBoost")),
                                  "levels": []})
        _, _, val = (u.get("effect") or "").partition(":")
        f["levels"].append({"level": u.get("level"), "levelReq": u.get("levelReq"), "cost": u.get("cost"),
                            "value": val})
    guild = [{"level": u["level"], "cost": u.get("cost")} for u in tables.get("cityupgrades", {}).values()
             if u.get("family") == "level"]
    # construções da cidade (prefeitura, taverna, construções dos trabalhadores, recursos)
    blds = {}
    for r in tables.get("buildings", {}).values():
        fam = r.get("family")
        b = blds.setdefault(fam, {"family": fam, "type": r.get("type"), "name": T.first(f"building_{fam}", f"worker_{fam}", default=fam),
                                  "icon": f"{fam}_head" if r.get("type") == "worker" else fam, "levels": []})
        b["levels"].append({"level": r.get("level"), "ticks": r.get("ticks") or 0, "time": r.get("time") or 0,
                            "bonus": r.get("bonus") or 0, "userLvl": r.get("userLvl") or 0})
    for b in blds.values():
        b["levels"].sort(key=lambda x: x["level"])
    return {"upgrades": list(fams.values()), "guildLevels": guild, "buildings": list(blds.values())}, set()


# ------------------------------------------------------------------ progressão / constantes
def build_progression(tables, T):
    c = tables.get("constants", {})
    keep = ["adventurer_power_attack_mult", "adventurer_power_defense_mult", "adventurer_power_hp_mult",
            "adventurer_power_shieldhp_mult", "adventurer_extra_power_defense_aggro_mult", "adventurer_extra_power_hp_aggro_mult",
            "adventurer_extra_power_shieldhp_eva_mult", "quest_evasion_max", "item_power_uncommon_mult", "item_power_flawless_mult",
            "item_power_epic_mult", "item_power_legd_mult", "affinity_stat_bonus", "affinity_all_bonus_mult"]
    raw = ["hero_element_rank_and_value", "affinity_element_bonus"]
    return {
        "levels": table_rows(tables, "levels"),
        "friendship": table_rows(tables, "flevels"),
        "fusion": [{"uid": k, "name": T.get(f"quality_{k}", k), **v} for k, v in tables.get("fusion", {}).items()],
        "constants": {**{k: num(c.get(k)) for k in keep if k in c}, **{k: c.get(k) for k in raw if k in c}},
    }, set()


def build_updates(tables, T):
    out = []
    for r in table_rows(tables, "updateLogs"):
        uid = r.get("uid", "")
        if uid.endswith("_header"):
            ver = uid[:-7]
            out.append({"id": ver, "title": clean(T.get(uid, ver)), "body": T.get(f"{ver}_body") or ""})
    return out, set()


SECTIONS = {
    "champions": build_champions, "classes": build_classes, "skills": build_skills, "quests": build_quests,
    "chests": build_chests, "workers": build_workers, "furniture": build_furniture, "skilltree": build_skilltree,
    "pets": build_pets, "collection": build_collection, "titles": build_titles, "city": build_city,
    "progression": build_progression, "updates": build_updates,
}


# ------------------------------------------------------------------ eventos: caravana, torre/tumba
def build_events(tables, T):
    c = tables.get("constants", {})
    cells = lambda m: str(m or "").split(",").count("1")
    shapes = {}
    for uid, r in tables.get("caravanItems", {}).items():
        shapes[uid] = {"w": num(r.get("width")), "l": num(r.get("length")), "n": cells(r.get("map")), "map": r.get("map")}
    pools = [{"id": r["uid"], "name": T.get(f"caravan_title_theme_{r['uid']}", r["uid"]),
              "wanted": split(r.get("pool"))} for r in tables.get("caravanWantedItemPools", {}).values()]
    days = [{"uid": r["uid"], "day": r.get("day"), "family": r.get("family"), "theme": r.get("theme"), "map": r.get("map"),
             "maxStack": r.get("maxItemStack"), "maxItems": r.get("maxItems")} for r in tables.get("caravanDays", {}).values()]
    maps = {r["uid"]: {"w": num(r.get("width")), "l": num(r.get("length")), "n": cells(r.get("map")), "map": r.get("map")}
            for r in tables.get("caravanMaps", {}).values()}
    ck = ["caravan_wanted_item_multiplier", "caravan_per_square_bonus", "caravan_all_wanted_item_match",
          "caravan_dividing_points_ratio", "caravan_minimum_item_points", "item_price_uncommon_mult", "item_price_flawless_mult",
          "item_price_epic_mult", "item_price_legd_mult", "quest_event_dragon_donate_power_mult"]
    mods = []
    for uid, r in tables.get("qmodifiers", {}).items():
        if not r.get("isTower"):
            continue
        eff = {k: num(r.get(k)) for k in ("atk", "def", "hp", "evasion", "critical", "critMult", "aggro", "regen", "mHp", "mDmg",
                                          "mCrit", "mCritMult", "mEva", "mAoe", "mAoeOdds", "mDmgPerRound", "barrierPowerExtra") if num(r.get(k))}
        mods.append({"uid": uid, "family": r.get("family"), "name": T.get(f"{uid}_name", uid), "desc": clean(T.get(f"{uid}_desc")),
                     "weight": num(r.get("weight")), "minTier": r.get("minTowerTier") or 0, "minFloor": r.get("minTowerFloor") or 0,
                     "classes": split(r.get("classes")), "eff": eff})
    tomb = []
    for uid, q in tables.get("quests", {}).items():
        if q.get("family") == "titantower" and "tomb" in uid:
            tier = uid.split("_")[-1]
            tomb.append({"uid": uid, "tier": tier, "name": T.get(f"quest_event_tower_tier_{tier}_tomb", tier), "party": q.get("party"),
                         "monsterHp": q.get("monsterHp"), "dmg": q.get("dmg"), "tdef": q.get("tdef"), "power": q.get("mpwr"),
                         "crit": num(q.get("crit")), "dmgRed": num(q.get("dmgRed")), "accuracy": num(q.get("accuracy")),
                         "element": q.get("element"), "barrier": q.get("barrierPower") or 0, "aoe": q.get("aoe")})
    info = lambda pre: [[clean(T.get(f"{pre}_info_header{i}")), clean(T.get(f"{pre}_info_body{i}"))]
                        for i in (1, 2, 3) if T.get(f"{pre}_info_header{i}")]
    # eventos recorrentes: as datas vêm do servidor da Kabam, os arquivos só têm regras, ícones e recompensas
    recurring = [
        {"id": "goldcity", "name": T.first("goldcity_name", "fq_lcog_name", default="Lost City of Gold"), "icon": "icon_quest_goldcity",
         "route": "cidadeouro", "info": info("goldcity")},
        {"id": "tower", "name": T.first("titantower_name", default="Titan Tower"), "icon": "icon_quest_titantower",
         "route": "tumba", "desc": clean(T.get("titantower_description")), "info": info("titantower")},
        {"id": "dragon", "name": T.first("dragon_invasion_name", default="Dragon Invasion"), "icon": "icon_dragoninvasion_airship",
         "route": "invasao", "desc": clean(T.get("dragon_invasion_description"))},
        {"id": "caravan", "name": T.first("caravan_shop_title", "caravan_title", default="Caravan"), "icon": "icon_caravan_emblem",
         "route": "caravana", "info": info("caravan")},
    ]
    community = []
    for uid, r in tables.get("communityEvents", {}).items():
        if uid.startswith("sample"):
            continue
        community.append({"id": uid, "theme": r.get("theme"), "name": T.first(f"community_event_title_{uid}", default=uid),
                          "desc": clean(T.get(f"community_event_intro_description_{uid}")),
                          "progress": clean(T.get(f"community_event_progress_description_{uid}")),
                          "icon": f"icon_news_header_{uid}_community_event", "min": r.get("minContribution")})
    king, king_icons = _king(tables, T, c)
    ev_icons = king_icons | {x["icon"] for x in recurring} | {x["icon"] for x in community} | {
        "icon_lostcityofgold_puregold", "icon_goldcity_endless_event_bronze", "icon_goldcity_endless_event_silver",
        "icon_goldcity_endless_event_gold", "icon_news_header_goldcity", "icon_quest_goldcity_boss", "icon_global_grand_prize_goldcity_blueprint",
        "icon_news_header_community_event", "icon_news_header_titantower"}
    return {
        "recurring": recurring, "community": community, "king": king,
        "goldcity": {"info": info("goldcity"), "k": {k: num(v) for k, v in c.items() if re.search(r"goldcity|lcog|pure_?gold", k)}},
        "caravan": {"pools": pools, "days": days, "maps": maps, "shapes": shapes, "k": {x: num(c.get(x)) for x in ck}},
        "tower": {"mods": mods, "tomb": tomb, "curse": {k: c.get(f"tomb_curse_{k}_percentage") for k in ("hp", "atk", "def")},
                  "spiritQuestMult": num(c.get("spirit_quest_restriction_bonus_multiplier")) or 2},
    }, ev_icons


def _king(tables, T, c):
    """Capricho do Rei: regras dos pedidos (sorteio por tipo) e a loja de Fichas de Antiguidade. Cada projeto, móvel,
    visual ou decoração com preço em fichas entra no sorteio da loja depois do lançamento: capriceDelay dias, ou
    quest_event_king_antique_shard_shop_delay_seasonal (180) quando não tem (unidade em dias deduzida dos dados)."""
    import datetime as _dt
    pairs = lambda s: [[a, num(b)] for a, b in (x.split(",") for x in str(s or "").split(";") if "," in x)]
    delay_def = num(c.get("quest_event_king_antique_shard_shop_delay_seasonal")) or 180
    shop, icons = [], set()
    srcs = [("items", "item", lambda u, r: item_name(T, u)),
            ("furniture", "furniture", lambda u, r: T.first(f"{u}_name", f"{r.get('family') or u}_name", default=u)),
            ("customizations", "look", lambda u, r: T.first(f"customization_{str(r.get('type', '')).lower()}_{u}", f"customization_{u}", default=u)),
            ("wallDecorations", "deco", lambda u, r: T.first(f"decoration_wall_{u}_name", default=u)),
            ("floorDecorations", "deco", lambda u, r: T.first(f"decoration_floor_{u}_name", default=u))]
    for table, kind, name in srcs:
        for uid, r in tables.get(table, {}).items():
            if not isinstance(r, dict) or not r.get("shardPrice") or r.get("prohibited"):
                continue
            rel = str(r.get("releaseAt") or "")[:10]
            if not rel or rel >= "2090":
                continue
            delay = num(r.get("capriceDelay")) or delay_def
            enter = (_dt.date.fromisoformat(rel) + _dt.timedelta(days=delay)).isoformat()
            shop.append({"u": uid, "k": kind, "n": name(uid, r), "t": r.get("tier") or 0, "p": num(r.get("shardPrice")),
                         "r": rel, "d": delay, "e": enter, "x": r.get("excl")})
            icons.add(uid)
    shop.sort(key=lambda x: (x["e"], x["k"], x["n"]))
    k = lambda key: num(c.get(f"quest_event_king_{key}"))
    rules = {
        "types": pairs(c.get("quest_event_king_itemtype_weights")), "premiumTypes": pairs(c.get("quest_event_king_itemtype_premium_weights")),
        "cats": pairs(c.get("quest_event_king_itemcategory_weights")), "premiumCats": pairs(c.get("quest_event_king_itemcategory_premium_weights")),
        "slots": [k("slot1_cycle"), k("slot2_cycle"), k("slot3_cycle")], "hot": k("hotitem_cycle"), "usedReset": k("used_list_reset"),
        "q": [1, k("uncommon_mult"), k("flawless_mult"), k("epic_mult"), k("legd_mult")],
        "freePack": c.get("quest_event_king_free_pack_content"), "freePackCycle": k("free_pack_cycle"),
        "shop": {"max": k("antique_shard_shop_max_item"), "vip": k("antique_shard_shop_vip_slot"), "minTier0": k("antique_shard_shop_min_tier_slot_0"),
                 "price": k("antique_shard_shop_default_price"), "reroll": k("antique_shard_shop_reroll_cost"), "minLevel": k("antique_shard_minimum_user_level"),
                 "cycle": k("antique_shard_shop_cycle"), "delay": delay_def, "sameRes": num(c.get("quest_event_king_same_resource_weight_mult"))},
        "info": clean(T.get("quest_event_king_caprices_info_text")), "name": T.first("kings_caprice_name", "kings_caprice", default="King's Caprice"),
    }
    trophies = [{"u": f"tkctrophy{m}1", "n": T.get(f"tkctrophy{m}1_name", m)} for m in ("bronze", "silver", "gold")]
    icons |= {t["u"] for t in trophies} | {"antique_shard", "icon_event_reward_dialog"}
    return {"rules": rules, "shop": shop, "trophies": trophies}, icons


SECTIONS["events"] = build_events

from .extras import build_calendar, build_eventrewards, build_misc, build_passes, build_stories  # noqa: E402

SECTIONS["passes"] = build_passes
SECTIONS["eventrewards"] = build_eventrewards
SECTIONS["misc"] = build_misc
SECTIONS["stories"] = build_stories
SECTIONS["calendar"] = build_calendar
