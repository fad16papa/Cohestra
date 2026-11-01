#!/usr/bin/env bash
# Fail-closed contract for the final UAT delivery outcome aggregator.
# Not a live deploy. No secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTCOME="$ROOT_DIR/deploy/uat-final-outcome.sh"
WF="$ROOT_DIR/.github/workflows/deploy.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$OUTCOME" ]] || fail "uat-final-outcome.sh missing"

SHA="74958f1ad4695ea8358b57ed6dc4b0be8f3ba9de"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

write_dispatch() {
  cat >"$1/uat-deploy-dispatch.json" <<JSON
{"workflow":"deploy-uat","environment":"uat","event":"workflow_run","sha":"${SHA}","result":"dispatched"}
JSON
}

write_acceptance() {
  local result="${2:-pass}"
  cat >"$1/uat-acceptance.json" <<JSON
{"story":"45.2","sha":"${SHA}","result":"${result}","deployment":{"shaMatch":true},"runtime":{"apiGitSha":"${SHA}"}}
JSON
}

write_smoke() {
  cat >"$1/uat-public-smoke.json" <<JSON
{"result":"${2:-pass}","failures":[]}
JSON
}

write_browser() {
  mkdir -p "$1/web/test-results"
  cat >"$1/web/test-results/uat-playwright.json" <<JSON
{"stats":{"expected":8,"skipped":2,"unexpected":${2:-0},"flaky":0}}
JSON
}

write_lifecycle() {
  cat >"$1/19-5-lifecycle.json" <<JSON
{"result":"${2:-pass}","story":"19.5"}
JSON
}

write_lifecycle_skip() {
  cat >"$1/19-5-lifecycle.json" <<JSON
{"result":"skip","reason":"${2:-lifecycle_disabled}","story":"19.5","paddleMutation":"NONE"}
JSON
}

write_predeploy() {
  cat >"$1/uat-predeploy-gate.json" <<JSON
{"result":"${2:-PASS}","reason":"${3:-all required checks SUCCESS on candidate_sha}","candidate_sha":"${SHA}"}
JSON
}

write_ssh() {
  cat >"$1/uat-ssh-execution.json" <<JSON
{"result":"recorded","conclusion":"${2:-success}","sha":"${SHA}","proof":"github_actions_step_conclusion","host_mutation":"unknown","ssh_attempted":true}
JSON
}

write_proven_host() {
  write_predeploy "$1" PASS "ok"
  write_dispatch "$1"
  write_ssh "$1" success
  write_acceptance "$1" pass
  write_smoke "$1" pass
  write_lifecycle "$1" pass
}

write_browser_raw() {
  mkdir -p "$1/web/test-results"
  printf '%s\n' "$2" >"$1/web/test-results/uat-playwright.json"
}

run_outcome() {
  local dir="$1"
  OUTCOME_RC=0
  OUTCOME_OUT="$(UAT_FINAL_OUTCOME_DIR="$dir" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)" || OUTCOME_RC=$?
}

if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/empty" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "missing evidence must not PASS"
fi
echo "$out" | grep -qE 'RESULT=(HOLD|REFUSE)|MISSING_EVIDENCE|INCOMPLETE' || { echo "$out"; fail "missing evidence reason"; }
pass "missing evidence fails closed"

mkdir -p "$TMP/hold"
write_predeploy "$TMP/hold" HOLD "UAT_DEPLOY_GATE_ACTIVE is not true"
run_outcome "$TMP/hold"
[[ "$OUTCOME_RC" -eq 0 ]] || { echo "$OUTCOME_OUT"; fail "pre-SSH HELD may exit 0 for status aggregation"; }
echo "$OUTCOME_OUT" | grep -q 'RESULT=HOLD' || { echo "$OUTCOME_OUT"; fail "HELD must print RESULT=HOLD"; }
echo "$OUTCOME_OUT" | grep -q 'UAT_DEPLOYMENT_OUTCOME=HELD' || { echo "$OUTCOME_OUT"; fail "HELD outcome token"; }
python3 - "$TMP/hold/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["phase"] == "final"
assert p["uat_deployment_outcome"] == "HELD"
assert p["result"] == "HOLD"
assert p["eligibility"] == "HOLD"
assert p["ssh_executed"] is False
assert p["uat_deployed"] is False
assert p["deployment_phase"] == "NOT_STARTED"
PY
pass "predeploy HOLD finalizes as HELD with exit 0; eligibility is JSON not rc"

