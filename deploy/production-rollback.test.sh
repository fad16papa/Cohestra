#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

if grep -nE 'psql|pg_restore|down -v' "$ROOT_DIR/deploy/production-rollback.sh"; then
  fail "rollback script must not contain database commands"
fi
pass "rollback script has no DB commands"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
build_provenance_fixture "$TMP"
cd "$PROVENANCE_LOCAL"

export COHESTRA_GH_API_MOCK="$ROOT_DIR/deploy/lib/production-gh-api-mock.sh"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
export GITHUB_REPOSITORY="fad16papa/Cohestra"
export ORIGIN_MAIN_REF="origin/main"
export COHESTRA_ROOT="$ROOT_DIR"
export COHESTRA_PRODUCTION_COMPOSE_CMD=true
export COHESTRA_ACCEPTED_SHA_LEDGER="$TMP/ledger"
printf '%s\n' "$PROVENANCE_MERGE" >"$COHESTRA_ACCEPTED_SHA_LEDGER"

run() {
  env ROLLBACK_SHA="${1:-}" bash "$ROOT_DIR/deploy/production-rollback.sh"
}

if ! run "$PROVENANCE_MERGE" >/dev/null 2>&1; then
  fail "accepted merge SHA should rollback"
fi
pass "explicit accepted SHA rollbacks"

if ROLLBACK_SHA= bash "$ROOT_DIR/deploy/production-rollback.sh" >/dev/null 2>&1; then
  fail "missing SHA must be refused"
fi
pass "missing SHA is refused"

if run "not-a-sha" >/dev/null 2>&1; then
  fail "malformed SHA must be refused"
fi
pass "malformed SHA is refused"

if run "$PROVENANCE_HEAD" >/dev/null 2>&1; then
  fail "unaccepted SHA must be refused"
fi
pass "unaccepted SHA is refused"

if ROLLBACK_SHA="$PROVENANCE_MERGE" bash "$ROOT_DIR/deploy/production-rollback.sh" --restore-dump x >/dev/null 2>&1; then
  fail "--restore-dump must be refused"
fi
pass "DB restore is refused"

echo "production-rollback contract OK"
