#!/usr/bin/env bash
# Issue or expand a Let's Encrypt certificate for:
#   uat.cohestra.app
#   *.uat.cohestra.app
# using DNS-01 (required for wildcard). Updates zz-cohestra-uat.conf only.
#
# Does NOT edit active-ssl.conf or the existing site certificate.
# Does NOT compose up lead-generation-crm.
#
# Usage (as deploy, after HTTP EDGE VHOST PROOF: PASS):
#   bash deploy/host-proxy/apply-additive-tls-wildcard.sh
#
# Owner gate: when certbot requests DNS TXT records, the script prints exact
# _acme-challenge.uat.cohestra.app values and waits for public DNS propagation
# before continuing. Add records in GoDaddy; do not paste secrets into chat.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/host-proxy/cohestra-uat-server-names.sh
source "$ROOT_DIR/deploy/host-proxy/cohestra-uat-server-names.sh"

EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
ALIAS="${COHESTRA_EDGE_ALIAS:-cohestra-uat-nginx}"
HOST_NAME="$COHESTRA_UAT_PLATFORM_HOST"
HTTP_EXAMPLE="$ROOT_DIR/deploy/host-proxy/cohestra-uat.nginx.example.conf"
TLS_EXAMPLE="$ROOT_DIR/deploy/host-proxy/cohestra-uat.nginx.tls.example.conf"
CERT_WWW_VOL="${COHESTRA_EDGE_CERTBOT_WWW_VOLUME:-lead-generation-crm_certbot_www}"
CERT_VOL="${COHESTRA_EDGE_CERTBOT_CERTS_VOLUME:-lead-generation-crm_certbot_certs}"
TMP=$(mktemp)
PREV=$(mktemp)
AUTH_HOOK="$ROOT_DIR/deploy/host-proxy/certbot-dns01-auth-hook.sh"
CLEANUP_HOOK="$ROOT_DIR/deploy/host-proxy/certbot-dns01-cleanup-hook.sh"

cleanup() { rm -f "$TMP" "$PREV"; }
trap cleanup EXIT

if [[ "$(id -u)" -eq 0 && "${COHESTRA_ALLOW_ROOT:-}" != "1" ]]; then
  echo "REFUSE: run as deploy, not root. sudo -iu deploy" >&2
  exit 1
fi
if [[ "$HOST_NAME" != "uat.cohestra.app" ]]; then
  echo "REFUSE: locked UAT hostname is uat.cohestra.app" >&2
  exit 1
fi

for f in "$HTTP_EXAMPLE" "$TLS_EXAMPLE"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing $f" >&2
    exit 1
  fi
done
if ! docker inspect "$EDGE_NGINX" >/dev/null 2>&1; then
  echo "REFUSE: $EDGE_NGINX not found" >&2
  exit 1
fi
if ! docker inspect "$ALIAS" >/dev/null 2>&1; then
  echo "REFUSE: $ALIAS is not running" >&2
  exit 1
fi
if ! docker volume inspect "$CERT_VOL" >/dev/null 2>&1; then
  echo "REFUSE: cert volume missing" >&2
  exit 1
fi

acme_certs_sh() {
  docker run --rm --entrypoint sh \
    -v "${CERT_VOL}:/etc/letsencrypt" \
    certbot/certbot:latest \
    -c "$1"
}

