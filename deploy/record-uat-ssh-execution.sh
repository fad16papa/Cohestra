#!/usr/bin/env bash
# Record GitHub Actions SSH *step* conclusion. This is not host-mutation proof.
# Never reads DROPLET_* or GITGUARDIAN_API_KEY. Never SSHes.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
OUT_DIR="${UAT_SSH_EVIDENCE_DIR:-${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}}"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/uat-ssh-execution.json"

TARGET_SHA="${TARGET_SHA:-${CANDIDATE_SHA:-}}"
TARGET_SHA="${TARGET_SHA,,}"
CONCLUSION="${SSH_STEP_CONCLUSION:-}"
OUTCOME="${SSH_STEP_OUTCOME:-}"

python3 - "$OUT_FILE" "$TARGET_SHA" "$CONCLUSION" "$OUTCOME" <<'PY'
import json, re, sys

path, sha, conclusion, outcome = sys.argv[1:5]
sha_n = sha.strip().lower()
if not re.fullmatch(r"[0-9a-f]{40}", sha_n):
    sha_n = ""
allowed = {"success", "failure", "cancelled", "skipped"}
conclusion_n = (conclusion or "").strip().lower()
if conclusion_n not in allowed:
    conclusion_n = "unknown"
outcome_n = (outcome or "").strip().lower() or conclusion_n

payload = {
    "result": "recorded",
    "conclusion": conclusion_n,
    "outcome": outcome_n,
    "sha": sha_n,
    "proof": "github_actions_step_conclusion",
    "host_mutation": "unknown",
    "ssh_attempted": conclusion_n in {"success", "failure", "cancelled"},
    "diagnostics": (
        "SSH Actions step conclusion only. "
        "This is not proof the host accepted a SHA or that UAT changed."
    ),
}
with open(path, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, indent=2)
    fh.write("\n")
print(f"SSH_STEP_EVIDENCE={path}")
print(f"SSH_STEP_CONCLUSION={conclusion_n}")
print("HOST_MUTATION=unknown")
PY
