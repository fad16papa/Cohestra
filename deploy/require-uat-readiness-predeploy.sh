#!/usr/bin/env bash
# Fail-closed pre-SSH readiness requirement. Does not SSH, merge, or set the gate.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export COHESTRA_ROOT="$ROOT_DIR"
EVIDENCE_DIR="${UAT_READINESS_OUT_DIR:-${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}}"
REPORT="$EVIDENCE_DIR/uat-readiness.json"
CANDIDATE_SHA="${CANDIDATE_SHA:-${UAT_READINESS_SHA:-}}"
GATE="${UAT_DEPLOY_GATE_ACTIVE:-}"

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "eligible=false" >>"$GITHUB_OUTPUT"
  fi
  exit 1
}

hold() {
  echo "RESULT=HOLD"
  echo "HOLD_REASON=$1"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "eligible=false" >>"$GITHUB_OUTPUT"
  fi
  exit 1
}

if [[ "$GATE" != "true" ]]; then
  echo "RESULT=HOLD"
  echo "HOLD_REASON=UAT_DEPLOY_GATE_ACTIVE is not true; readiness is report-only"
  if [[ -f "$REPORT" ]]; then
    echo "READINESS_REPORT=present"
  else
    echo "READINESS_REPORT=missing"
  fi
  exit 0
fi

if [[ ! -f "$REPORT" ]]; then
  refuse "UAT readiness report is missing; SSH is blocked"
fi

if grep -qE 'BEGIN (OPENSSH |RSA )?PRIVATE KEY|-----BEGIN|Bearer |password|ghp_|github_pat_' "$REPORT"; then
  rm -f "$REPORT"
  refuse "UAT readiness report contained secret-like values"
fi

if [[ ! "$CANDIDATE_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "predeploy candidate SHA is not a 40-character hexadecimal value"
fi
CANDIDATE_SHA="${CANDIDATE_SHA,,}"

python3 - "$REPORT" "$CANDIDATE_SHA" <<'PY'
import json, sys
path, sha = sys.argv[1], sys.argv[2].lower()
report = json.load(open(path, encoding="utf-8"))
if report.get("owner_authorization_claimed") is True:
    raise SystemExit("readiness report illegally claims owner authorization")
report_sha = (report.get("merge_commit_sha") or report.get("head_sha") or "").lower()
if report_sha != sha:
    raise SystemExit("readiness report SHA does not match candidate SHA")
if report.get("stale") is True:
    raise SystemExit("readiness report is stale")
if report.get("predeploy_ok") is not True:
    raise SystemExit(report.get("hold_reason") or "readiness is not predeploy eligible")
if report.get("state") == "UAT_ACCEPTED" and report.get("source_type") != "LIVE":
    raise SystemExit("UAT_ACCEPTED without LIVE evidence")
print("READINESS_PREDEPLOY=OK")
PY
echo "RESULT=PASS"
