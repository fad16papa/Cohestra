#!/usr/bin/env bash
# Read-only shared-droplet port + resource audit for Epic 19.
# Run ON THE DROPLET. Does not stop, restart, or rebind any service.
#
# Usage (SSH session on the droplet):
#   bash deploy/uat-port-audit.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PREFERRED_WEB="${WEB_HOST_PORT:-3100}"
PREFERRED_API="${API_HOST_PORT:-5100}"
PREFERRED_NGINX="${NGINX_HOST_PORT:-8180}"

PASS=0
FAIL=0
WARN=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }
warn() { echo "WARN: $1"; WARN=$((WARN + 1)); }

echo "== Cohestra UAT port / resource audit (read-only) =="
echo "This script never stops or modifies the existing application."
echo "Frozen map (2026-09-06): WEB=$PREFERRED_WEB API=$PREFERRED_API NGINX=$PREFERRED_NGINX"
echo ""

# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/cohestra-uat-guards.sh"
if ! refuse_legacy_compose_project; then
  fail "COMPOSE_PROJECT_NAME=cohestra-infra-uat is forbidden (may be the live stack)"
fi
if ! refuse_public_cohestra_host_ports; then
  fail "Cohestra host ports must not be 80 or 443"
fi
if ! refuse_ssl_nginx_config; then
  fail "NGINX_CONFIG_PATH must stay HTTP app.conf on the shared droplet"
fi

echo "== Host listeners (ss) =="
if command -v ss >/dev/null 2>&1; then
  ss -lntup || ss -lnt
else
  fail "ss is not available — cannot prove host ports are free. Install iproute2 / use a full SSH session."
fi
echo ""

echo "== Docker published ports =="
if command -v docker >/dev/null 2>&1; then
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' || true
  echo ""
  echo "== Docker networks =="
  docker network ls || true
  echo ""
  echo "== Docker compose projects (labels) =="
  docker ps -a --format '{{.Label "com.docker.compose.project"}}' | sort -u || true
else
  warn "docker CLI not available on this session"
fi
echo ""

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -lnt "( sport = :$port )" | awk 'NR>1 {print; found=1} END {exit found?0:1}'
    return
  fi
  return 2
}

owned_by_cohestra_uat() {
  local port="$1"
  command -v docker >/dev/null 2>&1 || return 1
  docker ps --filter "label=com.docker.compose.project=cohestra-uat" --format '{{.Ports}}' \
    | grep -E "[:.]${port}->" >/dev/null 2>&1
}

check_preferred() {
  local label="$1"
  local port="$2"
  echo "-- $label 127.0.0.1:$port --"
  if [[ "$port" == "80" || "$port" == "443" ]]; then
    fail "$label port $port is the public reverse-proxy range — choose a Cohestra-specific loopback port"
    return
  fi
  local occ=0
  if port_in_use "$port"; then
    occ=0
  else
    occ=$?
  fi
  if [[ "$occ" -eq 2 ]]; then
    fail "$label port $port occupancy is unknown without ss"
  elif [[ "$occ" -eq 0 ]]; then
    if owned_by_cohestra_uat "$port"; then
      pass "$label port $port is already owned by project cohestra-uat (redeploy OK)"
    else
      fail "$label preferred port $port is occupied — do not stop the occupant"
      echo "   Choose the nearest unused Cohestra-specific port and freeze it in .env"
      echo "   Suggested alternatives: $((port + 10)), $((port + 20)), $((port + 100))"
    fi
  else
    pass "$label preferred port $port is free on this host"
  fi
}

check_preferred "WEB" "$PREFERRED_WEB"
check_preferred "API" "$PREFERRED_API"
check_preferred "NGINX" "$PREFERRED_NGINX"

