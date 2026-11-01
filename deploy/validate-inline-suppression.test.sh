#!/usr/bin/env bash
# AD-27: trusted inline suppressor precedes candidate checkout.
# N36 / N37. No live SSH. No GitHub settings changes.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
CI="$ROOT_DIR/.github/workflows/ci.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$WF" ]] || fail "deploy.yml missing"

python3 - "$WF" "$CI" <<'PY' || fail "inline suppression contract"
from pathlib import Path
import re, sys

wf, ci = Path(sys.argv[1]).read_text(), Path(sys.argv[2]).read_text()
start = wf.find("  predeploy-gate:")
if start < 0:
    raise SystemExit("predeploy-gate missing")
rest = wf[start:]
m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
pre = rest if not m else rest[: m.start() + 1]
inline = pre.find("Trusted inline suppressors before candidate checkout")
checkout = pre.find("name: Checkout accepted SHA")
if inline < 0 or checkout < 0 or inline > checkout:
    raise SystemExit("predeploy inline suppressor must precede Checkout accepted SHA")
if "actions/checkout" in pre[inline:checkout]:
    raise SystemExit("inline suppressor must not checkout TARGET_SHA")
if 'UAT_MAIN_DEPLOY_SUPPRESSED:-}" == "true"' not in pre[inline:checkout]:
    raise SystemExit("inline step must test exact true suppression")
if 'UAT_DEPLOY_GATE_ACTIVE:-}" != "true"' not in pre[inline:checkout]:
    raise SystemExit("inline step must keep gate-false HOLD")
if "environment:" in pre:
    raise SystemExit("predeploy must not use environment: uat")
if "DROPLET_" in pre:
    raise SystemExit("predeploy must not read DROPLET secrets")

on = wf.split("jobs:", 1)[0]
if "workflow_run:" not in on:
    raise SystemExit("PR-C must keep workflow_run")
if "release/uat" in on:
    raise SystemExit("PR-C must not add release/uat to Deploy UAT triggers")
if "\n  push:" in on:
    raise SystemExit("PR-C must not add push to Deploy UAT")
if re.search(r"branches:\n\s+- main", on) is None:
    raise SystemExit("workflow_run.branches must remain main")
if "adcp" in wf.lower() or "autonomous delivery control plane" in wf.lower():
    raise SystemExit("ADCP must stay retired")

# CI expansion
if "release/uat" not in ci:
    raise SystemExit("ci.yml must include release/uat")
if "merge_group:" not in ci:
    raise SystemExit("ci.yml must include merge_group")
if "environment: uat" in ci or "secrets.DROPLET_" in ci:
    raise SystemExit("ci.yml must not gain Environment uat or DROPLET secrets")
print("inline-suppression-contract-ok")
PY
pass "inline suppressor precedes candidate checkout; workflow_run stays on main"

python3 - "$WF" <<'PY' || fail "candidate-omitted suppressor still HOLDs in YAML"
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text()
# N36: even if validate-uat-predeploy-gate.sh were absent from a candidate tree,
# the default-branch YAML still contains the suppressor.
if "Trusted inline suppressors before candidate checkout" not in text:
    raise SystemExit("missing trusted inline step")
if "validate-uat-predeploy-gate.sh" not in text:
    raise SystemExit("defense-in-depth script still invoked after checkout")
print("n36-yaml-ok")
PY
pass "N36: inline YAML is the first suppressor"

echo "validate-inline-suppression contract OK"
