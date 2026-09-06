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

if grep -q 'name: cohestra_uat_edge' "$COMPOSE"; then
  pass "Shared edge network cohestra_uat_edge is declared"
else
  fail "Missing dedicated edge network cohestra_uat_edge"
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
  if grep -q 'proxy_pass http://cohestra-uat-nginx:80' "$EDGE_EXAMPLE" && ! grep -q '127.0.0.1:8180' "$EDGE_EXAMPLE"; then
    pass "Existing-edge example uses Docker DNS alias, not host loopback"
  else
    fail "Existing-edge example must proxy to http://cohestra-uat-nginx:80 (not 127.0.0.1:8180)"
  fi
else
  fail "Missing deploy/host-proxy/cohestra-uat.nginx.example.conf"
fi

OVERLAY="$ROOT_DIR/deploy/host-proxy/lead-generation-crm.edge-overlay.yml"
if [[ -f "$OVERLAY" ]]; then
  if grep -qE '^  (postgres|redis|api|web):' "$OVERLAY"; then
    fail "Existing-app edge overlay must not attach data or app services"
  else
    pass "Existing-app edge overlay mentions nginx/edge only"
  fi
else
  fail "Missing lead-generation-crm.edge-overlay.yml"
fi

python3 - "$COMPOSE" <<'PY' || true
import sys, re
path = sys.argv[1]
text = open(path).read()
# Split services by top-level service keys
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
for name in ("postgres", "redis", "api", "web", "certbot"):
    blk = blocks.get(name, "")
    if "uat_edge" in blk:
        errors.append(f"{name} must not join uat_edge")
    if name in ("postgres", "redis") and "uat_internal" not in blk:
        errors.append(f"{name} must stay on uat_internal")
if "0.0.0.0:80" in text or re.search(r"(?<!127\.0\.0\.1:)\$\{NGINX_HTTP_PORT:-80\}:80", text):
    errors.append("compose must not claim host 80")
open("/tmp/uat-isolation-edge.txt", "w").write("\n".join(errors))
sys.exit(1 if errors else 0)
PY
if [[ -f /tmp/uat-isolation-edge.txt && -s /tmp/uat-isolation-edge.txt ]]; then
  while IFS= read -r err; do
    fail "$err"
  done < /tmp/uat-isolation-edge.txt
else
  pass "Only Cohestra nginx joins cohestra_uat_edge"
  pass "Cohestra nginx has stable alias cohestra-uat-nginx"
  pass "Postgres/Redis/API/web/certbot stay off the edge network"
fi

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "UAT isolation contract PASS"
