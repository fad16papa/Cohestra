#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/reset-production-sha.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git init -q -b main "$TMP/remote"
git -C "$TMP/remote" config user.email test@example.com
git -C "$TMP/remote" config user.name testd
echo one >"$TMP/remote/f"
git -C "$TMP/remote" add f
git -C "$TMP/remote" commit -q -m one
FIRST="$(git -C "$TMP/remote" rev-parse HEAD)"
echo two >"$TMP/remote/f"
git -C "$TMP/remote" add f
git -C "$TMP/remote" commit -q -m two
SECOND="$(git -C "$TMP/remote" rev-parse HEAD)"

git clone -q "$TMP/remote" "$TMP/local"
git -C "$TMP/local" config user.email test@example.com
git -C "$TMP/local" config user.name testd
cd "$TMP/local"
git fetch -q origin main

run_script() {
  DEPLOY_SHA="$1" DEPLOY_BRANCH=main bash "$SCRIPT"
}

for bad in "" HEAD latest github.sha; do
  if DEPLOY_SHA="$bad" DEPLOY_BRANCH=main bash "$SCRIPT" >/dev/null 2>&1; then
    fail "must refuse ${bad:-empty}"
  fi
done
pass "empty/HEAD/latest/github.sha are refused"

out="$(run_script "$FIRST")" || fail "ancestor SHA should be accepted"
[[ "$(git rev-parse HEAD)" == "$FIRST" ]] || fail "accepted SHA must be checked out"
echo "$out" | grep -qx "EXPECTED_SHA=${FIRST}" || fail "EXPECTED_SHA"
echo "$out" | grep -qx "GIT_SHA=${FIRST}" || fail "GIT_SHA export"
pass "ancestor DEPLOY_SHA is checked out"

if run_script "${FIRST^^}" >/dev/null; then
  [[ "$(git rev-parse HEAD)" == "$FIRST" ]] || fail "uppercase SHA must reset exactly"
else
  fail "uppercase ancestor SHA should be accepted"
fi
pass "uppercase DEPLOY_SHA is normalized"

if run_script "not-a-sha" >/dev/null 2>&1; then
  fail "malformed SHA must be refused"
fi
pass "malformed SHA is refused"

if run_script "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" >/dev/null 2>&1; then
  fail "unknown SHA must be refused"
fi
pass "unknown SHA is refused"

git checkout -q --orphan other
echo other >other
git add other
git commit -q -m other
ORPHAN="$(git rev-parse HEAD)"
git checkout -q main
if run_script "$ORPHAN" >/dev/null 2>&1; then
  fail "non-ancestor SHA must be refused"
fi
pass "non-ancestor SHA is refused"

run_script "$SECOND" >/dev/null || fail "tip SHA should be accepted"
[[ "$(git rev-parse HEAD)" == "$SECOND" ]] || fail "tip reset"
pass "origin/main tip is accepted when explicit"

echo "reset-production-sha contract OK"
