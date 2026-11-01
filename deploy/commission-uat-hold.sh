#!/usr/bin/env bash
# Unprivileged HOLD commissioning using the real gate + workflow YAML.
# Evidence class is CI_CONTRACT. This is not a live Deploy UAT HOLD run.
# Never reads DROPLET_* or GITGUARDIAN_API_KEY. Never SSHes.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"

WF="$ROOT_DIR/.github/workflows/deploy.yml"
PROD="$ROOT_DIR/.github/workflows/deploy-production.yml"
EVIDENCE_DIR="${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}"
mkdir -p "$EVIDENCE_DIR"

if [[ ! -f "$WF" ]]; then
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=deploy.yml missing"
  exit 1
fi

python3 - "$WF" "$PROD" <<'PY'
from pathlib import Path
import re, sys

wf, prod = Path(sys.argv[1]).read_text(), Path(sys.argv[2]).read_text()
start = wf.find("  deploy:")
if start < 0:
    raise SystemExit("deploy job missing")
rest = wf[start:]
m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
block = rest if not m else rest[: m.start() + 1]
if "needs.predeploy-gate.outputs.eligible == 'true'" not in block and \
   'needs.predeploy-gate.outputs.eligible == "true"' not in block:
    raise SystemExit("SSH job is not gated on eligible==true")
if "appleboy/ssh-action" not in block:
    raise SystemExit("SSH action missing from gated deploy job")
pre_start = wf.find("  predeploy-gate:")
if pre_start < 0:
    raise SystemExit("predeploy-gate missing")
pre = wf[pre_start:start]
if "environment:" in pre:
    raise SystemExit("predeploy-gate must not use an Environment")
if "DROPLET_" in pre:
    raise SystemExit("predeploy-gate must not read DROPLET secrets")
if "workflow_run:" not in wf:
    raise SystemExit("automatic UAT path missing workflow_run")
if "github.event_name == 'workflow_dispatch' ||" in wf:
    raise SystemExit("workflow_dispatch OR-bypass is forbidden")
if not re.search(r"^on:\n  workflow_dispatch:\n", prod, re.M) and "workflow_dispatch:" not in prod:
    raise SystemExit("Production must remain dispatch-only")
if re.search(r"^\s*workflow_run:", prod, re.M):
    raise SystemExit("Production must not gain workflow_run")
PY

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT
build_provenance_fixture "$TMP"
cd "$PROVENANCE_LOCAL"

export COHESTRA_GH_API_MOCK="$ROOT_DIR/deploy/lib/uat-gh-api-mock.sh"
export COHESTRA_PROVENANCE_FIXTURE="$PROVENANCE_FIX"
export GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-fad16papa/Cohestra}"
export ORIGIN_MAIN_REF="origin/main"
export COHESTRA_ROOT="$ROOT_DIR"
export GITHUB_EVENT_NAME=workflow_run
export WORKFLOW_RUN_HEAD_SHA="$PROVENANCE_MERGE"
export UAT_GATE_EVIDENCE_DIR="$EVIDENCE_DIR"
export UAT_DEPLOY_GATE_ACTIVE=false
export CANDIDATE_SHA="$PROVENANCE_MERGE"
cat >"$PROVENANCE_FIX/deploy_runs.json" <<'JSON'
{"total_count":0,"workflow_runs":[]}
JSON

set +e
gate_out="$(bash "$ROOT_DIR/deploy/validate-uat-predeploy-gate.sh" 2>&1)"
gate_rc=$?
set -e

if [[ "$gate_rc" -eq 0 ]] || echo "$gate_out" | grep -q 'RESULT=PASS'; then
  echo "$gate_out"
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=commissioning expected HOLD for UAT_DEPLOY_GATE_ACTIVE=false"
  exit 1
fi
if ! echo "$gate_out" | grep -q 'RESULT=HOLD'; then
  echo "$gate_out"
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=commissioning did not HOLD"
  exit 1
fi
if ! echo "$gate_out" | grep -q 'UAT_DEPLOY_GATE_ACTIVE'; then
  echo "$gate_out"
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=HOLD must name UAT_DEPLOY_GATE_ACTIVE"
  exit 1
fi

GATE_RESULT=HOLD \
GATE_REASON="UAT_DEPLOY_GATE_ACTIVE is not true" \
CANDIDATE_SHA="$PROVENANCE_MERGE" \
UAT_DEPLOYED=false \
UAT_DELIVERY_STATUS_DIR="$EVIDENCE_DIR" \
bash "$ROOT_DIR/deploy/uat-delivery-status.sh" >/dev/null

python3 - "$EVIDENCE_DIR/uat-hold-commissioning.json" "$PROVENANCE_MERGE" "${GITHUB_SHA:-}" <<'PY'
import json, sys
path, sha, ci_sha = sys.argv[1], sys.argv[2], sys.argv[3]
payload = {
    "evidence_class": "CI_CONTRACT",
    "live_deploy_uat_hold": False,
    "ci_sha": ci_sha.lower() if ci_sha else "",
    "configured_suppressor": "false",
    "gate_result": "HOLD",
    "eligible": False,
    "ssh_possible": False,
    "uat_deployed": False,
    "hold_reason": "UAT_DEPLOY_GATE_ACTIVE is not true",
    "diagnostics": "UAT_DEPLOY_GATE_ACTIVE is not true",
    "candidate_sha": sha.lower(),
    "ssh_blocked_by": [
        "UAT_DEPLOY_GATE_ACTIVE is not true",
        "deploy job if requires needs.predeploy-gate.outputs.eligible == 'true'",
        "commissioning path never loads droplet secrets or the SSH action",
    ],
    "automatic_path": "workflow_run(CI completed on main) then predeploy-gate; dispatch is optional and uses the same gate",
}
with open(path, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, indent=2)
    fh.write("\n")
PY

echo "RESULT=HOLD"
echo "HOLD_REASON=UAT_DEPLOY_GATE_ACTIVE is not true"
echo "eligible=false"
echo "EVIDENCE_CLASS=CI_CONTRACT"
echo "LIVE_DEPLOY_UAT_HOLD=false"
echo "SSH_POSSIBLE=false"
echo "UAT_DEPLOYED=false"
echo "VALIDATED_SHA=${PROVENANCE_MERGE}"
exit 0
