#!/usr/bin/env bash
# Write machine-readable predeploy evidence. Never prints tokens.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
EVIDENCE_DIR="${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}"
RESULT="${1:-REFUSE}"
REASON="${2:-predeploy evidence refused}"

mkdir -p "$EVIDENCE_DIR"
python3 - "$EVIDENCE_DIR/uat-predeploy-gate.json" "$RESULT" "$REASON" \
  "${CANDIDATE_SHA:-}" "${ORIGIN_MAIN_SHA:-}" \
  "${GITHUB_EVENT_NAME:-}" "${UAT_DEPLOY_GATE_ACTIVE:-}" <<'PY'
import json, sys
path, result, reason, candidate, origin, event, active = sys.argv[1:8]
payload = {
    "result": result,
    "reason": reason,
    "candidate_sha": candidate.lower() if candidate else "",
    "origin_main_sha": origin.lower() if origin else "",
    "event_name": event,
    "gate_active": active == "true",
}
with open(path, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, indent=2)
    fh.write("\n")
PY
GATE_RESULT="$RESULT" GATE_REASON="$REASON" \
  CANDIDATE_SHA="${CANDIDATE_SHA:-}" \
  UAT_DELIVERY_STATUS_DIR="$EVIDENCE_DIR" \
  bash "$ROOT_DIR/deploy/uat-delivery-status.sh" >/dev/null
if [[ -n "${GITHUB_OUTPUT:-}" && "$RESULT" != "PASS" ]]; then
  echo "eligible=false" >>"$GITHUB_OUTPUT"
fi
