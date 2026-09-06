#!/usr/bin/env bash
# Prepare /home/deploy/cohestra from the current Epic 19 PR branch.
# Does not start Cohestra. Does not touch /root/lead-generation-crm.
#
# Usage (on the droplet as deploy):
#   bash deploy/prepare-canonical-checkout.sh

set -euo pipefail

DEST="${COHESTRA_DEPLOY_ROOT:-/home/deploy/cohestra}"
BRANCH="${COHESTRA_DEPLOY_BRANCH:-cursor/epic-19-uat-port-isolation-a139}"
REPO_URL="${COHESTRA_DEPLOY_REPO:-https://github.com/fad16papa/Cohestra.git}"

if [[ "$DEST" == /tmp/* && "${COHESTRA_ALLOW_TMP_DEST:-}" != "1" ]]; then
  echo "REFUSE: canonical path is /home/deploy/cohestra, not $DEST" >&2
  exit 1
fi
if [[ -e /root/lead-generation-crm && "$DEST" == /root/* ]]; then
  echo "REFUSE: will not use the existing application tree" >&2
  exit 1
fi

if [[ -d "$DEST/.git" ]]; then
  echo "== existing checkout $DEST =="
  git -C "$DEST" remote -v
  git -C "$DEST" rev-parse --abbrev-ref HEAD
  git -C "$DEST" rev-parse HEAD
  current_branch=$(git -C "$DEST" rev-parse --abbrev-ref HEAD)
  if [[ "$current_branch" != "$BRANCH" && "${COHESTRA_DEPLOY_UPDATE:-}" != "1" ]]; then
    echo "REFUSE: $DEST is on $current_branch, expected $BRANCH. Set COHESTRA_DEPLOY_UPDATE=1 after inspect." >&2
    exit 1
  fi
  echo "Inspect above before mutating. Not fetching unless COHESTRA_DEPLOY_UPDATE=1."
  if [[ "${COHESTRA_DEPLOY_UPDATE:-}" == "1" ]]; then
    git -C "$DEST" fetch origin "$BRANCH"
    git -C "$DEST" checkout "$BRANCH"
    git -C "$DEST" pull --ff-only origin "$BRANCH"
    git -C "$DEST" rev-parse --short HEAD
  fi
  exit 0
fi

if [[ -e "$DEST" ]]; then
  echo "REFUSE: $DEST exists and is not a git checkout" >&2
  exit 1
fi

echo "Cloning $BRANCH → $DEST"
git clone --branch "$BRANCH" "$REPO_URL" "$DEST"
git -C "$DEST" rev-parse --short HEAD
echo "CANONICAL CHECKOUT PASS"
echo "Next: bash $DEST/deploy/reconcile-canonical-uat-env.sh"
