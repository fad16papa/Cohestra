#!/usr/bin/env bash
# Contract for deploy/exact-sha-secret-scan.sh. No live GitHub. No real secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCAN="$ROOT_DIR/deploy/exact-sha-secret-scan.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$SCAN" ]] || fail "exact-sha-secret-scan.sh missing"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git init -q -b main "$TMP"
git -C "$TMP" config user.email test@example.com
git -C "$TMP" config user.name testd
echo clean >"$TMP/ok.txt"
git -C "$TMP" add ok.txt
git -C "$TMP" commit -q -m clean
CLEAN="$(git -C "$TMP" rev-parse HEAD)"

out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" bash "$SCAN")" || { echo "$out"; fail "clean tree must pass"; }
echo "$out" | grep -q 'RESULT=PASS' || fail "clean tree missing RESULT=PASS"
pass "clean exact-SHA tree PASSES"

# Split the marker so this test file is not itself a finding.
PREFIX='-----BEGIN OPENSSH '
SUFFIX='PRIVATE KEY-----'
printf '%s%s\nplaceholder\n-----END OPENSSH PRIVATE KEY-----\n' "$PREFIX" "$SUFFIX" >"$TMP/leaked.pem"
git -C "$TMP" add leaked.pem
git -C "$TMP" commit -q -m leaked
DIRTY="$(git -C "$TMP" rev-parse HEAD)"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$DIRTY" bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "planted private-key marker must HOLD"
fi
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "dirty tree missing RESULT=HOLD"; }
echo "$out" | grep -q 'BEGIN OPENSSH' && fail "scan output must not print the secret marker"
pass "planted private-key marker HOLDs without printing the secret"

# The scanner must run against a specific SHA, not a dirty worktree.
printf 'AKIA%s\n' '0123456789ABCDEF' >"$TMP/worktree-only.txt"
out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" bash "$SCAN")" || { echo "$out"; fail "worktree-only dirt must not fail a clean SHA"; }
echo "$out" | grep -q 'RESULT=PASS' || fail "clean SHA must ignore uncommitted worktree dirt"
pass "scan is bound to the exact SHA tree"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "unknown SCAN_SHA must not PASS"
fi
echo "$out" | grep -qE 'RESULT=(HOLD|REFUSE)' || { echo "$out"; fail "unknown SHA missing HOLD/REFUSE"; }
pass "broken/unknown SCAN_SHA fails closed"

echo "exact-sha-secret-scan contract OK"
