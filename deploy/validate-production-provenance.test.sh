#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

grep -q 'check-runs?filter=all' "$ROOT_DIR/deploy/lib/production-github-provenance.py" \
  || fail "check-runs must request filter=all"
pass "GitGuardian check-runs request filter=all"

ANCHOR_FILE="$ROOT_DIR/deploy/production-provenance-anchor.txt"
[[ -f "$ANCHOR_FILE" ]] || fail "committed provenance anchor is missing"
[[ "$(tr -d '[:space:]' <"$ANCHOR_FILE")" == "c39f2618bcdcb71875d2da5b654f3a999b39ae35" ]] \
  || fail "committed provenance anchor must be the 46.3 baseline"
pass "committed provenance anchor is the 46.3 baseline"

TMP="$(mktemp -d)"
LAUNDER=""
CLEAN=""
ANCHOR_CASES=""
UNREACH=""
trap 'rm -rf "$TMP" "$LAUNDER" "$CLEAN" "$ANCHOR_CASES" "$UNREACH"' EXIT

build_provenance_fixture "$TMP"
cd "$PROVENANCE_LOCAL"

export COHESTRA_GH_API_MOCK="$ROOT_DIR/deploy/lib/production-gh-api-mock.sh"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
export GITHUB_REPOSITORY="fad16papa/Cohestra"
export ORIGIN_MAIN_REF="origin/main"
export COHESTRA_ROOT="$ROOT_DIR"

run_case() {
  DEPLOY_SHA="$1" bash "$ROOT_DIR/deploy/validate-production-provenance.sh"
}

expect_pass() {
  local out
  if ! out="$(run_case "$PROVENANCE_MERGE")"; then
    echo "$out"
    fail "$1"
  fi
  echo "$out" | grep -q 'RESULT=PASS' || fail "$1 missing RESULT=PASS"
  pass "$1"
}

expect_refuse() {
  local sha="$1"
  local msg="$2"
  if run_case "$sha" >/dev/null 2>&1; then
    fail "$msg"
  fi
  pass "$msg"
}

expect_pass "merge SHA + unique PR + GitGuardian success + five CI jobs"

# live head in fixture is deadbeef; ^2 is PROVENANCE_HEAD
out="$(run_case "$PROVENANCE_MERGE")" || fail "drifted live head should still pass"
echo "$out" | grep -q "REVIEWED_PR_HEAD=${PROVENANCE_HEAD}" || fail "must pin ^2"
pass "live pr.head.sha drift still uses immutable ^2"

expect_refuse "not-a-sha" "malformed SHA is refused"
expect_refuse "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "unknown object is refused"
expect_refuse "$PROVENANCE_PARENT" "one-parent / squash / rebase / direct commit is refused"

