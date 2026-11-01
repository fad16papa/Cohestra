#!/usr/bin/env bash
# Read-only UAT readiness evaluator wrapper. Never prints tokens.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export COHESTRA_ROOT="$ROOT_DIR"

MODE="${UAT_READINESS_MODE:-}"
PR_NUMBER="${UAT_READINESS_PR:-${PR_NUMBER:-}}"
SHA="${UAT_READINESS_SHA:-${CANDIDATE_SHA:-}}"
UAT_READINESS_HEAD_SHA="${UAT_READINESS_HEAD_SHA:-}"
UAT_READINESS_BASE_SHA="${UAT_READINESS_BASE_SHA:-}"
OUT_DIR="${UAT_READINESS_OUT_DIR:-${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}}"

if [[ -z "$MODE" ]]; then
  case "${GITHUB_EVENT_NAME:-}" in
    pull_request|pull_request_review|pull_request_review_comment|issue_comment)
      MODE="pr"
      ;;
    workflow_dispatch)
      if [[ -n "${PR_NUMBER}" ]]; then
        MODE="pr"
      elif [[ -n "${SHA}" ]]; then
        MODE="predeploy"
      else
        MODE="reconcile"
      fi
      ;;
    schedule)
      MODE="reconcile"
      ;;
    push)
      MODE="main"
      SHA="${SHA:-${GITHUB_SHA:-}}"
      ;;
    workflow_run|check_suite|check_run)
      if [[ -n "${PR_NUMBER}" ]]; then
        MODE="pr"
      else
        MODE="main"
        SHA="${SHA:-${WORKFLOW_RUN_HEAD_SHA:-${CHECK_SUITE_HEAD_SHA:-${GITHUB_SHA:-}}}}"
      fi
      ;;
    *)
      if [[ -n "${PR_NUMBER}" ]]; then
        MODE="pr"
      elif [[ -n "${SHA}" ]]; then
        MODE="predeploy"
      else
        MODE="pr"
      fi
      ;;
  esac
fi

export UAT_READINESS_MODE="$MODE"
export UAT_READINESS_OUT_DIR="$OUT_DIR"
mkdir -p "$OUT_DIR"

python3 "$ROOT_DIR/deploy/lib/uat-readiness.py" \
  --mode "$MODE" \
  ${PR_NUMBER:+--pr "$PR_NUMBER"} \
  ${SHA:+--sha "$SHA"} \
  ${UAT_READINESS_HEAD_SHA:+--head "$UAT_READINESS_HEAD_SHA"} \
  ${UAT_READINESS_BASE_SHA:+--base "$UAT_READINESS_BASE_SHA"} \
  --out "$OUT_DIR"

for ev in "$OUT_DIR/uat-readiness.json" "$OUT_DIR/uat-readiness.md" "$OUT_DIR/uat-readiness-notice.json"; do
  if [[ -f "$ev" ]] && grep -qE 'BEGIN (OPENSSH |RSA )?PRIVATE KEY|-----BEGIN|Bearer |password|ghp_|github_pat_' "$ev"; then
    rm -f "$ev"
    echo "REFUSE: removed secret-like ${ev}"
    exit 1
  fi
done

test -f "$OUT_DIR/uat-readiness.json"
python3 - "$OUT_DIR/uat-readiness.json" <<'PY'
import json, sys
path = sys.argv[1]
report = json.load(open(path, encoding="utf-8"))
assert isinstance(report, dict), "readiness report must be an object"
assert report.get("owner_authorization_claimed") is False
assert report.get("hardcoded_prs") is False
assert report.get("schema_version")
assert report.get("state")
assert report.get("provenance", {}).get("adcp") is False
print(f"READINESS_REPORT_OK={report.get('state')}")
PY
