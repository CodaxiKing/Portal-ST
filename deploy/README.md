# Portal Shop Titans numa VPS (Debian/Ubuntu)

Requisitos: ~15 GB de disco, 2 GB de RAM. O jogo é baixado pelo SteamCMD (versão Windows, que é a que o extrator lê).

```bash
# 1. pacotes
sudo dpkg --add-architecture i386 && sudo apt update
sudo apt install -y steamcmd python3-venv git rsync fonts-dejavu caddy

# 2. usuário e código
sudo useradd -m -d /opt/shoptitans shoptitans
sudo -u shoptitans git clone <seu-repositorio> /opt/shoptitans/portal

# 3. primeiro login na Steam (uma vez; o Steam Guard pede o código só agora)
sudo -u shoptitans steamcmd +login SUA_CONTA +quit

# 4. configuração
sudo cp /opt/shoptitans/portal/deploy/shoptitans.env.example /etc/default/shoptitans   # edite
sudo mkdir -p /var/www/shoptitans && sudo chown shoptitans /var/www/shoptitans

# 5. primeira extração (demora alguns minutos)
sudo -u shoptitans env $(cat /etc/default/shoptitans | xargs) FORCE=1 /opt/shoptitans/portal/extractor/update.sh

# 6. agendamento (a cada 6 h) e servidor web
sudo cp /opt/shoptitans/portal/deploy/shoptitans-update.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now shoptitans-update.timer
sudo cp /opt/shoptitans/portal/deploy/Caddyfile.example /etc/caddy/Caddyfile   # troque o domínio
sudo systemctl reload caddy
```

Recomendação: use uma conta da Steam só para isso (o jogo é grátis), porque a sessão fica salva no servidor.
Aviso no Discord: coloque `"discordWebhook": "https://discord.com/api/webhooks/..."` em `extractor/config.json`.
