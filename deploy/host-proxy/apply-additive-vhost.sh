#!/usr/bin/env bash
# Add ONLY zz-cohestra-uat.conf to the existing Docker nginx.
# Does not edit active-ssl.conf / default.conf.
# Does not recreate the existing stack.
#
# Live topology (2026-09-06):
#   bind /root/lead-generation-crm/deploy/nginx/active-ssl.conf
#     -> /etc/nginx/conf.d/default.conf (ro)
#   include /etc/nginx/conf.d/*.conf
# So a second file in conf.d is picked up. Persist later with a SECOND
# bind mount; do not replace the existing mount.
#
# Usage (on the droplet, AFTER Cohestra internal acceptance):
#   COHESTRA_UAT_HOSTNAME=uat.cohestra.app bash deploy/host-proxy/apply-additive-vhost.sh
#
# nginx -t must pass before reload. On -t failure this script does not reload.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
ALIAS="${COHESTRA_EDGE_ALIAS:-cohestra-uat-nginx}"
HOST_NAME="${COHESTRA_UAT_HOSTNAME:-}"
EXAMPLE="$ROOT_DIR/deploy/host-proxy/cohestra-uat.nginx.example.conf"
TMP=$(mktemp)

cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

if [[ -z "$HOST_NAME" || "$HOST_NAME" == "uat.example.com" || "$HOST_NAME" == "thesocialcollectivesg.com" || "$HOST_NAME" == "cohestra.app" ]]; then
  echo "REFUSE: set COHESTRA_UAT_HOSTNAME to uat.cohestra.app (not apex, not the existing site)." >&2
  exit 1
fi
if [[ "$HOST_NAME" != "uat.cohestra.app" ]]; then
  echo "REFUSE: locked UAT hostname is uat.cohestra.app (got $HOST_NAME)." >&2
  exit 1
fi
if ! echo "$HOST_NAME" | grep -qE '^[A-Za-z0-9.-]+$'; then
  echo "REFUSE: COHESTRA_UAT_HOSTNAME failed hostname character check" >&2
  exit 1
fi

if [[ ! -f "$EXAMPLE" ]]; then
  echo "Missing $EXAMPLE" >&2
  exit 1
fi

if ! docker inspect "$EDGE_NGINX" >/dev/null 2>&1; then
  echo "REFUSE: $EDGE_NGINX not found" >&2
  exit 1
fi

if ! docker inspect "$ALIAS" >/dev/null 2>&1; then
  echo "REFUSE: $ALIAS is not running. Prove Cohestra internally first." >&2
  exit 1
fi

nets=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$EDGE_NGINX")
if ! echo "$nets" | grep -qw cohestra_uat_edge; then
  echo "REFUSE: $EDGE_NGINX is not on cohestra_uat_edge. Run attach first." >&2
  exit 1
fi

sed "s/server_name uat.example.com;/server_name ${HOST_NAME};/" "$EXAMPLE" > "$TMP"
if grep -q 'thesocialcollectivesg.com' "$TMP"; then
  echo "REFUSE: generated vhost mentions the existing hostname" >&2
  exit 1
fi
if grep -qE '127\.0\.0\.1:8180' "$TMP"; then
  echo "REFUSE: generated vhost uses host loopback" >&2
  exit 1
fi

if ! grep -qE "server_name[[:space:]]+${HOST_NAME};" "$TMP"; then
  echo "REFUSE: generated vhost server_name is not ${HOST_NAME}" >&2
  exit 1
fi
if ! grep -q 'X-Cohestra-Edge-Vhost' "$TMP"; then
  echo "REFUSE: generated vhost missing X-Cohestra-Edge-Vhost discriminator" >&2
  exit 1
fi

echo "Copying additive zz-cohestra-uat.conf into $EDGE_NGINX:/etc/nginx/conf.d/"
docker cp "$TMP" "$EDGE_NGINX:/etc/nginx/conf.d/zz-cohestra-uat.conf"
docker exec "$EDGE_NGINX" chmod 644 /etc/nginx/conf.d/zz-cohestra-uat.conf

echo "nginx -t"
if ! docker exec "$EDGE_NGINX" nginx -t; then
  echo "nginx -t FAILED. Removing additive file. NOT reloading." >&2
  docker exec "$EDGE_NGINX" rm -f /etc/nginx/conf.d/zz-cohestra-uat.conf
  exit 1
fi

echo "Reloading $EDGE_NGINX only"
docker exec "$EDGE_NGINX" nginx -s reload
sleep 1

echo "Proving Host-header routes to Cohestra (not the existing default_server)"
if ! bash "$ROOT_DIR/deploy/host-proxy/prove-edge-vhost.sh"; then
  echo "ADDITIVE VHOST APPLY: FAIL — file left in place for inspect. Do not change DNS." >&2
  exit 1
fi
echo "ADDITIVE VHOST PASS (container writable layer). Persist later with a second bind mount."
echo "Do not compose up --force-recreate lead-generation-crm merely for this file."