# orphan non-ancestor (clone identity is required on GitHub-hosted runners)
git config user.email test@example.com
git config user.name testd
git checkout -q --orphan other
echo other >other
git add other
git commit -q -m other
ORPHAN="$(git rev-parse HEAD)"
git checkout -q main
expect_refuse "$ORPHAN" "non-main ancestor is refused"

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
p=sys.argv[1]
d=json.load(open(p))
d["check_runs"][0]["conclusion"]="failure"
json.dump(d, open(p,"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "GitGuardian failure is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
json.dump({"total_count":0,"check_runs":[]}, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "GitGuardian missing is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
p=sys.argv[1]
d=json.load(open(p))
d["check_runs"].append({"id":100,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},"head_sha":d["check_runs"][0]["head_sha"],"status":"queued","conclusion":None,"completed_at":None})
json.dump(d, open(p,"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "GitGuardian pending/queued is refused even if older SUCCESS exists"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

for conclusion in cancelled skipped neutral timed_out action_required; do
  python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" "$conclusion" <<'PY'
import json,sys
p,c=sys.argv[1],sys.argv[2]
d=json.load(open(p))
d["check_runs"][0]["conclusion"]=c
json.dump(d, open(p,"w"))
PY
  expect_refuse "$PROVENANCE_MERGE" "GitGuardian ${conclusion} is refused"
  write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"
done

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
p=sys.argv[1]
d=json.load(open(p))
d["check_runs"][0]["app"]={"slug":"not-gitguardian"}
json.dump(d, open(p,"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "wrong GitGuardian app.slug is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

printf '[]' >"$PROVENANCE_FIX/pulls_${PROVENANCE_MERGE}.json"
expect_refuse "$PROVENANCE_MERGE" "associated PR missing is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/pr_2.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["base"]={"ref":"develop"}
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "PR base != main is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/pr_2.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["merged"]=False
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "PR not merged is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/pulls_${PROVENANCE_MERGE}.json" "$PROVENANCE_MERGE" <<'PY'
import json,sys
sha=sys.argv[2]
json.dump([
  {"number":2,"merged":None,"base":{"ref":"main"},"merge_commit_sha":sha},
  {"number":3,"merged":None,"base":{"ref":"main"},"merge_commit_sha":sha}
], open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "ambiguous associated PRs are refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/pr_2.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["merge_commit_sha"]="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "merge_commit_sha mismatch is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["workflow_runs"][0]["conclusion"]="failure"
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "GitGuardian green + merge-SHA CI red is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" "$PROVENANCE_MERGE" <<'PY'
import json,sys
sha=sys.argv[2]
json.dump({"total_count":2,"workflow_runs":[
  {"id":10,"event":"push","head_sha":sha,"head_branch":"main","status":"completed","conclusion":"success","created_at":"2026-10-21T00:00:00Z"},
  {"id":12,"event":"push","head_sha":sha,"head_branch":"main","status":"completed","conclusion":"failure","created_at":"2026-10-22T00:00:00Z"}
]}, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "newer failed CI after older green is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["workflow_runs"][0]["head_branch"]="feature"
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "CI head_branch != main is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["workflow_runs"][0]["head_branch"]=None
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "CI head_branch null is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["workflow_runs"][0].pop("head_branch", None)
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "missing CI head_branch is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/jobs_11.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["jobs"]=d["jobs"][:-1]
d["total_count"]=4
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "missing required CI job is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/jobs_11.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["jobs"][0]["conclusion"]="failure"
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "failed required CI job is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["total_count"]=50
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "truncated CI pagination is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

touch "$PROVENANCE_FIX/error"
expect_refuse "$PROVENANCE_MERGE" "GitHub API error is refused"
rm -f "$PROVENANCE_FIX/error"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

# Anchor is the trust root. Missing PR on the anchor must not refuse the merge.
rm -f "$PROVENANCE_FIX/pulls_${PROVENANCE_PARENT}.json" "$PROVENANCE_FIX/pr_1.json"
expect_pass "anchor itself is not revalidated as a PR merge"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/checks_${PROVENANCE_HEAD}.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["check_runs"][0]["conclusion"]="failure"
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "five CI jobs green + GitGuardian red is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" "$PROVENANCE_MERGE" <<'PY'
import json,sys
sha=sys.argv[2]
json.dump({"total_count":1,"workflow_runs":[
  {"id":11,"event":"pull_request","head_sha":sha,"head_branch":"main","status":"completed","conclusion":"success","created_at":"2026-10-22T00:00:00Z"}
]}, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "PR-only CI is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/runs.json" "$PROVENANCE_MERGE" <<'PY'
import json,sys
sha=sys.argv[2]
json.dump({"total_count":1,"workflow_runs":[
  {"id":11,"event":"pull_request_target","head_sha":sha,"head_branch":"main","status":"completed","conclusion":"success","created_at":"2026-10-22T00:00:00Z"}
]}, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "pull_request_target CI is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/jobs_11.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
d["jobs"].append({"name":".NET build and test","conclusion":"failure"})
d["total_count"]=len(d["jobs"])
json.dump(d, open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "duplicate required CI job failure is refused"
write_pass_fixtures "$PROVENANCE_FIX" "$PROVENANCE_MERGE" "$PROVENANCE_HEAD" "$PROVENANCE_PARENT"

python3 - "$PROVENANCE_FIX/pulls_${PROVENANCE_MERGE}.json" <<'PY'
import json,sys
json.dump([{"number":2,"merged":None,"base":{"ref":"main"},"merge_commit_sha":""}], open(sys.argv[1],"w"))
PY
expect_refuse "$PROVENANCE_MERGE" "empty merge_commit_sha is refused"

# --- first-parent chain / laundering ---
LAUNDER="$(mktemp -d)"
build_launder_fixture "$LAUNDER"
cd "$PROVENANCE_LOCAL"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
export COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$PROVENANCE_ANCHOR_FILE"
write_layer_a "$PROVENANCE_FIX" "$PROVENANCE_M1"
expect_refuse "$PROVENANCE_M1" "immediate direct-main ride-along is refused"
write_layer_a "$PROVENANCE_FIX" "$PROVENANCE_M2"
expect_refuse "$PROVENANCE_M2" "laundered direct-main via later clean merge is refused"

CLEAN="$(mktemp -d)"
build_clean_chain_fixture "$CLEAN"
cd "$PROVENANCE_LOCAL"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
export COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$PROVENANCE_ANCHOR_FILE"
out="$(run_case "$PROVENANCE_M3")" || { echo "$out"; fail "clean first-parent chain should pass"; }
echo "$out" | grep -q 'RESULT=PASS' || fail "clean chain missing RESULT=PASS"
echo "$out" | grep -q "REVIEWED_PR_HEAD=${PROVENANCE_M3_HEAD}" || fail "clean chain must pin M3 ^2"
echo "$out" | grep -qx "FIRST_PARENT_CHAIN_DEPTH=3" || fail "clean chain depth"
pass "multiple clean first-parent merges from trusted anchor PASS"

ANCHOR_CASES="$(mktemp -d)"
build_provenance_fixture "$ANCHOR_CASES"
cd "$PROVENANCE_LOCAL"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
export COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$PROVENANCE_ANCHOR_FILE"

if COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$ANCHOR_CASES/missing" run_case "$PROVENANCE_MERGE" >/dev/null 2>&1; then
  fail "missing anchor must be refused"
fi
pass "anchor missing is refused"

printf 'not-a-sha\n' >"$ANCHOR_CASES/bad"
if COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$ANCHOR_CASES/bad" run_case "$PROVENANCE_MERGE" >/dev/null 2>&1; then
  fail "malformed anchor must be refused"
fi
pass "malformed anchor is refused"

tree="$(git rev-parse HEAD^{tree})"
printf '%s\n' "$tree" >"$ANCHOR_CASES/tree"
if COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$ANCHOR_CASES/tree" run_case "$PROVENANCE_MERGE" >/dev/null 2>&1; then
  fail "non-commit anchor must be refused"
fi
pass "anchor not a commit is refused"

git checkout -q --orphan stray
echo stray >stray
git add stray
git commit -q -m stray
STRAY="$(git rev-parse HEAD)"
git checkout -q main
printf '%s\n' "$STRAY" >"$ANCHOR_CASES/stray"
if COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$ANCHOR_CASES/stray" run_case "$PROVENANCE_MERGE" >/dev/null 2>&1; then
  fail "non-ancestor anchor must be refused"
fi
pass "anchor not ancestor of deploy_sha is refused"

UNREACH="$(mktemp -d)"
build_unreachable_anchor_fixture "$UNREACH"
cd "$PROVENANCE_LOCAL"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
export COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$PROVENANCE_ANCHOR_FILE"
expect_refuse "$PROVENANCE_MERGE" "first-parent traversal never reaches anchor is refused"

echo "validate-production-provenance contract OK"