mkdir -p "$TMP/inconsistent"
write_predeploy "$TMP/inconsistent" PASS "ok"
write_dispatch "$TMP/inconsistent"
python3 - "$TMP/inconsistent/uat-deploy-dispatch.json" <<'PY'
import json,sys
p=json.load(open(sys.argv[1]))
p["sha"]="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
json.dump(p, open(sys.argv[1],"w"))
PY
write_acceptance "$TMP/inconsistent"
write_smoke "$TMP/inconsistent"
write_browser "$TMP/inconsistent"
write_lifecycle "$TMP/inconsistent"
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/inconsistent" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "inconsistent SHA must fail closed"
fi
echo "$out" | grep -qiE 'INCONSISTENT|sha' || { echo "$out"; fail "inconsistent SHA reason"; }
python3 - "$TMP/inconsistent/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] == "INCONSISTENT", p
assert p["uat_deployed"] is None, p
assert p["ssh_executed"] is None, p
PY
pass "inconsistent SHA fails closed"

mkdir -p "$TMP/dispatch-only"
write_predeploy "$TMP/dispatch-only" PASS "ok"
write_dispatch "$TMP/dispatch-only"
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/dispatch-only" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "pre-SSH dispatch must not PASS"
fi
python3 - "$TMP/dispatch-only/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["ssh_attempted"] is True, p
assert p["ssh_executed"] is not True, p
assert p["uat_deployed"] is None, p
assert p["uat_deployment_outcome"] == "ATTEMPTED", p
assert p["deployment_phase"] == "ATTEMPTED", p
assert not p.get("deployed_sha"), p
text = json.dumps(p).lower()
assert "no deployment occurred" not in text
PY
pass "pre-SSH dispatch is ATTEMPTED, not executed or deployed"

mkdir -p "$TMP/ssh-connect-fail"
write_predeploy "$TMP/ssh-connect-fail" PASS "ok"
write_dispatch "$TMP/ssh-connect-fail"
write_ssh "$TMP/ssh-connect-fail" failure
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/ssh-connect-fail" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "failed SSH connection must not PASS"
fi
python3 - "$TMP/ssh-connect-fail/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["ssh_attempted"] is True, p
assert p["ssh_executed"] is not True, p
assert p["uat_deployed"] is None, p
assert p["ssh_step_conclusion"] == "failure", p
assert p["uat_deployment_outcome"] in ("ATTEMPTED", "UNKNOWN"), p
assert not p.get("deployed_sha"), p
PY
pass "SSH connection failure is UNKNOWN/ATTEMPTED, not a boolean deploy"

mkdir -p "$TMP/ssh-midway"
write_predeploy "$TMP/ssh-midway" PASS "ok"
write_dispatch "$TMP/ssh-midway"
write_ssh "$TMP/ssh-midway" failure
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/ssh-midway" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "mid-SSH remote failure must not invent deploy state"
fi
python3 - "$TMP/ssh-midway/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployed"] is None, p
assert p["ssh_executed"] is not True, p
assert p["uat_deployment_outcome"] in ("ATTEMPTED", "UNKNOWN"), p
PY
pass "mid-SSH remote failure stays UNKNOWN/ATTEMPTED"

mkdir -p "$TMP/ssh-skipped"
write_predeploy "$TMP/ssh-skipped" PASS "ok"
write_ssh "$TMP/ssh-skipped" skipped
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/ssh-skipped" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "skipped SSH step must not invent an attempt"
fi
python3 - "$TMP/ssh-skipped/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["ssh_attempted"] is False, p
assert p["ssh_executed"] is not True, p
assert p["uat_deployed"] is not True, p
assert p["uat_deployment_outcome"] != "ATTEMPTED", p
PY
pass "skipped SSH step is not an SSH attempt"

