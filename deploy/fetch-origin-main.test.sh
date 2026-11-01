#!/usr/bin/env bash
# TDD contract for authenticated origin/main fetch and disabled-gate HOLD-first.
# No live GitHub write, SSH, or UAT deploy.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FETCH="$ROOT_DIR/deploy/fetch-origin-main.sh"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
GATE="$ROOT_DIR/deploy/validate-uat-predeploy-gate.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$FETCH" ]] || fail "fetch-origin-main.sh missing"
[[ -f "$WF" ]] || fail "deploy.yml missing"
[[ -f "$GATE" ]] || fail "validate-uat-predeploy-gate.sh missing"

if grep -qiE 'adcp|autonomous delivery control plane' "$FETCH"; then
  fail "fetch helper must not restore ADCP"
fi
pass "fetch helper does not restore ADCP"

grep -q 'http.https://github.com/.extraheader' "$FETCH" \
  || fail "fetch must use URL-scoped http.https://github.com/.extraheader"
grep -q 'AUTHORIZATION: basic' "$FETCH" \
  || fail "fetch must use Basic x-access-token auth"
grep -q 'x-access-token' "$FETCH" \
  || fail "fetch must mint x-access-token Basic material"
if grep -qiE 'AUTHORIZATION:[[:space:]]*bearer' "$FETCH" "$WF"; then
  fail "Bearer extraheader is the live 41289603719 failure mode"
fi
pass "fetch uses URL-scoped Basic auth, not Bearer"

if grep -n 'git -c http.extraheader="AUTHORIZATION: bearer' "$WF"; then
  fail "deploy.yml still has the broken unscoped Bearer fetch"
fi
pass "deploy.yml no longer uses the broken Bearer fetch"

# Missing / empty token must refuse without printing secrets.
if out="$(GITHUB_TOKEN= bash "$FETCH" 2>&1)"; then
  echo "$out"
  fail "empty GITHUB_TOKEN must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "missing token RESULT=REFUSE"; }
echo "$out" | grep -qiE 'ghp_|github_pat_|xox' && fail "token-like material leaked"
pass "missing GITHUB_TOKEN refuses closed"

if out="$(unset GITHUB_TOKEN; bash "$FETCH" 2>&1)"; then
  echo "$out"
  fail "unset GITHUB_TOKEN must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "unset token RESULT=REFUSE"; }
pass "unset GITHUB_TOKEN refuses closed"

# Token must never appear in stdout/stderr even on a local fetch.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git init -q --bare "$TMP/remote.git"
git init -q "$TMP/local"
git -C "$TMP/local" checkout -q -b main
echo provenance >"$TMP/local/readme"
git -C "$TMP/local" add readme
git -C "$TMP/local" -c user.email=t@t -c user.name=t commit -q -m init
git -C "$TMP/local" remote add origin "$TMP/remote.git"
git -C "$TMP/local" push -q origin main
git -C "$TMP/local" fetch -q origin main:refs/remotes/origin/main

TOKEN="ghs_LIVEFAILREGRESSION_DO_NOT_PRINT_9f3a"
out="$(
  cd "$TMP/local" &&
  GITHUB_TOKEN="$TOKEN" ORIGIN_MAIN_REF=origin/main bash "$FETCH" 2>&1
)" || { echo "$out"; fail "local file:// origin fetch should succeed"; }
echo "$out" | grep -q "$TOKEN" && fail "GITHUB_TOKEN printed"
echo "$out" | grep -qi 'ghs_LIVEFAILREGRESSION' && fail "token fragment printed"
git -C "$TMP/local" rev-parse --verify origin/main >/dev/null \
  || fail "origin/main missing after successful fetch"
pass "valid token + reachable origin/main fetches without printing secrets"

# Disabled suppressor HOLDs and writes evidence without origin/main.
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"
build_provenance_fixture "$TMP/gate"
cd "$PROVENANCE_LOCAL"
git remote remove origin
export COHESTRA_ROOT="$ROOT_DIR"
export UAT_GATE_EVIDENCE_DIR="$TMP/disabled-evidence"
export UAT_DEPLOY_GATE_ACTIVE=false
export CANDIDATE_SHA="$PROVENANCE_MERGE"
export GITHUB_EVENT_NAME=workflow_run
export WORKFLOW_RUN_HEAD_SHA="$PROVENANCE_MERGE"
export GITHUB_REPOSITORY=fad16papa/Cohestra
unset GITHUB_TOKEN || true
set +e
gate_out="$(bash "$GATE" 2>&1)"
gate_rc=$?
set -e
[[ "$gate_rc" -ne 0 ]] || { echo "$gate_out"; fail "disabled gate must HOLD"; }
echo "$gate_out" | grep -q 'RESULT=HOLD' || { echo "$gate_out"; fail "disabled gate RESULT=HOLD"; }
echo "$gate_out" | grep -q 'UAT_DEPLOY_GATE_ACTIVE' || { echo "$gate_out"; fail "HOLD must name the gate"; }
[[ -f "$UAT_GATE_EVIDENCE_DIR/uat-predeploy-gate.json" ]] \
  || fail "HOLD must write uat-predeploy-gate.json"
