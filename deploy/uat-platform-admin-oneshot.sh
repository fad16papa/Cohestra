#!/usr/bin/env bash
# One-shot UAT PlatformAdmin seed. Does not persist credentials in .env.
# Never echo secret values. Never replace the running API container.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${UAT_AUTO_LIFECYCLE_ENABLED:-}" != "true" ]]; then
  echo "REFUSE: one-shot seed requires UAT_AUTO_LIFECYCLE_ENABLED=true"
  exit 83
fi

if [[ -z "${UAT_AUTO_PLATFORM_ADMIN_EMAIL:-}" || -z "${UAT_AUTO_PLATFORM_ADMIN_PASSWORD:-}" ]]; then
  echo "OWNER_GATE=platform_admin_credentials_missing"
  exit 81
fi

if [[ ! -f "$ROOT_DIR/docker-compose.uat.yml" ]]; then
  echo "REFUSE: docker-compose.uat.yml is required"
  exit 1
fi

if grep -q 'PlatformAdminSeed__Enabled: "true"' "$ROOT_DIR/docker-compose.uat.yml"; then
  echo "REFUSE: canonical UAT compose must not permanently enable PlatformAdminSeed"
  exit 1
fi

# Name-only -e takes values from this process environment. Values are not written
# to the canonical droplet .env and are not interpolated onto the command line.
export PLATFORM_ADMIN_SEED_ONESHOT=true
export PlatformAdminSeed__Enabled=true
export PlatformAdminSeed__Email="$UAT_AUTO_PLATFORM_ADMIN_EMAIL"
export PlatformAdminSeed__Password="$UAT_AUTO_PLATFORM_ADMIN_PASSWORD"

set +e
bash "$ROOT_DIR/deploy/uat-compose.sh" run --rm --no-deps \
  -e PLATFORM_ADMIN_SEED_ONESHOT \
  -e PlatformAdminSeed__Enabled \
  -e PlatformAdminSeed__Email \
  -e PlatformAdminSeed__Password \
  api
status=$?
set -e

unset PLATFORM_ADMIN_SEED_ONESHOT PlatformAdminSeed__Enabled PlatformAdminSeed__Email PlatformAdminSeed__Password

if [[ "$status" -ne 0 ]]; then
  echo "OWNER_GATE=platform_admin_bootstrap_conflict"
  exit 79
fi

if docker exec cohestra-uat-api printenv PlatformAdminSeed__Enabled 2>/dev/null | grep -qx 'true'; then
  echo "REFUSE: running API still has PlatformAdminSeed enabled"
  exit 1
fi

echo "PLATFORM_ADMIN_BOOTSTRAP=PASS"
exit 0
