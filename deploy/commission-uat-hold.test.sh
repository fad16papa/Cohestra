#!/usr/bin/env bash
# TDD contract: unprivileged HOLD commissioning. Not a live Deploy UAT run.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMISSION="$ROOT_DIR/deploy/commission-uat-hold.sh"
STATUS="$ROOT_DIR/deploy/uat-delivery-status.sh"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
CI="$ROOT_DIR/.github/workflows/ci.yml"
PROD="$ROOT_DIR/.github/workflows/deploy-production.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$COMMISSION" ]] || fail "deploy/commission-uat-hold.sh is missing"
[[ -f "$STATUS" ]] || fail "deploy/uat-delivery-status.sh is missing"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export UAT_GATE_EVIDENCE_DIR="$TMP/evidence"
export COHESTRA_ROOT="$ROOT_DIR"

out="$(UAT_DEPLOY_GATE_ACTIVE=false bash "$COMMISSION")" || true
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "commissioning must HOLD when suppressor is false"; }
echo "$out" | grep -q 'eligible=false' || { echo "$out"; fail "commissioning must emit eligible=false"; }
echo "$out" | grep -q 'EVIDENCE_CLASS=CI_CONTRACT' || { echo "$out"; fail "commissioning must label CI_CONTRACT"; }
echo "$out" | grep -q 'LIVE_DEPLOY_UAT_HOLD=false' || { echo "$out"; fail "must not claim a live Deploy UAT HOLD"; }
echo "$out" | grep -q 'SSH_POSSIBLE=false' || { echo "$out"; fail "commissioning must prove SSH is impossible"; }
pass "false suppressor HOLDs and cannot SSH"

EVIDENCE="$TMP/evidence/uat-hold-commissioning.json"
[[ -f "$EVIDENCE" ]] || fail "commissioning evidence JSON missing"
python3 - "$EVIDENCE" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p.get("evidence_class") == "CI_CONTRACT", p
assert p.get("live_deploy_uat_hold") is False, p
assert p.get("gate_result") == "HOLD", p
assert p.get("eligible") is False, p
assert p.get("ssh_possible") is False, p
assert p.get("uat_deployed") is False, p
assert p.get("configured_suppressor") == "false", p
reason = str(p.get("diagnostics") or p.get("hold_reason") or "")
assert "UAT_DEPLOY_GATE_ACTIVE" in reason, p
blob = json.dumps(p)
for needle in ("DROPLET_", "BEGIN OPENSSH", "ghs_", "ghp_", "GITGUARDIAN_API_KEY="):
    assert needle not in blob, needle
PY
pass "commissioning evidence is nonsecret and not a live HOLD run"

STATUS_JSON="$TMP/evidence/uat-delivery-status.json"
[[ -f "$STATUS_JSON" ]] || fail "delivery status JSON missing"
python3 - "$STATUS_JSON" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
required = (
    "candidate_sha",
    "failed_stage",
    "failed_test",
    "security_gate",
    "diagnostics",
    "run_links",
    "uat_deployed",
    "agent_policy",
)
missing = [k for k in required if k not in p]
if missing:
    raise SystemExit("status missing " + ",".join(missing))
assert p["security_gate"] == "HOLD", p
assert p["uat_deployed"] is False, p
assert p["failed_stage"] == "predeploy-gate", p
policy = str(p["agent_policy"])
assert "development branch" in policy.lower(), p
assert "not autonomously merge" in policy.lower(), p
blob = json.dumps(p)
for needle in ("DROPLET_", "BEGIN OPENSSH", "GITGUARDIAN_API_KEY="):
    assert needle not in blob, needle
PY
pass "structured delivery status covers Story C fields without secrets"

# Workflow YAML: SSH job cannot run unless eligible=true.
python3 - "$WF" <<'PY'
from pathlib import Path
import re, sys
text = Path(sys.argv[1]).read_text()
start = text.find("  deploy:")
if start < 0:
    raise SystemExit("deploy job missing")
rest = text[start:]
m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
block = rest if not m else rest[: m.start() + 1]
if "needs.predeploy-gate.outputs.eligible == 'true'" not in block and \
   'needs.predeploy-gate.outputs.eligible == "true"' not in block:
    raise SystemExit("deploy job must require eligible == true")
if "appleboy/ssh-action" not in block:
    raise SystemExit("SSH action must live only in the gated deploy job")
if "environment: uat" not in block:
    raise SystemExit("SSH job uses environment uat")
pre = text[text.find("  predeploy-gate:"):start]
if "environment:" in pre:
    raise SystemExit("predeploy-gate must not use an Environment")
if "DROPLET_" in pre:
    raise SystemExit("predeploy-gate must not read DROPLET secrets")
if "workflow_run:" not in text:
    raise SystemExit("automatic path must remain workflow_run on CI")
PY
pass "deploy.yml SSH path is gated and automatic via workflow_run"

python3 - "$CI" <<'PY'
from pathlib import Path
import sys
txt = Path(sys.argv[1]).read_text()
if "commission-uat-hold.test.sh" not in txt:
    raise SystemExit("CI must run HOLD commissioning contract")
if "uat-delivery-status.test.sh" not in txt:
    raise SystemExit("CI must run delivery-status contract")
if "uat-final-outcome.test.sh" not in txt:
    raise SystemExit("CI must run final-outcome contract")
iso = txt.split("  uat-isolation:\n", 1)[1]
if "bash deploy/commission-uat-hold.sh" not in iso:
    raise SystemExit("CI must persist commissioning by invoking commission-uat-hold.sh")
if "uat-ci-contract-commissioning" not in iso:
    raise SystemExit("CI must upload a separately named CI_CONTRACT artifact")
if "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02" not in iso:
    raise SystemExit("CI commissioning upload must pin upload-artifact")
if "if-no-files-found: error" not in iso:
    raise SystemExit("CI_CONTRACT upload must fail closed if the artifact is missing")
if "LIVE_DEPLOY_UAT_HOLD" in iso and "LIVE_DEPLOY_UAT_HOLD=true" in iso:
    raise SystemExit("CI must not label commissioning as a live HOLD")
PY
pass "CI persists and uploads a CI_CONTRACT commissioning artifact"

if grep -q 'UAT_DEPLOY_GATE_ACTIVE: true' "$CI" || grep -q 'UAT_DEPLOY_GATE_ACTIVE=true' "$COMMISSION"; then
  fail "commissioning/CI must not set the live gate to true"
fi
if grep -E 'uses:[[:space:]]*appleboy/ssh-action|appleboy/ssh-action@' "$COMMISSION"; then
  fail "commissioning must not invoke SSH"
fi
if ! grep -q 'workflow_dispatch:' "$PROD" || grep -qE '^[[:space:]]*workflow_run:' "$PROD"; then
  fail "Production must stay dispatch-only"
fi
pass "commissioning cannot activate the gate or touch Production"

echo "commission-uat-hold contract OK"