mkdir -p "$TMP/ssh-success-no-host"
write_predeploy "$TMP/ssh-success-no-host" PASS "ok"
write_dispatch "$TMP/ssh-success-no-host"
write_ssh "$TMP/ssh-success-no-host" success
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/ssh-success-no-host" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "SSH step success without host SHA must not claim ACCEPTED"
fi
python3 - "$TMP/ssh-success-no-host/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["ssh_executed"] is True, p
assert p["uat_deployed"] is None, p
assert p["uat_deployment_outcome"] == "INCOMPLETE", p
assert not p.get("deployed_sha"), p
PY
pass "SSH success without host acceptance is INCOMPLETE, not deployed"

mkdir -p "$TMP/rejected"
write_predeploy "$TMP/rejected" PASS "ok"
write_dispatch "$TMP/rejected"
write_ssh "$TMP/rejected" success
write_acceptance "$TMP/rejected" fail
write_smoke "$TMP/rejected" fail
write_browser "$TMP/rejected" 2
write_lifecycle "$TMP/rejected" fail
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/rejected" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "failed postdeploy must not PASS"
fi
python3 - "$TMP/rejected/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployed"] is True, p
assert p["ssh_executed"] is True, p
assert p["uat_deployment_outcome"] == "DEPLOYED_REJECTED", p
assert p["deployed_sha"]
text = json.dumps(p).lower()
assert "no deployment occurred" not in text
assert "no deploy occurred" not in text
PY
pass "postdeploy failure is DEPLOYED_REJECTED, not 'no deployment occurred'"

mkdir -p "$TMP/browser-fail"
write_predeploy "$TMP/browser-fail" PASS "ok"
write_dispatch "$TMP/browser-fail"
write_ssh "$TMP/browser-fail" success
write_acceptance "$TMP/browser-fail" pass
write_smoke "$TMP/browser-fail" pass
write_browser "$TMP/browser-fail" 2
write_lifecycle "$TMP/browser-fail" fail
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/browser-fail" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "confirmed deploy plus browser/lifecycle failure must not PASS"
fi
python3 - "$TMP/browser-fail/uat-final-outcome.json" <<PY
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployed"] is True, p
assert p["ssh_executed"] is True, p
assert p["deployed_sha"] == "${SHA}", p
assert p["uat_deployment_outcome"] == "DEPLOYED_REJECTED", p
text = json.dumps(p).lower()
assert "no deployment occurred" not in text
PY
pass "confirmed SHA plus later browser/lifecycle failure is DEPLOYED_REJECTED"

mkdir -p "$TMP/smoke-fail-skipped-browser"
write_predeploy "$TMP/smoke-fail-skipped-browser" PASS "ok"
write_dispatch "$TMP/smoke-fail-skipped-browser"
write_ssh "$TMP/smoke-fail-skipped-browser" success
write_acceptance "$TMP/smoke-fail-skipped-browser" pass
write_smoke "$TMP/smoke-fail-skipped-browser" fail
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/smoke-fail-skipped-browser" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "host-proven smoke fail with skipped browser must not PASS"
fi
python3 - "$TMP/smoke-fail-skipped-browser/uat-final-outcome.json" <<PY
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployed"] is True, p
assert p["deployed_sha"] == "${SHA}", p
assert p["uat_deployment_outcome"] == "DEPLOYED_REJECTED", p
assert p["browser"] == "missing", p
assert p["lifecycle"] == "missing", p
text = json.dumps(p).lower()
assert "no deployment occurred" not in text
PY
pass "host-proven smoke fail with skipped browser/lifecycle is DEPLOYED_REJECTED"

mkdir -p "$TMP/duplicate/artifacts"
write_predeploy "$TMP/duplicate" PASS "ok"
write_dispatch "$TMP/duplicate"
write_ssh "$TMP/duplicate" success
write_acceptance "$TMP/duplicate" pass
write_smoke "$TMP/duplicate" pass
write_browser "$TMP/duplicate" 0
write_lifecycle "$TMP/duplicate" pass
python3 - "$TMP/duplicate/uat-deploy-dispatch.json" "$TMP/duplicate/artifacts/uat-deploy-dispatch.json" <<'PY'
import json, sys
src = json.load(open(sys.argv[1]))
src["sha"] = "cccccccccccccccccccccccccccccccccccccccc"
json.dump(src, open(sys.argv[2], "w"))
PY
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/duplicate" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "duplicate disagreeing artifacts must fail closed"
fi
echo "$out" | grep -qiE 'INCONSISTENT|duplicate' || { echo "$out"; fail "duplicate artifact reason"; }
pass "duplicate disagreeing artifacts fail closed"

