#!/usr/bin/env bash
set -euo pipefail

# Obtain Let's Encrypt certificate via nip.io (or HTTPS_DOMAIN) and enable HTTPS.
# Safe for existing deploys — does not remove database or app volumes.
#
# Prerequisites:
#   - Stack already running (or will be started)
#   - Port 80 reachable from the internet (DigitalOcean firewall)
#   - LETSENCRYPT_EMAIL set in .env
#
# Usage (on droplet):
#   cd ~/lead-generation-crm
#   # Add to .env: LETSENCRYPT_EMAIL=you@example.com
#   bash deploy/setup-temporary-https.sh
#
# Optional overrides in .env:
#   DROPLET_IP=129.212.235.2
#   HTTPS_DOMAIN=129-212-235-2.nip.io

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
COMPOSE=(docker compose -f docker-compose.uat.yml --profile tools)

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.uat.example to .env first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "ERROR: Set LETSENCRYPT_EMAIL=your@email.com in .env (Let's Encrypt requires it)."
  exit 1
fi

detect_public_ip() {
  curl -fsS --max-time 5 ifconfig.me 2>/dev/null || true
}

DROPLET_IP="${DROPLET_IP:-$(detect_public_ip)}"
if [[ -z "$DROPLET_IP" ]]; then
  echo "ERROR: Could not detect public IP. Set DROPLET_IP in .env."
  exit 1
fi

HTTPS_DOMAIN="${HTTPS_DOMAIN:-${DROPLET_IP//./-}.nip.io}"
PUBLIC_BASE_URL="https://${HTTPS_DOMAIN}"
SSL_CONF="./deploy/nginx/active-ssl.conf"

echo "== Temporary HTTPS setup =="
echo "Public IP:     $DROPLET_IP"
echo "HTTPS domain:  $HTTPS_DOMAIN"
echo "PUBLIC_BASE_URL: $PUBLIC_BASE_URL"
echo ""

update_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    echo "${key}=${value}" >> .env
  fi
}

echo "== Step 1: HTTP nginx + ACME webroot =="
update_env "NGINX_CONFIG_PATH" "./deploy/nginx/app.conf"
"${COMPOSE[@]}" up -d nginx

echo ""
echo "== Step 2: Let's Encrypt certificate =="
"${COMPOSE[@]}" run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$HTTPS_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

echo ""
echo "== Step 3: Enable HTTPS nginx config =="
sed "s/__DOMAIN__/${HTTPS_DOMAIN}/g" deploy/nginx/app-ssl.conf.template > "$SSL_CONF"
update_env "HTTPS_DOMAIN" "$HTTPS_DOMAIN"
update_env "DROPLET_IP" "$DROPLET_IP"
update_env "PUBLIC_BASE_URL" "$PUBLIC_BASE_URL"
update_env "NGINX_CONFIG_PATH" "$SSL_CONF"

echo ""
echo "== Step 4: Rebuild web + API (PUBLIC_BASE_URL / CORS) and reload nginx =="
set -a
source .env
set +a
"${COMPOSE[@]}" up -d --build web api
"${COMPOSE[@]}" up -d --force-recreate nginx
"${COMPOSE[@]}" exec nginx nginx -t
"${COMPOSE[@]}" exec nginx nginx -s reload

echo ""
echo "== Step 5: Smoke check =="
sleep 5
curl -fsS "${PUBLIC_BASE_URL}/ready" | head -c 200 || true
echo ""

echo ""
echo "HTTPS is live: ${PUBLIC_BASE_URL}"
echo ""
echo "Use this URL in the browser (not the raw IP over HTTP)."
echo "Certificate renewal: bash deploy/renew-letsencrypt.sh"
echo "When client DNS is ready: bash deploy/switch-https-domain.sh NEW_DOMAIN"
