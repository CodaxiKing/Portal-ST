"""Seções extras: passes de conteúdo, recompensas de eventos, quadro de recompensas, loja de gemas,
expansões, sorte (roleta, recompensas aleatórias, Lua Cheia), histórias dos campeões e skins."""
from .common import num, split, table_rows


def _reward(T, s):
    """'item:key_forest,3' | 'gems:60' | 'furniture:x' | 'customization:x' -> {k, id, q, n}"""
    if not s:
        return None
    kind, _, rest = str(s).partition(":")
    if not rest:
        return {"k": "raw", "id": kind, "q": 1, "n": kind}
    parts = rest.split(",")
    rid, qty = parts[0], num(parts[1]) if len(parts) > 1 else 1
    if kind in ("gems", "gold", "xp", "tokens"):
        return {"k": kind, "id": kind, "q": num(rid), "n": T.first(f"resource_{kind}", kind, default=kind)}
    name = T.first(f"{rid}_name", f"item_{rid}_name", f"custom_{rid}", f"customization_{rid}", f"worker_{rid}", f"resource_{rid}",
                   f"chest_{rid}_name", default=rid)
    return {"k": kind, "id": rid, "q": qty or 1, "n": name}


def build_passes(tables, T):
    tasks = {}
    for r in table_rows(tables, "battlePassTasks"):
        tasks.setdefault(r.get("event"), []).append({"family": r.get("family"), "tier": r.get("tier"), "type": r.get("taskType"),
                                                     "sub": r.get("taskSubType"), "goal": r.get("goal"), "pts": r.get("reward"),
                                                     "premium": bool(r.get("isPremium"))})
    fams = {}
    for r in table_rows(tables, "battlePassRewards"):
        f = r.get("rewardFamily")
        fams.setdefault(f, []).append({"i": r.get("index"), "pts": r.get("pointsReq"), "free": _reward(T, r.get("reward")),
                                       "prem": _reward(T, r.get("rewardBPO")), "feat": bool(r.get("isFeatured"))})
    passes = []
    icons = set()
    for f, rw in fams.items():
        rw.sort(key=lambda x: x["i"] or 0)
        for x in rw:
            for k in ("free", "prem"):
                if x[k]:
                    icons.add(x[k]["id"])
        passes.append({"id": f, "name": T.first(f"bpass_event_{f}_name", f"bpass_{f}_name", default=f), "rewards": rw,
                       "tasks": tasks.get(f, [])})
    passes.sort(key=lambda p: p["id"], reverse=True)

    return {"passes": passes, "community": _community(tables, T)}, icons


def build_eventrewards(tables, T):
    """Recompensas dos eventos de missão em formato compacto: dicionário de recompensas + linhas curtas."""
    icons = set()
    names = {}
    def ref(rw):
        if not rw:
            return None
        names[rw["id"]] = [rw["n"], rw["k"]]
        icons.add(rw["id"])
        return [rw["id"], rw["q"]]
    events = {}
    for r in table_rows(tables, "questEventRewards"):
        ev = r.get("quEvUid")
        fam = r.get("rewardFamily")
        e = events.setdefault(ev, {"id": ev, "families": {}})
        # linha: [índice, pontos, nível mínimo, recompensa, recompensa VIP]
        e["families"].setdefault(fam, []).append([r.get("index") or 0, r.get("cityReq") or 0, r.get("userReq") or 0,
                                                  ref(_reward(T, r.get("reward"))), ref(_reward(T, r.get("rewardVip")))])
    evname = {"tower": T.first("titantower_name", default="Tower"), "goldcity": T.first("goldcity_name", "fq_lcog_name", default="Gold City"),
              "king": T.first("king_name", "quest_event_king_name", "tkc_name", default="King"), "dragon": T.first("dragon_invasion_name", default="Dragon")}
    qev = []
    for ev, e in events.items():
        fams_out = []
        for fam, rows in e["families"].items():
            rows.sort(key=lambda x: x[0])
            fams_out.append({"id": fam, "rows": rows})
        fams_out.sort(key=lambda x: x["id"])
        qev.append({"id": ev, "name": evname.get(ev, ev), "families": fams_out})
    return {"events": qev, "names": names}, icons


def _community(tables, T):
    comm = {}
    for r in table_rows(tables, "communityEventsRewards"):
        f = r.get("family")
        c = comm.setdefault(f, {"id": f, "name": T.first(f"community_event_title_{f}", default=f), "rewards": [], "tasks": []})
        c["rewards"].append({"goal": r.get("goal"), "r": _reward(T, r.get("reward")), "alt": _reward(T, r.get("altReward"))})
    for r in table_rows(tables, "communityEventsTasks"):
        f = r.get("family")
        c = comm.setdefault(f, {"id": f, "name": T.first(f"community_event_title_{f}", default=f), "rewards": [], "tasks": []})
        c["tasks"].append({"type": r.get("taskType"), "sub": r.get("taskSubType"), "pts": num(r.get("points"))})
    return [c for c in comm.values() if not c["id"].startswith("sample")]