mkdir -p "$TMP/accepted"
write_predeploy "$TMP/accepted" PASS "ok"
write_dispatch "$TMP/accepted"
write_ssh "$TMP/accepted" success
write_acceptance "$TMP/accepted" pass
write_smoke "$TMP/accepted" pass
write_browser "$TMP/accepted" 0
write_lifecycle "$TMP/accepted" pass
out="$(UAT_FINAL_OUTCOME_DIR="$TMP/accepted" TARGET_SHA="$SHA" bash "$OUTCOME")" \
  || { echo "$out"; fail "complete success must PASS"; }
python3 - "$TMP/accepted/uat-final-outcome.json" <<PY
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] == "DEPLOYED_ACCEPTED", p
assert p["uat_deployed"] is True
assert p["ssh_executed"] is True
assert p["deployed_sha"] == "${SHA}"
assert p["host_acceptance"] == "pass"
assert p["smoke"] == "pass"
assert p["browser"] == "pass"
assert p["lifecycle"] == "pass"
assert p.get("lifecycle_report") == "PASS", p
assert "lifecycle=PASS" in p["diagnostics"]
assert "lifecycle evidence passed" not in p["diagnostics"]
assert "SKIPPED" not in p["diagnostics"]
blob = json.dumps(p)
assert "DROPLET_" not in blob
assert "GITGUARDIAN_API_KEY=" not in blob
PY
pass "complete success is DEPLOYED_ACCEPTED"

mkdir -p "$TMP/lifecycle-skip"
write_predeploy "$TMP/lifecycle-skip" PASS "ok"
write_dispatch "$TMP/lifecycle-skip"
write_ssh "$TMP/lifecycle-skip" success
write_acceptance "$TMP/lifecycle-skip" pass
write_smoke "$TMP/lifecycle-skip" pass
write_browser "$TMP/lifecycle-skip" 0
write_lifecycle_skip "$TMP/lifecycle-skip" lifecycle_disabled
out="$(UAT_FINAL_OUTCOME_DIR="$TMP/lifecycle-skip" TARGET_SHA="$SHA" bash "$OUTCOME")" \
  || { echo "$out"; fail "opt-in lifecycle skip must not reject a proven deploy"; }
python3 - "$TMP/lifecycle-skip/uat-final-outcome.json" <<PY
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] == "DEPLOYED_ACCEPTED", p
assert p["uat_deployed"] is True
assert p["lifecycle"] == "skip"
assert p.get("lifecycle_reason") == "lifecycle_disabled", p
assert p.get("lifecycle_report") == "SKIPPED (lifecycle_disabled)", p
assert p["deployed_sha"] == "${SHA}"
diag = p["diagnostics"]
assert "lifecycle=SKIPPED (lifecycle_disabled)" in diag, p
assert "lifecycle=PASS" not in diag
assert "lifecycle evidence passed" not in diag
assert "smoke=PASS" in diag
assert "browser=PASS" in diag
PY
pass "authorized lifecycle_disabled skip is ACCEPTED with SKIPPED diagnostics"

mkdir -p "$TMP/lifecycle-closed"
write_predeploy "$TMP/lifecycle-closed" PASS "ok"
write_dispatch "$TMP/lifecycle-closed"
write_ssh "$TMP/lifecycle-closed" success
write_acceptance "$TMP/lifecycle-closed" pass
write_smoke "$TMP/lifecycle-closed" pass
write_browser "$TMP/lifecycle-closed" 0
write_lifecycle_skip "$TMP/lifecycle-closed" story_closed
out="$(UAT_FINAL_OUTCOME_DIR="$TMP/lifecycle-closed" TARGET_SHA="$SHA" bash "$OUTCOME")" \
  || { echo "$out"; fail "story_closed skip must not reject a proven deploy"; }
