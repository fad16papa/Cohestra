#!/usr/bin/env bash
# Read-only inspection of the existing Docker edge nginx.
# Does not modify containers, networks, config, or certificates.
# Does not print private keys, env secrets, or certificate bodies.
#
# Usage (on the droplet):
#   bash deploy/host-proxy/inspect-existing-nginx.sh

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
echo "compose.working_dir=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$EDGE_NGINX")"
echo "compose.config_files=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$EDGE_NGINX")"

echo ""
echo "== published ports =="
docker inspect --format '{{json .NetworkSettings.Ports}}' "$EDGE_NGINX"

echo ""
echo "== networks (do not add data services to cohestra_uat_edge) =="
docker inspect --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} ip={{$v.IPAddress}} aliases={{json $v.Aliases}}{{println}}{{end}}' "$EDGE_NGINX"

echo ""
echo "== mounts (config / certs — backup host Source paths before any edit) =="
docker inspect --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}} rw={{.RW}}{{println}}{{end}}' "$EDGE_NGINX"

echo ""
echo "== nginx -t (read-only test) =="
docker exec "$EDGE_NGINX" nginx -t

echo ""
echo "== include / main config =="
docker exec "$EDGE_NGINX" sh -c 'ls -la /etc/nginx/nginx.conf /etc/nginx/conf.d 2>/dev/null; echo; echo "--- nginx.conf (includes only) ---"; grep -E "^[[:space:]]*include |^http |^events " /etc/nginx/nginx.conf || true'

echo ""
echo "== server blocks (listen / server_name / ssl paths — no key material) =="
docker exec "$EDGE_NGINX" sh -c '
  for f in /etc/nginx/nginx.conf /etc/nginx/conf.d/*.conf /etc/nginx/conf.d/*.conf.*; do
    [ -f "$f" ] || continue
    echo "==== $f ===="
    grep -nE "listen |server_name |ssl_certificate|ssl_certificate_key|include |default_server" "$f" || true
    echo
  done
'

echo ""
echo "== certificate files present (names/paths only) =="
docker exec "$EDGE_NGINX" sh -c '
  if [ -d /etc/letsencrypt ]; then
    echo "letsencrypt live:"
    ls -la /etc/letsencrypt/live 2>/dev/null || echo "(no /etc/letsencrypt/live)"
    echo "letsencrypt renewal:"
    ls -la /etc/letsencrypt/renewal 2>/dev/null || true
  else
    echo "No /etc/letsencrypt in this container"
  fi
  echo
  echo "ssl_certificate paths referenced:"
  grep -R --include="*.conf" -h "ssl_certificate" /etc/nginx 2>/dev/null | sed "s/[[:space:]]*#.*//" | grep -v "^$" || true
'

echo ""
echo "== persistence / reload method =="
echo "Config persistence: host bind-mounts listed above. Edits on the host Source survive container recreate."
echo "Certificates: stay on this existing container. Do not copy them into cohestra-uat."
echo "Validate: docker exec $EDGE_NGINX nginx -t"
echo "Reload (preferred): docker exec $EDGE_NGINX nginx -s reload"
echo "Do NOT docker compose up --force-recreate the existing project merely to add Cohestra."
echo "Do NOT change existing hostname server blocks. Add only zz-cohestra-uat.conf."
echo "TLS for the Cohestra hostname is Story 19.2. Story 19.1 may prove HTTP first."
echo "This script made no changes."
