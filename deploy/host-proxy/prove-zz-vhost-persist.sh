#!/usr/bin/env bash
# Read-only: is zz-cohestra-uat.conf a durable host bind, or only in the
# edge container writable layer?
# Does not reload, recreate, copy, or edit anything.
#
# Usage (as deploy on the droplet):
#   bash deploy/host-proxy/prove-zz-vhost-persist.sh
#
# PERSISTENCE=
#   BIND            host bind mount covers the vhost (survives nginx recreate)
#   EXPORT_ONLY     persist-cohestra-vhost.sh export exists; container is not bound
#   CONTAINER_ONLY  vhost present in container; no host bind and no export
#   MISSING         vhost not in the edge container

set -euo pipefail

EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
VHOST_DEST="/etc/nginx/conf.d/zz-cohestra-uat.conf"
BACKUP_ROOT="${COHESTRA_EDGE_BACKUP_ROOT:-$HOME/cohestra-uat-edge-backups}"
EXPORT_FILE="${BACKUP_ROOT}/persist/zz-cohestra-uat.conf"

if [[ "$(id -u)" -eq 0 && "${COHESTRA_ALLOW_ROOT:-}" != "1" ]]; then
  echo "REFUSE: run as deploy, not root." >&2
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI required" >&2
  exit 1
fi
if ! docker inspect "$EDGE_NGINX" >/dev/null 2>&1; then
  echo "FAIL: $EDGE_NGINX not found" >&2
  exit 1
fi

echo "== zz-cohestra-uat.conf persistence (read-only) =="
echo "edge_nginx=${EDGE_NGINX}"

if docker exec "$EDGE_NGINX" test -f "$VHOST_DEST"; then
  echo "container_vhost=present"
else
  echo "container_vhost=missing"
  echo "PERSISTENCE=MISSING"
  echo "ZZ VHOST PERSISTENCE: FAIL — additive vhost is not in the edge container"
  exit 1
fi

if docker exec "$EDGE_NGINX" grep -q 'listen 443' "$VHOST_DEST"; then
  echo "zz_listen_443=yes"
else
  echo "zz_listen_443=no"
fi
if docker exec "$EDGE_NGINX" grep -q 'uat.cohestra.app' "$VHOST_DEST" \
  && docker exec "$EDGE_NGINX" grep -q '*.uat.cohestra.app' "$VHOST_DEST"; then
  echo "zz_server_names=uat+wildcard"
else
  echo "zz_server_names=unexpected"
fi

bind_source=""
while IFS=$'\t' read -r src dest; do
  [[ -n "$dest" ]] || continue
  if [[ "$dest" == "$VHOST_DEST" ]]; then
    bind_source="$src"
  fi
done < <(docker inspect --format '{{range .Mounts}}{{.Source}}{{"\t"}}{{.Destination}}{{println}}{{end}}' "$EDGE_NGINX")

if [[ -n "$bind_source" ]]; then
  echo "bind_source=${bind_source}"
  echo "PERSISTENCE=BIND"
  echo "ZZ VHOST PERSISTENCE: PASS — host bind will survive nginx recreate"
  exit 0
fi

echo "bind_source=none"

if [[ -f "$EXPORT_FILE" ]]; then
  echo "export_file=${EXPORT_FILE}"
  echo "PERSISTENCE=EXPORT_ONLY"
  echo "ZZ VHOST PERSISTENCE: CONDITIONAL — export exists; nginx recreate would drop the live vhost until a read-only bind is authorized"
  exit 0
fi

echo "export_file=missing"
echo "PERSISTENCE=CONTAINER_ONLY"
echo "ZZ VHOST PERSISTENCE: CONDITIONAL — run persist-cohestra-vhost.sh; do not recreate lead-generation-crm-nginx-1"
exit 0
