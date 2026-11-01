#!/usr/bin/env bash
# TDD contract for the permanent UAT readiness workflow.
# Mocked GitHub payloads only. No live SSH, merge, dispatch, or Production.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

EVALUATOR="$ROOT_DIR/deploy/lib/uat-readiness.py"
WRAPPER="$ROOT_DIR/deploy/evaluate-uat-readiness.sh"
REQUIRE="$ROOT_DIR/deploy/require-uat-readiness-predeploy.sh"
WORKFLOW="$ROOT_DIR/.github/workflows/uat-readiness.yml"
DEPLOY_WF="$ROOT_DIR/.github/workflows/deploy.yml"
CI_WF="$ROOT_DIR/.github/workflows/ci.yml"

[[ -f "$EVALUATOR" ]] || fail "uat-readiness.py missing"
[[ -f "$WRAPPER" ]] || fail "evaluate-uat-readiness.sh missing"
[[ -f "$REQUIRE" ]] || fail "require-uat-readiness-predeploy.sh missing"
[[ -f "$WORKFLOW" ]] || fail "uat-readiness.yml missing"

chmod +x "$WRAPPER" "$REQUIRE" "$ROOT_DIR/deploy/lib/uat-readiness-gh-api-mock.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

HEAD_SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
BASE_SHA="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
MAIN_SHA="cccccccccccccccccccccccccccccccccccccccc"
REVIEW_SHA="dddddddddddddddddddddddddddddddddddddddd"

review_body() {
  local role="$1"
  local sha="$2"
  local verdict="${3:-PASS}"
  local blocker="${4:-0}"
  local major="${5:-0}"
  cat <<JSON
<!-- cohestra-independent-review v1 -->
{"role":"${role}","head_sha":"${sha}","blocker":${blocker},"major":${major},"minor":0,"nit":0,"verdict":"${verdict}","independent":true}
JSON
}

