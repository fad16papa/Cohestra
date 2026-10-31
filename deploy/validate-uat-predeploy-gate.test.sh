#!/usr/bin/env bash
# TDD contract for the UAT pre-deploy eligibility gate.
# Uses mocked GitHub payloads only. No live SSH, webhook, or UAT deploy.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$ROOT_DIR/deploy/validate-uat-predeploy-gate.sh" ]] \
  || fail "validate-uat-predeploy-gate.sh is missing"
[[ -f "$ROOT_DIR/deploy/lib/uat-predeploy-gate.py" ]] \
  || fail "uat-predeploy-gate.py is missing"
[[ -f "$ROOT_DIR/deploy/lib/uat-gh-api-mock.sh" ]] \
  || fail "uat-gh-api-mock.sh is missing"

grep -q 'check-runs?filter=all' "$ROOT_DIR/deploy/lib/uat-predeploy-gate.py" \
  || fail "UAT GitGuardian check-runs must request filter=all"
pass "GitGuardian check-runs request filter=all"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

build_provenance_fixture "$TMP"
cd "$PROVENANCE_LOCAL"

export COHESTRA_GH_API_MOCK="$ROOT_DIR/deploy/lib/uat-gh-api-mock.sh"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
export GITHUB_REPOSITORY="fad16papa/Cohestra"
export ORIGIN_MAIN_REF="origin/main"
export COHESTRA_ROOT="$ROOT_DIR"
export UAT_DEPLOY_GATE_ACTIVE=true
export GITHUB_EVENT_NAME=workflow_run
export UAT_GATE_EVIDENCE_DIR="$TMP/evidence"
unset GITHUB_RUN_ID || true
# Set after fixture SHAs exist.

write_empty_deploy_runs() {
  cat >"$PROVENANCE_FIX/deploy_runs.json" <<'JSON'
{"total_count":0,"workflow_runs":[]}
JSON
}

write_empty_deploy_runs
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"
export WORKFLOW_RUN_HEAD_SHA="$PROVENANCE_MERGE"

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
  local saved="${WORKFLOW_RUN_HEAD_SHA:-}"
  if [[ "$msg" != *"head_sha mismatch"* && "$sha" =~ ^[0-9a-fA-F]{40}$ ]]; then
    export WORKFLOW_RUN_HEAD_SHA="$sha"
  fi
  if out="$(run_case "$sha" 2>&1)"; then
    echo "$out"
    fail "$msg (expected block, got success)"
  fi
  echo "$out" | grep -qE 'RESULT=(HOLD|REFUSE)' || { echo "$out"; fail "$msg (missing HOLD/REFUSE)"; }
  echo "$out" | grep -q 'RESULT=PASS' && { echo "$out"; fail "$msg (unexpected PASS)"; }
  if [[ -n "$saved" ]]; then
    export WORKFLOW_RUN_HEAD_SHA="$saved"
  fi
  pass "$msg"
}

expect_pass "all-green two-parent tip of origin/main is eligible"

GITHUB_EVENT_NAME=workflow_dispatch expect_pass \
  "workflow_dispatch uses the same gate and passes when every check is SUCCESS"

GITHUB_EVENT_NAME=workflow_run
export WORKFLOW_RUN_HEAD_SHA="$PROVENANCE_MERGE"
expect_pass "workflow_run.head_sha matching the candidate is eligible"

expect_block "not-a-sha" "malformed SHA is blocked"
expect_block "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "unknown git object is blocked"

# Wrong SHA: a real commit that is not the main tip.
expect_block "$PROVENANCE_HEAD" "feature-head / wrong SHA is blocked"

# workflow_run head mismatch
WORKFLOW_RUN_HEAD_SHA="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" \
  expect_block "$PROVENANCE_MERGE" "workflow_run.head_sha mismatch is blocked"
export WORKFLOW_RUN_HEAD_SHA="$PROVENANCE_MERGE"

# Gate suppressor
UAT_DEPLOY_GATE_ACTIVE= expect_block "$PROVENANCE_MERGE" "unset UAT_DEPLOY_GATE_ACTIVE is HOLD"
UAT_DEPLOY_GATE_ACTIVE=false expect_block "$PROVENANCE_MERGE" "UAT_DEPLOY_GATE_ACTIVE=false is HOLD"
UAT_DEPLOY_GATE_ACTIVE=TRUE expect_block "$PROVENANCE_MERGE" "UAT_DEPLOY_GATE_ACTIVE is case-sensitive"
UAT_DEPLOY_GATE_ACTIVE=1 expect_block "$PROVENANCE_MERGE" "UAT_DEPLOY_GATE_ACTIVE=1 is HOLD"
UAT_DEPLOY_GATE_ACTIVE=true

