#!/usr/bin/env bash
# TDD contract for dedicated UAT previous-SHA recovery.
# Does not SSH, restore databases, or change release controls.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/uat-rollback.sh"
WF="$ROOT_DIR/.github/workflows/deploy-uat-rollback.yml"
DEPLOY_WF="$ROOT_DIR/.github/workflows/deploy.yml"
PROD_WF="$ROOT_DIR/.github/workflows/deploy-production.yml"
VALIDATE="$ROOT_DIR/deploy/validate-uat-rollback-workflow.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$SCRIPT" ]] || fail "uat-rollback.sh missing"
[[ -f "$WF" ]] || fail "deploy-uat-rollback.yml missing"
[[ -f "$VALIDATE" ]] || fail "validate-uat-rollback-workflow.sh missing"

if grep -qiE 'adcp|autonomous delivery control plane' "$SCRIPT" "$WF"; then
  fail "UAT rollback must not restore ADCP"
fi
pass "rollback does not restore ADCP"

if grep -nE '^[[:space:]]*(psql|pg_restore|pg_dump)|down -v' "$SCRIPT" "$WF"; then
  fail "rollback must not invoke database commands"
fi
pass "rollback has no database commands"

if grep -qE 'PROD_|deploy-production|cohestra-production' "$SCRIPT" "$WF"; then
  fail "UAT rollback must not reference Production"
fi
pass "rollback is isolated from Production"

# Normal Deploy UAT tip-pin must remain untouched.
if ! grep -q 'DEPLOY_SHA is not the current origin' "$DEPLOY_WF"; then
  fail "workstream A must not weaken Deploy UAT tip-pin"
fi
pass "Deploy UAT current-tip policy remains"

# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
build_provenance_fixture "$TMP/fix"
cd "$PROVENANCE_LOCAL"

run() {
  env UAT_ROLLBACK_AUTHORIZED="${UAT_ROLLBACK_AUTHORIZED:-true}" \
    UAT_ROLLBACK_CONFIRM="${UAT_ROLLBACK_CONFIRM:-UAT ROLLBACK: AUTHORIZED}" \
    UAT_ROLLBACK_EXECUTE="${UAT_ROLLBACK_EXECUTE:-false}" \
    ROLLBACK_SHA="${1:-}" \
    ORIGIN_MAIN_REF=origin/main \
    bash "$SCRIPT"
}

if out="$(ROLLBACK_SHA= UAT_ROLLBACK_AUTHORIZED=true UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' bash "$SCRIPT" 2>&1)"; then
  echo "$out"
  fail "missing SHA must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "missing SHA RESULT=REFUSE"; }
pass "missing SHA is refused"

if run "not-a-sha" >/dev/null 2>&1; then
  fail "malformed SHA must refuse"
fi
pass "malformed SHA is refused"

if UAT_ROLLBACK_AUTHORIZED=false UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' \
  ROLLBACK_SHA="$PROVENANCE_PARENT" bash "$SCRIPT" >/dev/null 2>&1; then
  fail "unauthorized rollback must refuse"
fi
pass "missing owner authorization is refused"

if UAT_ROLLBACK_AUTHORIZED=true UAT_ROLLBACK_CONFIRM='please' \
  ROLLBACK_SHA="$PROVENANCE_PARENT" bash "$SCRIPT" >/dev/null 2>&1; then
  fail "wrong confirm phrase must refuse"
fi
pass "wrong owner confirm phrase is refused"

if run "$PROVENANCE_MERGE" >/dev/null 2>&1; then
  fail "current origin/main tip must refuse (use Deploy UAT)"
fi
pass "current tip is refused"

RANDOM_SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
if run "$RANDOM_SHA" >/dev/null 2>&1; then
  fail "unknown object must refuse"
fi
pass "unknown git object is refused"

git -C "$PROVENANCE_LOCAL" checkout -q --orphan rollback-side
echo orphan >"$PROVENANCE_LOCAL/orphan"
git -C "$PROVENANCE_LOCAL" add orphan
git -C "$PROVENANCE_LOCAL" -c user.email=t@t -c user.name=t commit -q -m orphan
ORPHAN="$(git -C "$PROVENANCE_LOCAL" rev-parse HEAD)"
git -C "$PROVENANCE_LOCAL" checkout -q main
if run "$ORPHAN" >/dev/null 2>&1; then
  fail "non-ancestor commit must refuse"
fi
pass "SHA that is not an ancestor of origin/main is refused"

if UAT_ROLLBACK_AUTHORIZED=true UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' \
  ROLLBACK_SHA="$PROVENANCE_PARENT" bash "$SCRIPT" --restore-dump x >/dev/null 2>&1; then
  fail "database restore flag must refuse"
fi
if RESTORE_DUMP=x UAT_ROLLBACK_AUTHORIZED=true UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' \
  ROLLBACK_SHA="$PROVENANCE_PARENT" bash "$SCRIPT" >/dev/null 2>&1; then
  fail "RESTORE_DUMP env must refuse"
fi
if grep -nE 'bash .*remote-deploy\.sh|deploy/remote-deploy\.sh"' "$SCRIPT"; then
  fail "execute must not call remote-deploy.sh (old copies reset to origin/main)"
fi
pass "database restore is refused and remote-deploy is not used"

BEFORE="$(git rev-parse HEAD)"
out="$(run "$PROVENANCE_PARENT")" || { echo "$out"; fail "authorized dry-run should hold"; }
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "dry-run RESULT=HOLD"; }
echo "$out" | grep -q 'DRY_RUN=true' || { echo "$out"; fail "dry-run must set DRY_RUN"; }
echo "$out" | grep -q "ROLLBACK_SHA=${PROVENANCE_PARENT}" || { echo "$out"; fail "dry-run must echo SHA"; }
[[ "$(git rev-parse HEAD)" == "$BEFORE" ]] || fail "dry-run must not move HEAD"
pass "authorized dry-run holds without mutating the tree"

EXECUTE_DIR="$TMP/execute"
git clone -q "$PROVENANCE_LOCAL" "$EXECUTE_DIR"
git -C "$EXECUTE_DIR" fetch -q origin main
out="$(
  cd "$EXECUTE_DIR" &&
  UAT_ROLLBACK_AUTHORIZED=true \
  UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' \
  UAT_ROLLBACK_EXECUTE=true \
  ROLLBACK_SHA="$PROVENANCE_PARENT" \
  ORIGIN_MAIN_REF=origin/main \
  COHESTRA_UAT_COMPOSE_STUB=true \
  bash "$SCRIPT"
)" || { echo "$out"; fail "authorized execute should pass on previous SHA"; }
echo "$out" | grep -q 'RESULT=PASS' || { echo "$out"; fail "execute RESULT=PASS"; }
echo "$out" | grep -q "DEPLOYED_SHA=${PROVENANCE_PARENT}" || { echo "$out"; fail "execute must reset to previous SHA"; }
echo "$out" | grep -q 'DATABASE_MUTATED=false' || { echo "$out"; fail "execute must record DATABASE_MUTATED=false"; }
[[ "$(git -C "$EXECUTE_DIR" rev-parse HEAD)" == "$PROVENANCE_PARENT" ]] \
  || fail "execute must leave HEAD on the previous SHA"
pass "authorized execute resets host tree to a previous main SHA"

bash "$VALIDATE" || fail "workflow contract failed"
pass "rollback workflow contract"

echo "uat-rollback contract OK"
