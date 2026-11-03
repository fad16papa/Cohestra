#!/usr/bin/env bash
# AD25-HARDENING contract. Local fixtures only. No live deploy credentials.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PYTHONPATH="${ROOT_DIR}/deploy/lib${PYTHONPATH:+:$PYTHONPATH}"

python3 - "$ROOT_DIR" <<'PY'
import sys
from pathlib import Path

sys.path.insert(0, str(Path(sys.argv[1]) / "deploy" / "lib"))
from ad25_hardening_contract import run_contract

raise SystemExit(run_contract(Path(sys.argv[1])))
PY
