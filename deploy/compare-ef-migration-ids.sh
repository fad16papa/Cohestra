#!/usr/bin/env bash
# Compare a pasted __EFMigrationsHistory ID list to the repo Up() contract.
# Does not connect to the droplet. Does not mutate anything.
#
# Usage:
#   # after owner pastes MigrationId lines (no headers) into a file:
#   bash deploy/compare-ef-migration-ids.sh /tmp/uat-migration-ids.txt
#   bash deploy/compare-ef-migration-ids.sh --self-test

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXPECTED="$ROOT_DIR/deploy/expected-ef-migration-ids.txt"
ORPHAN_CANDIDATE="20260830140000_AddTenantEmailOnNewRegistration"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

normalize_ids() {
  sed -E 's/\r$//; s/^[[:space:]]+//; s/[[:space:]]+$//' \
    | grep -E '^[0-9]{14}_[A-Za-z0-9_]+$' \
    | sort -u
}

self_test() {
  echo "== compare-ef-migration-ids self-test =="
  local tmp extra
  tmp=$(mktemp)
  extra=$(mktemp)
  normalize_ids < "$EXPECTED" > "$tmp"
  local disk
  disk=$(find "$ROOT_DIR/src/Infrastructure/Persistence/Migrations" -name '*.cs' \
    ! -name '*Designer.cs' ! -name 'CohestraDbContextModelSnapshot.cs' \
    -printf '%f\n' | sed 's/\.cs$//' | sort)
  if [[ "$(wc -l < "$tmp")" -eq 50 ]] && [[ "$(printf '%s\n' "$disk")" == "$(cat "$tmp")" ]]; then
    pass "expected list has 50 unique IDs matching Up() files (not ModelSnapshot)"
  else
    fail "expected list must have 50 unique IDs matching Up() files"
  fi
  if ! grep -qx "$ORPHAN_CANDIDATE" "$tmp"; then
    pass "expected list does not include deleted orphan ID"
  else
    fail "expected list must not include $ORPHAN_CANDIDATE"
  fi
  {
    cat "$tmp"
    echo "$ORPHAN_CANDIDATE"
  } > "$extra"
  if ! diff -q "$tmp" <(normalize_ids < "$extra") >/dev/null; then
    pass "extra ID is detectable"
  else
    fail "extra ID should not match expected"
  fi
  rm -f "$tmp" "$extra"
  echo "Passed: $PASS  Failed: $FAIL"
  [[ "$FAIL" -eq 0 ]]
}

if [[ "${1:-}" == "--self-test" ]]; then
  self_test
  exit $?
fi

PASTED="${1:-}"
if [[ -z "$PASTED" || ! -f "$PASTED" ]]; then
  echo "Usage: bash deploy/compare-ef-migration-ids.sh <pasted-ids-file>" >&2
  exit 2
fi

exp=$(mktemp)
got=$(mktemp)
normalize_ids < "$EXPECTED" > "$exp"
normalize_ids < "$PASTED" > "$got"

echo "expected_count=$(wc -l < "$exp")"
echo "applied_count=$(wc -l < "$got")"
echo "orphan_candidate=${ORPHAN_CANDIDATE}"

only_applied=$(comm -13 "$exp" "$got")
only_expected=$(comm -23 "$exp" "$got")

if [[ -z "$only_applied" ]]; then
  echo "extra_applied=none"
else
  echo "extra_applied:"
  printf '%s\n' "$only_applied"
  if grep -qx "$ORPHAN_CANDIDATE" <<<"$only_applied"; then
    echo "NOTE: extra ID matches deleted orphan $ORPHAN_CANDIDATE (no Designer.cs; folded into AddTenantFormTemplates). Confirm tenants.EmailOnNewRegistration exists. Do not DELETE the history row without a schema check."
  else
    echo "NOTE: extra ID is NOT the known orphan. Treat as an unmerged/unknown apply until the schema object is identified."
  fi
fi

if [[ -z "$only_expected" ]]; then
  echo "missing_from_db=none"
else
  echo "missing_from_db:"
  printf '%s\n' "$only_expected"
fi

if [[ -z "$only_applied" && -z "$only_expected" ]]; then
  echo "RESULT=MATCH"
  rm -f "$exp" "$got"
  exit 0
fi

echo "RESULT=MISMATCH"
rm -f "$exp" "$got"
exit 1
