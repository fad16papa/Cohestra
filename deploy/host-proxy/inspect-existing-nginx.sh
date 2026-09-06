#!/usr/bin/env bash
# Read-only inspection of the existing Docker edge nginx.
# Does not modify containers, networks, or config.

set -euo pipefail

EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI required" >&2
  exit 1
fi

if ! docker inspect "$EDGE_NGINX" >/dev/null 2>&1; then
  echo "Container $EDGE_NGINX not found" >&2
  exit 1
fi

echo "== container =="
docker inspect --format 'Name={{.Name}} Image={{.Config.Image}} Restart={{.HostConfig.RestartPolicy.Name}}' "$EDGE_NGINX"
echo "compose.project=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$EDGE_NGINX")"
echo "compose.service=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' "$EDGE_NGINX")"

echo ""
echo "== published ports =="
docker inspect --format '{{json .NetworkSettings.Ports}}' "$EDGE_NGINX"

echo ""
echo "== networks =="
docker inspect --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} ip={{$v.IPAddress}} aliases={{json $v.Aliases}}{{println}}{{end}}' "$EDGE_NGINX"

echo ""
echo "== mounts (config / certs) =="
docker inspect --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{println}}{{end}}' "$EDGE_NGINX"

echo ""
echo "== nginx -t (read-only test) =="
docker exec "$EDGE_NGINX" nginx -t

echo ""
echo "== conf.d listing =="
docker exec "$EDGE_NGINX" sh -c 'ls -la /etc/nginx/conf.d 2>/dev/null; ls -la /etc/nginx/nginx.conf'

echo ""
echo "Backup any mounted host config path above before adding a Cohestra server block."
echo "Do not edit existing hostname server blocks."
