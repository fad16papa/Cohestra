#!/usr/bin/env bash
# DNS-01 wildcard TLS with OWNER-INTERACTIVE certbot (no auth hook).
# Use when automated hooks see public DNS but Let's Encrypt still fails.
#
# Usage (as deploy, from /home/deploy/cohestra):
#   export LETSENCRYPT_EMAIL='you@domain.com'
#   bash deploy/host-proxy/apply-additive-tls-wildcard-interactive.sh
#
# Certbot will print TXT instructions and wait for Enter after you add DNS.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/host-proxy/cohestra-uat-server-names.sh
source "$ROOT_DIR/deploy/host-proxy/cohestra-uat-server-names.sh"

EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
HOST_NAME="$COHESTRA_UAT_PLATFORM_HOST"
HTTP_EXAMPLE="$ROOT_DIR/deploy/host-proxy/cohestra-uat.nginx.example.conf"
TLS_EXAMPLE="$ROOT_DIR/deploy/host-proxy/cohestra-uat.nginx.tls.example.conf"
CERT_VOL="${COHESTRA_EDGE_CERTBOT_CERTS_VOLUME:-lead-generation-crm_certbot_certs}"
TMP=$(mktemp)
PREV=$(mktemp)

cleanup() { rm -f "$TMP" "$PREV"; }
trap cleanup EXIT

if [[ "$(id -u)" -eq 0 && "${COHESTRA_ALLOW_ROOT:-}" != "1" ]]; then
  echo "REFUSE: run as deploy, not root." >&2
  exit 1
fi

install_conf() {
  local src="$1"
  docker cp "$src" "$EDGE_NGINX:/etc/nginx/conf.d/zz-cohestra-uat.conf"
  docker exec "$EDGE_NGINX" chmod 644 /etc/nginx/conf.d/zz-cohestra-uat.conf
  if ! docker exec "$EDGE_NGINX" nginx -t; then
    return 1
  fi
  docker exec "$EDGE_NGINX" nginx -s reload
  sleep 1
}

restore_previous_vhost() {
  if [[ -s "$PREV" ]]; then
    echo "Restoring previous zz-cohestra-uat.conf"
    install_conf "$PREV" || true
  fi
}

resolve_acme_email() {
  local found="${LETSENCRYPT_EMAIL:-}"
  if [[ -n "$found" && "$found" == *@* ]]; then
    printf '%s' "$found"
    return 0
  fi
  return 1
}

echo "== Phases 0–1b (same as automated script) =="
if ! bash "$ROOT_DIR/deploy/host-proxy/verify-existing-app.sh"; then
  exit 1
fi
if ! bash "$ROOT_DIR/deploy/host-proxy/apply-additive-vhost.sh"; then
  echo "REFUSE: HTTP vhost must pass before TLS" >&2
  exit 1
fi

email=""
if ! email=$(resolve_acme_email); then
  echo "REFUSE: export LETSENCRYPT_EMAIL in this shell only" >&2
  exit 1
fi

if docker exec "$EDGE_NGINX" test -f /etc/nginx/conf.d/zz-cohestra-uat.conf; then
  docker cp "$EDGE_NGINX:/etc/nginx/conf.d/zz-cohestra-uat.conf" "$PREV"
fi

echo ""
echo "== Phase 2: INTERACTIVE DNS-01 (certbot) =="
echo "Certbot will prompt for TXT at _acme-challenge.uat.cohestra.app"
echo "Verify before pressing Enter:"
echo "  bash deploy/host-proxy/verify-acme-txt.sh _acme-challenge.uat.cohestra.app 'TOKEN'"
echo "Authoritative NS must show the token (ns75/ns76), not only 8.8.8.8."
echo ""

if ! docker run -it --rm \
  -v "${CERT_VOL}:/etc/letsencrypt" \
  certbot/certbot:latest \
  certonly --manual --preferred-challenges dns \
  --cert-name "$HOST_NAME" \
  -d "$HOST_NAME" \
  -d "$COHESTRA_UAT_WILDCARD_HOST" \
  --agree-tos --force-renewal \
  --email "$email"; then
  restore_previous_vhost
  echo "INTERACTIVE WILDCARD TLS: FAIL — certbot did not complete" >&2
  exit 1
fi

echo ""
echo "== Phase 3–4: HTTPS vhost + proof =="
exec bash "$ROOT_DIR/deploy/host-proxy/install-cohestra-uat-https-vhost.sh"
