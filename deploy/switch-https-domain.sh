#!/usr/bin/env bash
set -euo pipefail

# Switch from nip.io (or old hostname) to client domain with a new Let's Encrypt cert.
# Does not wipe database or uploaded campaign assets.
#
# Usage:
#   bash deploy/switch-https-domain.sh uat.client.com you@client.com

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
COMPOSE=(docker compose -f docker-compose.uat.yml --profile tools)

NEW_DOMAIN="${1:-}"
NEW_EMAIL="${2:-${LETSENCRYPT_EMAIL:-}}"

if [[ -z "$NEW_DOMAIN" ]]; then
  echo "Usage: bash deploy/switch-https-domain.sh NEW_DOMAIN [LETSENCRYPT_EMAIL]"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

NEW_EMAIL="${NEW_EMAIL:-${LETSENCRYPT_EMAIL:-}}"
if [[ -z "$NEW_EMAIL" ]]; then
  echo "ERROR: Set LETSENCRYPT_EMAIL in .env or pass as second argument."
  exit 1
fi

update_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    echo "${key}=${value}" >> .env
  fi
}

echo "Switching HTTPS to: $NEW_DOMAIN"
echo "Ensure DNS A record for $NEW_DOMAIN points to this droplet before continuing."
read -r -p "Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo "== Step 1: HTTP nginx for ACME challenge =="
update_env "NGINX_CONFIG_PATH" "./deploy/nginx/app.conf"
set -a
source .env
set +a
"${COMPOSE[@]}" up -d --force-recreate nginx

echo ""
echo "== Step 2: Let's Encrypt certificate =="
"${COMPOSE[@]}" run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$NEW_DOMAIN" \
  --email "$NEW_EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

SSL_CONF="./deploy/nginx/active-ssl.conf"

echo ""
echo "== Step 3: Enable HTTPS nginx config =="
sed "s/__DOMAIN__/${NEW_DOMAIN}/g" deploy/nginx/app-ssl.conf.template > "$SSL_CONF"

update_env "HTTPS_DOMAIN" "$NEW_DOMAIN"
update_env "PUBLIC_BASE_URL" "https://${NEW_DOMAIN}"
update_env "NGINX_CONFIG_PATH" "$SSL_CONF"

set -a
source .env
set +a

echo ""
echo "== Step 4: Rebuild web + API and recreate nginx =="
"${COMPOSE[@]}" up -d --build web api
"${COMPOSE[@]}" up -d --force-recreate nginx
"${COMPOSE[@]}" exec nginx nginx -t
"${COMPOSE[@]}" exec nginx nginx -s reload

echo ""
echo "== Step 5: Smoke check =="
sleep 3
curl -fsS "https://${NEW_DOMAIN}/ready" | head -c 200 || {
  echo ""
  echo "WARNING: HTTPS check failed. If cert exists, try: bash deploy/fix-nginx-ssl.sh"
  exit 1
}
echo ""

echo "Done. App now at https://${NEW_DOMAIN}"
