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
