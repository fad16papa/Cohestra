#!/usr/bin/env bash
set -euo pipefail

# Regenerate active-ssl.conf from .env HTTPS_DOMAIN and reload nginx.
# Use when the app works with curl -k but browsers show certificate errors
# (nginx still serving an old cert after switch-https-domain.sh).
#
# Usage:
#   bash deploy/fix-nginx-ssl.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
COMPOSE=(docker compose -f docker-compose.uat.yml --profile tools)

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  if [[ "${PUBLIC_BASE_URL:-}" =~ ^https?://([^/]+) ]]; then
    DOMAIN="${BASH_REMATCH[1]}"
  else
    DOMAIN="${HTTPS_DOMAIN:-}"
  fi
fi
if [[ -z "$DOMAIN" ]]; then
  echo "ERROR: Set HTTPS_DOMAIN in .env (e.g. thesocialcollectivesg.com)."
  exit 1
fi

SSL_CONF="./deploy/nginx/active-ssl.conf"
echo "Regenerating ${SSL_CONF} for ${DOMAIN}..."
sed "s/__DOMAIN__/${DOMAIN}/g" deploy/nginx/app-ssl.conf.template > "$SSL_CONF"

update_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    echo "${key}=${value}" >> .env
  fi
}

update_env "HTTPS_DOMAIN" "$DOMAIN"
update_env "NGINX_CONFIG_PATH" "$SSL_CONF"
update_env "PUBLIC_BASE_URL" "https://${DOMAIN}"

set -a
source .env
set +a

echo "Recreating nginx with updated SSL config..."
"${COMPOSE[@]}" up -d --force-recreate nginx
"${COMPOSE[@]}" exec nginx nginx -t
"${COMPOSE[@]}" exec nginx nginx -s reload

echo ""
echo "Checking certificate files for ${DOMAIN}..."
if ! "${COMPOSE[@]}" run --rm --entrypoint test certbot \
  -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"; then
  echo "WARNING: No cert at /etc/letsencrypt/live/${DOMAIN}/"
  echo "Re-run: bash deploy/switch-https-domain.sh ${DOMAIN}"
  exit 1
fi
echo "Cert files present in volume."

sleep 2
curl -fsS "https://${DOMAIN}/ready" | head -c 200 || {
  echo ""
  echo "ERROR: HTTPS check failed. Inspect: docker compose -f docker-compose.uat.yml logs nginx --tail 50"
  exit 1
}
echo ""
echo "Done. https://${DOMAIN} should show a valid certificate."
