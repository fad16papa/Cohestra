#!/usr/bin/env bash
# Dedicated UAT previous-SHA recovery. Dry-run by default.
# Does not weaken Deploy UAT tip-pin. Does not touch Production or restore DBs.
# Execute never calls remote-deploy.sh: older copies of that script reset to
# origin/main and would undo the rollback.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ORIGIN_MAIN_REF="${ORIGIN_MAIN_REF:-origin/main}"

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  exit 1
}

for arg in "$@"; do
  case "$arg" in
    --restore-dump|--restore|--restore-dump=*|up|psql|pg_restore|pg_dump)
      refuse "database restore is an owner-only decision and is not automated"
      ;;
  esac
done

if [[ -n "${RESTORE_DUMP:-}" ]]; then
  refuse "database restore is an owner-only decision and is not automated"
fi

if [[ "${UAT_ROLLBACK_AUTHORIZED:-}" != "true" ]]; then
  refuse "UAT_ROLLBACK_AUTHORIZED must be the exact string true"
fi
if [[ "${UAT_ROLLBACK_CONFIRM:-}" != "UAT ROLLBACK: AUTHORIZED" ]]; then
  refuse "owner confirm phrase must be exactly UAT ROLLBACK: AUTHORIZED"
fi

ROLLBACK_SHA="${ROLLBACK_SHA:-}"
if [[ ! "$ROLLBACK_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "ROLLBACK_SHA must be a full 40-character hexadecimal Git SHA"
fi
ROLLBACK_SHA="${ROLLBACK_SHA,,}"

if ! git rev-parse --verify "$ORIGIN_MAIN_REF" >/dev/null 2>&1; then
  refuse "origin/main is unavailable"
fi
TIP_SHA="$(git rev-parse --verify "$ORIGIN_MAIN_REF")"
TIP_SHA="${TIP_SHA,,}"

if [[ "$ROLLBACK_SHA" == "$TIP_SHA" ]]; then
  refuse "current origin/main tip must use Deploy UAT, not rollback"
fi

if ! git cat-file -e "${ROLLBACK_SHA}^{commit}" 2>/dev/null; then
  refuse "ROLLBACK_SHA is not a git commit"
fi
if ! git merge-base --is-ancestor "$ROLLBACK_SHA" "$ORIGIN_MAIN_REF"; then
  refuse "ROLLBACK_SHA is not an ancestor of origin/main"
fi

echo "ROLLBACK_SHA=${ROLLBACK_SHA}"
echo "ORIGIN_MAIN_SHA=${TIP_SHA}"
echo "DATABASE_MUTATED=false"

if [[ "${UAT_ROLLBACK_EXECUTE:-}" != "true" ]]; then
  echo "RESULT=HOLD"
  echo "DRY_RUN=true"
  echo "HOLD_REASON=authorized dry-run; host tree was not mutated"
  exit 0
fi

# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/reset-accepted-sha.sh"
DEPLOY_SHA="$ROLLBACK_SHA" reset_accepted_sha || refuse "host tree reset failed"

if [[ "${COHESTRA_UAT_COMPOSE_STUB:-}" == "true" ]]; then
  echo "COMPOSE=stubbed"
elif [[ -x "$ROOT_DIR/deploy/uat-compose.sh" || -f "$ROOT_DIR/deploy/uat-compose.sh" ]]; then
  bash "$ROOT_DIR/deploy/uat-compose.sh" up -d --build
else
  refuse "isolated UAT compose helper is missing on this SHA"
fi

echo "RESULT=PASS"
echo "ACTION=rollback"
echo "DATABASE_MUTATED=false"
