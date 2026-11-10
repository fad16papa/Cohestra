#!/usr/bin/env bash
# Non-destructive 46.4 contract tests. Never prints interpolated secrets.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT_DIR/docker-compose.production.yml"
CONTRACT="$ROOT_DIR/deploy/validate-production-runtime-secrets.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

if ! bash "$CONTRACT" >"$out"; then
  cat "$out"
  fail "runtime secrets contract must pass"
fi
grep -q 'Production runtime / secrets isolation contract PASS' "$out" || fail "contract PASS marker"
pass "validate-production-runtime-secrets.sh"

if ! bash "$ROOT_DIR/deploy/validate-production-compose.sh" >"$out"; then
  fail "existing Production compose contract must still pass"
fi
pass "validate-production-compose.sh still PASS"

if ! bash "$ROOT_DIR/deploy/compare-classified-secrets.test.sh" >"$out"; then
  cat "$out"
  fail "classified isolation tests"
fi
pass "classified isolation fixtures"

if ! bash "$ROOT_DIR/deploy/prepare-production-host-env.test.sh" >"$out"; then
  cat "$out"
  fail "host env procedure tests"
fi
pass "host env procedure"

if ! bash "$ROOT_DIR/deploy/validate-uat-isolation.sh" >"$out"; then
  fail "UAT isolation contract"
fi
pass "UAT isolation"

# Compose interpolation fail-closed: missing required secrets must not render.
if command -v docker >/dev/null 2>&1; then
  cfg="$(mktemp)"
  err="$(mktemp)"
  trap 'rm -f "$out" "$cfg" "$err"' EXIT
  set +e
  env -u POSTGRES_PASSWORD -u REDIS_PASSWORD -u JWT_SIGNING_KEY \
    -u PUBLIC_BASE_URL -u SendGrid__ApiKey -u SendGrid__FromEmail \
    -u SelfServeSignup__RegistrationClosed -u SelfServeSignup__Recaptcha__Enabled \
    docker compose -f "$COMPOSE" --project-name cohestra-production config >"$cfg" 2>"$err"
  rc=$?
  set -e
  if [[ "$rc" -eq 0 ]]; then
    fail "compose config must fail closed without required secrets"
  fi
  if grep -qiE 'SG\.[A-Za-z0-9]{8,}|BEGIN (OPENSSH |RSA )?PRIVATE KEY' "$cfg" "$err"; then
    fail "compose failure output leaked a secret-like value"
  fi
  pass "compose config fails closed on missing secrets without leakage"

  set +e
  export POSTGRES_PASSWORD=synthetic-compose-postgres
  export REDIS_PASSWORD=synthetic-compose-redis
  export JWT_SIGNING_KEY=synthetic-compose-jwt-signing-key-32
  export PUBLIC_BASE_URL=https://cohestra.app
  export SendGrid__ApiKey=SG.syntheticComposeKeyIndependent
  export SendGrid__FromEmail=noreply@cohestra.app
  export SelfServeSignup__RegistrationClosed=true
  export SelfServeSignup__Recaptcha__Enabled=false
  docker compose -f "$COMPOSE" --project-name cohestra-production config >"$cfg" 2>"$err"
  rc=$?
  unset POSTGRES_PASSWORD REDIS_PASSWORD JWT_SIGNING_KEY PUBLIC_BASE_URL SendGrid__ApiKey SendGrid__FromEmail SelfServeSignup__RegistrationClosed SelfServeSignup__Recaptcha__Enabled
  set -e
  if [[ "$rc" -ne 0 ]]; then
    fail "compose config should parse with synthetic required names (stderr suppressed)"
  fi
  if grep -q 'synthetic-compose' "$cfg" && grep -q 'password:' "$cfg"; then
    # docker compose config interpolates; this test must not print that file.
    :
  fi
  pass "compose config parses with synthetic names (interpolated file not printed)"
else
  if [[ "${CI:-}" == "true" ]]; then
    fail "docker required in CI to prove compose fail-closed"
  else
    pass "docker not present — skipped compose fail-closed parse"
  fi
fi

if [[ -e "$ROOT_DIR/.env.production" ]]; then
  fail "test must not leave .env.production in the repo"
fi
pass "no .env.production created"

echo "46.4 runtime secrets validation OK"
