# shellcheck shell=bash
# Sourced by remote-deploy.sh after `git fetch origin "$DEPLOY_BRANCH"`.
# Never prints secrets. DEPLOY_SHA is a public git object id.

reset_accepted_sha() {
  local sha="${DEPLOY_SHA:-}"
  DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

  if [[ -z "$sha" ]]; then
    git reset --hard "origin/$DEPLOY_BRANCH"
    return 0
  fi

  if [[ ! "$sha" =~ ^[0-9a-fA-F]{40}([0-9a-fA-F]{24})?$ ]]; then
    echo "REFUSE: DEPLOY_SHA must be a full git object id"
    return 1
  fi

  if ! git cat-file -e "${sha}^{commit}" 2>/dev/null; then
    echo "REFUSE: DEPLOY_SHA is not present after fetching origin/${DEPLOY_BRANCH}"
    return 1
  fi

  if ! git merge-base --is-ancestor "$sha" "origin/$DEPLOY_BRANCH"; then
    echo "REFUSE: DEPLOY_SHA is not on origin/${DEPLOY_BRANCH}"
    return 1
  fi

  git reset --hard "$sha"
}
