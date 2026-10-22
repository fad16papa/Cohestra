#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/production-remote-deploy.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

cd "$ROOT_DIR"

run() {
  env COHESTRA_PRODUCTION_COMPOSE_CMD=true COHESTRA_ALLOW_COMPOSE_STUB=true "$@" bash "$SCRIPT" >"$out" 2>&1
}

run_args() {
  env COHESTRA_PRODUCTION_COMPOSE_CMD=true COHESTRA_ALLOW_COMPOSE_STUB=true bash "$SCRIPT" "$@" >"$out" 2>&1
}

if ! run; then
  fail "dry-run should pass with compose stub"
fi
grep -q 'COMPOSE_UP=false' "$out" || fail "compose up must be false"
grep -q 'DATABASE_MUTATED=false' "$out" || fail "database mutated must be false"
pass "dry-run remote deploy does not start workloads"

if run_args --restore-dump dump1; then
  fail "--restore-dump must fail"
fi
grep -q 'NOT_IMPLEMENTED_46_5' "$out" || fail "restore must emit NOT_IMPLEMENTED_46_5"
pass "--restore-dump is refused"

if RESTORE_DUMP=1 run; then
  fail "RESTORE_DUMP env must fail"
fi
pass "RESTORE_DUMP env is refused"

if COHESTRA_SHARED_HOST_UAT=true run; then
  fail "UAT shared host must fail"
fi
pass "COHESTRA_SHARED_HOST_UAT is refused"

if DROPLET_HOST=x run; then
  fail "UAT DROPLET_* must fail"
fi
pass "UAT DROPLET_* is refused"

if PROD_COMPOSE_PROJECT=cohestra-uat run; then
  fail "UAT compose project must fail"
fi
pass "UAT compose project is refused"

if env COHESTRA_PRODUCTION_COMPOSE_CMD=true bash "$SCRIPT" >"$out" 2>&1; then
  fail "compose stub without allow flag must fail"
fi
pass "compose stub is test-only"

if run_args --restore-dump=x; then
  fail "--restore-dump= must fail"
fi
pass "--restore-dump= attached form is refused"

if grep -qiE 'BEGIN (OPENSSH |RSA )?PRIVATE KEY' "$out"; then
  fail "no key material"
fi

echo "production-remote-deploy contract OK"
