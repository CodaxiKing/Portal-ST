"""Guarda um retrato dos itens a cada extração e calcula o que mudou entre versões."""
import hashlib
import json
import os
from datetime import date

FIELDS = ("tier", "level", "value", "time", "xp", "favor")
STATS = ("atk", "def", "hp", "eva", "crit", "shieldHp")


def compact(items_by_lang):
    """{uid: {...}} com nomes em todos os idiomas e os campos comparáveis."""
    base = items_by_lang["pt"]["items"]
    names = {lang: {i["uid"]: i["name"] for i in d["items"]} for lang, d in items_by_lang.items()}
    out = {}
    for i in base:
        out[i["uid"]] = {
            "names": {lang: n.get(i["uid"]) for lang, n in names.items()},
            "type": i["type"], **{k: i[k] for k in FIELDS}, **{k: i["stats"][k] for k in STATS},
            "resources": {r["id"]: r["qty"] for r in i["resources"]},
            "components": {c["id"]: c["qty"] for c in i["components"]},
        }
    return out


def data_hash(snap):
    """Hash só dos dados comparáveis (sem os nomes), para que novos idiomas não criem retratos falsos."""
    core = {u: {k: v for k, v in x.items() if k != "names"} for u, x in snap.items()}
    return hashlib.sha1(json.dumps(core, sort_keys=True).encode()).hexdigest()[:10]


def save_and_diff(folder, items_by_lang, version):
    os.makedirs(folder, exist_ok=True)
    snap = compact(items_by_lang)
    digest = data_hash(snap)
    files = sorted(f for f in os.listdir(folder) if f.endswith(".json"))
    latest = None
    if files:
        with open(os.path.join(folder, files[-1]), encoding="utf-8") as f:
            latest = json.load(f)
    if latest and data_hash(latest["items"]) == digest:
        # mesmos dados: só atualiza nomes/versão no retrato mais recente
        latest.update({"hash": digest, "version": version, "items": snap})
        with open(os.path.join(folder, files[-1]), "w", encoding="utf-8") as f:
            json.dump(latest, f, ensure_ascii=False)
    else:
        name = f"{date.today().isoformat()}_{digest}.json"
        with open(os.path.join(folder, name), "w", encoding="utf-8") as f:
            json.dump({"hash": digest, "version": version, "date": date.today().isoformat(), "items": snap},
                      f, ensure_ascii=False)
        files.append(name)
    if len(files) < 2:
        return {"from": None, "to": {"version": version, "date": date.today().isoformat()},
                "added": [], "removed": [], "changed": []}
    with open(os.path.join(folder, files[-2]), encoding="utf-8") as f:
        old = json.load(f)
    with open(os.path.join(folder, files[-1]), encoding="utf-8") as f:
        new = json.load(f)
    a, b = old["items"], new["items"]
    changed = []
    for uid in sorted(set(a) & set(b)):
        diffs = []
        for k in FIELDS + STATS:
            if a[uid].get(k) != b[uid].get(k):
                diffs.append({"field": k, "old": a[uid].get(k), "new": b[uid].get(k)})
        for k in ("resources", "components"):
            if a[uid].get(k) != b[uid].get(k):
                diffs.append({"field": k, "old": a[uid].get(k), "new": b[uid].get(k)})
        if diffs:
            changed.append({"uid": uid, "names": b[uid]["names"], "diffs": diffs})
    return {
        "from": {"version": old.get("version"), "date": old.get("date")},
        "to": {"version": new.get("version"), "date": new.get("date")},
        "added": [{"uid": u, "names": b[u]["names"], "tier": b[u]["tier"], "type": b[u]["type"]}
                  for u in sorted(set(b) - set(a))],
        "removed": [{"uid": u, "names": a[u]["names"], "tier": a[u]["tier"], "type": a[u]["type"]}
                    for u in sorted(set(a) - set(b))],
        "changed": changed,
    }