[[ -f "$UAT_GATE_EVIDENCE_DIR/uat-delivery-status.json" ]] \
  || fail "HOLD must write uat-delivery-status.json"
python3 - "$UAT_GATE_EVIDENCE_DIR/uat-predeploy-gate.json" \
  "$UAT_GATE_EVIDENCE_DIR/uat-delivery-status.json" "$PROVENANCE_MERGE" <<'PY'
import json, sys
gate, status, sha = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), sys.argv[3]
assert gate["result"] == "HOLD", gate
assert "UAT_DEPLOY_GATE_ACTIVE" in gate["reason"], gate
assert gate["candidate_sha"] == sha
assert gate["gate_active"] is False
assert status["eligibility"] == "HOLD", status
assert status["uat_deployment_outcome"] == "HELD", status
assert status["ssh_executed"] is False
assert status["uat_deployed"] is False
assert status["deployment_phase"] == "NOT_STARTED"
blob = json.dumps(gate) + json.dumps(status)
assert "DROPLET_" not in blob
assert "GITGUARDIAN_API_KEY=" not in blob
assert "BEGIN " not in blob
PY
pass "disabled gate HOLDs and writes nonsecret evidence without origin/main or token"

for value in "" false TRUE 1 yes True; do
  export UAT_DEPLOY_GATE_ACTIVE="$value"
  set +e
  out="$(bash "$GATE" 2>&1)"
  rc=$?
  set -e
  [[ "$rc" -ne 0 ]] || { echo "$out"; fail "UAT_DEPLOY_GATE_ACTIVE=${value:-unset} must HOLD"; }
  echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "${value:-unset} RESULT=HOLD"; }
done
pass "unset/false/TRUE/1/yes/True are HOLD, not eligible"

# Workflow path order: disabled suppressor evaluates the real gate before fetch.
python3 - "$WF" <<'PY'
from pathlib import Path
import re, sys

text = Path(sys.argv[1]).read_text()
if "AUTHORIZATION: bearer" in text.lower() or "AUTHORIZATION: Bearer" in text:
    raise SystemExit("deploy.yml must not use Bearer git extraheader")
if 'http.extraheader="AUTHORIZATION: bearer ${GITHUB_TOKEN}"' in text:
    raise SystemExit("live failure fetch line is still present")

def job(name: str) -> str:
    start = text.find(f"  {name}:")
    if start < 0:
        raise SystemExit(f"{name} missing")
    rest = text[start:]
    m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
    return rest if not m else rest[: m.start() + 1]

pre = job("predeploy-gate")
deploy = job("deploy")
if "persist-credentials: false" not in pre or "persist-credentials: false" not in deploy:
    raise SystemExit("persist-credentials: false must remain")
if "fetch-origin-main.sh" not in pre or "fetch-origin-main.sh" not in deploy:
    raise SystemExit("enabled path must call fetch-origin-main.sh")
if "validate-uat-predeploy-gate.sh" not in pre:
    raise SystemExit("real validator must run on predeploy")
if "environment:" in pre:
    raise SystemExit("predeploy must not use an Environment")
if "DROPLET_" in pre:
    raise SystemExit("predeploy must not read DROPLET secrets")
if "needs.predeploy-gate.outputs.eligible == 'true'" not in deploy and \
   'needs.predeploy-gate.outputs.eligible == "true"' not in deploy:
    raise SystemExit("SSH remains gated on eligible==true")
if "github.event_name == 'workflow_dispatch' ||" in text:
    raise SystemExit("workflow_dispatch OR-bypass is forbidden")

# Disabled path must invoke the real validator before fetch-origin-main.sh
eval_idx = pre.find("Evaluate UAT predeploy gate")
rerun_idx = deploy.find("Re-run UAT predeploy gate before SSH")
for label, block in (("predeploy evaluate", pre[eval_idx:]), ("SSH revalidate", deploy[rerun_idx:])):
    if "UAT_DEPLOY_GATE_ACTIVE:-}" not in block or '!= "true"' not in block:
        raise SystemExit(f"{label} must HOLD-first when gate is not exact true")
    gate_at = block.find("validate-uat-predeploy-gate.sh")
    fetch_at = block.find("fetch-origin-main.sh")
    if gate_at < 0 or fetch_at < 0:
        raise SystemExit(f"{label} must contain both validator and fetch helper")
    # In the disabled branch the validator appears first.
    if gate_at > fetch_at:
        raise SystemExit(f"{label} must run real validator before fetch when gate is disabled")

# Durable HOLD upload must fail closed if files are missing.
upload = pre[pre.find("Upload predeploy gate evidence"):]
if "uat-predeploy-gate-evidence" not in upload:
    raise SystemExit("predeploy upload name missing")
if "uat-predeploy-gate.json" not in upload or "uat-delivery-status.json" not in upload:
    raise SystemExit("predeploy upload must include both HOLD files")
if "if-no-files-found: error" not in upload:
    raise SystemExit("missing HOLD evidence must fail closed")
if "if-no-files-found: warn" in upload:
    raise SystemExit("predeploy evidence upload must not warn-and-continue")
PY
pass "workflow HOLDs before fetch, keeps SSH eligibility, and fail-closes missing evidence"

echo "fetch-origin-main contract OK"
