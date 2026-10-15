#!/usr/bin/env bash
# Contract test for deploy/reset-accepted-sha.sh using a throwaway repo.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/reset-accepted-sha.sh"

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
cd "$TMP/local"
git fetch -q origin main
DEPLOY_BRANCH=main

DEPLOY_SHA=""
reset_accepted_sha || fail "empty DEPLOY_SHA should reset to origin/main"
[[ "$(git rev-parse HEAD)" == "$SECOND" ]] || fail "default reset must land on origin/main"
pass "empty DEPLOY_SHA resets to origin/main"

DEPLOY_SHA="$FIRST"
reset_accepted_sha || fail "ancestor SHA should be accepted"
[[ "$(git rev-parse HEAD)" == "$FIRST" ]] || fail "accepted SHA must be checked out"
pass "ancestor DEPLOY_SHA is checked out"

DEPLOY_SHA="not-a-sha"
if reset_accepted_sha; then
  fail "malformed DEPLOY_SHA must be refused"
fi
pass "malformed DEPLOY_SHA is refused"

DEPLOY_SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
if reset_accepted_sha; then
  fail "unknown DEPLOY_SHA must be refused"
fi
pass "unknown DEPLOY_SHA is refused"

echo "reset-accepted-sha contract OK"