def build_misc(tables, T):
    icons = set()
    bounties = [{"id": r["uid"], "family": r.get("family"), "type": r.get("taskType"), "sub": r.get("taskSubType"),
                 "lvl": r.get("reqLevel"), "diff": r.get("difficulty"), "goal": r.get("recommendedGoal"), "reward": r.get("reward"),
                 "time": r.get("timeToComplete"), "guild": bool(r.get("isGuildBounty")), "premium": bool(r.get("isPremium"))}
                for r in table_rows(tables, "bounties")]
    store = []
    for r in table_rows(tables, "purchases"):
        it = [_reward(T, "item:" + x) for x in str(r.get("sitems") or "").split(";") if x]
        store.append({"id": r["uid"], "gems": num(r.get("gems")), "vip": num(r.get("vipGems")), "usd": num(r.get("usd")),
                      "gold": num(r.get("gold")), "items": [x for x in it if x], "sub": bool(r.get("isSub")), "days": r.get("days"),
                      "first": num(r.get("firstBonus")), "popular": bool(r.get("isPopular"))})
    exp = lambda name: [{"lvl": r.get("level"), "min": r.get("minLevel"), "gold": num(r.get("gold")), "gems": num(r.get("gems")),
                         "time": num(r.get("time")), "slots": r.get("vslots"), "vmax": r.get("vmax")} for r in table_rows(tables, name) if r.get("level")]
    luck = {
        "spin": [{"id": r["uid"], "odds": num(r.get("odds")), "tokens": r.get("tokens")} for r in table_rows(tables, "spinOdds")],
        "cats": [{"id": r["uid"], "feature": r.get("feature"), "type": r.get("type"), "odds": num(r.get("odds")), "quality": r.get("quality")}
                 for r in table_rows(tables, "randomCategories")],
        "items": [{"id": r["uid"], "item": r.get("item"), "name": (_reward(T, f"item:{r.get('item')}") or {}).get("n"), "type": r.get("type"),
                   "cats": split(r.get("categories")), "cost": num(r.get("cost")), "qty": num(r.get("qty")), "odds": num(r.get("odds"))}
                  for r in table_rows(tables, "randomItems")],
        "moon": [{"id": r["uid"], "lvl": r.get("level"), "result": (_reward(T, f"item:{r.get('result')}") or {}), "qty": r.get("resultQty"),
                  "time": r.get("craftTime"), "full": bool(r.get("isFullMoon")),
                  "comps": [{"id": r.get(f"comp{k}"), "type": r.get(f"comp{k}Type"), "q": r.get(f"comp{k}Qty"), "tier": r.get(f"comp{k}Tier"),
                             "n": T.first(f"{r.get(f'comp{k}')}_name", f"quality_{r.get(f'comp{k}')}", default=r.get(f"comp{k}"))}
                            for k in range(1, 6) if r.get(f"comp{k}")]} for r in table_rows(tables, "fullMoon")],
    }
    for x in luck["items"]:
        icons.add(x["item"])
    for x in luck["moon"]:
        icons.add(x["result"].get("id"))
    skins = {
        "hero": [{"id": r["uid"], "type": r.get("type"), "cat": r.get("category"), "gems": num(r.get("gemsPrice")), "gold": num(r.get("goldPrice")),
                  "shards": num(r.get("shardPrice")), "excl": r.get("excl"), "vip": bool(r.get("isVip")), "release": r.get("releaseAt"),
                  "n": T.first(f"customization_{r.get('type', '').lower()}_{r['uid']}", f"customization_{r['uid']}", f"{r['uid']}_name", default=None)}
                 for r in table_rows(tables, "customizations") if str(r.get("type", "")).startswith("item") and not r.get("prohibited")],
        "furniture": [{"id": r["uid"], "family": r.get("family"), "group": r.get("group"), "lvl": r.get("reqLevel"), "gold": num(r.get("gold")),
                       "gems": num(r.get("gems")), "shards": num(r.get("shardPrice")), "excl": r.get("excl"), "release": r.get("releaseAt"),
                       "n": T.first(f"fskin_{r['uid']}_name", f"{r['uid']}_name", default=None)} for r in table_rows(tables, "fskins")],
        "pets": [{"id": r["uid"], "pet": r.get("petUid"), "type": r.get("type"), "gold": num(r.get("goldPrice")), "gems": num(r.get("gemsPrice")),
                  "shards": num(r.get("shardPrice")), "excl": r.get("excl"), "progress": bool(r.get("progression"))}
                 for r in table_rows(tables, "petCust") if not r.get("prohibited")],
    }
    for k in ("hero", "furniture", "pets"):
        for x in skins[k]:
            icons.add(x["id"])
    return {"bounties": bounties, "store": store, "exp": {"shop": exp("expansions"), "vertical": exp("vexpansions"), "basement": exp("basement")},
            "luck": luck, "skins": skins, "boosts": [{"id": r["uid"], "max": r.get("max"), "cost": r.get("cost"), "dur": r.get("duration"),
                                                       "eff": num(r.get("effect"))} for r in table_rows(tables, "cityboosts")]}, icons


