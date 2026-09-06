#!/usr/bin/env bash
# Attach lead-generation-crm-nginx-1 to cohestra_uat_edge without recreating it.
# Idempotent. Does not start Cohestra. Does not reload nginx. Does not change
# existing server blocks.
#
# Usage (on the droplet, after cohestra_uat_edge exists or will be created):
#   bash deploy/host-proxy/reconcile-edge-network.sh

set -euo pipefail

EDGE_NET="${COHESTRA_EDGE_NETWORK:-cohestra_uat_edge}"
EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
ALIAS="${COHESTRA_EDGE_ALIAS:-cohestra-uat-nginx}"

if ! command -v docker >/dev/null 2>&1; then
  echo "REFUSE: docker CLI required" >&2
  exit 1
fi

if ! docker inspect "$EDGE_NGINX" >/dev/null 2>&1; then
  echo "REFUSE: existing edge container $EDGE_NGINX not found. Inspect first; do not invent a container." >&2
  exit 1
fi

if ! docker network inspect "$EDGE_NET" >/dev/null 2>&1; then
  echo "Creating $EDGE_NET (empty; Cohestra compose also declares this name)"
  docker network create --driver bridge "$EDGE_NET"
fi

already=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$EDGE_NGINX")
if echo "$already" | grep -qw "$EDGE_NET"; then
  echo "PASS: $EDGE_NGINX already on $EDGE_NET"
else
  echo "Connecting $EDGE_NGINX to $EDGE_NET (no recreate)"
  docker network connect "$EDGE_NET" "$EDGE_NGINX"
fi

echo "Existing nginx networks: $(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$EDGE_NGINX")"
echo "Cohestra alias to use in the NEW server block: http://${ALIAS}:80"
echo "Do not proxy_pass http://127.0.0.1:8180 from inside $EDGE_NGINX."
echo "Next: backup existing nginx config, add only the new server block, nginx -t, reload."
