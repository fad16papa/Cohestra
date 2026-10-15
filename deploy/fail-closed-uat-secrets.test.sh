#!/usr/bin/env bash
# Contract test for deploy/fail-closed-uat-secrets.sh
# Does not use real secrets. Never prints a value that looks like a key.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/fail-closed-uat-secrets.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

run_missing() {
  env -u DROPLET_HOST -u DROPLET_USER -u DROPLET_SSH_KEY -u DROPLET_DEPLOY_PATH \
    bash "$SCRIPT" >"$out" 2>&1 && return 0 || return 1
}

if run_missing; then
  fail "unset secrets must fail closed"
else
  pass "unset secrets fail closed"
fi

grep -q 'OWNER_GATE=missing_protected_secret' "$out" || fail "missing owner-gate marker"
grep -q 'MISSING_SECRET=DROPLET_HOST' "$out" || fail "must name DROPLET_HOST"
grep -q 'MISSING_SECRET=DROPLET_USER' "$out" || fail "must name DROPLET_USER"
grep -q 'MISSING_SECRET=DROPLET_SSH_KEY' "$out" || fail "must name DROPLET_SSH_KEY"
pass "missing secret NAMES are reported"

if grep -qiE 'BEGIN (OPENSSH |RSA )?PRIVATE KEY|-----' "$out"; then
  fail "output must not contain key material"
fi
pass "no key-material markers in failure output"

if ! DROPLET_HOST=example.invalid DROPLET_USER=deploy DROPLET_SSH_KEY=placeholder \
  bash "$SCRIPT" >"$out"; then
  fail "present required secrets must pass"
fi
grep -q 'UAT_DEPLOY_SECRETS=present' "$out" || fail "present marker missing"
grep -q 'DROPLET_DEPLOY_PATH=default' "$out" || fail "optional path should default"
pass "present required secrets pass; optional path defaults"

if ! DROPLET_HOST=example.invalid DROPLET_USER=deploy DROPLET_SSH_KEY=placeholder \
  DROPLET_DEPLOY_PATH=/home/deploy/cohestra bash "$SCRIPT" >"$out"; then
  fail "present optional path must pass"
fi
grep -q 'DROPLET_DEPLOY_PATH=present' "$out" || fail "optional path present marker missing"
if grep -q '/home/deploy/cohestra' "$out"; then
  fail "must not print the deploy path value"
fi
pass "optional path presence is boolean only"

echo "fail-closed-uat-secrets contract OK"
