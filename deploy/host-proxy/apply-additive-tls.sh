#!/usr/bin/env bash
# Issue a Let's Encrypt cert for uat.cohestra.app on the EXISTING edge
# nginx and add listen 443 to zz-cohestra-uat.conf only.
#
# Does not edit active-ssl.conf.
# Does not compose up lead-generation-crm.
# Does not use cohestra-uat-certbot or cohestra_uat_certbot_* volumes.
# Does not print the ACME email or private keys.
#
# Usage (as deploy, after HTTP EDGE VHOST PROOF: PASS):
#   COHESTRA_UAT_HOSTNAME=uat.cohestra.app bash deploy/host-proxy/apply-additive-tls.sh
#
# If this script prints REFUSE about ACME contact, set LETSENCRYPT_EMAIL in
# THIS shell only (do not paste the value into chat) and re-run.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
ALIAS="${COHESTRA_EDGE_ALIAS:-cohestra-uat-nginx}"
HOST_NAME="${COHESTRA_UAT_HOSTNAME:-}"
HTTP_EXAMPLE="$ROOT_DIR/deploy/host-proxy/cohestra-uat.nginx.example.conf"
TLS_EXAMPLE="$ROOT_DIR/deploy/host-proxy/cohestra-uat.nginx.tls.example.conf"
CERT_WWW_VOL="${COHESTRA_EDGE_CERTBOT_WWW_VOLUME:-lead-generation-crm_certbot_www}"
CERT_VOL="${COHESTRA_EDGE_CERTBOT_CERTS_VOLUME:-lead-generation-crm_certbot_certs}"
TMP=$(mktemp)
PREV=$(mktemp)

cleanup() { rm -f "$TMP" "$PREV"; }
trap cleanup EXIT

if [[ "$(id -u)" -eq 0 && "${COHESTRA_ALLOW_ROOT:-}" != "1" ]]; then
  echo "REFUSE: run as deploy, not root. sudo -iu deploy" >&2
  exit 1
fi
if [[ "$HOST_NAME" != "uat.cohestra.app" ]]; then
  echo "REFUSE: set COHESTRA_UAT_HOSTNAME=uat.cohestra.app (not apex, not the existing site)." >&2
  exit 1
fi
if [[ "$CERT_VOL" == *cohestra_uat* || "$CERT_WWW_VOL" == *cohestra_uat* ]]; then
  echo "REFUSE: ACME must use the existing edge certbot volumes, not cohestra_uat_certbot_*." >&2
  exit 1
fi
if [[ ! -f "$HTTP_EXAMPLE" || ! -f "$TLS_EXAMPLE" ]]; then
  echo "Missing HTTP or TLS nginx example" >&2
  exit 1
fi
if ! docker inspect "$EDGE_NGINX" >/dev/null 2>&1; then
  echo "REFUSE: $EDGE_NGINX not found" >&2
  exit 1
fi
if ! docker inspect "$ALIAS" >/dev/null 2>&1; then
  echo "REFUSE: $ALIAS is not running" >&2
  exit 1
fi
if ! docker volume inspect "$CERT_VOL" >/dev/null 2>&1 || ! docker volume inspect "$CERT_WWW_VOL" >/dev/null 2>&1; then
  echo "REFUSE: existing edge certbot volumes not found" >&2
  exit 1
fi

# Read ACME files from the existing certs volume (same mount certbot uses).
# Nginx may not expose accounts/ or renewal email. Never print the address.
acme_certs_sh() {
  docker run --rm --entrypoint sh \
    -v "${CERT_VOL}:/etc/letsencrypt" \
    certbot/certbot:latest \
    -c "$1"
}

# Newer certbot stores contact on the ACME account (mailto:), not ^email= in renewal.
# Also accept pref_email = in renewal files. Never print the resolved value.
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
  return 0
}

sed "s/server_name uat.example.com;/server_name ${HOST_NAME};/g" "$HTTP_EXAMPLE" > "$TMP"
if grep -q 'thesocialcollectivesg.com' "$TMP" || grep -qE '127\.0\.0\.1:8180' "$TMP"; then
  echo "REFUSE: HTTP vhost mentions existing hostname or host loopback" >&2
  exit 1
fi
if ! grep -q 'acme-challenge' "$TMP"; then
  echo "REFUSE: HTTP vhost missing ACME location" >&2
  exit 1
fi

echo "== Phase 1: HTTP vhost with ACME webroot =="
if docker exec "$EDGE_NGINX" test -f /etc/nginx/conf.d/zz-cohestra-uat.conf; then
  docker cp "$EDGE_NGINX:/etc/nginx/conf.d/zz-cohestra-uat.conf" "$PREV"
fi
if ! install_conf "$TMP"; then
  echo "ADDITIVE TLS: FAIL at HTTP+ACME install" >&2
  exit 1
fi

