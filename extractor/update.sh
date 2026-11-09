#!/usr/bin/env bash
# Atualização automática do Portal Shop Titans numa VPS Linux.
#  1. SteamCMD baixa/atualiza o Shop Titans (versão Windows, que é a que o extrator lê)
#  2. se o build mudou (ou FORCE=1), roda o extrator
#  3. publica: copia site/ para WEB_ROOT (Caddy/Nginx) e/ou faz commit + push (GitHub Pages)
# Variáveis (arquivo /etc/default/shoptitans ou ambiente):
#   STEAM_USER   conta da Steam que tem o jogo (faça um login manual uma vez para o Steam Guard)
#   GAME_DIR     onde instalar o jogo           (padrão: /opt/shoptitans/game)
#   WEB_ROOT     pasta servida pelo servidor web (opcional)
#   GIT_PUSH=1   fazer commit e push do repositório (opcional)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
GAME_DIR="${GAME_DIR:-/opt/shoptitans/game}"
LOG="$HERE/update.log"
log() { echo "$(date '+%F %T')  $*" | tee -a "$LOG"; }

[ -n "${STEAM_USER:-}" ] || { log "defina STEAM_USER"; exit 1; }
STEAMCMD="$(command -v steamcmd || echo /usr/games/steamcmd)"
log "atualizando o jogo com SteamCMD"
"$STEAMCMD" +@sSteamCmdForcePlatformType windows +force_install_dir "$GAME_DIR" +login "$STEAM_USER" +app_update 1258080 +quit >>"$LOG" 2>&1 || { log "SteamCMD falhou"; exit 1; }

MANIFEST="$GAME_DIR/steamapps/appmanifest_1258080.acf"
BUILD="$(grep -oP '"buildid"\s+"\K[0-9]+' "$MANIFEST" || true)"
LAST="$(cat "$HERE/.last_build" 2>/dev/null || true)"
if [ "$BUILD" = "$LAST" ] && [ "${FORCE:-0}" != "1" ]; then log "build $BUILD já extraído"; exit 0; fi

PY="$HERE/.venv/bin/python"
if [ ! -x "$PY" ]; then
  log "criando ambiente Python"
  python3 -m venv "$HERE/.venv"
  "$HERE/.venv/bin/pip" install -q -r "$HERE/requirements.txt"
fi
log "extraindo build $BUILD (anterior: ${LAST:-nenhum})"
"$PY" -I "$HERE/extract.py" --game "$GAME_DIR" >>"$LOG" 2>&1 || { log "extrator falhou"; exit 1; }
echo "$BUILD" > "$HERE/.last_build"

if [ -n "${WEB_ROOT:-}" ]; then
  rsync -a --delete "$ROOT/site/" "$WEB_ROOT/" && log "site copiado para $WEB_ROOT"
fi
if [ "${GIT_PUSH:-0}" = "1" ] && [ -d "$ROOT/.git" ]; then
  cd "$ROOT"
  git add -A
  if ! git diff --cached --quiet; then
    git commit -q -m "Dados do jogo: build $BUILD" && git push -q && log "enviado para o GitHub"
  fi
fi
log "pronto"
