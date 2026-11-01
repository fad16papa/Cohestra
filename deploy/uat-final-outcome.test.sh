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

write_predeploy() {
  cat >"$1/uat-predeploy-gate.json" <<JSON
{"result":"${2:-PASS}","reason":"${3:-all required checks SUCCESS on candidate_sha}","candidate_sha":"${SHA}"}
JSON
}

if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/empty" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "missing evidence must not PASS"
fi
echo "$out" | grep -qE 'RESULT=(HOLD|REFUSE)|MISSING_EVIDENCE|INCOMPLETE' || { echo "$out"; fail "missing evidence reason"; }
pass "missing evidence fails closed"

mkdir -p "$TMP/hold"
write_predeploy "$TMP/hold" HOLD "UAT_DEPLOY_GATE_ACTIVE is not true"
out="$(UAT_FINAL_OUTCOME_DIR="$TMP/hold" TARGET_SHA="$SHA" bash "$OUTCOME")" \
  || { echo "$out"; fail "HOLD-only evidence should classify as HELD"; }
python3 - "$TMP/hold/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["phase"] == "final"
assert p["uat_deployment_outcome"] == "HELD"
assert p["eligibility"] == "HOLD"
assert p["ssh_executed"] is False
assert p["uat_deployed"] is False
assert p["deployment_phase"] == "NOT_STARTED"
PY
pass "predeploy HOLD finalizes as HELD with no SSH"

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
pass "inconsistent SHA fails closed"

mkdir -p "$TMP/incomplete"
write_predeploy "$TMP/incomplete" PASS "ok"
write_dispatch "$TMP/incomplete"
if out="$(UAT_FINAL_OUTCOME_DIR="$TMP/incomplete" TARGET_SHA="$SHA" bash "$OUTCOME" 2>&1)"; then
  echo "$out"
  fail "dispatch without acceptance must not claim ACCEPTED"
fi
python3 - "$TMP/incomplete/uat-final-outcome.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["uat_deployed"] is True, p
assert p["ssh_executed"] is True, p
assert p["uat_deployment_outcome"] == "INCOMPLETE", p
assert p["host_acceptance"] in ("missing", "fail", "unknown"), p
PY
pass "incomplete postdeploy evidence keeps uat_deployed=true"

mkdir -p "$TMP/rejected"
write_predeploy "$TMP/rejected" PASS "ok"
write_dispatch "$TMP/rejected"
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

mkdir -p "$TMP/accepted"
write_predeploy "$TMP/accepted" PASS "ok"
write_dispatch "$TMP/accepted"
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
blob = json.dumps(p)
assert "DROPLET_" not in blob
assert "GITGUARDIAN_API_KEY=" not in blob
PY
pass "complete success is DEPLOYED_ACCEPTED"

# Live Deploy UAT downloads Playwright to the checkout root, not artifacts/.
mkdir -p "$TMP/live/artifacts" "$TMP/live/web/test-results"
write_predeploy "$TMP/live/artifacts" PASS "ok"
write_dispatch "$TMP/live/artifacts"
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
PY
pass "deploy.yml records a secret-free always() final outcome job"

if grep -qiE 'adcp|autonomous delivery control plane' "$OUTCOME"; then
  fail "final outcome must not restore ADCP"
fi
pass "final outcome does not restore ADCP"

echo "uat-final-outcome contract OK"