# Stale / older queued run: origin/main moved past the candidate.
REMOTE="$(git -C "$PROVENANCE_LOCAL" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
# Advance the fixture remote and refetch so origin/main is newer than the merge.
REMOTE_DIR="$(cd "$PROVENANCE_LOCAL" && git rev-parse --abbrev-ref '@{u}' >/dev/null && git remote get-url origin)"
git -C "$REMOTE_DIR" checkout -q main
echo stale-advance >"$REMOTE_DIR/stale-advance"
git -C "$REMOTE_DIR" add stale-advance
git -C "$REMOTE_DIR" commit -q -m "advance main past candidate"
git -C "$PROVENANCE_LOCAL" fetch -q origin main
NEWER_MAIN="$(git -C "$PROVENANCE_LOCAL" rev-parse origin/main)"
[[ "$NEWER_MAIN" != "$PROVENANCE_MERGE" ]] || fail "fixture failed to advance origin/main"
expect_block "$PROVENANCE_MERGE" "stale candidate superseded by newer origin/main is blocked"
expect_block "$PROVENANCE_MERGE" "older queued run for a superseded SHA is blocked"

# Restore origin/main to the eligible merge for remaining check-run cases.
git -C "$REMOTE_DIR" reset -q --hard "$PROVENANCE_MERGE"
git -C "$PROVENANCE_LOCAL" fetch -q origin main

write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"
write_empty_deploy_runs

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
p=sys.argv[1]
d=json.load(open(p))
d["check_runs"][0]["conclusion"]="neutral"
json.dump(d, open(p,"w"))
PY
expect_block "$PROVENANCE_MERGE" "GitGuardian neutral is blocked"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
p=sys.argv[1]
d=json.load(open(p))
d["check_runs"][0]["conclusion"]="skipped"
json.dump(d, open(p,"w"))
PY
expect_block "$PROVENANCE_MERGE" "GitGuardian skipped is blocked"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
json.dump({"total_count":0,"check_runs":[]}, open(sys.argv[1],"w"))
PY
expect_block "$PROVENANCE_MERGE" "GitGuardian absent is blocked"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

for conclusion in failure cancelled timed_out action_required; do
  python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" "$conclusion" <<'PY'
import json,sys
p,c=sys.argv[1],sys.argv[2]
d=json.load(open(p))
d["check_runs"][0]["conclusion"]=c
json.dump(d, open(p,"w"))
PY
  expect_block "$PROVENANCE_MERGE" "GitGuardian ${conclusion} is blocked"
  write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"
done

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
p=sys.argv[1]
d=json.load(open(p))
d["check_runs"].append({
  "id":100,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},
  "head_sha":d["check_runs"][0]["head_sha"],"status":"queued","conclusion":None,"completed_at":None
})
json.dump(d, open(p,"w"))
PY
expect_block "$PROVENANCE_MERGE" "GitGuardian pending/queued is blocked even if older SUCCESS exists"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
p=sys.argv[1]
d=json.load(open(p))
d["check_runs"][0]["app"]={"slug":"not-gitguardian"}
json.dump(d, open(p,"w"))
PY
expect_block "$PROVENANCE_MERGE" "wrong GitGuardian app.slug is blocked"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" "$PROVENANCE_HEAD" <<'PY'
import json,sys
p,sha=sys.argv[1],sys.argv[2]
json.dump({"total_count":2,"check_runs":[
  {"id":99,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},
   "head_sha":sha,"status":"completed","conclusion":"success","completed_at":"2026-10-22T00:00:01Z"},
  {"id":100,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},
   "head_sha":sha,"status":"completed","conclusion":"neutral","completed_at":"2026-10-22T00:00:02Z"}
]}, open(p,"w"))
PY
expect_block "$PROVENANCE_MERGE" "malicious duplicate GitGuardian conclusions are blocked"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/jobs_11.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["jobs"][0]["conclusion"]="skipped"
json.dump(d, open(sys.argv[1],"w"))
PY
expect_block "$PROVENANCE_MERGE" "required CI job skipped is blocked"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/jobs_11.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["jobs"]=d["jobs"][:-1]
d["total_count"]=4
json.dump(d, open(sys.argv[1],"w"))
PY
expect_block "$PROVENANCE_MERGE" "required CI job absent is blocked"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/jobs_11.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["jobs"].append({"name":".NET build and test","conclusion":"failure"})
d["total_count"]=len(d["jobs"])
json.dump(d, open(sys.argv[1],"w"))
PY
expect_block "$PROVENANCE_MERGE" "duplicate required CI job with failure is blocked"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["workflow_runs"][0]["conclusion"]="failure"
json.dump(d, open(sys.argv[1],"w"))
PY
expect_block "$PROVENANCE_MERGE" "CI workflow failure is blocked even if GitGuardian is green"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

