#!/usr/bin/env bash
# Layer A (exact deploy_sha / main CI) + Layer B (merged PR + GitGuardian).
# Fail closed. Never prints tokens or secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/cohestra-gh-api.sh"

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  exit 1
}

DEPLOY_SHA="${DEPLOY_SHA:-}"
ORIGIN_MAIN_REF="${ORIGIN_MAIN_REF:-origin/main}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-fad16papa/Cohestra}"
export COHESTRA_ROOT="$ROOT_DIR"

if [[ ! "$DEPLOY_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "deploy_sha must be exactly 40 hexadecimal characters"
fi
DEPLOY_SHA="${DEPLOY_SHA,,}"

if ! git cat-file -t "$DEPLOY_SHA" >/dev/null 2>&1; then
  refuse "deploy_sha is not a git object"
fi
if [[ "$(git cat-file -t "$DEPLOY_SHA")" != "commit" ]]; then
  refuse "deploy_sha must be a commit object"
fi

if ! git rev-parse --verify "$ORIGIN_MAIN_REF" >/dev/null 2>&1; then
  refuse "origin/main is unavailable"
fi
if ! git merge-base --is-ancestor "$DEPLOY_SHA" "$ORIGIN_MAIN_REF"; then
  refuse "deploy_sha is not an ancestor of origin/main"
fi

parent_count="$(git rev-list --parents -n 1 "$DEPLOY_SHA" | awk '{print NF-1}')"
if [[ "$parent_count" != "2" ]]; then
  refuse "deploy_sha must be a two-parent merge commit"
fi

REVIEWED_PR_HEAD="$(git rev-parse "${DEPLOY_SHA}^2")"
FIRST_PARENT="$(git rev-parse "${DEPLOY_SHA}^1")"

export COHESTRA_GH_API_MOCK="${COHESTRA_GH_API_MOCK:-}"

set +e
layer_a_out="$(python3 "$ROOT_DIR/deploy/lib/production-github-provenance.py" layer-a "$GITHUB_REPOSITORY" "$DEPLOY_SHA" 2>&1)"
layer_a_rc=$?
set -e
if [[ "$layer_a_rc" -ne 0 ]]; then
  echo "$layer_a_out"
  exit 1
fi

set +e
layer_b_out="$(python3 "$ROOT_DIR/deploy/lib/production-github-provenance.py" layer-b "$GITHUB_REPOSITORY" "$DEPLOY_SHA" "$REVIEWED_PR_HEAD" "$FIRST_PARENT" 2>&1)"
layer_b_rc=$?
set -e
if [[ "$layer_b_rc" -ne 0 ]]; then
  echo "$layer_b_out"
  exit 1
fi

ASSOCIATED_PR_NUMBER="$(printf '%s\n' "$layer_b_out" | awk -F= '/^ASSOCIATED_PR_NUMBER=/{print $2}')"

echo "RESULT=PASS"
echo "VALIDATED_SHA=${DEPLOY_SHA}"
echo "REVIEWED_PR_HEAD=${REVIEWED_PR_HEAD}"
echo "ASSOCIATED_PR_NUMBER=${ASSOCIATED_PR_NUMBER}"
echo "$layer_a_out"
echo "$layer_b_out"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "validated_sha=${DEPLOY_SHA}"
    echo "reviewed_pr_head=${REVIEWED_PR_HEAD}"
    echo "associated_pr_number=${ASSOCIATED_PR_NUMBER}"
  } >>"$GITHUB_OUTPUT"
fi