echo ""
echo "== Public ports that must remain the existing application / host proxy =="
for port in 80 443 22; do
  occ=0
  if port_in_use "$port"; then
    occ=0
  else
    occ=$?
  fi
  if [[ "$occ" -eq 0 ]]; then
    pass "Host :$port is in use (expected for shared droplet / SSH)"
  elif [[ "$occ" -eq 2 ]]; then
    warn "Host :$port occupancy unknown without ss"
  else
    warn "Host :$port has no listener from this view"
  fi
done

echo ""
echo "== Who owns :80 / :443 (do not modify) =="
if command -v docker >/dev/null 2>&1; then
  docker ps --format '{{.Names}} {{.Ports}}' | grep -E ':80->|:443->|0.0.0.0:80|:::80' || true
fi
if command -v ss >/dev/null 2>&1; then
  ss -lntup | grep -E ':80 |:443 ' || true
fi

echo ""
echo "== Resource audit =="
if [[ -r /proc/meminfo ]]; then
  total_mb=$(awk '/^MemTotal:/ {printf "%d", $2/1024}' /proc/meminfo)
  avail_mb=$(awk '/^MemAvailable:/ {printf "%d", $2/1024}' /proc/meminfo)
  echo "MemTotalMiB=$total_mb MemAvailableMiB=$avail_mb"
  if [[ "${total_mb:-0}" -lt 2048 ]]; then
    fail "Host has under 2 GiB RAM — isolated Cohestra + existing stack is FAIL without resize"
  elif [[ "${total_mb:-0}" -lt 3500 || "${avail_mb:-0}" -lt 1200 ]]; then
    warn "SHARED UAT HOSTING is CONDITIONAL (4 GiB is tight; do not build both stacks at once). Isolation is unchanged."
  else
    pass "Memory headroom looks sufficient for a cautious isolated start"
  fi
elif command -v free >/dev/null 2>&1; then
  free -m
  warn "Could not read /proc/meminfo — treat RAM as CONDITIONAL"
else
  warn "Memory size unknown — SHARED UAT HOSTING is CONDITIONAL"
fi

if command -v nproc >/dev/null 2>&1; then
  echo "vCPU=$(nproc)"
fi

if command -v docker >/dev/null 2>&1; then
  echo ""
  echo "== docker stats (no-stream) =="
  docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' || true
fi

echo ""
echo "== COHESTRA PORT PLAN (freeze after preferred ports are free or self-owned) =="
printf '%-10s %-12s %-10s %-16s %-8s %s\n' "SERVICE" "HOST IP" "HOST PORT" "CONTAINER PORT" "PUBLIC?" "OWNER"
printf '%-10s %-12s %-10s %-16s %-8s %s\n' "Web" "127.0.0.1" "$PREFERRED_WEB" "3000" "NO" "Cohestra"
printf '%-10s %-12s %-10s %-16s %-8s %s\n' "API" "127.0.0.1" "$PREFERRED_API" "8080" "NO" "Cohestra"
printf '%-10s %-12s %-10s %-16s %-8s %s\n' "nginx" "127.0.0.1" "$PREFERRED_NGINX" "80" "NO" "Cohestra"
printf '%-10s %-12s %-10s %-16s %-8s %s\n' "Postgres" "none" "none" "5432" "NO" "Cohestra"
printf '%-10s %-12s %-10s %-16s %-8s %s\n' "Redis" "none" "none" "6379" "NO" "Cohestra"
printf '%-10s %-12s %-10s %-16s %-8s %s\n' "Host proxy" "0.0.0.0" "80/443" "existing" "YES" "Shared host"
printf '%-10s %-12s %-10s %-16s %-8s %s\n' "SSH" "0.0.0.0" "22" "host" "YES" "Shared host"

echo ""
echo "Passed: $PASS  Failed: $FAIL  Warnings: $WARN"
echo "Do not deploy Cohestra until WEB/API/NGINX preferred ports are PASS or self-owned."
echo "Do not stop the existing application to free a port."
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "PORT AUDIT PASS — Cohestra host binds are free or already this project. Isolation unchanged if RAM is CONDITIONAL."
