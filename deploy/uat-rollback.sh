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
  echo "DB_RESTORE_NOT_ATTEMPTED=true"
  echo "DB_MIGRATION_EFFECT=UNVERIFIED"
  echo "RECOVERY_RESTORE_READY=false"
  exit 1
}

emit_db_honesty() {
  echo "DB_RESTORE_NOT_ATTEMPTED=true"
  echo "DB_MIGRATION_EFFECT=UNVERIFIED"
  echo "RECOVERY_RESTORE_READY=false"
  echo "OWNER_ATTESTATION_REQUIRED=true"
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
emit_db_honesty

if [[ "${UAT_ROLLBACK_EXECUTE:-}" != "true" ]]; then
  echo "RESULT=HOLD"
  echo "DRY_RUN=true"
  echo "HOLD_REASON=authorized dry-run; host tree was not mutated"
  exit 0
fi

if [[ "${UAT_ROLLBACK_BACKUP_ATTESTED:-}" != "true" ]]; then
  refuse "owner must attest a current UAT backup before execute"
fi
if [[ "${UAT_ROLLBACK_COMPAT_REVIEWED:-}" != "true" ]]; then
  refuse "owner must attest previous-SHA schema compatibility before execute"
fi

if [[ "${COHESTRA_UAT_HOST_LOCK_STUB:-}" == "held" ]]; then
  refuse "UAT host mutation lock is held"
elif [[ "${COHESTRA_UAT_HOST_LOCK_STUB:-}" == "clear" ]]; then
  echo "HOST_LOCK=stubbed_clear"
elif [[ -f "$ROOT_DIR/deploy/uat-host-mutation-lock.sh" ]]; then
  bash "$ROOT_DIR/deploy/uat-host-mutation-lock.sh" actions \
    || refuse "UAT host mutation lock refused execute"
else
  refuse "UAT host mutation lock helper is missing"
fi

# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/reset-accepted-sha.sh"
DEPLOY_SHA="$ROLLBACK_SHA" reset_accepted_sha || refuse "host tree reset failed"

GIT_SHA="$ROLLBACK_SHA"
export GIT_SHA
echo "GIT_SHA=${GIT_SHA}"

if [[ "${COHESTRA_UAT_COMPOSE_STUB:-}" == "true" ]]; then
  echo "COMPOSE=stubbed"
elif [[ -x "$ROOT_DIR/deploy/uat-compose.sh" || -f "$ROOT_DIR/deploy/uat-compose.sh" ]]; then
  bash "$ROOT_DIR/deploy/uat-compose.sh" build api
  bash "$ROOT_DIR/deploy/uat-compose.sh" build web
  bash "$ROOT_DIR/deploy/uat-compose.sh" up -d --no-build
else
  refuse "isolated UAT compose helper is missing on this SHA"
fi

if [[ "${COHESTRA_UAT_POSTCHECK_STUB:-}" == "fail" ]]; then
  refuse "post-rollback acceptance failed"
elif [[ "${COHESTRA_UAT_POSTCHECK_STUB:-}" == "pass" ]]; then
  echo "POST_ROLLBACK_ACCEPTANCE=pass"
  echo "POST_ROLLBACK_SHA_MATCH=true"
elif [[ -n "${COHESTRA_UAT_POSTCHECK_STUB:-}" ]]; then
  refuse "unknown post-rollback acceptance stub"
else
  NGINX_PORT="${NGINX_HOST_PORT:-8180}"
  API_PORT="${API_HOST_PORT:-5100}"
  ready=0
  for _attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if curl -fsS --connect-timeout 3 "http://127.0.0.1:${NGINX_PORT}/ready" 2>/dev/null \
      | grep -q '"status":"Healthy"'; then
      ready=1
      break
    fi
    sleep 5
  done
  [[ "$ready" == 1 ]] || refuse "post-rollback /ready is not Healthy"
  TREE_SHA="$(git rev-parse HEAD)"
  TREE_SHA="${TREE_SHA,,}"
  [[ "$TREE_SHA" == "$ROLLBACK_SHA" ]] || refuse "post-rollback tree SHA does not match ROLLBACK_SHA"
  if [[ -f "$ROOT_DIR/deploy/uat-compose.sh" ]]; then
    API_SHA="$(
      bash "$ROOT_DIR/deploy/uat-compose.sh" exec -T api printenv GIT_SHA 2>/dev/null || true
    )"
    API_SHA="${API_SHA,,}"
    if [[ ! "$API_SHA" =~ ^[0-9a-f]{40}$ ]]; then
      refuse "post-rollback API GIT_SHA is missing"
    fi
    if [[ "$API_SHA" != "$ROLLBACK_SHA" ]]; then
      refuse "post-rollback API GIT_SHA does not match ROLLBACK_SHA"
    fi
  fi
  echo "POST_ROLLBACK_ACCEPTANCE=pass"
  echo "POST_ROLLBACK_SHA_MATCH=true"
fi

echo "RESULT=PASS"
echo "ACTION=rollback"
emit_db_honesty