def build_stories(tables, T):
    dlg = {}
    for r in table_rows(tables, "dialogs"):
        uid = r["uid"]
        if not uid.startswith("story_"):
            continue
        parts = uid.split("_")  # story_<fam>_<chapter>_<line>
        if len(parts) < 4:
            continue
        key = "_".join(parts[1:-1])
        text = T.get(uid) or T.get(r.get("dialog") or "")
        if text:
            dlg.setdefault(key, []).append({"a": r.get("actor"), "t": text})
    fams = {}
    for r in table_rows(tables, "stories"):
        f = r.get("family")
        uid = r["uid"]
        ch = "_".join(uid.split("_")[:-1]) + "_" + uid.split("_")[-1]
        fams.setdefault(f, []).append({"id": uid, "i": r.get("index"), "title": T.first(f"story_{uid}_name", f"story_{uid}_title", default=None),
                                       "req": r.get("requirement"), "reward": _reward(T, r.get("reward")), "side": bool(r.get("isSide")),
                                       "lines": dlg.get(uid, [])})
    out = []
    for f, chs in fams.items():
        chs.sort(key=lambda x: x["i"] or 0)
        out.append({"id": f, "name": T.first(f"{f}_name", default=f), "chapters": chs})
    out.sort(key=lambda x: x["name"])
    return out, {f"icon_global_{x['id']}" for x in out} | {f"cc_{x['id']}" for x in out}


# ------------------------------------------------------------------ calendário (datas que estão nos arquivos)
def build_calendar(tables, T):
    """Datas de lançamento que não estão em outras seções (decorações, visuais de herói, mascotes)
    e os eventos de login (data de criação + recompensas por dia). Itens, móveis e skins vêm das próprias seções."""
    rel = []
    for kind in ("wall", "floor", "beam"):
        for r in table_rows(tables, f"{kind}Decorations"):
            if r.get("releaseAt") and not r.get("prohibited"):
                rel.append({"d": r["releaseAt"][:10], "k": "deco", "u": r["uid"],
                            "n": T.first(f"decoration_{kind}_{r['uid']}_name", default=r["uid"])})
    for r in table_rows(tables, "customizations"):
        if r.get("releaseAt") and not r.get("prohibited") and not str(r.get("type", "")).startswith("item"):
            rel.append({"d": r["releaseAt"][:10], "k": "look", "u": r["uid"],
                        "n": T.first(f"customization_{str(r.get('type', '')).lower()}_{r['uid']}", f"customization_{r['uid']}", default=r["uid"])})
    for uid, p in tables.get("pet", {}).items():
        if p.get("releaseAt") and not p.get("prohibited"):
            rel.append({"d": p["releaseAt"][:10], "k": "pet", "u": uid, "n": T.get(f"pet_family_{uid}", uid.capitalize())})
    fams = {}
    for r in tables.get("loginEvents", {}).values():
        f = r.get("family") or ""
        if f.startswith("test") or r.get("isPersonal"):
            continue
        g = fams.setdefault(f, {"id": f, "d": (r.get("dateCreated") or "")[:10], "n": T.first(f"login_event_{f}_title", default=f), "days": []})
        typ, _, rest = str(r.get("reward") or "").partition(":")
        rid, _, qty = rest.partition(",")
        g["days"].append({"n": r.get("rewardNum"), "t": typ, "id": rid, "q": num(qty) if qty else 1, "sp": bool(r.get("rewardSpecial"))})
    for g in fams.values():
        g["days"].sort(key=lambda x: x["n"] or 0)
    rel.sort(key=lambda x: (x["d"], x["k"], x["n"]))
    return {"releases": rel, "logins": sorted(fams.values(), key=lambda g: g["d"])}, set()