python3 - "$TMP/lifecycle-closed/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] == "DEPLOYED_ACCEPTED", p
assert p["lifecycle"] == "skip"
assert p.get("lifecycle_reason") == "story_closed", p
assert p.get("lifecycle_report") == "SKIPPED (story_closed)", p
assert "lifecycle=SKIPPED (story_closed)" in p["diagnostics"]
assert "lifecycle=PASS" not in p["diagnostics"]
PY
pass "authorized story_closed skip is ACCEPTED with SKIPPED diagnostics"

mkdir -p "$TMP/lifecycle-missing"
write_predeploy "$TMP/lifecycle-missing" PASS "ok"
write_dispatch "$TMP/lifecycle-missing"
write_ssh "$TMP/lifecycle-missing" success
write_acceptance "$TMP/lifecycle-missing" pass
write_smoke "$TMP/lifecycle-missing" pass
write_browser "$TMP/lifecycle-missing" 0
run_outcome "$TMP/lifecycle-missing"
[[ "$OUTCOME_RC" -ne 0 ]] || { echo "$OUTCOME_OUT"; fail "missing lifecycle artifact must exit nonzero"; }
python3 - "$TMP/lifecycle-missing/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployed"] is True, p
assert p["uat_deployment_outcome"] == "INCOMPLETE", p
assert p["lifecycle"] == "missing", p
assert p["result"] == "HOLD", p
PY
pass "missing lifecycle artifact HOLDs as INCOMPLETE"

mkdir -p "$TMP/lifecycle-bare-skip"
write_predeploy "$TMP/lifecycle-bare-skip" PASS "ok"
write_dispatch "$TMP/lifecycle-bare-skip"
write_ssh "$TMP/lifecycle-bare-skip" success
write_acceptance "$TMP/lifecycle-bare-skip" pass
write_smoke "$TMP/lifecycle-bare-skip" pass
write_browser "$TMP/lifecycle-bare-skip" 0
write_lifecycle "$TMP/lifecycle-bare-skip" skip
run_outcome "$TMP/lifecycle-bare-skip"
[[ "$OUTCOME_RC" -ne 0 ]] || { echo "$OUTCOME_OUT"; fail "skip without authorized reason must exit nonzero"; }
python3 - "$TMP/lifecycle-bare-skip/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] == "DEPLOYED_REJECTED", p
assert p["result"] == "HOLD", p
assert p["uat_deployed"] is True, p
assert "failed:lifecycle=unauthorized_skip" in p["diagnostics"], p
PY
pass "malformed skip without reason HOLDs"

mkdir -p "$TMP/lifecycle-fake-skip"
write_predeploy "$TMP/lifecycle-fake-skip" PASS "ok"
write_dispatch "$TMP/lifecycle-fake-skip"
write_ssh "$TMP/lifecycle-fake-skip" success
write_acceptance "$TMP/lifecycle-fake-skip" pass
write_smoke "$TMP/lifecycle-fake-skip" pass
write_browser "$TMP/lifecycle-fake-skip" 0
write_lifecycle_skip "$TMP/lifecycle-fake-skip" all_good
run_outcome "$TMP/lifecycle-fake-skip"
[[ "$OUTCOME_RC" -ne 0 ]] || { echo "$OUTCOME_OUT"; fail "unauthorized skip reason must exit nonzero"; }
python3 - "$TMP/lifecycle-fake-skip/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] == "DEPLOYED_REJECTED", p
assert p["result"] == "HOLD", p
assert p["uat_deployed"] is True, p
assert "failed:lifecycle=unauthorized_skip" in p["diagnostics"], p
PY
pass "unauthorized skip reason HOLDs"

mkdir -p "$TMP/smoke-skip"
write_proven_host "$TMP/smoke-skip"
write_smoke "$TMP/smoke-skip" skip
write_browser "$TMP/smoke-skip" 0
run_outcome "$TMP/smoke-skip"
[[ "$OUTCOME_RC" -ne 0 ]] || { echo "$OUTCOME_OUT"; fail "mandatory smoke skip must exit nonzero"; }
python3 - "$TMP/smoke-skip/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] == "DEPLOYED_REJECTED", p
assert p["result"] == "HOLD", p
assert p["smoke"] == "skip", p
assert p["uat_deployed"] is True, p
PY
pass "mandatory smoke skip is DEPLOYED_REJECTED HOLD exit 1"

