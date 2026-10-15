#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/fetch-uat-acceptance.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

if env -u DROPLET_HOST -u DROPLET_USER -u DROPLET_SSH_KEY bash "$SCRIPT" >"$out" 2>&1; then
  fail "unset secrets must fail closed"
fi
grep -q 'MISSING_SECRET=DROPLET_HOST' "$out" || fail "must name DROPLET_HOST"
grep -q 'MISSING_SECRET=DROPLET_SSH_KEY' "$out" || fail "must name DROPLET_SSH_KEY"
if grep -qiE 'BEGIN (OPENSSH |RSA )?PRIVATE KEY|-----' "$out"; then
  fail "must not print key material"
fi
pass "fetch fails closed with secret NAMES only"

echo "fetch-uat-acceptance contract OK"
