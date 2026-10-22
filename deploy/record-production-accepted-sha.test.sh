#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/record-production-accepted-sha.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
LEDGER="$TMP/accepted-sha"
SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

out="$(ACCEPTED_SHA="$SHA" COHESTRA_ACCEPTED_SHA_LEDGER="$LEDGER" bash "$SCRIPT")" || fail "fixture write should pass"
echo "$out" | grep -qx "LEDGER_WRITE=appended" || fail "append marker"
grep -qx "$SHA" "$LEDGER" || fail "ledger must contain SHA"
pass "fixture ledger appends 40-hex SHA"

out="$(ACCEPTED_SHA="$SHA" COHESTRA_ACCEPTED_SHA_LEDGER="$LEDGER" bash "$SCRIPT")" || fail "repeat write should pass"
echo "$out" | grep -qx "LEDGER_WRITE=already_present" || fail "idempotent marker"
[[ "$(wc -l <"$LEDGER")" -eq 1 ]] || fail "must not duplicate"
pass "repeat write is idempotent"

if ACCEPTED_SHA=not-a-sha COHESTRA_ACCEPTED_SHA_LEDGER="$LEDGER" bash "$SCRIPT" >/dev/null 2>&1; then
  fail "malformed SHA must be refused"
fi
pass "malformed SHA is refused"

out="$(ACCEPTED_SHA="$SHA" bash "$SCRIPT")" || fail "real ledger path should skip in 46.3"
echo "$out" | grep -qx "LEDGER_WRITE=not_executed" || fail "real ledger must not be written"
[[ ! -e /var/lib/cohestra-production/accepted-sha ]] || fail "real Production ledger must stay untouched"
pass "real Production ledger is not written"

echo "record-production-accepted-sha contract OK"
