#!/usr/bin/env bash
# Fail-closed UAT pre-deploy eligibility. Mockable. Never prints tokens or secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/cohestra-gh-api.sh"

hold() {
  echo "RESULT=HOLD"
  echo "HOLD_REASON=$1"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "eligible=false" >>"$GITHUB_OUTPUT"
  fi
  write_evidence "HOLD" "$1"
  exit 1
}

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "eligible=false" >>"$GITHUB_OUTPUT"
  fi
  write_evidence "REFUSE" "$1"
  exit 1
}

CANDIDATE_SHA="${CANDIDATE_SHA:-${DEPLOY_SHA:-}}"
ORIGIN_MAIN_REF="${ORIGIN_MAIN_REF:-origin/main}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-fad16papa/Cohestra}"
GITHUB_EVENT_NAME="${GITHUB_EVENT_NAME:-}"
export COHESTRA_ROOT="$ROOT_DIR"

EVIDENCE_DIR="${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}"
EVIDENCE_FILE="$EVIDENCE_DIR/uat-predeploy-gate.json"

write_evidence() {
  local result="$1"
  local reason="$2"
  mkdir -p "$EVIDENCE_DIR"
  python3 - "$EVIDENCE_FILE" "$result" "$reason" "${CANDIDATE_SHA:-}" "${ORIGIN_MAIN_SHA:-}" \
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
}

if [[ "${UAT_DEPLOY_GATE_ACTIVE:-}" != "true" ]]; then
  hold "UAT_DEPLOY_GATE_ACTIVE is not true"
fi

if [[ ! "$CANDIDATE_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "candidate_sha must be exactly 40 hexadecimal characters"
fi
CANDIDATE_SHA="${CANDIDATE_SHA,,}"

if [[ "$GITHUB_EVENT_NAME" != "workflow_run" && "$GITHUB_EVENT_NAME" != "workflow_dispatch" ]]; then
  hold "UAT deploy trigger must be workflow_run or workflow_dispatch"
fi

if [[ "$GITHUB_EVENT_NAME" == "workflow_run" ]]; then
  HEAD_SHA="${WORKFLOW_RUN_HEAD_SHA:-}"
  if [[ ! "$HEAD_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
    refuse "workflow_run.head_sha must be exactly 40 hexadecimal characters"
  fi
  if [[ "${HEAD_SHA,,}" != "$CANDIDATE_SHA" ]]; then
    hold "candidate_sha does not equal workflow_run.head_sha"
  fi
fi

if ! git cat-file -t "$CANDIDATE_SHA" >/dev/null 2>&1; then
  refuse "candidate_sha is not a git object"
fi
if [[ "$(git cat-file -t "$CANDIDATE_SHA")" != "commit" ]]; then
  refuse "candidate_sha must be a commit object"
fi

if ! git rev-parse --verify "$ORIGIN_MAIN_REF" >/dev/null 2>&1; then
  refuse "origin/main is unavailable"
fi
ORIGIN_MAIN_SHA="$(git rev-parse "$ORIGIN_MAIN_REF")"
ORIGIN_MAIN_SHA="${ORIGIN_MAIN_SHA,,}"

if ! git merge-base --is-ancestor "$CANDIDATE_SHA" "$ORIGIN_MAIN_REF"; then
  hold "candidate_sha is not an ancestor of origin/main"
fi
if [[ "$CANDIDATE_SHA" != "$ORIGIN_MAIN_SHA" ]]; then
  hold "candidate_sha is not the current origin/main tip"
fi

parent_count="$(git rev-list --parents -n 1 "$CANDIDATE_SHA" | awk '{print NF-1}')"
if [[ "$parent_count" == "2" ]]; then
  REVIEWED_SHA="$(git rev-parse "${CANDIDATE_SHA}^2")"
else
  REVIEWED_SHA="$CANDIDATE_SHA"
fi
REVIEWED_SHA="${REVIEWED_SHA,,}"

export COHESTRA_GH_API_MOCK="${COHESTRA_GH_API_MOCK:-}"

set +e
gate_out="$(python3 "$ROOT_DIR/deploy/lib/uat-predeploy-gate.py" "$GITHUB_REPOSITORY" "$CANDIDATE_SHA" "$REVIEWED_SHA" 2>&1)"
gate_rc=$?
set -e
if [[ "$gate_rc" -ne 0 ]]; then
  echo "$gate_out"
  if echo "$gate_out" | grep -q 'RESULT=HOLD'; then
    reason="$(printf '%s\n' "$gate_out" | awk -F= '/^HOLD_REASON=/{print substr($0,13); exit}')"
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
      echo "eligible=false" >>"$GITHUB_OUTPUT"
    fi
    write_evidence "HOLD" "${reason:-python gate HOLD}"
    exit 1
  fi
  if echo "$gate_out" | grep -q 'RESULT=REFUSE'; then
    reason="$(printf '%s\n' "$gate_out" | awk -F= '/^REFUSE_REASON=/{print substr($0,15); exit}')"
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
      echo "eligible=false" >>"$GITHUB_OUTPUT"
    fi
    write_evidence "REFUSE" "${reason:-python gate REFUSE}"
    exit 1
  fi
  hold "UAT predeploy python gate failed closed"
fi
echo "$gate_out"

echo "RESULT=PASS"
echo "VALIDATED_SHA=${CANDIDATE_SHA}"
echo "REVIEWED_SHA=${REVIEWED_SHA}"
echo "ORIGIN_MAIN_SHA=${ORIGIN_MAIN_SHA}"
write_evidence "PASS" "all required checks SUCCESS on candidate_sha"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "eligible=true"
    echo "validated_sha=${CANDIDATE_SHA}"
    echo "reviewed_sha=${REVIEWED_SHA}"
  } >>"$GITHUB_OUTPUT"
fi
