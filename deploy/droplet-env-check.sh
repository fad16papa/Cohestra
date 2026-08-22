#!/usr/bin/env bash
# Validate production droplet .env before deploy (no secrets printed).
#
# Usage (on droplet):
#   cd ~/cohestra
#   bash deploy/droplet-env-check.sh
#   bash deploy/droplet-env-check.sh --phase p2   # include reCAPTCHA strict checks

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PHASE="${1:-p0}"
if [[ "${1:-}" == "--phase" ]]; then
  PHASE="${2:-p0}"
fi

echo "== Cohestra droplet env check (phase: ${PHASE}) =="
echo "Path: $ROOT_DIR"
echo ""

if [[ ! -f .env ]]; then
  echo "❌ .env missing — cp .env.uat.example .env && nano .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

PASS=0
FAIL=0
WARN=0

pass() { echo "✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "❌ $1"; FAIL=$((FAIL + 1)); }
warn() { echo "⚠️  $1"; WARN=$((WARN + 1)); }

echo "-- P0: core production --"

[[ -n "${PUBLIC_BASE_URL:-}" ]] && pass "PUBLIC_BASE_URL set" || fail "PUBLIC_BASE_URL missing"

if [[ -n "${SMOKE_TENANT_HOST:-}" ]]; then
  pass "SMOKE_TENANT_HOST set (${SMOKE_TENANT_HOST})"
else
  if [[ "${PUBLIC_BASE_URL:-}" != *localhost* && "${PUBLIC_BASE_URL:-}" != *127.0.0.1* ]]; then
    fail "SMOKE_TENANT_HOST missing (required for production smoke)"
  else
    warn "SMOKE_TENANT_HOST unset (OK for local only)"
  fi
fi

[[ -n "${POSTGRES_PASSWORD:-}" && "${POSTGRES_PASSWORD}" != "change-me-strong-postgres-password" ]] \
  && pass "POSTGRES_PASSWORD customized" || fail "POSTGRES_PASSWORD not set or still placeholder"

[[ -n "${JWT_SIGNING_KEY:-}" && ${#JWT_SIGNING_KEY} -ge 32 ]] \
  && pass "JWT_SIGNING_KEY length OK" || fail "JWT_SIGNING_KEY missing or too short"

[[ -n "${SendGrid__ApiKey:-}" && "${SendGrid__ApiKey}" != SG.replace-with-live-mail-send-api-key ]] \
  && pass "SendGrid__ApiKey set" || fail "SendGrid__ApiKey missing or placeholder"

[[ -n "${SendGrid__FromEmail:-}" ]] && pass "SendGrid__FromEmail set" || fail "SendGrid__FromEmail missing"

[[ "${DemoDataSeed__Enabled:-false}" != "true" ]] && pass "DemoDataSeed off" || fail "DemoDataSeed must be false"
[[ "${LoadTestSeed__Enabled:-false}" != "true" ]] && pass "LoadTestSeed off" || fail "LoadTestSeed must be false"
[[ -z "${DEV_TENANT_SLUG:-}" ]] && pass "DEV_TENANT_SLUG unset" || fail "DEV_TENANT_SLUG must not be set on production"

if [[ "${PUBLIC_BASE_URL:-}" == http://* ]]; then
  warn "PUBLIC_BASE_URL is HTTP — enable HTTPS (Phase P1) before public launch"
fi

if [[ "${PUBLIC_BASE_URL:-}" == https://* ]]; then
  pass "PUBLIC_BASE_URL uses HTTPS"
fi

echo ""
echo "-- P1: TLS / nginx (informational) --"

if [[ -n "${NGINX_CONFIG_PATH:-}" && "${NGINX_CONFIG_PATH}" == *ssl* ]]; then
  pass "NGINX_CONFIG_PATH points to SSL config"
else
  warn "NGINX_CONFIG_PATH not SSL — using default HTTP nginx config"
fi

echo ""
echo "-- P2: reCAPTCHA (Epic 19.3) --"

if [[ "$PHASE" == "p2" || "$PHASE" == "p3" ]]; then
  [[ "${SelfServeSignup__Recaptcha__Enabled:-false}" == "true" ]] \
    && pass "reCAPTCHA enabled" || fail "SelfServeSignup__Recaptcha__Enabled must be true"
  [[ -n "${SelfServeSignup__Recaptcha__SecretKey:-}" ]] \
    && pass "reCAPTCHA secret set" || fail "SelfServeSignup__Recaptcha__SecretKey missing"
  [[ "${NEXT_PUBLIC_RECAPTCHA_ENABLED:-false}" == "true" ]] \
    && pass "NEXT_PUBLIC_RECAPTCHA_ENABLED=true" || fail "Rebuild web after setting NEXT_PUBLIC_RECAPTCHA_ENABLED"
else
  if [[ "${SelfServeSignup__Recaptcha__Enabled:-false}" == "true" ]]; then
    pass "reCAPTCHA enabled"
  else
    warn "reCAPTCHA disabled — OK until Epic 19.3"
  fi
fi

echo ""
echo "-- P3: Stripe (Epic 19.4) --"

if [[ "$PHASE" == "p3" ]]; then
  [[ -n "${Stripe__SecretKey:-}" ]] && pass "Stripe secret set" || fail "Stripe__SecretKey missing"
  [[ -n "${Stripe__WebhookSecret:-}" ]] && pass "Stripe webhook secret set" || fail "Stripe__WebhookSecret missing"
  if [[ "${Stripe__SecretKey:-}" == sk_live_* ]]; then
    warn "Stripe LIVE key — ensure intentional for launch"
  else
    pass "Stripe test or non-live key"
  fi
else
  if [[ -n "${Stripe__SecretKey:-}" ]]; then
    pass "Stripe configured"
  else
    warn "Stripe unset — OK until Epic 19.4"
  fi
fi

echo ""
echo "== Summary: ${PASS} passed, ${FAIL} failed, ${WARN} warnings =="

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "Fix failures above, then run: bash deploy/preflight-launch.sh"
  exit 1
fi

echo ""
echo "Env check OK for phase ${PHASE}."
echo "Next: bash deploy/preflight-launch.sh && bash deploy/remote-deploy.sh"
