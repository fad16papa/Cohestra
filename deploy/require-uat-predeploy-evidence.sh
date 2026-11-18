#!/usr/bin/env bash
# Fail closed unless both predeploy evidence files exist and are objects.
# Does not upload secrets. Does not SSH.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
EVIDENCE_DIR="${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}"
missing=0
for name in uat-predeploy-gate.json uat-delivery-status.json; do
  path="$EVIDENCE_DIR/$name"
  if [[ ! -f "$path" ]]; then
    echo "REFUSE: missing ${name}"
    missing=1
    continue
  fi
  if ! python3 - "$path" "$name" <<'PY'
import json, sys
path, name = sys.argv[1], sys.argv[2]
obj = json.load(open(path, encoding="utf-8"))
if not isinstance(obj, dict):
    raise SystemExit(f"REFUSE: {name} is not an object")
if name == "uat-predeploy-gate.json" and obj.get("result") not in {"HOLD", "REFUSE", "PASS"}:
    raise SystemExit(f"REFUSE: {name} result is not HOLD/REFUSE/PASS")
if name == "uat-delivery-status.json" and obj.get("eligibility") not in {"HOLD", "REFUSE", "PASS"}:
    raise SystemExit(f"REFUSE: {name} eligibility is not HOLD/REFUSE/PASS")
text = json.dumps(obj)
for needle in ("BEGIN OPENSSH", "PRIVATE KEY", "GITGUARDIAN_API_KEY=", "DROPLET_"):
    if needle in text:
        raise SystemExit(f"REFUSE: secret-like material in {name}")
PY
  then
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=predeploy evidence is incomplete"
  exit 1
fi
