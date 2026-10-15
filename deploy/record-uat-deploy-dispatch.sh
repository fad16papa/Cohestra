#!/usr/bin/env bash
# Write machine-readable UAT deploy dispatch evidence. No secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$ROOT_DIR/artifacts}"
mkdir -p "$OUT_DIR"

TARGET_SHA="${TARGET_SHA:-${GITHUB_SHA:-unknown}}"
EVENT_NAME="${GITHUB_EVENT_NAME:-local}"
RUN_ID="${GITHUB_RUN_ID:-}"
RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:-}"
REF_NAME="${GITHUB_REF_NAME:-}"

python3 - "$OUT_DIR/uat-deploy-dispatch.json" "$TARGET_SHA" "$EVENT_NAME" "$RUN_ID" "$RUN_ATTEMPT" "$REF_NAME" <<'PY'
import json, sys
from datetime import datetime, timezone

path, sha, event_name, run_id, run_attempt, ref_name = sys.argv[1:7]
payload = {
    "workflow": "deploy-uat",
    "environment": "uat",
    "event": event_name,
    "sha": sha,
    "ref": ref_name,
    "runId": run_id or None,
    "runAttempt": run_attempt or None,
    "recordedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "result": "dispatched",
}
with open(path, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, indent=2)
    fh.write("\n")
print(f"wrote {path}")
print(f"DISPATCH_SHA={sha}")
PY
