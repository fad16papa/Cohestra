#!/usr/bin/env bash
# In-run AD-17 provenance negatives. No DROPLET secrets. No SSH.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/write-uat-deploy-provenance.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -x "$SCRIPT" || -f "$SCRIPT" ]] || fail "write-uat-deploy-provenance.sh missing"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git init -q -b release/uat "$TMP/r"
git -C "$TMP/r" config user.email t@t
git -C "$TMP/r" config user.name t
echo x >"$TMP/r/f"
git -C "$TMP/r" add f
git -C "$TMP/r" commit -q -m base
SHA="$(git -C "$TMP/r" rev-parse HEAD)"
cd "$TMP/r"

if out="$(SCAN_SHA=notasha UAT_PROVENANCE_DIR="$TMP/ev" GITHUB_REF=refs/heads/release/uat bash "$SCRIPT" 2>&1)"; then
  echo "$out"
  fail "malformed SCAN_SHA must refuse"
fi
echo "$out" | grep -q '40-character' || { echo "$out"; fail "must name 40-character requirement"; }
pass "malformed SCAN_SHA refuses"

if out="$(SCAN_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa UAT_PROVENANCE_DIR="$TMP/ev" \
  GITHUB_REF=refs/heads/release/uat bash "$SCRIPT" 2>&1)"; then
  echo "$out"
  fail "HEAD/SCAN_SHA mismatch must refuse"
fi
echo "$out" | grep -q 'HEAD is not SCAN_SHA' || { echo "$out"; fail "must refuse HEAD mismatch"; }
pass "HEAD != SCAN_SHA refuses"

if out="$(SCAN_SHA="$SHA" UAT_PROVENANCE_DIR="$TMP/ev" \
  GITHUB_REF=refs/heads/main GITHUB_EVENT_NAME=push bash "$SCRIPT" 2>&1)"; then
  echo "$out"
  fail "main ref must HOLD provenance"
fi
echo "$out" | grep -q 'CUTOVER_INCOMPLETE_MAIN_SOURCE' || { echo "$out"; fail "wrong ref HOLD"; }
pass "provenance main ref HOLDs"

out="$(SCAN_SHA="$SHA" UAT_PROVENANCE_DIR="$TMP/ev" \
  GITHUB_REF=refs/heads/release/uat GITHUB_EVENT_NAME=push bash "$SCRIPT")" \
  || { echo "$out"; fail "valid provenance must PASS"; }
echo "$out" | grep -q 'RESULT=PASS' || { echo "$out"; fail "valid provenance RESULT=PASS"; }
[[ -f "$TMP/ev/uat-deploy-provenance.json" ]] || fail "provenance JSON missing"
python3 - "$TMP/ev/uat-deploy-provenance.json" "$SHA" <<'PY'
import json, sys
p, sha = json.load(open(sys.argv[1])), sys.argv[2]
assert p["result"] == "PASS", p
assert p["candidate_sha"] == sha.lower(), p
assert p["source_ref"] == "refs/heads/release/uat", p
assert p["git_tree"], p
PY
pass "valid release/uat provenance writes evidence"

echo "write-uat-deploy-provenance contract OK"
