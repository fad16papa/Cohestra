#!/usr/bin/env bash
# Static contract for the permanent UAT readiness workflow.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT_DIR/.github/workflows/uat-readiness.yml"
DEPLOY="$ROOT_DIR/.github/workflows/deploy.yml"
CI="$ROOT_DIR/.github/workflows/ci.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$WF" ]] || fail "uat-readiness.yml missing"

python3 - "$WF" "$DEPLOY" "$CI" <<'PY'
from pathlib import Path
import sys

wf, deploy, ci = (Path(p).read_text() for p in sys.argv[1:])

on_block = wf.split("\njobs:", 1)[0]
if "\n  pull_request_target:" in on_block:
    raise SystemExit("pull_request_target must not be a trigger")
if "appleboy/ssh-action" in wf or "DROPLET_" in wf:
    raise SystemExit("readiness workflow must not SSH or read droplet secrets")
if "adcp" in wf.lower():
    raise SystemExit("ADCP must stay retired")
for needle in ("UAT_DEPLOY_GATE_ACTIVE=true", "UAT_DEPLOY_GATE_ACTIVE: true"):
    if needle in wf or needle in deploy:
        raise SystemExit("must not set the UAT gate to true")
required = [
    "pull_request:",
    "pull_request_review:",
    "issue_comment:",
    "check_suite:",
    "workflow_run:",
    "schedule:",
    "workflow_dispatch:",
    "push:",
]
missing = [item for item in required if item not in wf]
if missing:
    raise SystemExit(f"missing triggers {missing}")
if "- CI" not in wf.split("workflow_run:", 1)[1][:240]:
    raise SystemExit("workflow_run must be bound to CI")
if "persist-credentials: false" not in wf:
    raise SystemExit("checkout must not persist credentials")
if "contents: write" in wf.split("notify:")[0]:
    raise SystemExit("evaluate job must not request contents: write")
if "evaluate-uat-readiness.sh" not in wf:
    raise SystemExit("workflow must invoke the shared evaluator")
if "UAT_READINESS_BMAD_APP_SLUG" not in wf or "UAT_READINESS_CATSEC_APP_ID" not in wf:
    raise SystemExit("evaluate job must map owner-pinned review app vars")
if "evaluate-uat-readiness.sh" not in deploy or "require-uat-readiness-predeploy.sh" not in deploy:
    raise SystemExit("Deploy UAT must integrate readiness")
if "evaluate-uat-readiness.test.sh" not in ci or "validate-uat-readiness-workflow.sh" not in ci:
    raise SystemExit("CI must run readiness contracts")
if "Revalidate UAT readiness before SSH" not in deploy:
    raise SystemExit("Deploy UAT must revalidate readiness immediately before SSH")
print("uat-readiness workflow contract ok")
PY

pass "uat-readiness workflow contract"
echo "validate-uat-readiness-workflow OK"
