#!/usr/bin/env bash
# Owner-workstation SSH acceptance for Epic 19.1.
# Proves key-based login and real deploy capabilities.
# Never prints private key, passphrase, or Linux password material.
#
# NOPASSWD: ALL is NOT required. Interactive sudo + Docker group is enough.
#
# On the OWNER workstation (not a Cloud Agent VM):
#   eval "$(ssh-agent -s)"
#   ssh-add ~/.ssh/cohestra_uat          # or cohestra_uat_v2 — enter passphrase locally
#   UAT_SSH_USER=deploy bash deploy/uat-ssh-accept.sh
#
# Optional:
#   UAT_SSH_HOST=129.212.235.2
#   UAT_SSH_KEY=$HOME/.ssh/cohestra_uat

set -euo pipefail

HOST="${UAT_SSH_HOST:-129.212.235.2}"
USER_NAME="${UAT_SSH_USER:-deploy}"
KEY="${UAT_SSH_KEY:-$HOME/.ssh/cohestra_uat}"
PUB="${KEY}.pub"

PASS=0
FAIL=0
WARN=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }
warn() { echo "WARN: $1"; WARN=$((WARN + 1)); }

echo "== Cohestra UAT SSH acceptance =="
echo "Host: $HOST"
echo "Key path: $KEY (contents not printed)"
echo ""

if [[ -z "$USER_NAME" ]]; then
  fail "UAT_SSH_USER is required (non-root deploy user). Do not use root."
  echo "Example: UAT_SSH_USER=deploy bash deploy/uat-ssh-accept.sh"
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
  if git -C "$root" ls-files | grep -E '(^|/)\.ssh/|(^|/)id_rsa$|(^|/)id_ed25519$|(^|/)cohestra_uat(_v[0-9]+)?$' >/dev/null; then
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
if [[ "$remote_user" == "root" || -z "$remote_user" ]]; then
  fail "Remote identity must be a non-root deploy user"
else
  pass "Remote user is non-root ($remote_user)"
fi

remote_groups=$("${ssh_base[@]}" "${USER_NAME}@${HOST}" 'groups' | tr -d '\r')
if echo "$remote_groups" | grep -qw sudo; then
  pass "sudo group membership (interactive sudo is enough; NOPASSWD: ALL not required)"
else
  fail "Remote user is not in group sudo"
fi
if echo "$remote_groups" | grep -qw docker; then
  pass "docker group membership"
else
  fail "Remote user is not in group docker"
fi

# Optional: passwordless sudo is convenient, not a gate.
if "${ssh_base[@]}" "${USER_NAME}@${HOST}" 'sudo -n true' >/dev/null 2>&1; then
  pass "Passwordless sudo available (optional)"
else
  warn "sudo -n failed — interactive sudo is accepted. Do not enable NOPASSWD: ALL for this gate."
fi

if "${ssh_base[@]}" "${USER_NAME}@${HOST}" 'docker ps >/dev/null'; then
  pass "Docker daemon access without sudo"
else
  fail "docker ps failed without sudo"
fi

if "${ssh_base[@]}" "${USER_NAME}@${HOST}" 'docker compose version >/dev/null'; then
  pass "Docker Compose available"
else
  fail "docker compose is missing"
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
  fail "authorized_keys permissions $remote_auth (want 600 or 644)"
fi

echo ""
echo "=== Summary ==="
echo "Passed: $PASS  Failed: $FAIL  Warnings: $WARN"
echo "DigitalOcean console remains the recovery path if SSH is locked out."
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "SSH acceptance PASS — Story 19.1 may continue on the droplet as $USER_NAME."
