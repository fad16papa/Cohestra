#!/usr/bin/env bash
# Contract for structured, nonsecret UAT delivery status reports.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS="$ROOT_DIR/deploy/uat-delivery-status.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$STATUS" ]] || fail "uat-delivery-status.sh missing"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

out="$(
  UAT_DELIVERY_STATUS_DIR="$TMP" \
  CANDIDATE_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  GATE_RESULT=HOLD \
  GATE_REASON="UAT_DEPLOY_GATE_ACTIVE is not true" \
  GITHUB_RUN_ID=41275916994 \
  GITHUB_REPOSITORY=fad16papa/Cohestra \
  bash "$STATUS"
)" || { echo "$out"; fail "status writer must succeed"; }
[[ -f "$TMP/uat-delivery-status.json" ]] || fail "status file missing"

python3 - "$TMP/uat-delivery-status.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["candidate_sha"] == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
assert p["security_gate"] == "HOLD"
assert p["failed_stage"] == "predeploy-gate"
assert p["phase"] == "predeploy"
assert p["deployment_phase"] == "NOT_STARTED"
assert p["uat_deployment_outcome"] == "HELD"
assert p["uat_deployed"] is False
assert p["ssh_executed"] is False
assert "UAT_DEPLOY_GATE_ACTIVE" in p["diagnostics"]
link = p["run_links"].get("actions_run") or ""
assert "41275916994" in link
assert "fad16papa/Cohestra" in link
assert "not autonomously merge" in p["agent_policy"].lower()
blob = json.dumps(p)
assert "DROPLET_" not in blob
assert "GITGUARDIAN_API_KEY=" not in blob
PY
pass "HOLD status names SHA, stage, diagnostics, run link, no UAT deploy"

out="$(
  UAT_DELIVERY_STATUS_DIR="$TMP" \
  CANDIDATE_SHA=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb \
  GATE_RESULT=PASS \
  GATE_REASON="all required checks SUCCESS on candidate_sha" \
  UAT_DEPLOYED=false \
  bash "$STATUS"
)" || { echo "$out"; fail "PASS status writer must succeed"; }
python3 - "$TMP/uat-delivery-status.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["security_gate"] == "PASS"
assert p["failed_stage"] == "none"
assert p["phase"] == "predeploy"
assert p["deployment_phase"] == "NOT_STARTED"
assert p["uat_deployment_outcome"] == "NOT_STARTED"
assert p["uat_deployed"] is None
assert p["ssh_executed"] is False
PY
pass "predeploy PASS records NOT_STARTED and does not claim a final deploy outcome"

if grep -qiE 'adcp|autonomous delivery control plane' "$STATUS"; then
  fail "delivery status must not restore ADCP"
fi
pass "delivery status does not restore ADCP"

echo "uat-delivery-status contract OK"