write_pr_green() {
  local fix="$1"
  local number="${2:-9999}"
  mkdir -p "$fix"
  cat >"$fix/pr_${number}.json" <<JSON
{
  "number": ${number},
  "draft": true,
  "merged": false,
  "mergeable": true,
  "mergeable_state": "clean",
  "body": "Implement UAT readiness. Do not treat this body as BMAD.",
  "user": {"login": "coder", "type": "User"},
  "head": {"sha": "${HEAD_SHA}", "ref": "cursor/future-uat-pr-a5ee"},
  "base": {"sha": "${BASE_SHA}", "ref": "main"},
  "labels": [{"name": "uat"}]
}
JSON
  cat >"$fix/pr_files_${number}.json" <<'JSON'
[{"filename":"deploy/evaluate-uat-readiness.sh"}]
JSON
  cat >"$fix/issue_comments_${number}.json" <<JSON
[
  {
    "id": 101,
    "user": {"login": "bmad-reviewer", "type": "User"},
    "author_association": "MEMBER",
    "body": $(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$(review_body BMAD "$HEAD_SHA")")
  },
  {
    "id": 102,
    "user": {"login": "catsec-reviewer", "type": "User"},
    "author_association": "MEMBER",
    "body": $(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$(review_body CAT-SEC "$HEAD_SHA")")
  }
]
JSON
  cat >"$fix/pr_reviews_${number}.json" <<'JSON'
[]
JSON
  cat >"$fix/pr_review_comments_${number}.json" <<'JSON'
[]
JSON
  cat >"$fix/runs.json" <<JSON
{"total_count":1,"workflow_runs":[{"id":22,"event":"pull_request","head_sha":"${HEAD_SHA}","head_branch":"cursor/future-uat-pr-a5ee","status":"completed","conclusion":"success","html_url":"https://example.invalid/ci/22","created_at":"2026-11-01T00:00:00Z"}]}
JSON
  cat >"$fix/run_22.json" <<JSON
{"id":22,"event":"pull_request","head_sha":"${HEAD_SHA}","head_branch":"cursor/future-uat-pr-a5ee","status":"completed","conclusion":"success","html_url":"https://example.invalid/ci/22"}
JSON
  cat >"$fix/jobs_22.json" <<JSON
{"total_count":6,"jobs":[
  {"name":".NET build and test","conclusion":"success","status":"completed","head_sha":"${HEAD_SHA}","html_url":"https://example.invalid/job/dotnet"},
  {"name":"API integration tests","conclusion":"success","status":"completed","head_sha":"${HEAD_SHA}"},
  {"name":"Next.js build","conclusion":"success","status":"completed","head_sha":"${HEAD_SHA}"},
  {"name":"UAT isolation contract","conclusion":"success","status":"completed","head_sha":"${HEAD_SHA}"},
  {"name":"Docker stack smoke","conclusion":"success","status":"completed","head_sha":"${HEAD_SHA}"},
  {"name":"Exact-SHA security scan","conclusion":"success","status":"completed","head_sha":"${HEAD_SHA}"}
]}
JSON
  cat >"$fix/checks_${HEAD_SHA}.json" <<JSON
{"total_count":1,"check_runs":[{"id":77,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},"head_sha":"${HEAD_SHA}","status":"completed","conclusion":"success","completed_at":"2026-11-01T00:00:01Z","html_url":"https://example.invalid/gg"}]}
JSON
  cat >"$fix/pulls_${HEAD_SHA}.json" <<JSON
[{"number":${number},"state":"open","merged":false,"base":{"ref":"main"},"head":{"sha":"${HEAD_SHA}"}}]
JSON
}

write_main_green() {
  local fix="$1"
  mkdir -p "$fix"
  cat >"$fix/runs.json" <<JSON
{"total_count":1,"workflow_runs":[{"id":11,"event":"push","head_sha":"${MAIN_SHA}","head_branch":"main","status":"completed","conclusion":"success","html_url":"https://example.invalid/ci/11","created_at":"2026-11-01T00:00:00Z"}]}
JSON
  cat >"$fix/run_11.json" <<JSON
{"id":11,"event":"push","head_sha":"${MAIN_SHA}","head_branch":"main","status":"completed","conclusion":"success","html_url":"https://example.invalid/ci/11"}
JSON
  cat >"$fix/jobs_11.json" <<JSON
{"total_count":7,"jobs":[
  {"name":".NET build and test","conclusion":"success","status":"completed","head_sha":"${MAIN_SHA}"},
  {"name":"API integration tests","conclusion":"success","status":"completed","head_sha":"${MAIN_SHA}"},
  {"name":"Next.js build","conclusion":"success","status":"completed","head_sha":"${MAIN_SHA}"},
  {"name":"UAT isolation contract","conclusion":"success","status":"completed","head_sha":"${MAIN_SHA}"},
  {"name":"Docker stack smoke","conclusion":"success","status":"completed","head_sha":"${MAIN_SHA}"},
  {"name":"Exact-SHA security scan","conclusion":"success","status":"completed","head_sha":"${MAIN_SHA}"},
  {"name":"GitGuardian exact-SHA API scan","conclusion":"success","status":"completed","head_sha":"${MAIN_SHA}"}
]}
JSON
  cat >"$fix/pulls_${MAIN_SHA}.json" <<JSON
[{"number":8888,"state":"closed","merged":true,"base":{"ref":"main"},"merge_commit_sha":"${MAIN_SHA}","head":{"sha":"${REVIEW_SHA}"}}]
JSON
  cat >"$fix/pr_8888.json" <<JSON
{
  "number": 8888,
  "merged": true,
  "body": "",
  "user": {"login": "coder", "type": "User"},
  "head": {"sha": "${REVIEW_SHA}"},
  "base": {"sha": "${BASE_SHA}", "ref": "main"},
  "merge_commit_sha": "${MAIN_SHA}"
}
JSON
  cat >"$fix/pr_files_8888.json" <<'JSON'
[{"filename":"deploy/lib/uat-readiness.py"}]
JSON
  cat >"$fix/issue_comments_8888.json" <<JSON
[
  {
    "id": 201,
    "user": {"login": "bmad-reviewer", "type": "User"},
    "author_association": "MEMBER",
    "body": $(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$(review_body BMAD "$REVIEW_SHA")")
  },
  {
    "id": 202,
    "user": {"login": "catsec-reviewer", "type": "User"},
    "author_association": "MEMBER",
    "body": $(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$(review_body CAT-SEC "$REVIEW_SHA")")
  }
]
JSON
  cat >"$fix/pr_reviews_8888.json" <<'JSON'
[]
JSON
  cat >"$fix/pr_review_comments_8888.json" <<'JSON'
[]
JSON
  cat >"$fix/pr_commits_8888.json" <<JSON
[{"sha":"${REVIEW_SHA}"}]
JSON
  cat >"$fix/checks_${REVIEW_SHA}.json" <<JSON
{"total_count":1,"check_runs":[{"id":88,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},"head_sha":"${REVIEW_SHA}","status":"completed","conclusion":"success","completed_at":"2026-11-01T00:00:01Z"}]}
JSON
  cat >"$fix/checks_${MAIN_SHA}.json" <<JSON
{"total_count":1,"check_runs":[{"id":89,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},"head_sha":"${MAIN_SHA}","status":"completed","conclusion":"success","completed_at":"2026-11-01T00:00:02Z"}]}
JSON
  cat >"$fix/deploy_runs.json" <<JSON
{"total_count":1,"workflow_runs":[{"id":41293585950,"head_sha":"${MAIN_SHA}","status":"completed","conclusion":"failure","html_url":"https://example.invalid/deploy/hold"}]}
JSON
  cat >"$fix/run_41293585950.json" <<JSON
{"id":41293585950,"event":"workflow_dispatch","head_sha":"${MAIN_SHA}","head_branch":"main","status":"completed","conclusion":"failure","html_url":"https://example.invalid/deploy/hold"}
JSON
  cat >"$fix/jobs_41293585950.json" <<JSON
{"total_count":2,"jobs":[
  {"name":"Pre-UAT eligibility gate","conclusion":"failure","status":"completed","head_sha":"${MAIN_SHA}"},
  {"name":"Deploy accepted SHA to UAT","conclusion":"skipped","status":"completed","head_sha":"${MAIN_SHA}"}
]}
JSON
}

run_eval() {
  local fix="$1"
  shift
  COHESTRA_ROOT="$ROOT_DIR" \
    COHESTRA_GH_API_MOCK="$ROOT_DIR/deploy/lib/uat-readiness-gh-api-mock.sh" \
    COHESTRA_PROVENANCE_FIXTURE="$fix" \
    COHESTRA_READINESS_FIXTURE="$fix" \
    GITHUB_REPOSITORY="fad16papa/Cohestra" \
    UAT_READINESS_OUT_DIR="$fix/out" \
    python3 "$EVALUATOR" "$@"
}

load_report() {
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$1" "$2"
}

expect_state() {
  local report="$1"
  local want="$2"
  local got
  got="$(load_report "$report" state)"
  [[ "$got" == "$want" ]] || fail "expected state $want, got $got"
}

# ---------------------------------------------------------------------------
# Static workflow / wiring contracts
# ---------------------------------------------------------------------------
python3 - "$WORKFLOW" <<'PY'
from pathlib import Path
import re, sys
text = Path(sys.argv[1]).read_text()
on_block = text.split("\njobs:", 1)[0]
if re.search(r"(?m)^  pull_request_target:", on_block):
    raise SystemExit("pull_request_target must not be a trigger")
print("no pull_request_target trigger")
PY
pass "workflow does not use pull_request_target"

grep -qiE 'adcp|autonomous delivery control plane' "$WORKFLOW" && fail "workflow must not revive ADCP"
pass "workflow does not revive ADCP"

python3 - "$WORKFLOW" <<'PY'
import pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text()
for forbidden in ("532", "533", "531", "505"):
    if f"#{forbidden}" in text or f"pr: {forbidden}" in text or f"pulls/{forbidden}" in text:
        raise SystemExit(f"workflow hardcodes PR {forbidden}")
if "UAT_DEPLOY_GATE_ACTIVE: true" in text or "UAT_DEPLOY_GATE_ACTIVE=true" in text:
    raise SystemExit("workflow mutates or sets the UAT gate")
if "appleboy/ssh-action" in text:
    raise SystemExit("readiness workflow must not SSH")
if "workflow_dispatch:" in text and "Deploy UAT" in text.split("workflow_dispatch:")[1][:400]:
    raise SystemExit("readiness workflow_dispatch must stay diagnostic")
required = (
    "pull_request:",
    "pull_request_review:",
    "issue_comment:",
    "check_suite:",
    "workflow_run:",
    "schedule:",
    "workflow_dispatch:",
    "push:",
)
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit(f"missing triggers: {missing}")
if "workflows:\n      - CI" not in text and 'workflows: [CI]' not in text and "- CI" not in text:
    raise SystemExit("workflow_run must listen to CI only")
if "UAT Readiness" in text.split("workflow_run:")[1][:500]:
    raise SystemExit("workflow_run must not recurse on itself")
if "contents: write" in text or "id-token: write" in text:
    raise SystemExit("evaluate job must not request write contents or id-token")
if "persist-credentials: false" not in text:
    raise SystemExit("checkout must persist-credentials: false")
print("workflow trigger contract ok")
PY
pass "event-driven trigger coverage is registered and non-recursive"

python3 - "$DEPLOY_WF" "$CI_WF" <<'PY'
import pathlib, sys
deploy, ci = (pathlib.Path(p).read_text() for p in sys.argv[1:])
if "evaluate-uat-readiness.sh" not in deploy:
    raise SystemExit("deploy.yml must call evaluate-uat-readiness.sh")
if "require-uat-readiness-predeploy.sh" not in deploy:
    raise SystemExit("deploy.yml must require readiness before enabled SSH")
if "evaluate-uat-readiness.test.sh" not in ci:
    raise SystemExit("ci.yml must run readiness contract tests")
if "validate-uat-readiness-workflow.sh" not in ci:
    raise SystemExit("ci.yml must validate the readiness workflow")
print("ci/deploy wiring ok")
PY
pass "validator is wired into CI and Deploy UAT"

# ---------------------------------------------------------------------------
# Future PR, not hardcoded 532/533
# ---------------------------------------------------------------------------
FIX="$TMP/pr-green"
write_pr_green "$FIX" 9999
run_eval "$FIX" --mode pr --pr 9999 --head "$HEAD_SHA" --base "$BASE_SHA" >/dev/null
expect_state "$FIX/out/uat-readiness.json" "READY_FOR_OWNER_MERGE_DECISION"
python3 - "$FIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["pr_number"] == 9999
assert r["ready"] is True
assert r["owner_authorization_claimed"] is False
assert r["hardcoded_prs"] is False
assert r["should_notify"] is True
assert r["notify_reason"] == "new_decision"
assert r["review_evidence"] == "AUTHENTIC"
assert r["gitguardian"]["native"] == "SUCCESS"
assert r["gitguardian"]["exact_sha_api"] in {"NOT_REQUIRED_ON_PR", "SKIPPED_OK_ON_PR"}
assert "token" not in json.dumps(r).lower() or "[REDACTED]" in json.dumps(r)
PY
pass "future labeled UAT PR 9999 becomes READY without hardcoded 532/533"

# Path-based candidate without label
python3 - "$FIX/pr_9999.json" "$FIX/pr_files_9999.json" <<'PY'
import json, sys
pr = json.load(open(sys.argv[1]))
pr["labels"] = []
pr["number"] = 4242
json.dump(pr, open(sys.argv[1], "w"))
json.dump([{"filename":"web/e2e-uat/authenticated.spec.ts"}], open(sys.argv[2], "w"))
PY
# reuse same comments/CI keyed by 9999 — copy to 4242
cp "$FIX/pr_9999.json" "$FIX/pr_4242.json"
cp "$FIX/pr_files_9999.json" "$FIX/pr_files_4242.json"
cp "$FIX/issue_comments_9999.json" "$FIX/issue_comments_4242.json"
cp "$FIX/pr_reviews_9999.json" "$FIX/pr_reviews_4242.json"
cp "$FIX/pr_review_comments_9999.json" "$FIX/pr_review_comments_4242.json"
run_eval "$FIX" --mode pr --pr 4242 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "READY_FOR_OWNER_MERGE_DECISION"
pass "path-based future UAT PR is a candidate without hardcoded numbers"

# Unrelated PR is not a candidate
cat >"$FIX/pr_7.json" <<JSON
{"number":7,"draft":false,"mergeable":true,"mergeable_state":"clean","body":"","user":{"login":"coder","type":"User"},"head":{"sha":"${HEAD_SHA}"},"base":{"sha":"${BASE_SHA}","ref":"main"},"labels":[]}
JSON
echo '[{"filename":"README.md"}]' >"$FIX/pr_files_7.json"
echo '[]' >"$FIX/issue_comments_7.json"
echo '[]' >"$FIX/pr_reviews_7.json"
echo '[]' >"$FIX/pr_review_comments_7.json"
run_eval "$FIX" --mode pr --pr 7 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "NOT_UAT_CANDIDATE"
pass "unrelated README PR is not a UAT candidate"

# ---------------------------------------------------------------------------
# Negative review / CI / security paths
# ---------------------------------------------------------------------------
write_pr_green "$FIX" 9999

python3 - "$FIX/pr_9999.json" <<'PY'
import json, sys
pr = json.load(open(sys.argv[1]))
pr["body"] = """<!-- cohestra-independent-review v1 -->
{"role":"BMAD","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","blocker":0,"major":0,"minor":0,"nit":0,"verdict":"PASS","independent":true}
"""
json.dump(pr, open(sys.argv[1], "w"))
PY
echo '[]' >"$FIX/issue_comments_9999.json"
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
python3 - "$FIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["review_evidence"] == "SPOOFED"
assert r["ready"] is False
assert r["material_blocker"] is True
PY
pass "PR body spoofed BMAD review cannot produce READY"

write_pr_green "$FIX" 9999
python3 - "$FIX/issue_comments_9999.json" "$HEAD_SHA" <<'PY'
import json, sys
sha = sys.argv[2]
payload = [
  {"id":1,"user":{"login":"coder","type":"User"},"body":"""<!-- cohestra-independent-review v1 -->
{"role":"BMAD","head_sha":"%s","blocker":0,"major":0,"minor":0,"nit":0,"verdict":"PASS","independent":true}
""" % sha},
  {"id":2,"user":{"login":"catsec-reviewer","type":"User"},"body":"""<!-- cohestra-independent-review v1 -->
{"role":"CAT-SEC","head_sha":"%s","blocker":0,"major":0,"minor":0,"nit":0,"verdict":"PASS","independent":true}
""" % sha},
]
json.dump(payload, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
grep -q 'REVIEW_EVIDENCE_MISSING\|author' "$FIX/out/uat-readiness.json" \
  || fail "self-review must not count"
pass "PR author review is not authentic independent evidence"

write_pr_green "$FIX" 9999
python3 - "$FIX/issue_comments_9999.json" "$HEAD_SHA" <<'PY'
import json, sys
sha = sys.argv[2]
payload = [
  {"id":1,"user":{"login":"github-actions[bot]","type":"Bot"},"body":"""<!-- cohestra-independent-review v1 -->
{"role":"BMAD","head_sha":"%s","blocker":0,"major":0,"minor":0,"nit":0,"verdict":"PASS","independent":true}
""" % sha},
  {"id":2,"user":{"login":"catsec-reviewer","type":"User"},"body":"""<!-- cohestra-independent-review v1 -->
{"role":"CAT-SEC","head_sha":"%s","blocker":0,"major":0,"minor":0,"nit":0,"verdict":"PASS","independent":true}
""" % sha},
]
json.dump(payload, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
pass "bot impersonation is unsupported reviewer identity"

write_pr_green "$FIX" 9999
python3 - "$FIX/issue_comments_9999.json" <<'PY'
import json, sys
payload = json.load(open(sys.argv[1]))
payload[0]["body"] = payload[0]["body"].replace(
    '"head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"',
    '"head_sha":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"',
)
json.dump(payload, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
python3 - "$FIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["review_evidence"] == "REVIEW_EVIDENCE_MISSING"
assert r["ready"] is False
PY
pass "stale review SHA is REVIEW_EVIDENCE_MISSING, not READY"

write_pr_green "$FIX" 9999
python3 - "$FIX/issue_comments_9999.json" <<'PY'
import json, sys
comments = json.load(open(sys.argv[1]))
body = comments[0]["body"].replace('"blocker":0', '"blocker":1', 1)
comments[0]["body"] = body
json.dump(comments, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
pass "PASS verdict with BLOCKER>0 is rejected"

write_pr_green "$FIX" 9999
python3 - "$FIX/jobs_22.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
data["jobs"] = [job for job in data["jobs"] if job["name"] != "Exact-SHA security scan"]
data["total_count"] = len(data["jobs"])
json.dump(data, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
pass "partial CI (missing Exact-SHA) is HOLD"

write_pr_green "$FIX" 9999
python3 - "$FIX/jobs_22.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
for job in data["jobs"]:
    if job["name"] == "Next.js build":
        job["conclusion"] = "failure"
json.dump(data, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
pass "failed required check changes READY back to HOLD"

write_pr_green "$FIX" 9999
python3 - "$FIX/jobs_22.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
for job in data["jobs"]:
    if job["name"] == "Docker stack smoke":
        job["status"] = "in_progress"
        job["conclusion"] = None
json.dump(data, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "REVIEW_IN_PROGRESS"
pass "in-progress required check is REVIEW_IN_PROGRESS"

write_pr_green "$FIX" 9999
rm -f "$FIX/checks_${HEAD_SHA}.json"
echo '{"total_count":0,"check_runs":[]}' >"$FIX/checks_${HEAD_SHA}.json"
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
pass "missing native GitGuardian is HOLD"

write_pr_green "$FIX" 9999
python3 - "$FIX/pr_9999.json" "$HEAD_SHA" <<'PY'
import json, sys
pr = json.load(open(sys.argv[1]))
pr["head"]["sha"] = "ffffffffffffffffffffffffffffffffffffffff"
json.dump(pr, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 --head "$HEAD_SHA" >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
python3 - "$FIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["stale"] is True
PY
pass "SHA race against current PR HEAD is stale HOLD"

write_pr_green "$FIX" 9999
touch "$FIX/http_403"
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
python3 - "$FIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["api_error"]
assert r["ready"] is False
assert r["material_blocker"] is True
PY
rm -f "$FIX/http_403"
pass "API 403 fail-closes to HOLD"

# ---------------------------------------------------------------------------
# Skipped vs succeeded GitGuardian API scan
# ---------------------------------------------------------------------------
MAINFIX="$TMP/main"
write_main_green "$MAINFIX"
run_eval "$MAINFIX" --mode main --sha "$MAIN_SHA" >/dev/null
expect_state "$MAINFIX/out/uat-readiness.json" "READY_FOR_OWNER_UAT_COMMISSIONING_DECISION"
python3 - "$MAINFIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["predeploy_ok"] is True
assert r["gitguardian"]["exact_sha_api"] == "SUCCESS"
assert r["attestation_matrix"]["live_enabled_deployment"] == "DISABLED_GATE_HOLD_VERIFIED"
assert r["owner_authorization_claimed"] is False
PY
pass "main SHA with live disabled-gate HOLD is commissioning-ready evidence only"

write_main_green "$MAINFIX"
python3 - "$MAINFIX/jobs_11.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
for job in data["jobs"]:
    if job["name"] == "GitGuardian exact-SHA API scan":
        job["conclusion"] = "skipped"
json.dump(data, open(sys.argv[1], "w"))
PY
run_eval "$MAINFIX" --mode main --sha "$MAIN_SHA" >/dev/null
expect_state "$MAINFIX/out/uat-readiness.json" "HOLD"
pass "skipped GitGuardian exact-SHA API scan on push-main is HOLD"

write_pr_green "$FIX" 9999
python3 - "$FIX/jobs_22.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
data["jobs"].append({"name":"GitGuardian exact-SHA API scan","conclusion":"skipped","status":"completed","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
data["total_count"] = len(data["jobs"])
json.dump(data, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "READY_FOR_OWNER_MERGE_DECISION"
python3 - "$FIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["gitguardian"]["exact_sha_api"] == "SKIPPED_OK_ON_PR"
PY
pass "skipped GitGuardian API scan on a PR is not required"

write_main_green "$MAINFIX"
echo '{"total_count":0,"workflow_runs":[]}' >"$MAINFIX/deploy_runs.json"
run_eval "$MAINFIX" --mode main --sha "$MAIN_SHA" >/dev/null
expect_state "$MAINFIX/out/uat-readiness.json" "UAT_ACTIVATION_HOLD"
python3 - "$MAINFIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["predeploy_ok"] is True
assert r["attestation_matrix"]["environment_secrets"] == "UNVERIFIED"
assert r["attestation_matrix"]["restore_rehearsal"] == "UNVERIFIED"
PY
pass "missing live HOLD artifacts stay UAT_ACTIVATION_HOLD with unverified attestations"

# ---------------------------------------------------------------------------
# Notification idempotency
# ---------------------------------------------------------------------------
write_pr_green "$FIX" 9999
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
FP="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["dedup_fingerprint"])' "$FIX/out/uat-readiness.json")"
python3 - "$FIX/issue_comments_9999.json" "$FP" <<'PY'
import json, sys
comments = json.load(open(sys.argv[1]))
comments.append({
  "id": 303,
  "user": {"login": "github-actions[bot]", "type": "Bot"},
  "body": f"<!-- cohestra-readiness-notice:{sys.argv[2]} -->\nprior notice",
})
json.dump(comments, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
python3 - "$FIX/out/uat-readiness.json" "$FIX/out/uat-readiness-notice.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
n = json.load(open(sys.argv[2]))
assert r["state"] == "READY_FOR_OWNER_MERGE_DECISION"
assert r["should_notify"] is False
assert r["notify_reason"] == "idempotent"
assert n["should_notify"] is False
assert n["owner_authorization_claimed"] is False
PY
pass "same-HEAD decision notice is idempotent"

# ---------------------------------------------------------------------------
# Secrets are not introspectable
# ---------------------------------------------------------------------------
write_pr_green "$FIX" 9999
python3 - "$FIX/issue_comments_9999.json" <<'PY'
import json, sys
comments = json.load(open(sys.argv[1]))
comments.append({"id":404,"user":{"login":"leaker","type":"User"},"body":"token=ghp_secrettokenvalue123 and password=supersecret"})
json.dump(comments, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
if grep -qE 'ghp_secrettokenvalue123|supersecret' "$FIX/out/uat-readiness.json" "$FIX/out/uat-readiness.md"; then
  fail "secret-like values leaked into readiness report"
fi
pass "private secret-like strings are not persisted in reports"

# ---------------------------------------------------------------------------
# Predeploy require gate
# ---------------------------------------------------------------------------
write_main_green "$MAINFIX"
run_eval "$MAINFIX" --mode predeploy --sha "$MAIN_SHA" >/dev/null
if ! CANDIDATE_SHA="$MAIN_SHA" UAT_DEPLOY_GATE_ACTIVE=true UAT_READINESS_OUT_DIR="$MAINFIX/out" \
    bash "$REQUIRE"; then
  fail "enabled gate must accept a fresh predeploy_ok report"
fi
pass "enabled predeploy accepts matching fresh readiness"

if CANDIDATE_SHA="ffffffffffffffffffffffffffffffffffffffff" UAT_DEPLOY_GATE_ACTIVE=true \
    UAT_READINESS_OUT_DIR="$MAINFIX/out" bash "$REQUIRE" 2>/dev/null; then
  fail "SHA mismatch must block SSH"
fi
pass "changed SHA refuses predeploy readiness"

rm -rf "$TMP/missing"
mkdir -p "$TMP/missing"
if CANDIDATE_SHA="$MAIN_SHA" UAT_DEPLOY_GATE_ACTIVE=true UAT_READINESS_OUT_DIR="$TMP/missing" \
    bash "$REQUIRE" 2>/dev/null; then
  fail "missing report must block SSH when gate is true"
fi
pass "missing readiness report blocks enabled SSH"

if ! CANDIDATE_SHA="$MAIN_SHA" UAT_DEPLOY_GATE_ACTIVE=false UAT_READINESS_OUT_DIR="$TMP/missing" \
    bash "$REQUIRE"; then
  fail "disabled gate must not fail closed on missing readiness"
fi
pass "disabled gate preserves HOLD-first and does not require readiness to exist"

python3 - "$MAINFIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
r["stale"] = True
r["predeploy_ok"] = True
json.dump(r, open(sys.argv[1], "w"))
PY
if CANDIDATE_SHA="$MAIN_SHA" UAT_DEPLOY_GATE_ACTIVE=true UAT_READINESS_OUT_DIR="$MAINFIX/out" \
    bash "$REQUIRE" 2>/dev/null; then
  fail "stale readiness must block SSH"
fi
pass "stale readiness report blocks enabled SSH"

# ---------------------------------------------------------------------------
# Wrapper + disabled-gate report-only
# ---------------------------------------------------------------------------
write_pr_green "$FIX" 9999
COHESTRA_ROOT="$ROOT_DIR" \
  COHESTRA_GH_API_MOCK="$ROOT_DIR/deploy/lib/uat-readiness-gh-api-mock.sh" \
  COHESTRA_PROVENANCE_FIXTURE="$FIX" \
  GITHUB_REPOSITORY="fad16papa/Cohestra" \
  UAT_READINESS_MODE=pr \
  UAT_READINESS_PR=9999 \
  UAT_READINESS_OUT_DIR="$FIX/wrap" \
  bash "$WRAPPER" >/dev/null
[[ -f "$FIX/wrap/uat-readiness.json" ]] || fail "wrapper must write uat-readiness.json"
[[ -f "$FIX/wrap/uat-readiness.md" ]] || fail "wrapper must write markdown"
pass "wrapper writes sanitized JSON and Markdown reports"

# ---------------------------------------------------------------------------
# Reconcile future PRs
# ---------------------------------------------------------------------------
write_pr_green "$FIX" 9999
cat >"$FIX/open_pulls.json" <<JSON
[{"number":9999,"labels":[{"name":"uat"}],"head":{"sha":"${HEAD_SHA}"},"base":{"sha":"${BASE_SHA}","ref":"main"}}]
JSON
run_eval "$FIX" --mode reconcile >/dev/null
python3 - "$FIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["mode"] == "reconcile"
assert r["state"] == "READY_FOR_OWNER_MERGE_DECISION"
assert any(item.get("pr_number") == 9999 for item in r.get("reports") or [])
assert not any(item.get("pr_number") in {532, 533, 505} for item in r.get("reports") or [])
PY
pass "scheduled reconcile evaluates future UAT PRs, not hardcoded 532/533"

# ---------------------------------------------------------------------------
# Deploy.yml HOLD-first still present
# ---------------------------------------------------------------------------
python3 - "$DEPLOY_WF" <<'PY'
from pathlib import Path
import re, sys
text = Path(sys.argv[1]).read_text()
if "UAT_DEPLOY_GATE_ACTIVE:-}" not in text or '!= "true"' not in text:
    raise SystemExit("disabled gate HOLD-first missing")
if "require-uat-readiness-predeploy.sh" not in text:
    raise SystemExit("enabled path must require readiness")
# Require script only in enabled (true) branch, or guarded by gate == true.
if text.count("require-uat-readiness-predeploy.sh") < 2:
    raise SystemExit("readiness must be required on predeploy and immediately before SSH")
print("deploy HOLD-first + pre-SSH readiness ok")
PY
pass "Deploy UAT keeps HOLD-first and revalidates readiness before SSH"

write_pr_green "$FIX" 9999
python3 - "$FIX/jobs_22.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
for job in data["jobs"]:
    if job["name"] == "Exact-SHA security scan":
        job["conclusion"] = "skipped"
json.dump(data, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
pass "skipped required PR check is HOLD, not READY"

write_pr_green "$FIX" 9999
python3 - "$FIX/pr_9999.json" <<'PY'
import json, sys
pr = json.load(open(sys.argv[1]))
pr["mergeable"] = None
pr["mergeable_state"] = "unknown"
json.dump(pr, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
pass "ambiguous mergeability fail-closes to HOLD"

write_pr_green "$FIX" 9999
python3 - "$FIX/issue_comments_9999.json" <<'PY'
import json, sys
comments = json.load(open(sys.argv[1]))
for row in comments:
    row["author_association"] = "NONE"
json.dump(comments, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
pass "public untrusted commenter cannot mint authentic reviews"

write_pr_green "$FIX" 9999
python3 - "$FIX/issue_comments_9999.json" <<'PY'
import json, sys
comments = json.load(open(sys.argv[1]))
comments[1]["user"]["login"] = comments[0]["user"]["login"]
json.dump(comments, open(sys.argv[1], "w"))
PY
run_eval "$FIX" --mode pr --pr 9999 >/dev/null
expect_state "$FIX/out/uat-readiness.json" "HOLD"
pass "one identity cannot satisfy both BMAD and CAT-SEC"

write_pr_green "$FIX" 9999
run_eval "$FIX" --mode main --sha "$HEAD_SHA" >/dev/null
expect_state "$FIX/out/uat-readiness.json" "READY_FOR_OWNER_MERGE_DECISION"
python3 - "$FIX/out/uat-readiness.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["mode"] == "pr"
assert r["pr_number"] == 9999
PY
pass "workflow_run/main-mode SHA of an open UAT PR re-evaluates that PR"

write_main_green "$MAINFIX"
python3 - "$MAINFIX/jobs_41293585950.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
for job in data["jobs"]:
    if job["name"] == "Deploy accepted SHA to UAT":
        job["conclusion"] = "cancelled"
json.dump(data, open(sys.argv[1], "w"))
PY
run_eval "$MAINFIX" --mode main --sha "$MAIN_SHA" >/dev/null
expect_state "$MAINFIX/out/uat-readiness.json" "UAT_ACTIVATION_HOLD"
pass "cancelled Deploy UAT is not live disabled-gate HOLD proof"

echo "evaluate-uat-readiness contract OK"
