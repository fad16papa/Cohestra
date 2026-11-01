#!/usr/bin/env bash
# Contract: post-SSH step evidence is not host-mutation proof.
# Not a live deploy. No secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RECORDER="$ROOT_DIR/deploy/record-uat-ssh-execution.sh"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
PROD="$ROOT_DIR/.github/workflows/deploy-production.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$RECORDER" ]] || fail "deploy/record-uat-ssh-execution.sh missing"

SHA="74958f1ad4695ea8358b57ed6dc4b0be8f3ba9de"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

out="$(
  UAT_SSH_EVIDENCE_DIR="$TMP/ok" \
  TARGET_SHA="$SHA" \
  SSH_STEP_CONCLUSION=success \
  SSH_STEP_OUTCOME=success \
  bash "$RECORDER"
)" || { echo "$out"; fail "success conclusion must record"; }
python3 - "$TMP/ok/uat-ssh-execution.json" "$SHA" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["result"] == "recorded", p
assert p["conclusion"] == "success", p
assert p["sha"] == sys.argv[2]
assert p["proof"] == "github_actions_step_conclusion", p
assert p["host_mutation"] == "unknown", p
assert p["ssh_attempted"] is True, p
assert p.get("ssh_executed") is not True, p
blob = json.dumps(p)
assert "DROPLET_" not in blob
assert "BEGIN OPENSSH" not in blob
PY
pass "successful SSH step records conclusion without host mutation"

out="$(
  UAT_SSH_EVIDENCE_DIR="$TMP/fail" \
  TARGET_SHA="$SHA" \
  SSH_STEP_CONCLUSION=failure \
  SSH_STEP_OUTCOME=failure \
  bash "$RECORDER"
)" || { echo "$out"; fail "failure conclusion must record"; }
python3 - "$TMP/fail/uat-ssh-execution.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["conclusion"] == "failure", p
assert p["host_mutation"] == "unknown", p
assert p.get("ssh_executed") is not True, p
PY
pass "failed SSH step remains unknown for host mutation"

if HOST_MUTATED=true UAT_SSH_EVIDENCE_DIR="$TMP/claim" TARGET_SHA="$SHA" \
  SSH_STEP_CONCLUSION=success bash "$RECORDER"; then
  python3 - "$TMP/claim/uat-ssh-execution.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["host_mutation"] == "unknown", p
assert p.get("host_mutated") is not True, p
PY
else
  fail "recorder must ignore HOST_MUTATED claims"
fi
pass "recorder cannot claim host mutation"

if out="$(UAT_SSH_EVIDENCE_DIR="$TMP/blank" TARGET_SHA="$SHA" SSH_STEP_CONCLUSION= bash "$RECORDER" 2>&1)"; then
  python3 - "$TMP/blank/uat-ssh-execution.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
assert p["conclusion"] == "unknown", p
assert p["result"] == "recorded", p
PY
else
  echo "$out"
  fail "missing conclusion must record unknown, not invent success"
fi
pass "missing step conclusion is unknown"

python3 - "$WF" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text()
start = text.find("  deploy:")
if start < 0:
    raise SystemExit("deploy job missing")
end = text.find("\n  browser:")
block = text[start:end]
dispatch = block.find("record-uat-deploy-dispatch.sh")
ssh = block.find("appleboy/ssh-action")
record = block.find("record-uat-ssh-execution.sh")
if dispatch < 0 or ssh < 0 or record < 0:
    raise SystemExit("dispatch, SSH, or SSH-step recorder missing from deploy job")
if not (dispatch < ssh < record):
    raise SystemExit("dispatch must be before SSH; SSH-step evidence must be after SSH")
if "id: ssh-deploy" not in block:
    raise SystemExit("SSH step must have an id so conclusion can be recorded")
if "steps.ssh-deploy.conclusion" not in block:
    raise SystemExit("SSH-step recorder must read the SSH step conclusion")
if "environment:" in block[block.find("Record SSH"):]:
    raise SystemExit("SSH-step recorder must not add an Environment")
if "DROPLET_" in block[block.find("Record SSH step evidence"):block.find("Fetch host acceptance")]:
    raise SystemExit("SSH-step recorder must not read DROPLET secrets")
if "uat-ssh-execution.json" not in block:
    raise SystemExit("deploy evidence upload must include uat-ssh-execution.json")
PY
pass "deploy.yml records SSH-step evidence after SSH and before host fetch"

if grep -q 'record-uat-ssh-execution' "$PROD"; then
  fail "Production workflow must stay unchanged"
fi
if grep -qiE 'adcp|autonomous delivery control plane' "$RECORDER"; then
  fail "SSH-step recorder must not restore ADCP"
fi
pass "recorder does not touch Production or restore ADCP"

echo "record-uat-ssh-execution contract OK"
