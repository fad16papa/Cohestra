#!/usr/bin/env bash
# Story 46.9 — Production CSP contract.
# Shared nginx must allow live Paddle. A live-only snippet must exist that
# does not require sandbox Paddle hosts. Live header verification on
# https://cohestra.app remains PENDING until 46.13 TLS.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_CONF="$ROOT/deploy/nginx/app.conf"
SSL_CONF="$ROOT/deploy/nginx/app-ssl.conf.template"
LIVE_SNIPPET="$ROOT/deploy/nginx/production-live-csp.snippet"
TS_CSP="$ROOT/web/content-security-policy.ts"

pass=0
fail=0

pass() { echo "PASS: $1"; pass=$((pass + 1)); }
fail() { echo "FAIL: $1"; fail=$((fail + 1)); }

for origin in https://cdn.paddle.com https://buy.paddle.com https://api.paddle.com; do
  if grep -qF "$origin" "$APP_CONF"; then
    pass "app.conf allows $origin"
  else
    fail "app.conf missing live Paddle origin $origin"
  fi
  if grep -qF "$origin" "$SSL_CONF"; then
    pass "app-ssl.conf.template allows $origin"
  else
    fail "app-ssl.conf.template missing live Paddle origin $origin"
  fi
done

if grep -qF "https://www.google.com" "$APP_CONF" && grep -qF "https://www.recaptcha.net" "$APP_CONF"; then
  pass "app.conf allows reCAPTCHA hosts"
else
  fail "app.conf missing reCAPTCHA hosts"
fi

if [[ -f "$LIVE_SNIPPET" ]]; then
  pass "production-live-csp.snippet exists"
else
  fail "production-live-csp.snippet is missing"
fi

if grep -qF "https://cdn.paddle.com" "$LIVE_SNIPPET" \
  && grep -qF "https://buy.paddle.com" "$LIVE_SNIPPET" \
  && grep -qF "https://api.paddle.com" "$LIVE_SNIPPET"; then
  pass "live CSP snippet allows live Paddle"
else
  fail "live CSP snippet missing live Paddle origins"
fi

if grep -qE 'sandbox-(cdn|buy|api)\.paddle\.com' "$LIVE_SNIPPET"; then
  fail "live CSP snippet must not require sandbox Paddle hosts"
else
  pass "live CSP snippet does not require sandbox Paddle"
fi

if grep -q 'paddleMode: "live"' "$TS_CSP" \
  || grep -q "paddleMode: 'live'" "$TS_CSP"; then
  pass "TypeScript CSP exposes a live-only Paddle mode"
else
  fail "content-security-policy.ts must expose paddleMode live"
fi

echo
echo "Production CSP contract: ${pass} passed, ${fail} failed"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
