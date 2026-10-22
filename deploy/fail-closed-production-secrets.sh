#!/usr/bin/env bash
# Fail closed when required Production Environment secrets are missing.
# Never prints secret values. Prints missing NAMES only.

set -euo pipefail

required=(
  PROD_DROPLET_HOST
  PROD_DROPLET_USER
  PROD_DROPLET_SSH_KEY
  PROD_DROPLET_DEPLOY_PATH
  PROD_PUBLIC_BASE_URL
)
missing=()

for name in "${required[@]}"; do
  val="${!name:-}"
  val="${val//[[:space:]]/}"
  if [[ -z "$val" ]]; then
    missing+=("$name")
  fi
done

if ((${#missing[@]} > 0)); then
  echo "OWNER_GATE=missing_protected_secret"
  echo "ENVIRONMENT=production"
  for name in "${missing[@]}"; do
    echo "MISSING_SECRET=${name}"
  done
  echo "Configure the named secrets on GitHub Environment 'production'."
  echo "Do not paste values into chat, git, or screenshots."
  exit 1
fi

echo "PROD_DEPLOY_SECRETS=present"
echo "ENVIRONMENT=production"
for name in "${required[@]}"; do
  echo "${name}=present"
done