touch "$PROVENANCE_FIX/error"
expect_block "$PROVENANCE_MERGE" "GitHub API unreachable/error is blocked"
rm -f "$PROVENANCE_FIX/error"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["total_count"]=50
json.dump(d, open(sys.argv[1],"w"))
PY
expect_block "$PROVENANCE_MERGE" "truncated GitHub pagination is blocked"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

cat >"$PROVENANCE_FIX/deploy_runs.json" <<JSON
{"total_count":1,"workflow_runs":[{"id":77,"event":"workflow_run","head_sha":"${PROVENANCE_MERGE}","head_branch":"main","status":"completed","conclusion":"success","created_at":"2026-10-22T00:00:00Z"}]}
JSON
expect_block "$PROVENANCE_MERGE" "duplicate successful UAT deploy of the same SHA is blocked"
write_empty_deploy_runs

cat >"$PROVENANCE_FIX/deploy_runs.json" <<JSON
{"total_count":1,"workflow_runs":[{"id":88,"event":"workflow_run","head_sha":"${PROVENANCE_MERGE}","head_branch":"main","status":"in_progress","conclusion":null,"created_at":"2026-10-22T00:00:00Z"}]}
JSON
expect_block "$PROVENANCE_MERGE" "in-progress duplicate UAT deploy of the same SHA is blocked"
GITHUB_RUN_ID=88 expect_pass "current Deploy UAT run is not treated as a duplicate of itself"
write_empty_deploy_runs

# Retry after a failed prior deploy is allowed.
cat >"$PROVENANCE_FIX/deploy_runs.json" <<JSON
{"total_count":1,"workflow_runs":[{"id":89,"event":"workflow_run","head_sha":"${PROVENANCE_MERGE}","head_branch":"main","status":"completed","conclusion":"failure","created_at":"2026-10-22T00:00:00Z"}]}
JSON
expect_pass "retry after a failed prior UAT deploy is eligible"
write_empty_deploy_runs

# Single-parent tip of main: GitGuardian must SUCCESS on the candidate itself.
git -C "$REMOTE_DIR" checkout -q main
echo one-parent >"$REMOTE_DIR/one-parent"
git -C "$REMOTE_DIR" add one-parent
git -C "$REMOTE_DIR" commit -q -m "direct main commit"
SINGLE="$(git -C "$REMOTE_DIR" rev-parse HEAD)"
git -C "$PROVENANCE_LOCAL" fetch -q origin main
write_layer_a "$PROVENANCE_FIX" "$SINGLE"
write_empty_deploy_runs
cat >"$PROVENANCE_FIX/checks_${SINGLE}.json" <<JSON
{"total_count":1,"check_runs":[{"id":199,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},"head_sha":"${SINGLE}","status":"completed","conclusion":"success","completed_at":"2026-10-22T01:00:01Z"}]}
JSON
export WORKFLOW_RUN_HEAD_SHA="$SINGLE"
out="$(run_case "$SINGLE")" || { echo "$out"; fail "single-parent tip with GG SUCCESS should pass"; }
echo "$out" | grep -q 'RESULT=PASS' || fail "single-parent tip missing RESULT=PASS"
pass "single-parent origin/main tip with GitGuardian SUCCESS on the SHA is eligible"

python3 - "$PROVENANCE_FIX/checks_${SINGLE}.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["check_runs"][0]["conclusion"]="neutral"
json.dump(d, open(sys.argv[1],"w"))
PY
expect_block "$SINGLE" "single-parent GitGuardian neutral is blocked"

echo "validate-uat-predeploy-gate contract OK"
