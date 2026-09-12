#!/usr/bin/env bash
# Export zz-cohestra-uat.conf from the live edge container to durable host storage.
# Does NOT recreate lead-generation-crm-nginx-1 automatically.
#
# Usage (as deploy):
#   bash deploy/host-proxy/persist-cohestra-vhost.sh
#
# To make the vhost survive nginx container recreation, add a SECOND read-only bind
# mount on the existing lead-generation-crm nginx service pointing at the exported file.
# Do that only after backup + verify-existing-app.sh PASS.

set -euo pipefail

EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
BACKUP_ROOT="${COHESTRA_EDGE_BACKUP_ROOT:-$HOME/cohestra-uat-edge-backups}"
DEST_DIR="${BACKUP_ROOT}/persist"
DEST_FILE="${DEST_DIR}/zz-cohestra-uat.conf"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

if [[ "$(id -u)" -eq 0 && "${COHESTRA_ALLOW_ROOT:-}" != "1" ]]; then
  echo "REFUSE: run as deploy, not root." >&2
  exit 1
fi
if ! docker exec "$EDGE_NGINX" test -f /etc/nginx/conf.d/zz-cohestra-uat.conf; then
  echo "REFUSE: zz-cohestra-uat.conf not present in $EDGE_NGINX" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
docker cp "$EDGE_NGINX:/etc/nginx/conf.d/zz-cohestra-uat.conf" "$DEST_FILE"
cp "$DEST_FILE" "${DEST_FILE}.${STAMP}"
chmod 644 "$DEST_FILE" "${DEST_FILE}.${STAMP}"

echo "persisted=${DEST_FILE}"
echo "snapshot=${DEST_FILE}.${STAMP}"
echo ""
echo "NGINX CONFIG PERSISTENCE: CONDITIONAL"
echo "File is on the host, but the edge container still needs a second bind mount:"
echo "  ${DEST_FILE} -> /etc/nginx/conf.d/zz-cohestra-uat.conf (ro)"
echo "Add that to the EXISTING lead-generation-crm nginx service only after:"
echo "  1) backup-existing-nginx.sh"
echo "  2) verify-existing-app.sh PASS"
echo "  3) smallest possible nginx-only recreate with all existing networks/volumes preserved"
