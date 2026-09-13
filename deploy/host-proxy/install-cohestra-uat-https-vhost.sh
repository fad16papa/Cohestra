#!/usr/bin/env bash
# Install zz-cohestra-uat.conf HTTPS vhost when wildcard cert already exists.
# Usage (as deploy): bash deploy/host-proxy/install-cohestra-uat-https-vhost.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/host-proxy/cohestra-uat-server-names.sh
source "$ROOT_DIR/deploy/host-proxy/cohestra-uat-server-names.sh"

EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
HOST_NAME="$COHESTRA_UAT_PLATFORM_HOST"
TLS_EXAMPLE="$ROOT_DIR/deploy/host-proxy/cohestra-uat.nginx.tls.example.conf"
CERT_VOL="${COHESTRA_EDGE_CERTBOT_CERTS_VOLUME:-lead-generation-crm_certbot_certs}"
TMP=$(mktemp)
PREV=$(mktemp)

cleanup() { rm -f "$TMP" "$PREV"; }
trap cleanup EXIT

acme_certs_sh() {
  docker run --rm --entrypoint sh \
    -v "${CERT_VOL}:/etc/letsencrypt" \
    certbot/certbot:latest \
    -c "$1"
}

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

if docker exec "$EDGE_NGINX" test -f /etc/nginx/conf.d/zz-cohestra-uat.conf; then
  docker cp "$EDGE_NGINX:/etc/nginx/conf.d/zz-cohestra-uat.conf" "$PREV"
fi

sans=$(acme_certs_sh "openssl x509 -in /etc/letsencrypt/live/${HOST_NAME}/fullchain.pem -noout -ext subjectAltName 2>/dev/null || true")
echo "certificate_sans=${sans:-MISSING}"
if ! echo "$sans" | grep -q "DNS:${HOST_NAME}"; then
  echo "REFUSE: certificate missing SAN ${HOST_NAME}" >&2
  exit 1
fi
if ! echo "$sans" | grep -q 'DNS:\*.uat.cohestra.app'; then
  echo "REFUSE: certificate missing SAN *.uat.cohestra.app" >&2
  exit 1
fi

render_cohestra_uat_nginx "$TLS_EXAMPLE" "$TMP"
if ! install_conf "$TMP"; then
  if [[ -s "$PREV" ]]; then
    install_conf "$PREV" || true
  fi
  exit 1
fi

if ! bash "$ROOT_DIR/deploy/host-proxy/prove-edge-tls-wildcard.sh"; then
  if [[ -s "$PREV" ]]; then
    install_conf "$PREV" || true
  fi
  exit 1
fi

echo "STORY 19.2 WILDCARD TLS: PASS (live edge)"
