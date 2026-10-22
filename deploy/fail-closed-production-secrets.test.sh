#!/usr/bin/env bash
# Contract test for deploy/fail-closed-production-secrets.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/fail-closed-production-secrets.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

clear_env() {
  env -u PROD_DROPLET_HOST -u PROD_DROPLET_USER -u PROD_DROPLET_SSH_KEY \
    -u PROD_DROPLET_DEPLOY_PATH -u PROD_PUBLIC_BASE_URL \
    "$@"
}

if clear_env bash "$SCRIPT" >"$out" 2>&1; then
  fail "unset secrets must fail closed"
fi
grep -q 'OWNER_GATE=missing_protected_secret' "$out" || fail "owner-gate marker"
grep -q 'ENVIRONMENT=production' "$out" || fail "environment marker"
for name in PROD_DROPLET_HOST PROD_DROPLET_USER PROD_DROPLET_SSH_KEY PROD_DROPLET_DEPLOY_PATH PROD_PUBLIC_BASE_URL; do
  grep -q "MISSING_SECRET=${name}" "$out" || fail "must name ${name}"
done
if grep -qiE 'BEGIN (OPENSSH |RSA )?PRIVATE KEY|-----' "$out"; then
  fail "output must not contain key material"
fi
pass "missing secret NAMES are reported without values"

present_env=(
  PROD_DROPLET_HOST=159.223.55.242
  PROD_DROPLET_USER=deploy
  PROD_DROPLET_SSH_KEY=placeholder
  PROD_DROPLET_DEPLOY_PATH=/home/deploy/cohestra-production
  PROD_PUBLIC_BASE_URL=http://159.223.55.242
)

for name in PROD_DROPLET_HOST PROD_DROPLET_USER PROD_DROPLET_SSH_KEY PROD_DROPLET_DEPLOY_PATH PROD_PUBLIC_BASE_URL; do
  if env "${present_env[@]}" "${name}=   " bash "$SCRIPT" >"$out" 2>&1; then
    fail "whitespace-only ${name} must fail closed"
  fi
  grep -q "MISSING_SECRET=${name}" "$out" || fail "whitespace-only ${name} must be named"
done
pass "whitespace-only secrets fail closed"

if ! env "${present_env[@]}" bash "$SCRIPT" >"$out" 2>&1; then
  fail "present required secrets must pass"
fi
grep -q 'PROD_DEPLOY_SECRETS=present' "$out" || fail "present marker missing"
if grep -q '159.223.55.242' "$out" || grep -q 'placeholder' "$out" || grep -q '/home/deploy' "$out"; then
  fail "must not print secret or path values"
fi
pass "present secrets pass with names only"

echo "fail-closed-production-secrets contract OK"
