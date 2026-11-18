#!/usr/bin/env bash
# In-run AD-17 provenance: bind github.sha to the checked-out tree.
# No DROPLET secrets. No Environment uat.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SCAN_SHA="${SCAN_SHA:-${GITHUB_SHA:-}}"
OUT_DIR="${UAT_PROVENANCE_DIR:-$ROOT_DIR/artifacts}"
mkdir -p "$OUT_DIR"

if [[ ! "$SCAN_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "REFUSE: provenance requires a 40-character SCAN_SHA"
  exit 1
fi
SCAN_SHA="${SCAN_SHA,,}"
HEAD="$(git rev-parse HEAD)"
HEAD="${HEAD,,}"
if [[ "$HEAD" != "$SCAN_SHA" ]]; then
  echo "REFUSE: checked-out HEAD is not SCAN_SHA"
  exit 1
fi
if [[ "$(git cat-file -t "$SCAN_SHA")" != "commit" ]]; then
  echo "REFUSE: SCAN_SHA is not a commit"
  exit 1
fi
TREE="$(git rev-parse "${SCAN_SHA}^{tree}")"
REF="${GITHUB_REF:-}"
if [[ "$REF" != "refs/heads/release/uat" ]]; then
  echo "HOLD: provenance ref is not refs/heads/release/uat"
  echo "RESULT=HOLD"
  echo "HOLD_REASON=CUTOVER_INCOMPLETE_MAIN_SOURCE"
  exit 1
fi

python3 - "$OUT_DIR/uat-deploy-provenance.json" "$SCAN_SHA" "$TREE" "$REF" "${GITHUB_EVENT_NAME:-}" <<'PY'
import json, sys
path, sha, tree, ref, event = sys.argv[1:6]
payload = {
    "result": "PASS",
    "candidate_sha": sha,
    "git_tree": tree,
    "source_ref": ref,
    "event_name": event,
    "suppressor": "ad17-in-run-provenance",
}
with open(path, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, indent=2)
    fh.write("\n")
PY
echo "RESULT=PASS"
echo "VALIDATED_SHA=${SCAN_SHA}"
echo "GIT_TREE=${TREE}"
