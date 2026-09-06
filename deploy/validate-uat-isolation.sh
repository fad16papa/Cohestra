#!/usr/bin/env bash
# Repo-side isolation contract for docker-compose.uat.yml.
# Does not deploy. Does not talk to the droplet.
#
# Usage: bash deploy/validate-uat-isolation.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT_DIR/docker-compose.uat.yml"
NGINX="$ROOT_DIR/deploy/nginx/app.conf"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if [[ ! -f "$COMPOSE" ]]; then
  echo "Missing $COMPOSE" >&2
  exit 1
fi

echo "== Cohestra UAT isolation contract =="

if grep -qE '^name:[[:space:]]*cohestra-uat[[:space:]]*$' "$COMPOSE"; then
  pass "Compose project name is cohestra-uat"
else
  fail "Compose project name must be exactly cohestra-uat"
fi

if grep -q 'name: cohestra_uat_internal' "$COMPOSE"; then
  pass "Dedicated network cohestra_uat_internal"
else
  fail "Missing dedicated network cohestra_uat_internal"
fi

if grep -q 'name: cohestra_uat_edge' "$COMPOSE" && grep -q 'external: true' "$COMPOSE"; then
  pass "Shared edge network cohestra_uat_edge is external (survives compose down)"
else
  fail "cohestra_uat_edge must be a named external network"
fi

if grep -q 'name: cohestra_uat_postgres_data' "$COMPOSE"; then
  pass "Dedicated postgres volume"
else
  fail "Missing cohestra_uat_postgres_data volume"
fi

if grep -q 'name: cohestra_uat_redis_data' "$COMPOSE"; then
  pass "Dedicated redis volume"
else
  fail "Missing cohestra_uat_redis_data volume"
fi

if grep -qE '127\.0\.0\.1:\$\{WEB_HOST_PORT:-3100\}:3000' "$COMPOSE"; then
  pass "Web host bind 127.0.0.1:3100 → 3000"
else
  fail "Web host bind must be 127.0.0.1:\${WEB_HOST_PORT:-3100}:3000"
fi

if grep -qE '127\.0\.0\.1:\$\{API_HOST_PORT:-5100\}:8080' "$COMPOSE"; then
  pass "API host bind 127.0.0.1:5100 → 8080"
else
  fail "API host bind must be 127.0.0.1:\${API_HOST_PORT:-5100}:8080"
fi

if grep -qE '127\.0\.0\.1:\$\{NGINX_HOST_PORT:-8180\}:80' "$COMPOSE"; then
  pass "nginx host bind 127.0.0.1:8180 → 80"
else
  fail "nginx host bind must be 127.0.0.1:\${NGINX_HOST_PORT:-8180}:80"
fi

if grep -qE 'NGINX_HTTPS_PORT|[^0-9]443:' "$COMPOSE"; then
  fail "Compose must not publish host 443"
else
  pass "No host 443 publish"
fi

if grep -qE '[^0-9]80:80|0\.0\.0\.0:80' "$COMPOSE"; then
  fail "Compose must not publish public :80"
else
  pass "No public :80 publish"
fi

# Postgres/Redis must not have a ports: block at all.
awk '
  $0 ~ /^  (postgres|redis):/ { svc=$1; gsub(":","",svc); in_svc=1; next }
  in_svc && $0 ~ /^  [a-z]/ && $0 !~ /^  (postgres|redis):/ { in_svc=0 }
  in_svc && $0 ~ /^    ports:/ { print svc; }
' "$COMPOSE" | while read -r svc; do
  echo "LEAK: $svc still has a ports: block"
done

if awk '
  $0 ~ /^  (postgres|redis):/ { svc=$1; gsub(":","",svc); in_svc=1; next }
  in_svc && $0 ~ /^  [a-z]/ && $0 !~ /^  (postgres|redis):/ { in_svc=0 }
  in_svc && $0 ~ /^    ports:/ { found=1 }
  END { exit found+0 }
' "$COMPOSE"; then
  pass "Postgres and Redis have no host ports"
else
  fail "Postgres or Redis still publishes a host port"
fi

if grep -qE '0\.0\.0\.0' "$COMPOSE"; then
  fail "Compose must not bind 0.0.0.0"
else
  pass "No 0.0.0.0 host binds"
fi