# Existing nginx mounts the ACME webroot read-only. Writes go through a
# throwaway certbot container on lead-generation-crm_certbot_www (rw).
acme_www_sh() {
  docker run --rm --entrypoint sh \
    -v "${CERT_WWW_VOL}:/var/www/certbot" \
    certbot/certbot:latest \
    -c "$1"
}

echo "== ACME HTTP-01 preflight =="
echo "certbot_image=certbot/certbot:latest (pull may take a minute)"
docker pull certbot/certbot:latest
TOKEN="cohestra-preflight-$(date +%s)"
acme_www_sh "mkdir -p /var/www/certbot/.well-known/acme-challenge && printf 'preflight-ok\n' > /var/www/certbot/.well-known/acme-challenge/${TOKEN}"
pre=$(curl -sS --connect-timeout 8 "http://${HOST_NAME}/.well-known/acme-challenge/${TOKEN}" || true)
acme_www_sh "rm -f /var/www/certbot/.well-known/acme-challenge/${TOKEN}"
if [[ "$(printf '%s' "$pre" | tr -d '\r\n')" != "preflight-ok" ]]; then
  echo "ADDITIVE TLS: FAIL — HTTP-01 webroot not reachable at http://${HOST_NAME}/.well-known/acme-challenge/" >&2
  echo "body_preview=$(printf '%s' "$pre" | tr -cd '[:print:]' | head -c 80)" >&2
  echo "Let's Encrypt would fail the same way. HTTP vhost left with ACME location." >&2
  exit 1
fi
echo "acme_http01_preflight=PASS"

echo "== Phase 2: Let's Encrypt for ${HOST_NAME} only =="
echo "acme_renewal_confs=$(acme_certs_sh 'ls /etc/letsencrypt/renewal 2>/dev/null | wc -l')"
echo "acme_account_jsons=$(acme_certs_sh 'find /etc/letsencrypt/accounts -name regr.json 2>/dev/null | wc -l')"
email=""
if ! email=$(resolve_acme_email); then
  echo "REFUSE: no ACME contact on the existing edge account." >&2
  echo "In THIS shell only (do not paste the value into chat):" >&2
  echo "  export LETSENCRYPT_EMAIL='you@your-domain'" >&2
  echo "Then re-run apply-additive-tls.sh" >&2
  exit 1
fi
echo "certbot_email=SET"
echo "certbot_volumes=${CERT_WWW_VOL} ${CERT_VOL}"
echo "certbot_name=${HOST_NAME}"

if ! docker run --rm \
  -v "${CERT_WWW_VOL}:/var/www/certbot" \
  -v "${CERT_VOL}:/etc/letsencrypt" \
  certbot/certbot:latest \
  certonly --webroot -w /var/www/certbot \
  --cert-name "$HOST_NAME" \
  -d "$HOST_NAME" \
  --preferred-challenges http \
  --non-interactive --agree-tos --keep-until-expiring \
  --email "$email"; then
  echo "ADDITIVE TLS: FAIL — certbot did not issue. HTTP vhost left with ACME location." >&2
  exit 1
fi
echo "certbot=ISSUED_OR_KEPT"
if ! docker exec "$EDGE_NGINX" test -f "/etc/letsencrypt/live/${HOST_NAME}/fullchain.pem"; then
  echo "REFUSE: cert file missing in $EDGE_NGINX after certbot" >&2
  exit 1
fi
if docker exec "$EDGE_NGINX" test -f /etc/letsencrypt/live/thesocialcollectivesg.com/fullchain.pem; then
  echo "existing_site_cert=present_untouched"
fi

echo "== Phase 3: additive HTTPS server_name =="
sed "s/server_name uat.example.com;/server_name ${HOST_NAME};/g" "$TLS_EXAMPLE" > "$TMP"
if grep -q 'thesocialcollectivesg.com' "$TMP" || grep -qE '127\.0\.0\.1:8180' "$TMP"; then
  echo "REFUSE: TLS vhost mentions existing hostname or host loopback" >&2
  exit 1
fi
if ! grep -q "/etc/letsencrypt/live/${HOST_NAME}/fullchain.pem" "$TMP"; then
  echo "REFUSE: TLS vhost cert path is not ${HOST_NAME}" >&2
  exit 1
fi
if ! install_conf "$TMP"; then
  echo "nginx -t failed for TLS file. Restoring previous zz- file." >&2
  if [[ -s "$PREV" ]]; then
    install_conf "$PREV" || true
  fi
  exit 1
fi

echo "Proving https://${HOST_NAME} is Cohestra TLS"
if ! bash "$ROOT_DIR/deploy/host-proxy/prove-edge-tls.sh"; then
  echo "ADDITIVE TLS APPLY: FAIL — zz file left in place. Do not flip PUBLIC_BASE_URL." >&2
  exit 1
fi
echo "ADDITIVE TLS PASS (container writable layer). Do not compose up lead-generation-crm."
echo "Do not edit active-ssl.conf. Do not edit apex/@/www DNS."
