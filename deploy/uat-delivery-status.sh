#!/usr/bin/env bash
# Structured, nonsecret UAT delivery status for agents and operators.
# Never prints tokens, secrets, or match bodies. Does not deploy.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
OUT_DIR="${UAT_DELIVERY_STATUS_DIR:-${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}}"
OUT_FILE="$OUT_DIR/uat-delivery-status.json"

CANDIDATE_SHA="${CANDIDATE_SHA:-${DEPLOY_SHA:-}}"
CANDIDATE_SHA="${CANDIDATE_SHA,,}"
GATE_RESULT="${GATE_RESULT:-${UAT_GATE_RESULT:-UNKNOWN}}"
GATE_REASON="${GATE_REASON:-${HOLD_REASON:-${REFUSE_REASON:-}}}"
UAT_DEPLOYED="${UAT_DEPLOYED:-false}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-fad16papa/Cohestra}"
GITHUB_RUN_ID="${GITHUB_RUN_ID:-}"
FAILED_TEST="${FAILED_TEST:-}"

mkdir -p "$OUT_DIR"

python3 - "$OUT_FILE" "$CANDIDATE_SHA" "$GATE_RESULT" "$GATE_REASON" \
  "$UAT_DEPLOYED" "$GITHUB_REPOSITORY" "$GITHUB_RUN_ID" "$FAILED_TEST" <<'PY'
import json, sys

path, sha, result, reason, deployed, repo, run_id, failed_test = sys.argv[1:9]
result_n = (result or "UNKNOWN").strip().upper()
reason_n = (reason or "").strip()
deployed_n = (deployed or "").strip().lower() == "true"

if result_n == "HOLD":
    failed_stage = "predeploy-gate"
elif result_n == "REFUSE":
    failed_stage = "predeploy-gate"
elif result_n == "PASS":
    failed_stage = "none"
else:
    failed_stage = "unknown"

run_links = {}
if run_id.isdigit() and repo:
    run_links["actions_run"] = f"https://github.com/{repo}/actions/runs/{run_id}"

payload = {
    "candidate_sha": sha if sha and len(sha) == 40 else sha,
    "failed_stage": failed_stage,
    "failed_test": failed_test or reason_n,
    "security_gate": result_n,
    "diagnostics": reason_n,
    "run_links": run_links,
    "uat_deployed": deployed_n,
    "agent_policy": (
        "Investigate and prepare fixes on a development branch only. "
        "Do not autonomously merge, change release controls, or retry indefinitely."
    ),
}
with open(path, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, indent=2)
    fh.write("\n")
print(f"UAT_DELIVERY_STATUS={path}")
PY