mkdir -p "$TMP/browser-missing-ok-rest"
write_proven_host "$TMP/browser-missing-ok-rest"
run_outcome "$TMP/browser-missing-ok-rest"
[[ "$OUTCOME_RC" -ne 0 ]] || { echo "$OUTCOME_OUT"; fail "missing Playwright must exit nonzero"; }
python3 - "$TMP/browser-missing-ok-rest/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] == "INCOMPLETE", p
assert p["result"] == "HOLD", p
assert p["browser"] == "missing", p
assert p["uat_deployed"] is True, p
PY
pass "missing mandatory Playwright is INCOMPLETE HOLD exit 1"

assert_malformed_browser() {
  local dir="$1"
  local label="$2"
  run_outcome "$dir"
  [[ "$OUTCOME_RC" -ne 0 ]] || { echo "$OUTCOME_OUT"; fail "$label must exit nonzero"; }
  python3 - "$dir/uat-final-outcome.json" "$label" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
label = sys.argv[2]
assert p["uat_deployment_outcome"] == "INCOMPLETE", (label, p)
assert p["result"] == "HOLD", (label, p)
assert p["uat_deployed"] is True, (label, p)
assert p["browser"] != "pass", (label, p)
assert p["uat_deployment_outcome"] != "DEPLOYED_ACCEPTED", (label, p)
PY
  pass "$label"
}

mkdir -p "$TMP/pw-stats-absent"
write_proven_host "$TMP/pw-stats-absent"
write_browser_raw "$TMP/pw-stats-absent" '{"suites":[]}'
assert_malformed_browser "$TMP/pw-stats-absent" "Playwright stats absent HOLDs INCOMPLETE"

mkdir -p "$TMP/pw-expected-absent"
write_proven_host "$TMP/pw-expected-absent"
write_browser_raw "$TMP/pw-expected-absent" '{"stats":{"unexpected":0,"skipped":0}}'
assert_malformed_browser "$TMP/pw-expected-absent" "Playwright expected absent HOLDs INCOMPLETE"

mkdir -p "$TMP/pw-expected-zero"
write_proven_host "$TMP/pw-expected-zero"
write_browser_raw "$TMP/pw-expected-zero" '{"stats":{"expected":0,"unexpected":0,"skipped":0}}'
assert_malformed_browser "$TMP/pw-expected-zero" "Playwright expected zero HOLDs INCOMPLETE"

mkdir -p "$TMP/pw-unexpected-absent"
write_proven_host "$TMP/pw-unexpected-absent"
write_browser_raw "$TMP/pw-unexpected-absent" '{"stats":{"expected":8,"skipped":0}}'
assert_malformed_browser "$TMP/pw-unexpected-absent" "Playwright unexpected absent HOLDs INCOMPLETE"

mkdir -p "$TMP/pw-nonnumeric"
write_proven_host "$TMP/pw-nonnumeric"
write_browser_raw "$TMP/pw-nonnumeric" '{"stats":{"expected":"eight","unexpected":"none"}}'
assert_malformed_browser "$TMP/pw-nonnumeric" "Playwright nonnumeric stats HOLD INCOMPLETE"

mkdir -p "$TMP/pw-booleans"
write_proven_host "$TMP/pw-booleans"
write_browser_raw "$TMP/pw-booleans" '{"stats":{"expected":true,"unexpected":false}}'
assert_malformed_browser "$TMP/pw-booleans" "Playwright boolean stats HOLD INCOMPLETE"

mkdir -p "$TMP/pw-negatives"
write_proven_host "$TMP/pw-negatives"
write_browser_raw "$TMP/pw-negatives" '{"stats":{"expected":-1,"unexpected":-2}}'
assert_malformed_browser "$TMP/pw-negatives" "Playwright negative stats HOLD INCOMPLETE"

mkdir -p "$TMP/pw-malformed-json"
write_proven_host "$TMP/pw-malformed-json"
write_browser_raw "$TMP/pw-malformed-json" '{stats: not-json'
assert_malformed_browser "$TMP/pw-malformed-json" "Playwright malformed JSON HOLD INCOMPLETE"

