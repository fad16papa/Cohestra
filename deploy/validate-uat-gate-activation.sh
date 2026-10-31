#!/usr/bin/env bash
# Static contract for the UAT gate + first-merge activation procedure.
# Does not enable the live gate, disable workflows, or talk to UAT/Production.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
PROD="$ROOT_DIR/.github/workflows/deploy-production.yml"
DOC="$ROOT_DIR/docs/deploy/uat-gated-promotion.md"
PROD_DOC="$ROOT_DIR/docs/deploy/github-actions-cd.md"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

[[ -f "$WF" ]] || { echo "Missing $WF" >&2; exit 1; }
[[ -f "$PROD" ]] || { echo "Missing $PROD" >&2; exit 1; }
[[ -f "$DOC" ]] || { echo "Missing $DOC" >&2; exit 1; }

echo "== UAT gate activation / first-merge contract =="

if grep -q 'name: Pre-UAT eligibility gate' "$WF" \
  && grep -q 'validate-uat-predeploy-gate.sh' "$WF"; then
  pass "Deploy UAT has a predeploy eligibility gate"
else
  fail "deploy.yml must run deploy/validate-uat-predeploy-gate.sh in a predeploy-gate job"
fi

if grep -q 'UAT_DEPLOY_GATE_ACTIVE: ${{ vars.UAT_DEPLOY_GATE_ACTIVE }}' "$WF"; then
  pass "gate reads vars.UAT_DEPLOY_GATE_ACTIVE"
else
  fail "workflow must read UAT_DEPLOY_GATE_ACTIVE from vars (unset = HOLD)"
fi

if grep -q 'needs.predeploy-gate.outputs.eligible' "$WF"; then
  pass "SSH deploy proceeds only when the gate marks eligible"
else
  fail "deploy job must require needs.predeploy-gate.outputs.eligible"
fi

if grep -q "github.event_name == 'workflow_dispatch' ||" "$WF"; then
  fail "workflow_dispatch must not OR-bypass the predeploy gate"
else
  pass "workflow_dispatch is not an OR-bypass of the gate"
fi

if python3 - "$WF" <<'PY'
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text()
# Isolate the predeploy-gate job until the next top-level job.
start = text.find("  predeploy-gate:")
if start < 0:
    raise SystemExit("predeploy-gate job missing")
rest = text[start:]
# next job at column 2
idx = rest.find("\n  ", 1)
# find next job key (two-space + name + colon) after the first line
import re
m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
block = rest if not m else rest[: m.start() + 1]
if "environment:" in block:
    raise SystemExit("predeploy-gate must not use an Environment (no UAT secrets)")
if "DROPLET_" in block or "PROD_" in block:
    raise SystemExit("predeploy-gate must not read UAT/Production secrets")
if "secrets." in block and "secrets.GITHUB_TOKEN" not in block:
    raise SystemExit("predeploy-gate may only use secrets.GITHUB_TOKEN")
PY
then
  pass "predeploy-gate has no Environment and no UAT secrets"
else
  fail "predeploy-gate must not use environment: uat or secrets"
fi

if grep -q 'actions: read' "$WF" && grep -q 'checks: read' "$WF"; then
  pass "workflow can read Actions jobs and check-runs"
else
  fail "deploy.yml must request actions: read and checks: read"
fi

if grep -q 'Re-run UAT predeploy gate before SSH' "$WF" \
  && grep -q 'validate-uat-predeploy-gate.sh' "$WF"; then
  pass "deploy job revalidates the gate immediately before SSH"
else
  fail "deploy job must re-run validate-uat-predeploy-gate.sh before SSH"
fi

if grep -q 'public-uat-smoke.sh' "$WF" \
  && grep -q 'test:e2e:uat' "$WF" \
  && grep -q 'uat-acceptance-summary.sh' "$WF"; then
  pass "post-deploy UAT smoke, Playwright, and acceptance remain"
else
  fail "must keep public smoke, Playwright, and acceptance-summary"
fi

if grep -qiE 'adcp|autonomous delivery control plane' "$WF"; then
  fail "Deploy UAT must not restore ADCP"
else
  pass "ADCP is not restored on Deploy UAT"
fi

if grep -qE '^name:[[:space:]]*Deploy Production[[:space:]]*$' "$PROD" \
  && grep -q 'workflow_dispatch:' "$PROD" \
  && ! grep -qE '^[[:space:]]*workflow_run:' "$PROD"; then
  pass "Production workflow remains dispatch-only"
else
  fail "Production workflow must stay workflow_dispatch only"
fi

if grep -qiE 'adcp' "$PROD"; then
  fail "Production workflow must not gain ADCP"
else
  pass "Production workflow has no ADCP"
fi

# First-merge procedure must be documented and must not be performed by this PR.
for needle in \
  "FIRST-MERGE HAZARD" \
  "Disable Deploy UAT" \
  "Drain" \
  "UAT_DEPLOY_GATE_ACTIVE" \
  "Do not activate" \
  "Do not deploy" \
  "Do not touch Production"
do
  if grep -q "$needle" "$DOC"; then
    pass "activation doc names: $needle"
  else
    fail "docs/deploy/uat-gated-promotion.md must contain: $needle"
  fi
done

if python3 - "$DOC" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text()
order = [
    "Disable Deploy UAT",
    "Drain",
    "Merge",
    "Re-enable",
    "Observe one HOLD",
    "UAT_DEPLOY_GATE_ACTIVE=true",
]
positions = []
for item in order:
    i = text.find(item)
    if i < 0:
        raise SystemExit(f"missing ordered step: {item}")
    positions.append(i)
if positions != sorted(positions):
    raise SystemExit("activation steps are out of order")
PY
then
  pass "safe activation steps are documented in order"
else
  fail "activation procedure steps must appear in the documented fail-safe order"
fi

if grep -q 'UAT_DEPLOY_GATE_ACTIVE' "$PROD_DOC" \
  && grep -q 'predeploy' "$PROD_DOC"; then
  pass "github-actions-cd.md documents the gated UAT path"
else
  fail "docs/deploy/github-actions-cd.md must describe the predeploy gate"
fi

echo "Passed: ${PASS} | Failed: ${FAIL}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
