#!/usr/bin/env bash
# Read-only shared-droplet port + resource audit for Epic 19.
# Run ON THE DROPLET. Does not stop, restart, or rebind any service.
#
# Usage (SSH session on the droplet):
#   bash deploy/uat-port-audit.sh
#
# Preferred Cohestra host binds (use if free; otherwise pick nearest unused
# and freeze — do not randomize per deploy):
#   127.0.0.1:3100 web
#   127.0.0.1:5100 api
#   127.0.0.1:8180 nginx
# Postgres/Redis: no host port.

set -euo pipefail

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
echo ""

if [[ "${COMPOSE_PROJECT_NAME:-}" == "cohestra-infra-uat" ]]; then
  fail "COMPOSE_PROJECT_NAME=cohestra-infra-uat is forbidden (may be the live stack)"
fi

echo "== Host listeners (ss) =="
if command -v ss >/dev/null 2>&1; then
  ss -lntup || ss -lnt
else
  warn "ss not available — falling back to /proc/net"
  cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | head -n 40 || true
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

loopback_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -lnt "( sport = :$port )" | awk 'NR>1 {print; found=1} END {exit found?0:1}'
    return
  fi
  return 1
}

check_preferred() {
  local label="$1"
  local port="$2"
  echo "-- $label preferred 127.0.0.1:$port --"
  if loopback_in_use "$port"; then
    fail "$label preferred port $port is occupied — do not stop the occupant"
    echo "   Choose the nearest unused Cohestra-specific port and freeze it in .env"
    echo "   Suggested alternatives: $((port + 10)), $((port + 20)), $((port + 100))"
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
  if loopback_in_use "$port"; then
    pass "Host :$port is in use (expected for shared droplet / SSH)"
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
if command -v free >/dev/null 2>&1; then
  free -m
  total_mb=$(free -m | awk '/Mem:/ {print $2}')
  avail_mb=$(free -m | awk '/Mem:/ {print $7}')
  echo "MemTotalMiB=$total_mb MemAvailableMiB=$avail_mb"
  if [[ "${total_mb:-0}" -lt 3500 ]]; then
    fail "Host has under 3.5 GiB RAM — isolated Cohestra + existing stack is FAIL without resize"
  elif [[ "${avail_mb:-0}" -lt 1200 ]]; then
    warn "Available RAM under 1.2 GiB — SHARED UAT HOSTING is CONDITIONAL (do not build both stacks at once)"
  else
    pass "Memory headroom looks sufficient for a cautious isolated start"
  fi
else
  warn "free not available"
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
echo "== COHESTRA PORT PLAN (proposed; freeze only after preferred ports are free) =="
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
echo "Do not deploy Cohestra until WEB/API/NGINX preferred ports are PASS."
echo "Do not stop the existing application to free a port."
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "PORT AUDIT PASS — preferred Cohestra host binds are free. Next: env reconcile, then isolated compose up."
