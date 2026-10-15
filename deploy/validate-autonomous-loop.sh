#!/usr/bin/env bash
# Repo-side 45.8 loop contract. No secrets. No live UAT.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POLICY="$ROOT_DIR/_bmad-output/planning-artifacts/autonomous-merge-policy.md"
LOOP="$ROOT_DIR/_bmad-output/planning-artifacts/autonomous-delivery-loop.md"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$POLICY" ]] || fail "missing autonomous-merge-policy.md"
[[ -f "$LOOP" ]] || fail "missing autonomous-delivery-loop.md"
grep -q 'Status: \*\*APPROVED\*\*' "$POLICY" || fail "merge policy must remain APPROVED"
grep -q 'Production/live cutover remains owner' "$POLICY" || fail "production must stay owner-gated in the policy"
grep -q 'NO-GO' "$LOOP" || fail "loop must keep production NO-GO"
grep -q 'MISSING_SECRET' "$LOOP" || fail "loop must name missing-secret owner gates"
grep -q 'acceptance-summary.json' "$LOOP" || fail "loop must require acceptance-summary.json"
grep -q 'Do not ask the owner to SSH' "$LOOP" || fail "loop must forbid routine owner SSH"
pass "autonomous loop contract"

echo "autonomous-loop contract OK"
