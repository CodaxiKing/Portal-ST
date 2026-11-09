"""Índice compacto para a busca global (Ctrl+K) do site.

Cada entrada: [tipo, nome, subtítulo, ícone, rota]. Tipos curtos para economizar bytes:
i=item, c=campeão, k=classe, s=habilidade, q=missão, b=baú, w=trabalhador, f=móvel, p=mascote, t=talento,
a=passe, h=história, n=skin, l=evento de login. As páginas do menu (g) são somadas no próprio site.
"""

from urllib.parse import quote


def build_search(items, sec):
    out = []
    types = items["types"]
    for i in items["items"]:
        ty = types.get(i["type"], {}).get("name") or i["type"]
        out.append(["i", i["name"], f"T{i['tier']} · {ty}", i["uid"], f"#/item/{i['uid']}"])
    for c in sec.get("champions") or []:
        out.append(["c", c["name"], c.get("className") or "", c.get("icon") or f"icon_global_{c['uid']}", f"#/campeoes/{c['uid']}"])
    for c in sec.get("classes") or []:
        out.append(["k", c["name"], c.get("typeName") or c.get("type") or "", c.get("icon") or "", f"#/classes/{c['uid']}"])
    skills = sec.get("skills") or []
    for s in skills:
        out.append(["s", s["name"], ", ".join(c["name"] for c in s.get("classes") or [])[:60], s.get("icon") or "",
                    f"#/habilidades?k={s['kind']}&q={quote(s['name'])}"])
    for z in sec.get("quests") or []:
        out.append(["q", z["name"], z.get("boss") or "", z.get("icon") or "", f"#/missoes/{z['id']}"])
    for b in sec.get("chests") or []:
        out.append(["b", b["name"], b.get("zoneName") or "", b.get("icon") or b["uid"], "#/baus"])
    w = sec.get("workers") or {}
    for x in w.get("workers") or []:
        out.append(["w", x["name"], x.get("npc") or "", x.get("icon") or "", f"#/trabalhadores/{x['uid']}"])
    for f in sec.get("furniture") or []:
        lv = f.get("levels") or [{}]
        out.append(["f", f["name"], f.get("type") or "", lv[-1].get("uid") or lv[0].get("uid") or "", f"#/moveis?t={f.get('type', '')}"])
    pets = sec.get("pets") or {}
    for p in pets.get("pets") or []:
        out.append(["p", p["name"], p.get("houseName") or "", p.get("icon") or "", "#/mascotes"])
    tree = sec.get("skilltree") or {}
    for t in tree.get("trees") or []:
        for n in t.get("nodes") or []:
            out.append(["t", n["title"], t["name"], n.get("icon") or "", "#/talentos"])
    for ps in (sec.get("passes") or {}).get("passes") or []:
        feat = next((r for r in ps.get("rewards") or [] if r.get("feat")), None)
        icon = ((feat or {}).get("prem") or {}).get("id") or ""
        out.append(["a", ps["name"], "", icon, f"#/passes?id={ps['id']}"])
    for st in sec.get("stories") or []:
        out.append(["h", st["name"], f"{len(st.get('chapters') or [])} cap.", f"icon_global_{st['id']}", f"#/historias/{st['id']}"])
    skins = (sec.get("misc") or {}).get("skins") or {}
    for k in ("hero", "furniture"):
        for x in skins.get(k) or []:
            if x.get("n"):
                out.append(["n", x["n"], (x.get("release") or "")[:10], x["id"], "#/skins"])
    for g in (sec.get("calendar") or {}).get("logins") or []:
        out.append(["l", g["n"], g["d"], "", f"#/calendario?m={g['d'][:7]}&d={g['d']}"])
    return out
