#!/usr/bin/env bash
# Fail-closed UAT pre-deploy eligibility after PR-D / AD-14 / AD-23.
# Mockable. Never prints tokens or secrets.

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
ORIGIN_UAT_REF="${ORIGIN_UAT_REF:-origin/release/uat}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-fad16papa/Cohestra}"
GITHUB_EVENT_NAME="${GITHUB_EVENT_NAME:-}"
GITHUB_REF="${GITHUB_REF:-}"
export COHESTRA_ROOT="$ROOT_DIR"

EVIDENCE_DIR="${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}"
EVIDENCE_FILE="$EVIDENCE_DIR/uat-predeploy-gate.json"

write_evidence() {
  local result="$1"
  local reason="$2"
  mkdir -p "$EVIDENCE_DIR"
  python3 - "$EVIDENCE_FILE" "$result" "$reason" "${CANDIDATE_SHA:-}" "${ORIGIN_UAT_SHA:-}" \
    "${GITHUB_EVENT_NAME:-}" "${UAT_DEPLOY_GATE_ACTIVE:-}" "${UAT_MAIN_DEPLOY_SUPPRESSED:-}" \
    "${GITHUB_REF:-}" <<'PY'
import json, sys
path, result, reason, candidate, origin, event, active, suppressed, ref = sys.argv[1:10]
payload = {
    "result": result,
    "reason": reason,
    "candidate_sha": candidate.lower() if candidate else "",
    "origin_uat_sha": origin.lower() if origin else "",
    "event_name": event,
    "gate_active": active == "true",
    "main_deploy_suppressed": suppressed == "true",
    "github_ref": ref,
}
with open(path, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, indent=2)
    fh.write("\n")
PY
  GATE_RESULT="$result" GATE_REASON="$reason" \
    CANDIDATE_SHA="${CANDIDATE_SHA:-}" \
    UAT_DELIVERY_STATUS_DIR="$EVIDENCE_DIR" \
    bash "$ROOT_DIR/deploy/uat-delivery-status.sh" >/dev/null
}

if [[ "${UAT_DEPLOY_GATE_ACTIVE:-}" != "true" ]]; then
  hold "UAT_DEPLOY_GATE_ACTIVE is not true"
fi

if [[ "${GITHUB_REF:-}" != "refs/heads/release/uat" ]]; then
  hold "CUTOVER_INCOMPLETE_MAIN_SOURCE"
fi

if [[ "${UAT_MAIN_DEPLOY_SUPPRESSED:-}" != "true" ]]; then
  hold "UAT_MAIN_DEPLOY_SUPPRESSED is not true"
fi

if [[ ! "$CANDIDATE_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "candidate_sha must be exactly 40 hexadecimal characters"
fi
CANDIDATE_SHA="${CANDIDATE_SHA,,}"

if [[ "$GITHUB_EVENT_NAME" != "push" && "$GITHUB_EVENT_NAME" != "workflow_dispatch" ]]; then
  hold "UAT deploy trigger must be push or workflow_dispatch"
fi

if ! git cat-file -t "$CANDIDATE_SHA" >/dev/null 2>&1; then
  refuse "candidate_sha is not a git object"
fi
if [[ "$(git cat-file -t "$CANDIDATE_SHA")" != "commit" ]]; then
  refuse "candidate_sha must be a commit object"
fi

if ! git rev-parse --verify "$ORIGIN_UAT_REF" >/dev/null 2>&1; then
  refuse "origin/release/uat is unavailable"
fi
ORIGIN_UAT_SHA="$(git rev-parse "$ORIGIN_UAT_REF")"
ORIGIN_UAT_SHA="${ORIGIN_UAT_SHA,,}"

if ! git merge-base --is-ancestor "$CANDIDATE_SHA" "$ORIGIN_UAT_REF"; then
  hold "candidate_sha is not an ancestor of origin/release/uat"
fi
if [[ "$CANDIDATE_SHA" != "$ORIGIN_UAT_SHA" ]]; then
  hold "candidate_sha is not the current origin/release/uat tip"
fi

# AD-14: AD-17 success is the workflow `needs` edge, not Checks API.
# Native GitGuardian check-runs do not complete on push (see PR-D investigation).
# In-run GitGuardian exact-SHA API scan is the UAT post-merge security signal.
if [[ "${UAT_AD17_IN_RUN:-}" != "true" ]]; then
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
fi

echo "RESULT=PASS"
echo "VALIDATED_SHA=${CANDIDATE_SHA}"
echo "ORIGIN_UAT_SHA=${ORIGIN_UAT_SHA}"
write_evidence "PASS" "AD-14 conjuncts and release/uat tip-pin SUCCESS"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "eligible=true"
    echo "validated_sha=${CANDIDATE_SHA}"
  } >>"$GITHUB_OUTPUT"
fi
