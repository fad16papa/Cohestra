#!/usr/bin/env bash
# Fail closed when required UAT Environment secrets are missing.
# Never prints secret values. Prints missing NAMES only.
#
# Expected environment (set by GitHub Actions from Environment `uat`):
#   DROPLET_HOST, DROPLET_USER, DROPLET_SSH_KEY  (required)
#   DROPLET_DEPLOY_PATH                          (optional)
#
# Usage: bash deploy/fail-closed-uat-secrets.sh

set -euo pipefail

required=(DROPLET_HOST DROPLET_USER DROPLET_SSH_KEY)
missing=()

for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
done

if ((${#missing[@]} > 0)); then
  echo "OWNER_GATE=missing_protected_secret"
  echo "ENVIRONMENT=uat"
  for name in "${missing[@]}"; do
    echo "MISSING_SECRET=${name}"
  done
  echo "Configure the named secrets on GitHub Environment 'uat'."
  echo "Do not paste values into chat, git, or screenshots."
  exit 1
fi

echo "UAT_DEPLOY_SECRETS=present"
echo "ENVIRONMENT=uat"
if [[ -z "${DROPLET_DEPLOY_PATH:-}" ]]; then
  echo "DROPLET_DEPLOY_PATH=default"
else
  echo "DROPLET_DEPLOY_PATH=present"
fi
