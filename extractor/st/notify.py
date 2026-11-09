"""Aviso de patch no Discord: quando a extração encontra mudanças novas nos itens, posta um resumo num webhook.

Configure em extractor/config.json:  { "discordWebhook": "https://discord.com/api/webhooks/...", "baseUrl": "https://..." }
Só envia uma vez por retrato de dados (guarda o último hash avisado em extractor/.last_notified).
"""
import json
import os
import urllib.request

from .common import log


def notify_patch(here, cfg, diff, version, items_pt):
    url = (cfg or {}).get("discordWebhook")
    if not url or not diff.get("from"):
        return
    if not (diff.get("added") or diff.get("removed") or diff.get("changed")):
        return
    sig = f"{diff['from'].get('version')}->{diff['to'].get('version')}:{len(diff['added'])}/{len(diff['removed'])}/{len(diff['changed'])}"
    state = os.path.join(here, ".last_notified")
    try:
        if open(state, encoding="utf-8").read().strip() == sig:
            return
    except OSError:
        pass
    name = lambda x: (x.get("names") or {}).get("pt") or (x.get("names") or {}).get("en") or x.get("uid")
    base = (cfg.get("baseUrl") or "").rstrip("/")
    lines = [f"**Portal Shop Titans — dados atualizados para {version}**",
             f"Itens novos: **{len(diff['added'])}** · removidos: **{len(diff['removed'])}** · alterados: **{len(diff['changed'])}**"]
    if diff["added"]:
        lines.append("Novos: " + ", ".join(f"{name(x)} (T{x.get('tier')})" for x in diff["added"][:12]) + (" …" if len(diff["added"]) > 12 else ""))
    if diff["changed"]:
        lines.append("Alterados: " + ", ".join(name(x) for x in diff["changed"][:10]) + (" …" if len(diff["changed"]) > 10 else ""))
    if base:
        lines.append(f"{base}/index.html#/novidades")
    body = json.dumps({"content": "\n".join(lines)[:1900], "username": "Portal Shop Titans"}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "User-Agent": "shoptitans-portal-extractor"})
    try:
        urllib.request.urlopen(req, timeout=15).read()
        open(state, "w", encoding="utf-8").write(sig)
        log("aviso enviado ao Discord")
    except Exception as e:  # noqa: BLE001 — o aviso nunca deve derrubar a extração
        log("aviso ao Discord falhou:", e)


def _post(url, text):
    body = json.dumps({"content": text[:1900], "username": "Portal Shop Titans"}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "User-Agent": "shoptitans-portal-extractor"})
    urllib.request.urlopen(req, timeout=15).read()


def event_news(here, calendar, items, today):
    """Compara com o que já foi visto (extractor/.seen_events.json): eventos de login novos e itens "Em breve"
    que apareceram nos arquivos. Na primeira execução só grava o estado. Devolve as linhas da mensagem (ou [])."""
    state = os.path.join(here, ".seen_events.json")
    logins = {g["id"]: g for g in (calendar or {}).get("logins") or []}
    soon = {i["uid"]: i for i in (items or {}).get("items") or []
            if i.get("releaseAt") and str(i["releaseAt"])[:10] > today and str(i["releaseAt"])[:4] < "2090"}
    try:
        seen = json.load(open(state, encoding="utf-8"))
    except (OSError, ValueError):
        seen = None
    json.dump({"logins": sorted(logins), "soon": sorted(set(soon) | set((seen or {}).get("soon") or []))},
              open(state, "w", encoding="utf-8"))
    if seen is None:
        return []
    new_logins = [g for k, g in logins.items() if k not in set(seen.get("logins") or [])]
    new_soon = sorted((i for k, i in soon.items() if k not in set(seen.get("soon") or [])), key=lambda i: str(i["releaseAt"]))
    lines = []
    for g in new_logins:
        lines.append(f"📅 Novo evento de login nos arquivos: **{g['n']}** ({len(g.get('days') or [])} dias, criado em {g['d']})")
    if new_soon:
        by_day = {}
        for i in new_soon:
            by_day.setdefault(str(i["releaseAt"])[:10], []).append(i["name"])
        for d, names in list(by_day.items())[:8]:
            lines.append(f"🆕 {d}: " + ", ".join(names[:8]) + (" …" if len(names) > 8 else ""))
    return lines


def notify_events(here, cfg, calendar, items, today):
    lines = event_news(here, calendar, items, today)
    if not lines:
        return
    log("novidades de eventos:", len(lines))
    url = (cfg or {}).get("discordWebhook")
    if not url:
        return
    base = (cfg.get("baseUrl") or "").rstrip("/")
    text = "**Portal Shop Titans — novidades no calendário**\n" + "\n".join(lines) + (f"\n{base}/index.html#/calendario" if base else "")
    try:
        _post(url, text)
        log("aviso de eventos enviado ao Discord")
    except Exception as e:  # noqa: BLE001
        log("aviso de eventos ao Discord falhou:", e)