resolve_acme_email() {
  local found="${LETSENCRYPT_EMAIL:-}"
  if [[ -n "$found" && "$found" == *@* ]]; then
    printf '%s' "$found"
    return 0
  fi
  found=$(acme_certs_sh '
    set +e
    for f in /etc/letsencrypt/renewal/*.conf; do
      [ -f "$f" ] || continue
      line=$(grep -E "^(pref_)?email[[:space:]]*=" "$f" 2>/dev/null | head -1)
      if [ -n "$line" ]; then
        echo "$line" | cut -d= -f2 | tr -d "[:space:]"
        exit 0
      fi
    done
    if [ -d /etc/letsencrypt/accounts ]; then
      mailto=$(grep -rho "mailto:[^\"[:space:]]*" /etc/letsencrypt/accounts 2>/dev/null | head -1)
      echo "${mailto#mailto:}"
    fi
  ' || true)
  if [[ -n "$found" && "$found" == *@* ]]; then
    printf '%s' "$found"
    return 0
  fi
  return 1
}

install_conf() {
  local src="$1"
  docker cp "$src" "$EDGE_NGINX:/etc/nginx/conf.d/zz-cohestra-uat.conf"
  docker exec "$EDGE_NGINX" chmod 644 /etc/nginx/conf.d/zz-cohestra-uat.conf
  if ! docker exec "$EDGE_NGINX" nginx -t; then
    echo "nginx -t FAILED. Not reloading." >&2
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

if [[ ! -x "$AUTH_HOOK" || ! -x "$CLEANUP_HOOK" ]]; then
  echo "REFUSE: certbot DNS hook scripts missing or not executable" >&2
  exit 1
fi

echo "== Phase 0: existing app baseline =="
if ! bash "$ROOT_DIR/deploy/host-proxy/verify-existing-app.sh"; then
  echo "STORY 19.2 WILDCARD TLS: FAIL — existing app baseline" >&2
  exit 1
fi
echo "EXISTING APP PRE-TLS BASELINE: PASS"

echo ""
echo "== Phase 1: HTTP vhost with platform + tenant server_name =="
render_cohestra_uat_nginx "$HTTP_EXAMPLE" "$TMP"
if grep -q 'thesocialcollectivesg.com' "$TMP" || grep -qE '127\.0\.0\.1:8180' "$TMP"; then
  echo "REFUSE: HTTP vhost mentions existing hostname or loopback" >&2
  exit 1
fi
if docker exec "$EDGE_NGINX" test -f /etc/nginx/conf.d/zz-cohestra-uat.conf; then
  docker cp "$EDGE_NGINX:/etc/nginx/conf.d/zz-cohestra-uat.conf" "$PREV"
fi
if ! install_conf "$TMP"; then
  restore_previous_vhost
  echo "ADDITIVE WILDCARD TLS: FAIL at HTTP install" >&2
  exit 1
fi

echo ""
echo "== Phase 1b: HTTP host routing (platform + tenant) =="
if ! bash "$ROOT_DIR/deploy/host-proxy/prove-edge-vhost.sh"; then
  restore_previous_vhost
  echo "ADDITIVE WILDCARD TLS: FAIL — HTTP host routing before DNS-01" >&2
  exit 1
fi

echo ""
echo "== Phase 2: DNS-01 certificate (uat + wildcard) =="
email=""
if ! email=$(resolve_acme_email); then
  echo "REFUSE: set LETSENCRYPT_EMAIL in this shell only, then re-run." >&2
  exit 1
fi
echo "certbot_email=SET"
echo "certbot_domains=${HOST_NAME} ${COHESTRA_UAT_WILDCARD_HOST}"
echo "certbot_method=DNS-01"
echo "certbot_volumes=${CERT_VOL}"

docker pull certbot/certbot:latest

if ! docker run --rm \
  -v "${CERT_VOL}:/etc/letsencrypt" \
  -v "${ROOT_DIR}/deploy/host-proxy/certbot-dns01-auth-hook.sh:/usr/local/bin/cohestra-dns-auth:ro" \
  -v "${ROOT_DIR}/deploy/host-proxy/certbot-dns01-cleanup-hook.sh:/usr/local/bin/cohestra-dns-cleanup:ro" \
  certbot/certbot:latest \
  certonly --manual --preferred-challenges dns \
  --cert-name "$HOST_NAME" \
  -d "$HOST_NAME" \
  -d "$COHESTRA_UAT_WILDCARD_HOST" \
  --non-interactive --agree-tos --keep-until-expiring \
  --manual-public-ip-logging-ok \
  --email "$email" \
  --manual-auth-hook /usr/local/bin/cohestra-dns-auth \
  --manual-cleanup-hook /usr/local/bin/cohestra-dns-cleanup; then
  restore_previous_vhost
  echo "ADDITIVE WILDCARD TLS: FAIL — certbot DNS-01 did not complete" >&2
  exit 1
fi

sans=$(acme_certs_sh "openssl x509 -in /etc/letsencrypt/live/${HOST_NAME}/fullchain.pem -noout -ext subjectAltName 2>/dev/null || true")
echo "certificate_sans=${sans:-MISSING}"
if ! echo "$sans" | grep -q "DNS:${HOST_NAME}"; then
  restore_previous_vhost
  echo "REFUSE: certificate missing SAN ${HOST_NAME}" >&2
  exit 1
fi
if ! echo "$sans" | grep -q 'DNS:\*.uat.cohestra.app'; then
  restore_previous_vhost
  echo "REFUSE: certificate missing SAN *.uat.cohestra.app" >&2
  exit 1
fi
echo "CERT SAN: uat.cohestra.app — PASS"
echo "CERT SAN: *.uat.cohestra.app — PASS"

echo ""
echo "== Phase 3: additive HTTPS vhost =="
render_cohestra_uat_nginx "$TLS_EXAMPLE" "$TMP"
if ! grep -q "/etc/letsencrypt/live/${HOST_NAME}/fullchain.pem" "$TMP"; then
  echo "REFUSE: TLS vhost cert path is not ${HOST_NAME}" >&2
  exit 1
fi
if ! install_conf "$TMP"; then
  restore_previous_vhost
  exit 1
fi

echo ""
echo "== Phase 4: edge TLS proof =="
if ! bash "$ROOT_DIR/deploy/host-proxy/prove-edge-tls-wildcard.sh"; then
  restore_previous_vhost
  echo "ADDITIVE WILDCARD TLS: FAIL — proof script" >&2
  exit 1
fi

echo ""
echo "STORY 19.2 WILDCARD TLS: PASS (live edge)"
echo "CERTIFICATE RENEWAL: MANUAL-ACCEPTED — DNS-01 wildcard requires owner TXT action or future DNS provider automation."
echo "Next: bash deploy/host-proxy/flip-public-base-https.sh (if not already https)"
echo "Then: bash deploy/uat-compose.sh up -d --build web && bash deploy/uat-compose.sh up -d --no-deps api"
echo "Persist zz-cohestra-uat.conf: bash deploy/host-proxy/persist-cohestra-vhost.sh"
