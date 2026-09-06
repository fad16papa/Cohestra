#!/usr/bin/env bash
# Owner-workstation SSH acceptance for Epic 19.1.
# Proves key-based login. Never prints private key or passphrase material.
#
# On the OWNER workstation (not a Cloud Agent VM):
#   eval "$(ssh-agent -s)"
#   ssh-add ~/.ssh/cohestra_uat          # enter passphrase locally
#   UAT_SSH_USER=YOUR_DEPLOY_USER bash deploy/uat-ssh-accept.sh
#
# Optional:
#   UAT_SSH_HOST=129.212.235.2
#   UAT_SSH_KEY=$HOME/.ssh/cohestra_uat

set -euo pipefail

HOST="${UAT_SSH_HOST:-129.212.235.2}"
USER_NAME="${UAT_SSH_USER:-}"
KEY="${UAT_SSH_KEY:-$HOME/.ssh/cohestra_uat}"
PUB="${KEY}.pub"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "== Cohestra UAT SSH acceptance =="
echo "Host: $HOST"
echo "Key path: $KEY (contents not printed)"
echo ""

if [[ -z "$USER_NAME" ]]; then
  fail "UAT_SSH_USER is required (non-root deploy user). Do not use root."
  echo "Example: UAT_SSH_USER=ubuntu bash deploy/uat-ssh-accept.sh"
  exit 1
fi

if [[ "$USER_NAME" == "root" ]]; then
  fail "Deploy user must be non-root"
  exit 1
fi

if [[ ! -f "$KEY" ]]; then
  fail "Private key file missing at path (not reading contents)"
else
  pass "Private key file PRESENT"
  perms=$(stat -c '%a' "$KEY" 2>/dev/null || stat -f '%OLp' "$KEY")
  if [[ "$perms" == "600" || "$perms" == "400" ]]; then
    pass "Private key permissions $perms"
  else
    fail "Private key permissions are $perms (want 600 or 400)"
  fi
fi

if [[ ! -f "$PUB" ]]; then
  fail "Public key file missing at ${PUB}"
else
  pass "Public key file PRESENT"
fi

if git rev-parse --show-toplevel >/dev/null 2>&1; then
  root=$(git rev-parse --show-toplevel)
  if git -C "$root" ls-files | grep -E '(^|/)\.ssh/|id_rsa|id_ed25519|cohestra_uat$' >/dev/null; then
    fail "SSH private key path is tracked in git"
  else
    pass "No private key tracked in this repository"
  fi
fi

if ! command -v ssh >/dev/null; then
  fail "ssh client missing"
  exit 1
fi

ssh_base=(ssh -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=8 -i "$KEY")

if ! "${ssh_base[@]}" "${USER_NAME}@${HOST}" 'true' >/dev/null 2>&1; then
  fail "Key-based login failed (BatchMode). Add the key to ssh-agent, then retry:"
  echo "  eval \"\$(ssh-agent -s)\""
  echo "  ssh-add $KEY"
  echo "  UAT_SSH_USER=$USER_NAME bash deploy/uat-ssh-accept.sh"
  echo "PASS=$PASS FAIL=$FAIL"
  exit 1
fi
pass "Key-based login succeeded"

remote_user=$("${ssh_base[@]}" "${USER_NAME}@${HOST}" 'whoami' | tr -d '\r')
if [[ "$remote_user" == "root" ]]; then
  fail "Remote identity is root"
else
  pass "Remote user is non-root"
fi

if "${ssh_base[@]}" "${USER_NAME}@${HOST}" 'sudo -n true' >/dev/null 2>&1; then
  pass "Passwordless sudo available"
else
  fail "sudo -n failed — deploy user needs required sudo without an interactive root password in scripts"
fi

if ! "${ssh_base[@]}" "${USER_NAME}@${HOST}" 'true' >/dev/null 2>&1; then
  fail "Reconnect failed"
else
  pass "Reconnect succeeded"
fi

remote_auth=$("${ssh_base[@]}" "${USER_NAME}@${HOST}" 'stat -c %a ~/.ssh/authorized_keys 2>/dev/null || echo missing')
if [[ "$remote_auth" == "600" || "$remote_auth" == "644" ]]; then
  pass "authorized_keys permissions $remote_auth"
elif [[ "$remote_auth" == "missing" ]]; then
  fail "authorized_keys missing on server"
else
  fail "authorized_keys permissions $remote_auth (want 600)"
fi

echo ""
echo "=== Summary ==="
echo "Passed: $PASS  Failed: $FAIL"
echo "DigitalOcean console remains the recovery path if SSH is locked out."
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "SSH acceptance PASS — Story 19.1 may continue from the owner workstation."
