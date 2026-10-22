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

if [[ -n "${COHESTRA_PRODUCTION_PROVENANCE_ANCHOR:-}" ]]; then
  ANCHOR_FILE="$COHESTRA_PRODUCTION_PROVENANCE_ANCHOR"
else
  ANCHOR_FILE="$ROOT_DIR/deploy/production-provenance-anchor.txt"
fi
if [[ ! -f "$ANCHOR_FILE" ]]; then
  refuse "production provenance anchor is missing"
fi
ANCHOR="$(tr -d '[:space:]' <"$ANCHOR_FILE")"
if [[ ! "$ANCHOR" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "production provenance anchor is malformed"
fi
ANCHOR="${ANCHOR,,}"
if ! git cat-file -t "$ANCHOR" >/dev/null 2>&1; then
  refuse "production provenance anchor is not a git object"
fi
if [[ "$(git cat-file -t "$ANCHOR")" != "commit" ]]; then
  refuse "production provenance anchor must be a commit object"
fi
if ! git merge-base --is-ancestor "$ANCHOR" "$DEPLOY_SHA"; then
  refuse "production provenance anchor is not an ancestor of deploy_sha"
fi

# Walk first-parent history from deploy_sha back to the immutable trust anchor.
# The anchor is the trust root and is not revalidated as a new PR merge.
CHAIN=()
current="$DEPLOY_SHA"
steps=0
MAX_CHAIN=10000
while [[ "$current" != "$ANCHOR" ]]; do
  if ! git cat-file -t "$current" >/dev/null 2>&1; then
    refuse "first-parent chain traversal failed"
  fi
  parent_count="$(git rev-list --parents -n 1 "$current" | awk '{print NF-1}')"
  if [[ "$parent_count" != "2" ]]; then
    refuse "first-parent chain does not reach the provenance anchor"
  fi
  CHAIN+=("$current")
  if ! current="$(git rev-parse "${current}^1")"; then
    refuse "first-parent chain traversal failed"
  fi
  current="${current,,}"
  steps=$((steps + 1))
  if [[ "$steps" -gt "$MAX_CHAIN" ]]; then
    refuse "first-parent chain exceeded traversal limit"
  fi
done

if [[ "${#CHAIN[@]}" -eq 0 ]]; then
  REVIEWED_PR_HEAD="$DEPLOY_SHA"
else
  if [[ ! "${CHAIN[0]}" == "$DEPLOY_SHA" ]]; then
    refuse "first-parent chain does not start at deploy_sha"
  fi
  parent_count="$(git rev-list --parents -n 1 "$DEPLOY_SHA" | awk '{print NF-1}')"
  if [[ "$parent_count" != "2" ]]; then
    refuse "deploy_sha must be a two-parent merge commit"
  fi
  REVIEWED_PR_HEAD="$(git rev-parse "${DEPLOY_SHA}^2")"
fi

export COHESTRA_GH_API_MOCK="${COHESTRA_GH_API_MOCK:-}"

set +e
layer_a_out="$(python3 "$ROOT_DIR/deploy/lib/production-github-provenance.py" layer-a "$GITHUB_REPOSITORY" "$DEPLOY_SHA" 2>&1)"
layer_a_rc=$?
set -e
if [[ "$layer_a_rc" -ne 0 ]]; then
  echo "$layer_a_out"
  exit 1
fi

layer_b_out=""
ASSOCIATED_PR_NUMBER=""
if [[ "${#CHAIN[@]}" -gt 0 ]]; then
  for sha in "${CHAIN[@]}"; do
    reviewed="$(git rev-parse "${sha}^2")"
    set +e
    one_out="$(python3 "$ROOT_DIR/deploy/lib/production-github-provenance.py" layer-b "$GITHUB_REPOSITORY" "$sha" "$reviewed" 2>&1)"
    one_rc=$?
    set -e
    if [[ "$one_rc" -ne 0 ]]; then
      echo "$one_out"
      exit 1
    fi
    if [[ "$sha" == "$DEPLOY_SHA" ]]; then
      layer_b_out="$one_out"
      ASSOCIATED_PR_NUMBER="$(printf '%s\n' "$one_out" | awk -F= '/^ASSOCIATED_PR_NUMBER=/{print $2}')"
    fi
  done
else
  layer_b_out="LAYER_B=SKIP_ANCHOR"
fi

echo "RESULT=PASS"
echo "VALIDATED_SHA=${DEPLOY_SHA}"
echo "REVIEWED_PR_HEAD=${REVIEWED_PR_HEAD}"
echo "ASSOCIATED_PR_NUMBER=${ASSOCIATED_PR_NUMBER}"
echo "PROVENANCE_ANCHOR=${ANCHOR}"
echo "FIRST_PARENT_CHAIN_DEPTH=${#CHAIN[@]}"
echo "$layer_a_out"
echo "$layer_b_out"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "validated_sha=${DEPLOY_SHA}"
    echo "reviewed_pr_head=${REVIEWED_PR_HEAD}"
    echo "associated_pr_number=${ASSOCIATED_PR_NUMBER}"
  } >>"$GITHUB_OUTPUT"
fi
