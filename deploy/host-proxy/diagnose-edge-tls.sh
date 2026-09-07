#!/usr/bin/env bash
# Read-only TLS diagnose for uat.cohestra.app on the shared droplet.
# Does not issue certs, reload nginx, or print keys / ACME email.
#
# Usage (as deploy, cwd /home/deploy/cohestra):
#   bash deploy/host-proxy/diagnose-edge-tls.sh

set -euo pipefail

HOST_NAME="${COHESTRA_UAT_HOSTNAME:-uat.cohestra.app}"
EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
EXISTING_HOST="${EXISTING_APP_HOST:-thesocialcollectivesg.com}"

if [[ "$HOST_NAME" != "uat.cohestra.app" ]]; then
  echo "REFUSE: locked UAT hostname is uat.cohestra.app (got $HOST_NAME)." >&2
  exit 1
fi

echo "== Edge TLS diagnose (read-only) =="
echo "cwd=$(pwd)"
echo "user=$(id -un)"
if git rev-parse --short HEAD >/dev/null 2>&1; then
  echo "git_head=$(git rev-parse --short HEAD)"
fi
echo "edge_nginx=${EDGE_NGINX}"

if ! docker inspect "$EDGE_NGINX" >/dev/null 2>&1; then
  echo "FAIL: $EDGE_NGINX not found"
  exit 1
fi

www_rw=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/www/certbot"}}{{.RW}} {{.Name}}{{end}}{{end}}' "$EDGE_NGINX" || true)
echo "nginx_acme_www_mount=${www_rw:-missing}"
if echo "$www_rw" | grep -q '^false'; then
  echo "nginx_acme_www_writable=no  (expected — write via certbot www volume, not docker exec)"
fi

if docker exec "$EDGE_NGINX" test -f /etc/nginx/conf.d/zz-cohestra-uat.conf; then
  echo "zz_vhost=present"
  if docker exec "$EDGE_NGINX" grep -q 'listen 443' /etc/nginx/conf.d/zz-cohestra-uat.conf; then
    echo "zz_listen_443=yes"
  else
    echo "zz_listen_443=no  (HTTPS vhost not installed yet)"
  fi
  if docker exec "$EDGE_NGINX" grep -q 'acme-challenge' /etc/nginx/conf.d/zz-cohestra-uat.conf; then
    echo "zz_acme_location=yes"
  else
    echo "zz_acme_location=no"
  fi
  cert_path=$(docker exec "$EDGE_NGINX" sh -c \
    "grep -E 'ssl_certificate[[:space:]]' /etc/nginx/conf.d/zz-cohestra-uat.conf | awk '{print \$2}' | tr -d ';' | head -1" || true)
  echo "zz_ssl_certificate=${cert_path:-none}"
else
  echo "zz_vhost=missing"
fi

if docker exec "$EDGE_NGINX" test -f "/etc/letsencrypt/live/${HOST_NAME}/fullchain.pem"; then
  echo "live_cert_${HOST_NAME}=present"
else
  echo "live_cert_${HOST_NAME}=missing"
fi
if docker exec "$EDGE_NGINX" test -f "/etc/letsencrypt/live/${EXISTING_HOST}/fullchain.pem"; then
  echo "live_cert_${EXISTING_HOST}=present_untouched"
fi

leaf=$(echo | openssl s_client -servername "$HOST_NAME" -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null || true)
echo "sni_leaf=${leaf:-MISSING}"
if echo "$leaf" | grep -q "$HOST_NAME"; then
  echo "sni_names_uat=yes"
else
  echo "sni_names_uat=no  (browser NET::ERR_CERT_COMMON_NAME_INVALID until apply PASSes)"
fi
if echo "$leaf" | grep -q "$EXISTING_HOST"; then
  echo "sni_is_existing_site_cert=yes"
fi

http_ready=$(curl -sS --connect-timeout 8 -o /tmp/cohestra-diag-ready.json -w '%{http_code}' \
  -H "Host: ${HOST_NAME}" http://127.0.0.1/ready || echo "000")
echo "loopback_host_ready=${http_ready}"
if [[ -f /tmp/cohestra-diag-ready.json ]] && grep -q '"default-tenant"' /tmp/cohestra-diag-ready.json; then
  echo "loopback_ready_default_tenant=yes"
else
  echo "loopback_ready_default_tenant=no"
fi
rm -f /tmp/cohestra-diag-ready.json

public_http=$(curl -sS --connect-timeout 8 -o /dev/null -w '%{http_code}' "http://${HOST_NAME}/ready" || echo "000")
echo "public_http_ready=${public_http}"

echo ""
echo "If sni_names_uat=no, run apply-additive-tls.sh as deploy from /home/deploy/cohestra."
echo "Do not paste ACME email, keys, or .env values."