if grep -q 'Host=postgres;Port=5432' "$COMPOSE" && grep -q 'redis:6379' "$COMPOSE"; then
  pass "API uses Docker DNS for postgres and redis"
else
  fail "API must use Host=postgres and redis:6379"
fi

if grep -q 'COMPOSE_PROJECT_NAME' "$COMPOSE"; then
  fail "Do not interpolate COMPOSE_PROJECT_NAME in the compose file"
else
  pass "Project name is a literal in the compose file"
fi

WRAPPER="$ROOT_DIR/deploy/uat-compose.sh"
if [[ -f "$WRAPPER" ]] && grep -q -- '--project-name cohestra-uat' "$WRAPPER" && grep -q -- '-p' "$WRAPPER"; then
  pass "uat-compose.sh forces --project-name cohestra-uat and refuses -p"
else
  fail "deploy/uat-compose.sh must force --project-name cohestra-uat and refuse -p"
fi

if [[ -f "$NGINX" ]]; then
  if grep -q 'server web:3000' "$NGINX" && grep -q 'server api:8080' "$NGINX"; then
    pass "nginx upstreams use Docker service names"
  else
    fail "nginx must proxy to web:3000 and api:8080"
  fi
  if grep -q 'X-Forwarded-Proto $forwarded_proto' "$NGINX"; then
    pass "nginx forwards proto from host proxy when present"
  else
    fail "nginx must set X-Forwarded-Proto from \$forwarded_proto"
  fi
  if grep -qE 'listen 443|ssl_certificate' "$NGINX"; then
    fail "Shared-host Cohestra nginx must stay HTTP-only"
  else
    pass "Cohestra nginx config is HTTP-only"
  fi
fi

EDGE_EXAMPLE="$ROOT_DIR/deploy/host-proxy/cohestra-uat.nginx.example.conf"
if [[ -f "$EDGE_EXAMPLE" ]]; then
  if grep -q 'cohestra-uat-nginx' "$EDGE_EXAMPLE" && grep -q 'resolver 127.0.0.11' "$EDGE_EXAMPLE" && ! grep -qE '127\.0\.0\.1[^0-9]' "$EDGE_EXAMPLE"; then
    pass "Existing-edge example uses Docker DNS + resolver, not host loopback"
  else
    fail "Existing-edge example must use resolver + cohestra-uat-nginx (no 127.0.0.1)"
  fi
  if grep -q 'zz-cohestra-uat.conf' "$EDGE_EXAMPLE" && ! grep -qE 'listen[^;]*default_server' "$EDGE_EXAMPLE"; then
    pass "Public proxy snippet is additive (zz-cohestra-uat.conf, not default_server)"
  else
    fail "Example vhost must stay additive (zz- name, no listen default_server)"
  fi
else
  fail "Missing deploy/host-proxy/cohestra-uat.nginx.example.conf"
fi

INSPECT="$ROOT_DIR/deploy/host-proxy/inspect-existing-nginx.sh"
if [[ -f "$INSPECT" ]]; then
  if grep -vE '^[[:space:]]*(#|echo )' "$INSPECT" | grep -Eq 'network connect|nginx -s reload|compose up|docker cp'; then
    fail "inspect-existing-nginx.sh must stay read-only (no connect/reload/recreate)"
  else
    pass "inspect-existing-nginx.sh is read-only"
  fi
else
  fail "Missing deploy/host-proxy/inspect-existing-nginx.sh"
fi

SSH_ACCEPT="$ROOT_DIR/deploy/uat-ssh-accept.sh"
if [[ -f "$SSH_ACCEPT" ]]; then
  if grep -q 'fail "sudo -n' "$SSH_ACCEPT"; then
    fail "uat-ssh-accept.sh must not require passwordless sudo"
  elif grep -q 'docker ps' "$SSH_ACCEPT" && grep -q 'docker compose version' "$SSH_ACCEPT" && grep -q 'NOPASSWD' "$SSH_ACCEPT"; then
    pass "uat-ssh-accept.sh gates on Docker/Compose/sudo group, not NOPASSWD: ALL"
  else
    fail "uat-ssh-accept.sh must prove docker, compose, and sudo group without requiring NOPASSWD"
  fi
else
  fail "Missing deploy/uat-ssh-accept.sh"
fi

