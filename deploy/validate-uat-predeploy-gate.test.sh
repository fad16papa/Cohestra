#!/usr/bin/env bash
# PR-D / AD-14 / AD-23 predeploy polarity. Mockable only. No live SSH.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$ROOT_DIR/deploy/validate-uat-predeploy-gate.sh" ]] \
  || fail "validate-uat-predeploy-gate.sh is missing"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

build_provenance_fixture "$TMP"
cd "$PROVENANCE_LOCAL"
REMOTE_DIR="$(git remote get-url origin)"
git -C "$REMOTE_DIR" branch -f release/uat "$PROVENANCE_MERGE"
git fetch -q origin release/uat:refs/remotes/origin/release/uat

export COHESTRA_ROOT="$ROOT_DIR"
export GITHUB_REPOSITORY="fad16papa/Cohestra"
export ORIGIN_UAT_REF="origin/release/uat"
export UAT_DEPLOY_GATE_ACTIVE=true
export UAT_MAIN_DEPLOY_SUPPRESSED=true
export GITHUB_REF=refs/heads/release/uat
export GITHUB_EVENT_NAME=push
export UAT_AD17_IN_RUN=true
export UAT_GATE_EVIDENCE_DIR="$TMP/evidence"
unset GITHUB_RUN_ID || true
mkdir -p "$UAT_GATE_EVIDENCE_DIR"

pin_uat() {
  local sha="$1"
  git -C "$REMOTE_DIR" checkout -q -B release/uat "$sha"
  git -C "$REMOTE_DIR" checkout -q main
  git fetch -q --force origin release/uat:refs/remotes/origin/release/uat
}

run_case() {
  CANDIDATE_SHA="$1" bash "$ROOT_DIR/deploy/validate-uat-predeploy-gate.sh"
}

expect_pass() {
  local out
  if ! out="$(run_case "$PROVENANCE_MERGE")"; then
    echo "$out"
    fail "$1"
  fi
  echo "$out" | grep -q 'RESULT=PASS' || { echo "$out"; fail "$1 missing RESULT=PASS"; }
  echo "$out" | grep -q "VALIDATED_SHA=${PROVENANCE_MERGE}" || fail "$1 missing VALIDATED_SHA"
  pass "$1"
}

expect_block() {
  local sha="$1"
  local msg="$2"
  local out
  if out="$(run_case "$sha" 2>&1)"; then
    echo "$out"
    fail "$msg (expected block, got success)"
  fi
  echo "$out" | grep -qE 'RESULT=(HOLD|REFUSE)' || { echo "$out"; fail "$msg (missing HOLD/REFUSE)"; }
  echo "$out" | grep -q 'RESULT=PASS' && { echo "$out"; fail "$msg (unexpected PASS)"; }
  pass "$msg"
}

expect_pass "all-green tip of origin/release/uat is eligible"

GITHUB_EVENT_NAME=workflow_dispatch expect_pass \
  "workflow_dispatch on release/uat uses the same gate and passes"

GITHUB_EVENT_NAME=push
expect_block "not-a-sha" "malformed SHA is blocked"
expect_block "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "unknown git object is blocked"
expect_block "$PROVENANCE_HEAD" "feature-head / wrong SHA is blocked"

UAT_DEPLOY_GATE_ACTIVE= expect_block "$PROVENANCE_MERGE" "unset UAT_DEPLOY_GATE_ACTIVE is HOLD"
UAT_DEPLOY_GATE_ACTIVE=false expect_block "$PROVENANCE_MERGE" "UAT_DEPLOY_GATE_ACTIVE=false is HOLD"
UAT_DEPLOY_GATE_ACTIVE=TRUE expect_block "$PROVENANCE_MERGE" "UAT_DEPLOY_GATE_ACTIVE is case-sensitive"
UAT_DEPLOY_GATE_ACTIVE=1 expect_block "$PROVENANCE_MERGE" "UAT_DEPLOY_GATE_ACTIVE=1 is HOLD"
UAT_DEPLOY_GATE_ACTIVE=true

UAT_MAIN_DEPLOY_SUPPRESSED= expect_block "$PROVENANCE_MERGE" "unset UAT_MAIN_DEPLOY_SUPPRESSED is HOLD"
UAT_MAIN_DEPLOY_SUPPRESSED=false expect_block "$PROVENANCE_MERGE" "UAT_MAIN_DEPLOY_SUPPRESSED=false is HOLD"
UAT_MAIN_DEPLOY_SUPPRESSED=TRUE expect_block "$PROVENANCE_MERGE" "UAT_MAIN_DEPLOY_SUPPRESSED is case-sensitive"
UAT_MAIN_DEPLOY_SUPPRESSED=1 expect_block "$PROVENANCE_MERGE" "UAT_MAIN_DEPLOY_SUPPRESSED=1 is HOLD"
UAT_MAIN_DEPLOY_SUPPRESSED=true

GITHUB_REF=refs/heads/main expect_block "$PROVENANCE_MERGE" "N14 main ref is HOLD CUTOVER_INCOMPLETE_MAIN_SOURCE"
GITHUB_REF=refs/heads/feature expect_block "$PROVENANCE_MERGE" "feature ref is HOLD"
GITHUB_REF=refs/heads/release/uat

GITHUB_EVENT_NAME=workflow_run expect_block "$PROVENANCE_MERGE" "N25 workflow_run event is HOLD"
GITHUB_EVENT_NAME=pull_request expect_block "$PROVENANCE_MERGE" "pull_request event is HOLD"
GITHUB_EVENT_NAME=repository_dispatch expect_block "$PROVENANCE_MERGE" "repository_dispatch event is HOLD"
GITHUB_EVENT_NAME=push

# Stale candidate: origin/release/uat moved past the SHA.
echo stale-advance >"$REMOTE_DIR/stale-advance"
git -C "$REMOTE_DIR" checkout -q release/uat
git -C "$REMOTE_DIR" add stale-advance
git -C "$REMOTE_DIR" commit -q -m "advance release/uat past candidate"
git fetch -q origin release/uat:refs/remotes/origin/release/uat
NEWER="$(git rev-parse origin/release/uat)"
[[ "$NEWER" != "$PROVENANCE_MERGE" ]] || fail "fixture failed to advance origin/release/uat"
expect_block "$PROVENANCE_MERGE" "stale candidate superseded by newer origin/release/uat is blocked"

pin_uat "$PROVENANCE_MERGE"

# In-run AD-17 skips Checks API: missing native GG must not block when needs already passed.
export COHESTRA_GH_API_MOCK="$ROOT_DIR/deploy/lib/uat-gh-api-mock.sh"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
cat >"$PROVENANCE_FIX/deploy_runs.json" <<'JSON'
{"total_count":0,"workflow_runs":[]}
JSON
python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_MERGE}.json" <<'PY' 2>/dev/null || true
import json,sys
from pathlib import Path
p=Path(sys.argv[1])
p.write_text(json.dumps({"total_count":0,"check_runs":[]}))
PY
expect_pass "UAT_AD17_IN_RUN=true does not require Checks API GitGuardian"

# Fallback python path still fail-closes if someone omits the in-run flag.
UAT_AD17_IN_RUN= expect_block "$PROVENANCE_MERGE" \
  "missing UAT_AD17_IN_RUN falls back to Checks API and HOLDs without GG"

UAT_AD17_IN_RUN=true
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"
cat >"$PROVENANCE_FIX/deploy_runs.json" <<'JSON'
{"total_count":0,"workflow_runs":[]}
JSON
expect_pass "restored in-run path remains eligible"

echo "validate-uat-predeploy-gate contract OK"
