#!/usr/bin/env bash
# Pre-flight checks before UAT/production deploy (Epic 19.1 / 19.3).
#
# Usage:
#   cp .env.uat.example .env   # fill secrets
#   bash deploy/preflight-launch.sh
#   bash deploy/preflight-launch.sh --strict-recaptcha
#
# Exits non-zero when required production gates fail.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STRICT_RECAPTCHA=false
if [[ "${1:-}" == "--strict-recaptcha" ]]; then
  STRICT_RECAPTCHA=true
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "❌ Missing .env — copy from .env.uat.example and fill secrets."
  exit 1
fi

PASS=0
FAIL=0
WARN=0

pass() { echo "✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "❌ $1"; FAIL=$((FAIL + 1)); }
warn() { echo "⚠️  $1"; WARN=$((WARN + 1)); }

require_nonempty() {
  local label="$1"
  local value="${2:-}"
  if [[ -n "$value" ]]; then
    pass "$label set"
  else
    fail "$label missing"
  fi
}

require_nonempty "PUBLIC_BASE_URL" "${PUBLIC_BASE_URL:-}"
require_nonempty "POSTGRES_PASSWORD" "${POSTGRES_PASSWORD:-}"
require_nonempty "JWT_SIGNING_KEY" "${JWT_SIGNING_KEY:-}"
require_nonempty "SendGrid__ApiKey" "${SendGrid__ApiKey:-}"

if [[ "${POSTGRES_PASSWORD:-}" == "crm" ]]; then
  fail "POSTGRES_PASSWORD must not be dev default 'crm'"
else
  pass "POSTGRES_PASSWORD is not dev default"
fi

if [[ "${JWT_SIGNING_KEY:-}" == *"dev-compose-jwt"* ]]; then
  fail "JWT_SIGNING_KEY must not be dev-compose default"
elif [[ ${#JWT_SIGNING_KEY} -lt 32 ]]; then
  fail "JWT_SIGNING_KEY must be at least 32 characters"
else
  pass "JWT_SIGNING_KEY length OK"
fi

if [[ "${DemoDataSeed__Enabled:-false}" == "true" ]]; then
  fail "DemoDataSeed__Enabled must be false for launch"
else
  pass "DemoDataSeed__Enabled is false or unset"
fi

if [[ "${LoadTestSeed__Enabled:-false}" == "true" ]]; then
  fail "LoadTestSeed__Enabled must be false for launch"
else
  pass "LoadTestSeed__Enabled is false or unset"
fi

if [[ "${OperatorSeed__Enabled:-false}" == "true" ]]; then
  warn "OperatorSeed__Enabled=true — use only for one-time bootstrap, then disable"
else
  pass "OperatorSeed__Enabled is false or unset"
fi

if [[ -n "${DEV_TENANT_SLUG:-}" ]]; then
  fail "DEV_TENANT_SLUG must not be set in production/UAT"
else
  pass "DEV_TENANT_SLUG unset"
fi

RECAPTCHA_ENABLED="${SelfServeSignup__Recaptcha__Enabled:-false}"
if [[ "$STRICT_RECAPTCHA" == true || "$RECAPTCHA_ENABLED" == "true" ]]; then
  require_nonempty "SelfServeSignup__Recaptcha__SecretKey" "${SelfServeSignup__Recaptcha__SecretKey:-}"
  require_nonempty "NEXT_PUBLIC_RECAPTCHA_SITE_KEY" "${NEXT_PUBLIC_RECAPTCHA_SITE_KEY:-}"
  if [[ "${NEXT_PUBLIC_RECAPTCHA_ENABLED:-false}" != "true" ]]; then
    fail "NEXT_PUBLIC_RECAPTCHA_ENABLED must be true when reCAPTCHA is enabled (rebuild web after change)"
  else
    pass "NEXT_PUBLIC_RECAPTCHA_ENABLED=true"
  fi
else
  warn "reCAPTCHA disabled — enable before public signup (Story 19.3)"
fi

if [[ -n "${Stripe__SecretKey:-}" || -n "${Stripe__WebhookSecret:-}" ]]; then
  fail "Stripe keys must not be set — billing is Paddle (Epic 29 / Story 19.4)"
fi

if [[ -n "${Paddle__ApiKey:-}" ]]; then
  require_nonempty "Paddle__WebhookSecret" "${Paddle__WebhookSecret:-}"
  require_nonempty "Paddle__ClientToken" "${Paddle__ClientToken:-}"
  if [[ "${Paddle__Environment:-sandbox}" == "production" ]]; then
    warn "Paddle__Environment=production — UAT should use sandbox until public launch"
  else
    pass "Paddle sandbox configured"
  fi
else
  warn "Paddle__ApiKey unset — stack smoke (19.1) can proceed; billing UAT (19.4) needs sandbox keys"
fi

echo ""
echo "=== Preflight summary ==="
echo "Passed: ${PASS} | Failed: ${FAIL} | Warnings: ${WARN}"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi

echo "Preflight OK — proceed with docker compose up"
