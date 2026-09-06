#!/usr/bin/env bash
# Fail-closed proof that Cohestra API targets dedicated Docker DNS,
# not the existing application's host loopback 5432/6379.
# Redacts password/key material. Does not migrate.
#
# Usage (on the droplet, after cohestra-uat is running):
#   bash deploy/host-proxy/prove-cohestra-data-targets.sh

set -euo pipefail

API="${COHESTRA_API_CONTAINER:-cohestra-uat-api}"
PG="${COHESTRA_POSTGRES_CONTAINER:-cohestra-uat-postgres}"
RD="${COHESTRA_REDIS_CONTAINER:-cohestra-uat-redis}"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if ! docker inspect "$API" >/dev/null 2>&1; then
  echo "REFUSE: $API is not running — cannot prove data targets." >&2
  exit 1
fi

pg_conn=$(docker exec "$API" sh -c 'printf %s "${ConnectionStrings__DefaultConnection:-}"')
rd_conn=$(docker exec "$API" sh -c 'printf %s "${ConnectionStrings__Redis:-}"')

redact() {
  echo "$1" | sed -E 's/Password=[^;]*/Password=REDACTED/g; s/password=[^;]*/password=REDACTED/g'
}

echo "API postgres (redacted): $(redact "$pg_conn")"
echo "API redis (redacted): $(redact "$rd_conn")"

if echo "$pg_conn" | grep -qE 'Host=postgres(;|$)' && echo "$pg_conn" | grep -qE 'Port=5432'; then
  pass "API postgres target is Docker DNS postgres:5432"
else
  fail "API postgres target is not Host=postgres;Port=5432"
fi
if echo "$pg_conn" | grep -qE '127\.0\.0\.1|localhost'; then
  fail "API postgres target mentions host loopback — that is lead-generation-crm"
fi

if echo "$rd_conn" | grep -qE '^redis:6379'; then
  pass "API redis target is Docker DNS redis:6379"
else
  fail "API redis target is not redis:6379"
fi
if echo "$rd_conn" | grep -qE '127\.0\.0\.1|localhost'; then
  fail "API redis target mentions host loopback — that is lead-generation-crm"
fi

if docker inspect "$PG" >/dev/null 2>&1; then
  ports=$(docker inspect --format '{{json .NetworkSettings.Ports}}' "$PG")
  if echo "$ports" | grep -qE '5432/tcp":\[\{'; then
    fail "$PG publishes a host port"
  else
    pass "$PG has no host publication"
  fi
else
  fail "$PG missing"
fi

if docker inspect "$RD" >/dev/null 2>&1; then
  ports=$(docker inspect --format '{{json .NetworkSettings.Ports}}' "$RD")
  if echo "$ports" | grep -qE '6379/tcp":\[\{'; then
    fail "$RD publishes a host port"
  else
    pass "$RD has no host publication"
  fi
else
  fail "$RD missing"
fi

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  echo "DATA TARGET PROOF: FAIL — do not migrate."
  exit 1
fi
echo "DATA TARGET PROOF: PASS — migrations may target Cohestra postgres only."