mkdir -p "$TMP/pw-duplicate"
write_proven_host "$TMP/pw-duplicate"
write_browser "$TMP/pw-duplicate" 0
cat >"$TMP/pw-duplicate/uat-playwright.json" <<'JSON'
{"stats":{"expected":3,"skipped":0,"unexpected":1,"flaky":0}}
JSON
run_outcome "$TMP/pw-duplicate"
[[ "$OUTCOME_RC" -ne 0 ]] || { echo "$OUTCOME_OUT"; fail "conflicting Playwright artifacts must exit nonzero"; }
python3 - "$TMP/pw-duplicate/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] in {"INCOMPLETE", "INCONSISTENT"}, p
assert p["result"] == "HOLD", p
assert p["uat_deployed"] is True, p
assert p["uat_deployment_outcome"] != "DEPLOYED_ACCEPTED", p
PY
pass "duplicate conflicting Playwright artifacts HOLD with host-proven deploy"

# Live Deploy UAT downloads Playwright to the checkout root, not artifacts/.
mkdir -p "$TMP/live/artifacts" "$TMP/live/web/test-results"
write_predeploy "$TMP/live/artifacts" PASS "ok"
write_dispatch "$TMP/live/artifacts"
write_ssh "$TMP/live/artifacts" success
write_acceptance "$TMP/live/artifacts" pass
write_smoke "$TMP/live/artifacts" pass
write_lifecycle "$TMP/live/artifacts" pass
cat >"$TMP/live/web/test-results/uat-playwright.json" <<JSON
{"stats":{"expected":8,"skipped":2,"unexpected":0,"flaky":0}}
JSON
out="$(
  cd "$TMP/live" &&
  UAT_FINAL_OUTCOME_DIR="$TMP/live/artifacts" TARGET_SHA="$SHA" bash "$OUTCOME"
)" || { echo "$out"; fail "live download layout must find Playwright at web/test-results"; }
python3 - "$TMP/live/artifacts/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployment_outcome"] == "DEPLOYED_ACCEPTED", p
assert p["browser"] == "pass", p
assert p["uat_deployed"] is True
PY
pass "live Playwright path at cwd/web/test-results is aggregated"

python3 - "$WF" <<'PY'
from pathlib import Path
import re, sys
text = Path(sys.argv[1]).read_text()
start = text.find("  delivery-outcome:")
if start < 0:
    raise SystemExit("delivery-outcome job missing")
rest = text[start:]
m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
block = rest if not m else rest[: m.start() + 1]
required = (
    "name: UAT final delivery outcome",
    "if: always()",
    "Refuse unpinned TARGET_SHA",
    "uat-final-outcome.sh",
    "uat-final-outcome",
    "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
)
for fragment in required:
    if fragment not in block:
        raise SystemExit("delivery-outcome missing " + fragment)
if "environment:" in block:
    raise SystemExit("final outcome job must not use an Environment")
if "DROPLET_" in block or "PROD_" in block:
    raise SystemExit("final outcome job must not read UAT/Production secrets")
if "appleboy/ssh-action" in block:
    raise SystemExit("final outcome job must not SSH")
if "needs.delivery-outcome" in text[text.find("  deploy:"):text.find("  browser:")]:
    raise SystemExit("SSH job must not depend on delivery-outcome exit code")
if "needs.predeploy-gate.outputs.eligible == 'true'" not in text and \
   'needs.predeploy-gate.outputs.eligible == "true"' not in text:
    raise SystemExit("SSH remains gated on eligible==true, not aggregator rc")
deploy = text[text.find("  deploy:"):text.find("  browser:")]
if deploy.find("record-uat-deploy-dispatch.sh") > deploy.find("appleboy/ssh-action"):
    raise SystemExit("dispatch evidence must remain pre-SSH intent")
if deploy.find("appleboy/ssh-action") > deploy.find("record-uat-ssh-execution.sh"):
    raise SystemExit("SSH-step evidence must be recorded after SSH")
PY
pass "deploy.yml records a secret-free always() final outcome job"

if grep -qiE 'adcp|autonomous delivery control plane' "$OUTCOME"; then
  fail "final outcome must not restore ADCP"
fi
pass "final outcome does not restore ADCP"

echo "uat-final-outcome contract OK"
