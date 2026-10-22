#!/usr/bin/env bash
# Production SHA pin. Refuses empty / HEAD / latest / github.sha.
# Does not source UAT reset-accepted-sha.sh (empty fallback is UAT-only).

set -euo pipefail

refuse() {
  echo "REFUSE: $1"
  exit 1
}

DEPLOY_SHA="${DEPLOY_SHA:-}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

case "${DEPLOY_SHA}" in
  ""|HEAD|head|latest|LATEST|github.sha)
    refuse "Production refuses empty/HEAD/latest/github.sha"
    ;;
esac

if [[ ! "$DEPLOY_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "DEPLOY_SHA must be a full 40-character hexadecimal Git SHA"
fi
DEPLOY_SHA="${DEPLOY_SHA,,}"

if ! git cat-file -e "${DEPLOY_SHA}^{commit}" 2>/dev/null; then
  refuse "DEPLOY_SHA is not a commit object after fetch"
fi

if ! git merge-base --is-ancestor "$DEPLOY_SHA" "origin/${DEPLOY_BRANCH}"; then
  refuse "DEPLOY_SHA is not an ancestor of origin/${DEPLOY_BRANCH}"
fi

git reset --hard "$DEPLOY_SHA"
actual="$(git rev-parse HEAD)"
export GIT_SHA="$actual"
echo "EXPECTED_SHA=${DEPLOY_SHA}"
echo "DEPLOYED_SHA=${actual}"
echo "GIT_SHA=${actual}"
if [[ "$actual" != "$DEPLOY_SHA" ]]; then
  refuse "DEPLOYED_SHA does not match EXPECTED_SHA"
fi
