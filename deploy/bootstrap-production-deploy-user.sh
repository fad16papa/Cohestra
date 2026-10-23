#!/usr/bin/env bash
# Owner-run Production deploy-user bootstrap. Cursor / Cloud Agent must not
# execute this against the live Production host. No SSH public keys, sudoers
# rules, or GitHub credentials are embedded.

set -euo pipefail

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  exit 1
}

if [[ "${COHESTRA_BOOTSTRAP_UNDER_TEST:-}" == "1" ]]; then
  refuse "test_harness_must_not_mutate_live_accounts"
fi

if [[ "$(id -u)" -ne 0 ]]; then
  refuse "must_run_as_root"
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  refuse "linux_only"
fi

HOSTNAME_NOW="$(hostname -s 2>/dev/null || hostname)"
if [[ "$HOSTNAME_NOW" == *uat* || "$HOSTNAME_NOW" == *UAT* ]]; then
  refuse "uat_hostname_forbidden"
fi
if [[ "$HOSTNAME_NOW" != "cohestra-production" && "${COHESTRA_CONFIRM_PRODUCTION_HOST:-}" != "I_UNDERSTAND" ]]; then
  refuse "hostname_is_not_cohestra-production"
fi

DEPLOY_USER="deploy"
DEPLOY_HOME="/home/deploy"
DEPLOY_PATH="/home/deploy/cohestra-production"
SSH_DIR="${DEPLOY_HOME}/.ssh"
AUTH_KEYS="${SSH_DIR}/authorized_keys"

if id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  echo "USER_STATE=exists"
else
  useradd --create-home --home-dir "$DEPLOY_HOME" --shell /bin/bash --user-group "$DEPLOY_USER"
  echo "USER_STATE=created"
fi

if [[ "$(getent passwd "$DEPLOY_USER" | awk -F: '{print $6}')" != "$DEPLOY_HOME" ]]; then
  refuse "deploy_home_must_be_/home/deploy"
fi

passwd -l "$DEPLOY_USER" >/dev/null
chage -E -1 "$DEPLOY_USER" >/dev/null || true

mkdir -p "$SSH_DIR" "$DEPLOY_PATH"
chmod 700 "$SSH_DIR"
if [[ ! -e "$AUTH_KEYS" ]]; then
  : >"$AUTH_KEYS"
fi
chmod 600 "$AUTH_KEYS"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$DEPLOY_HOME"

if [[ -e "/etc/sudoers.d/deploy" ]]; then
  refuse "unexpected_deploy_sudoers_present"
fi
if grep -RqsE '^[[:space:]]*deploy[[:space:]].*NOPASSWD' /etc/sudoers /etc/sudoers.d 2>/dev/null; then
  refuse "passwordless_sudo_forbidden"
fi

echo "RESULT=PREPARED_NOT_KEYED"
echo "DEPLOY_USER=deploy"
echo "DEPLOY_HOME=/home/deploy"
echo "DEPLOY_PATH=/home/deploy/cohestra-production"
echo "PASSWORD_AUTH=locked"
echo "PASSWORDLESS_SUDO=false"
echo "SSH_PUBLIC_KEY_INSTALLED=false"
echo "HOST_TO_GITHUB_DEPLOY_KEY=not_created"
echo
echo "OWNER ACTION REQUIRED later (Gate B, not this script):"
echo "  1. Mint a NEW Production Actions SSH key. Do not reuse owner or UAT keys."
echo "  2. Install only that public key into ${AUTH_KEYS}."
echo "  3. If the host must git fetch a private repository, mint a SEPARATE"
echo "     read-only GitHub deploy key / credential. Do not reuse the Actions"
echo "     SSH key. Those are opposite trust directions."
echo "  4. Do not grant passwordless sudo. If a later story needs a narrow"
echo "     privileged operation, authorize that operation separately."
echo
echo "Cursor must not become the Production SSH client."