BACKUP="$ROOT_DIR/deploy/host-proxy/backup-existing-nginx.sh"
if [[ -f "$BACKUP" ]]; then
  if grep -q 'letsencrypt' "$BACKUP" && grep -q 'privkey' "$BACKUP" && ! grep -vE '^[[:space:]]*(#|echo )' "$BACKUP" | grep -Eq 'nginx -s reload|compose up|network connect'; then
    pass "backup-existing-nginx.sh skips cert/key material and does not reload"
  else
    fail "backup-existing-nginx.sh must skip certs/keys and stay non-mutating for nginx"
  fi
else
  fail "Missing deploy/host-proxy/backup-existing-nginx.sh"
fi

LIVE="$ROOT_DIR/deploy/host-proxy/live-19-1.sh"
if [[ -f "$LIVE" ]]; then
  if grep -q 'discover' "$LIVE" && grep -q 'backup' "$LIVE" && grep -q 'attach' "$LIVE" && ! grep -vE '^[[:space:]]*(#|echo )' "$LIVE" | grep -Eq 'uat-compose.sh|zz-cohestra-uat'; then
    pass "live-19-1.sh is phased and does not start Cohestra or write the vhost"
  else
    fail "live-19-1.sh must stay phased discover/backup/attach/verify"
  fi
else
  fail "Missing deploy/host-proxy/live-19-1.sh"
fi

RECONCILE="$ROOT_DIR/deploy/host-proxy/reconcile-edge-network.sh"
if [[ -f "$RECONCILE" ]]; then
  if grep -q 'docker network connect' "$RECONCILE" && ! grep -vE '^[[:space:]]*(#|echo )' "$RECONCILE" | grep -Eq 'force-recreate|docker compose up'; then
    pass "reconcile-edge-network.sh attaches via docker network connect only"
  else
    fail "reconcile-edge-network.sh must use docker network connect and must not recreate"
  fi
else
  fail "Missing deploy/host-proxy/reconcile-edge-network.sh"
fi

OVERLAY="$ROOT_DIR/deploy/host-proxy/lead-generation-crm.edge-overlay.yml"
if [[ -f "$OVERLAY" ]]; then
  if grep -qE '^services:' "$OVERLAY"; then
    fail "Edge overlay must not declare services: (unsafe compose merge)"
  else
    pass "Edge overlay is documentation-only (no services:)"
  fi
else
  fail "Missing lead-generation-crm.edge-overlay.yml"
fi

EDGE_TMP=$(mktemp)
set +e
python3 - "$COMPOSE" <<'PY' >"$EDGE_TMP" 2>&1
import sys, re
path = sys.argv[1]
text = open(path).read()
body = text.split("services:", 1)[1].split("\nnetworks:", 1)[0]
blocks = {}
current = None
buf = []
for line in body.splitlines():
    m = re.match(r"^  ([a-z0-9_-]+):$", line)
    if m:
        if current:
            blocks[current] = "\n".join(buf)
        current = m.group(1)
        buf = [line]
    elif current:
        buf.append(line)
if current:
    blocks[current] = "\n".join(buf)
errors = []
nginx = blocks.get("nginx", "")
if "uat_edge" not in nginx or "uat_internal" not in nginx:
    errors.append("nginx must attach uat_internal and uat_edge")
if "cohestra-uat-nginx" not in nginx:
    errors.append("nginx must declare alias cohestra-uat-nginx")
for name, blk in blocks.items():
    if name != "nginx" and "uat_edge" in blk:
        errors.append(f"{name} must not join uat_edge")
for name in ("postgres", "redis"):
    if "uat_internal" not in blocks.get(name, ""):
        errors.append(f"{name} must stay on uat_internal")
if "0.0.0.0:80" in text:
    errors.append("compose must not claim host 80")
print("\n".join(errors))
sys.exit(1 if errors else 0)
PY
PY_RC=$?
set -e
if [[ "$PY_RC" -gt 1 ]]; then
  fail "Edge membership parser crashed"
  cat "$EDGE_TMP" || true
elif [[ "$PY_RC" -eq 1 ]]; then
  while IFS= read -r err; do
    [[ -n "$err" ]] && fail "$err"
  done < "$EDGE_TMP"
else
  pass "Only Cohestra nginx joins cohestra_uat_edge"
  pass "Cohestra nginx has stable alias cohestra-uat-nginx"
  pass "Non-nginx Cohestra services stay off the edge network"
fi
rm -f "$EDGE_TMP"

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "UAT isolation contract PASS"
