#!/usr/bin/env bash
# Explicit Production rollback. No implicit previous SHA. No DB restore.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  exit 1
}

for arg in "$@"; do
  case "$arg" in
    --restore-dump|--restore)
      echo "NOT_IMPLEMENTED_46_5"
      refuse "database restore is Story 46.5"
      ;;
    --restore-dump=*)
      echo "NOT_IMPLEMENTED_46_5"
      refuse "database restore is Story 46.5"
      ;;
  esac
done

if [[ -n "${RESTORE_DUMP:-}" ]]; then
  echo "NOT_IMPLEMENTED_46_5"
  refuse "RESTORE_DUMP is forbidden"
fi

ROLLBACK_SHA="${ROLLBACK_SHA:-${DEPLOY_SHA:-}}"
LEDGER="${COHESTRA_ACCEPTED_SHA_LEDGER:-/var/lib/cohestra-production/accepted-sha}"

if [[ ! "$ROLLBACK_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "ROLLBACK_SHA must be a full 40-character hexadecimal Git SHA"
fi
ROLLBACK_SHA="${ROLLBACK_SHA,,}"

if [[ ! -f "$LEDGER" ]]; then
  refuse "accepted-SHA ledger is missing"
fi
if ! grep -qx "$ROLLBACK_SHA" "$LEDGER"; then
  refuse "ROLLBACK_SHA is not a previously accepted SHA"
fi

export DEPLOY_SHA="$ROLLBACK_SHA"
# Provenance is Actions-side (GITHUB_TOKEN). The droplet must not receive a token.
if [[ -n "${COHESTRA_GH_API_MOCK:-}" || -n "${GITHUB_TOKEN:-}" || -n "${GH_TOKEN:-}" ]]; then
  bash "$ROOT_DIR/deploy/validate-production-provenance.sh" >/dev/null
fi
bash "$ROOT_DIR/deploy/reset-production-sha.sh" >/dev/null
bash "$ROOT_DIR/deploy/production-remote-deploy.sh" >/dev/null

echo "RESULT=PASS"
echo "ACTION=rollback"
echo "ROLLBACK_SHA=${ROLLBACK_SHA}"
echo "DATABASE_MUTATED=false"
echo "COMPOSE_UP=false"
