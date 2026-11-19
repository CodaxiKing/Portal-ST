# Imagem do site estático (pasta site/) servida pelo Caddy.
# Usada pelo Coolify (Build Pack: Dockerfile, porta 80). O HTTPS fica por conta do proxy do Coolify.
FROM caddy:2-alpine

COPY deploy/Caddyfile.docker /etc/caddy/Caddyfile
COPY site/ /srv/

# 3000 é a porta padrão do "Ports Exposes" do Coolify; o Caddy atende nas duas para funcionar sem ajuste.
EXPOSE 80 3000

# /healthz responde 200 sem passar pelo bloqueio de robôs (que barra o User-Agent do wget).
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
	CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
