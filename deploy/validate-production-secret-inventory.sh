#!/usr/bin/env bash
# Story 46.9 — secret inventory contract (names only, no values).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLE="$ROOT/.env.production.example"
INVENTORY="$ROOT/docs/deploy/production-secret-inventory.md"
COMPOSE="$ROOT/docker-compose.production.yml"

pass=0
fail=0
pass() { echo "PASS: $1"; pass=$((pass + 1)); }
fail() { echo "FAIL: $1"; fail=$((fail + 1)); }

if [[ -f "$EXAMPLE" ]]; then
  pass ".env.production.example exists"
else
  fail ".env.production.example missing"
fi

if grep -vE '^[[:space:]]*(#|$)' "$EXAMPLE" | grep -qE '^[A-Za-z0-9_.-]+='; then
  fail ".env.production.example must stay names-only (no KEY=value assignments)"
else
  pass ".env.production.example has no KEY=value assignments"
fi

if grep -qiE 'sk_live_|pdl_live_|SG\.[A-Za-z0-9]|BEGIN (OPENSSH|RSA) PRIVATE KEY' "$EXAMPLE" "$INVENTORY"; then
  fail "example/inventory must not contain credential material"
else
  pass "example/inventory contain no credential material"
fi

required_names=(
  JWT_SIGNING_KEY
  POSTGRES_PASSWORD
  REDIS_PASSWORD
  SendGrid__ApiKey
  Paddle__ApiKey
  Paddle__ClientToken
  Paddle__WebhookSecret
  SelfServeSignup__Recaptcha__SecretKey
)

for name in "${required_names[@]}"; do
  if grep -qF "$name" "$EXAMPLE" && grep -qF "$name" "$INVENTORY"; then
    pass "secret name $name listed in example and inventory"
  else
    fail "secret name $name missing from example or inventory"
  fi
done

if grep -q 'TestBypassToken\|NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN\|test-captcha-pass' "$COMPOSE"; then
  fail "Production compose must not inject recaptcha bypass secrets"
else
  pass "Production compose does not inject recaptcha bypass secrets"
fi

if grep -q 'Do not set SelfServeSignup__Recaptcha__TestBypassToken' "$EXAMPLE"; then
  pass "example forbids recaptcha bypass token"
else
  fail "example must forbid recaptcha bypass token"
fi

echo
echo "Production secret inventory: ${pass} passed, ${fail} failed"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
