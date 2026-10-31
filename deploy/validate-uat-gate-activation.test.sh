#!/usr/bin/env bash
# First-merge hazard + safe activation contract. Does not activate the live gate.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

bash "$ROOT_DIR/deploy/validate-uat-gate-activation.sh"
pass "static activation contract"

# Runtime: the live suppressor must HOLD when the owner has not activated.
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
build_provenance_fixture "$TMP"
cd "$PROVENANCE_LOCAL"
export COHESTRA_GH_API_MOCK="$ROOT_DIR/deploy/lib/uat-gh-api-mock.sh"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
export GITHUB_REPOSITORY="fad16papa/Cohestra"
export ORIGIN_MAIN_REF="origin/main"
export COHESTRA_ROOT="$ROOT_DIR"
export GITHUB_EVENT_NAME=workflow_run
export WORKFLOW_RUN_HEAD_SHA="$PROVENANCE_MERGE"
export UAT_GATE_EVIDENCE_DIR="$TMP/evidence"
cat >"$PROVENANCE_FIX/deploy_runs.json" <<'JSON'
{"total_count":0,"workflow_runs":[]}
JSON

run_inactive() {
  env -u UAT_DEPLOY_GATE_ACTIVE \
    CANDIDATE_SHA="$PROVENANCE_MERGE" \
    WORKFLOW_RUN_HEAD_SHA="$PROVENANCE_MERGE" \
    bash "$ROOT_DIR/deploy/validate-uat-predeploy-gate.sh"
}

if out="$(run_inactive 2>&1)"; then
  echo "$out"
  fail "first-merge / inactive gate must HOLD (got success)"
fi
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "inactive gate must emit RESULT=HOLD"; }
echo "$out" | grep -q 'UAT_DEPLOY_GATE_ACTIVE' || { echo "$out"; fail "HOLD must name UAT_DEPLOY_GATE_ACTIVE"; }
echo "$out" | grep -q 'RESULT=PASS' && { echo "$out"; fail "inactive gate must not PASS"; }
pass "first merge with unset UAT_DEPLOY_GATE_ACTIVE HOLDs before SSH"

echo "validate-uat-gate-activation runtime OK"
