#!/usr/bin/env bash
# Owner-run Production Git checkout bootstrap. Cursor / Cloud Agent must not
# execute this against the live Production host. No GitHub credentials, tokens,
# SSH keys, compose, or database commands are included.

set -euo pipefail

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  echo "COMPOSE_UP=false"
  echo "DATABASE_MUTATED=false"
  exit 1
}

CANONICAL_ORIGIN="https://github.com/fad16papa/Cohestra.git"
CANONICAL_USER="deploy"
CANONICAL_HOME="/home/deploy"
CANONICAL_PATH="/home/deploy/cohestra-production"
CANONICAL_HOST="cohestra-production"
UAT_IP="129.212.235.2"

UNDER_TEST=0
if [[ "${COHESTRA_BOOTSTRAP_UNDER_TEST:-}" == "1" ]]; then
  UNDER_TEST=1
fi

if [[ "$UNDER_TEST" -eq 1 ]]; then
  : "${COHESTRA_TEST_HOSTNAME:?test harness requires COHESTRA_TEST_HOSTNAME}"
  : "${COHESTRA_TEST_DEPLOY_USER:?test harness requires COHESTRA_TEST_DEPLOY_USER}"
  : "${COHESTRA_TEST_DEPLOY_HOME:?test harness requires COHESTRA_TEST_DEPLOY_HOME}"
  : "${COHESTRA_TEST_DEPLOY_PATH:?test harness requires COHESTRA_TEST_DEPLOY_PATH}"
  : "${COHESTRA_TEST_REPO_URL:?test harness requires COHESTRA_TEST_REPO_URL}"
  HOSTNAME_NOW="$COHESTRA_TEST_HOSTNAME"
  DEPLOY_USER="$COHESTRA_TEST_DEPLOY_USER"
  DEPLOY_HOME="$COHESTRA_TEST_DEPLOY_HOME"
  DEPLOY_PATH="$COHESTRA_TEST_DEPLOY_PATH"
  ORIGIN_URL="$COHESTRA_TEST_REPO_URL"
  if [[ "$DEPLOY_PATH" == /home/deploy/* || "$DEPLOY_HOME" == /home/deploy || "$DEPLOY_HOME" == /home/deploy/* ]]; then
    refuse "test_harness_must_not_use_live_path"
  fi
  case "$ORIGIN_URL" in
    http://*|https://*|ssh://*|git@*)
      refuse "test_harness_must_use_local_fixture"
      ;;
  esac
else
  if [[ "$(id -u)" -ne 0 ]]; then
    refuse "must_run_as_root"
  fi
  if [[ "$(uname -s)" != "Linux" ]]; then
    refuse "linux_only"
  fi
  HOSTNAME_NOW="$(hostname -s 2>/dev/null || hostname)"
  DEPLOY_USER="$CANONICAL_USER"
  DEPLOY_HOME="$CANONICAL_HOME"
  DEPLOY_PATH="$CANONICAL_PATH"
  ORIGIN_URL="$CANONICAL_ORIGIN"
fi

if [[ "$HOSTNAME_NOW" == *uat* || "$HOSTNAME_NOW" == *UAT* ]]; then
  refuse "uat_hostname_forbidden"
fi
if [[ "$HOSTNAME_NOW" != "$CANONICAL_HOST" ]]; then
  refuse "hostname_is_not_cohestra-production"
fi

if [[ "$UNDER_TEST" -eq 0 ]] && ip -4 addr show 2>/dev/null | grep -q "$UAT_IP"; then
  refuse "uat_public_ipv4_present_on_host"
fi

if [[ "$DEPLOY_USER" != "$CANONICAL_USER" ]]; then
  refuse "deploy_user_must_be_deploy"
fi
if [[ "$DEPLOY_HOME" != "$CANONICAL_HOME" && "$UNDER_TEST" -eq 0 ]]; then
  refuse "deploy_home_must_be_/home/deploy"
fi
if [[ "$(basename "$DEPLOY_PATH")" != "cohestra-production" ]]; then
  refuse "deploy_path_must_be_cohestra-production"
fi
if [[ "$UNDER_TEST" -eq 0 && "$DEPLOY_PATH" != "$CANONICAL_PATH" ]]; then
  refuse "deploy_path_must_be_/home/deploy/cohestra-production"
fi
if [[ "$DEPLOY_PATH" == *..* ]]; then
  refuse "path_traversal_forbidden"
fi
if [[ "$DEPLOY_PATH" != /* ]]; then
  refuse "deploy_path_must_be_absolute"
fi

if [[ "$UNDER_TEST" -eq 0 ]]; then
  if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
    refuse "deploy_user_missing"
  fi
  if [[ ! -d "$DEPLOY_HOME" ]]; then
    refuse "deploy_home_missing"
  fi
  if [[ "$(getent passwd "$DEPLOY_USER" | awk -F: '{print $6}')" != "$DEPLOY_HOME" ]]; then
    refuse "deploy_home_must_be_/home/deploy"
  fi
fi

if [[ "$ORIGIN_URL" != "$CANONICAL_ORIGIN" && "$UNDER_TEST" -eq 0 ]]; then
  refuse "repository_url_must_be_canonical"
fi
if [[ "$ORIGIN_URL" == *:*@* || "$ORIGIN_URL" == *token* || "$ORIGIN_URL" == git@* ]]; then
  refuse "credentialed_or_ssh_remote_forbidden"
fi

SHA="${PRODUCTION_BOOTSTRAP_SHA:-}"
SHA="${SHA//[[:space:]]/}"
case "$SHA" in
  ""|HEAD|head|latest|LATEST|github.sha|main|origin/main)
    refuse "bootstrap_sha_must_be_explicit_40_hex"
    ;;
esac
if [[ ! "$SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "bootstrap_sha_must_be_explicit_40_hex"
fi
SHA="${SHA,,}"

if [[ -L "$DEPLOY_PATH" ]]; then
  refuse "symlink_target_forbidden"
fi
if [[ -e "$DEPLOY_PATH" && ! -d "$DEPLOY_PATH" ]]; then
  refuse "target_is_not_a_directory"
fi

git_owner_name() {
  local path="$1"
  if [[ -n "${COHESTRA_TEST_GIT_OWNER:-}" ]]; then
    printf '%s\n' "$COHESTRA_TEST_GIT_OWNER"
    return
  fi
  stat -c '%U' "$path" 2>/dev/null || stat -f '%Su' "$path"
}

as_deploy_git() {
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    git -C "$DEPLOY_PATH" "$@"
  else
    runuser -u "$DEPLOY_USER" -- git -C "$DEPLOY_PATH" "$@"
  fi
}

if [[ -e "$DEPLOY_PATH/.git" ]]; then
  if [[ -L "$DEPLOY_PATH/.git" ]]; then
    refuse "symlink_git_forbidden"
  fi
  owner="$(git_owner_name "$DEPLOY_PATH/.git")"
  if [[ "$owner" == "root" || "$owner" == "0" ]]; then
    refuse "root_owned_git_forbidden"
  fi
  if [[ "$UNDER_TEST" -eq 0 && "$owner" != "$DEPLOY_USER" ]]; then
    refuse "foreign_owned_git_forbidden"
  fi
  if [[ "$UNDER_TEST" -eq 1 && -n "${COHESTRA_TEST_GIT_OWNER:-}" && "$owner" != "$DEPLOY_USER" ]]; then
    refuse "foreign_owned_git_forbidden"
  fi
  current_origin="$(as_deploy_git config --get remote.origin.url || true)"
  if [[ "$current_origin" != "$ORIGIN_URL" ]]; then
    refuse "wrong_origin"
  fi
else
  if [[ -d "$DEPLOY_PATH" ]]; then
    leftover=""
    while IFS= read -r leftover; do
      break
    done < <(find "$DEPLOY_PATH" -mindepth 1 -maxdepth 1 -print)
    if [[ -n "$leftover" ]]; then
      refuse "unexpected_nonempty_directory"
    fi
  else
    if [[ "$UNDER_TEST" -eq 1 ]]; then
      mkdir -p "$DEPLOY_PATH"
    else
      install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$DEPLOY_PATH"
    fi
  fi
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    git clone -- "$ORIGIN_URL" "$DEPLOY_PATH"
  else
    runuser -u "$DEPLOY_USER" -- git clone -- "$ORIGIN_URL" "$DEPLOY_PATH"
  fi
fi

as_deploy_git fetch -- origin main
as_deploy_git rev-parse --verify origin/main >/dev/null

if ! as_deploy_git cat-file -e "${SHA}^{commit}" 2>/dev/null; then
  refuse "bootstrap_sha_is_not_a_commit"
fi
if ! as_deploy_git merge-base --is-ancestor "$SHA" origin/main; then
  refuse "bootstrap_sha_not_on_origin_main"
fi

as_deploy_git reset --hard "$SHA"
actual="$(as_deploy_git rev-parse HEAD)"
if [[ "$actual" != "$SHA" ]]; then
  refuse "head_does_not_match_bootstrap_sha"
fi

if [[ "$UNDER_TEST" -eq 0 ]]; then
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$DEPLOY_PATH"
  if find "$DEPLOY_PATH" -user root -print -quit | grep -q .; then
    refuse "root_owned_worktree_files_remain"
  fi
fi

as_deploy_git status --porcelain >/dev/null
as_deploy_git fetch -- origin main

echo "RESULT=PASS"
echo "CHECKOUT_BOOTSTRAPPED=true"
echo "REPOSITORY_URL=${CANONICAL_ORIGIN}"
echo "TARGET_PATH=${CANONICAL_PATH}"
echo "TARGET_USER=${CANONICAL_USER}"
echo "BOOTSTRAP_SHA=${SHA}"
echo "HEAD_SHA=${actual}"
echo "PUBLIC_REPO_AUTH=unauthenticated_https"
echo "HOST_TO_GITHUB_CREDENTIAL=not_created"
echo "COMPOSE_UP=false"
echo "DATABASE_MUTATED=false"
echo "PASSWORDLESS_SUDO=false"
echo
echo "Checkout bootstrap only. Do not compose-up, migrate, or start services."
echo "Cursor must not become the Production SSH client."
