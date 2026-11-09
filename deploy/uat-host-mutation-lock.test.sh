#!/usr/bin/env bash
# TDD contract for the shared UAT host mutation lock. No live dispatch or SSH.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT_DIR/deploy/uat-host-mutation-lock.sh"
WF="$ROOT_DIR/.github/workflows/deploy-uat-rollback.yml"
DEPLOY_WF="$ROOT_DIR/.github/workflows/deploy.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -x "$LOCK" || -f "$LOCK" ]] || fail "uat-host-mutation-lock.sh missing"
[[ -f "$WF" ]] || fail "rollback workflow missing"

if grep -qE 'group:[[:space:]]*deploy-uat-rollback' "$WF"; then
  fail "independent rollback concurrency permits overlap with Deploy UAT"
fi
grep -qE 'group:[[:space:]]*deploy-uat$' "$WF" \
  || fail "rollback must share the deploy-uat host mutation concurrency group"
grep -q 'cancel-in-progress: false' "$WF" \
  || fail "shared lock must not cancel an in-flight Deploy UAT"
grep -qE 'group:[[:space:]]*deploy-uat$' "$DEPLOY_WF" \
  || fail "Deploy UAT concurrency group must remain deploy-uat"
if grep -qE 'group:[[:space:]]*deploy-production' "$WF"; then
  fail "must not share Production concurrency"
fi
grep -q 'uat-host-mutation-lock.sh' "$WF" \
  || fail "execute path must call the Actions-side host mutation lock"
grep -q 'flock' "$WF" || fail "droplet execute must take a host flock"
pass "shared deploy-uat lock is declared and Production stays isolated"

if out="$(GITHUB_REPOSITORY= UAT_HOST_LOCK_RUNS_JSON='{"workflow_runs":[]}' bash "$LOCK" actions 2>&1)"; then
  echo "$out"
  fail "missing repository must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "missing repository RESULT=REFUSE"; }
pass "actions lock refuses without GITHUB_REPOSITORY"

if out="$(
  GITHUB_REPOSITORY=fad16papa/Cohestra \
  GITHUB_RUN_ID=99 \
  UAT_HOST_LOCK_RUNS_JSON='{"workflow_runs":[{"id":1,"path":".github/workflows/deploy.yml","status":"in_progress"}]}' \
  bash "$LOCK" actions 2>&1
)"; then
  echo "$out"
  fail "in-progress Deploy UAT must refuse rollback"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "overlap RESULT=REFUSE"; }
echo "$out" | grep -q 'HOST_LOCK=held' || { echo "$out"; fail "overlap HOST_LOCK=held"; }
pass "in-progress Deploy UAT is refused"

if out="$(
  GITHUB_REPOSITORY=fad16papa/Cohestra \
  GITHUB_RUN_ID=99 \
  UAT_HOST_LOCK_RUNS_JSON='{"workflow_runs":[{"id":2,"path":".github/workflows/deploy-uat-rollback.yml","event":"workflow_dispatch","status":"queued"}]}' \
  bash "$LOCK" actions 2>&1
)"; then
  echo "$out"
  fail "queued sibling rollback must refuse"
fi
pass "queued sibling rollback is refused"

out="$(
  GITHUB_REPOSITORY=fad16papa/Cohestra \
  GITHUB_RUN_ID=7 \
  UAT_HOST_LOCK_RUNS_JSON='{"workflow_runs":[{"id":7,"path":".github/workflows/deploy-uat-rollback.yml","event":"workflow_dispatch","status":"in_progress"},{"id":8,"path":".github/workflows/deploy.yml","status":"completed"}]}' \
  bash "$LOCK" actions
)" || { echo "$out"; fail "this run and completed Deploy UAT must be clear"; }
echo "$out" | grep -q 'HOST_LOCK=clear' || { echo "$out"; fail "clear lock token"; }
pass "this run is excluded and completed Deploy UAT is not a conflict"

out="$(
  GITHUB_REPOSITORY=fad16papa/Cohestra \
  GITHUB_RUN_ID=7 \
  UAT_HOST_LOCK_RUNS_JSON='{"workflow_runs":[{"id":11,"path":".github/workflows/deploy-uat-rollback.yml","event":"push","status":"in_progress"},{"id":12,"path":".github/workflows/deploy-uat-rollback.yml","event":"pull_request","status":"queued"}]}' \
  bash "$LOCK" actions
)" || { echo "$out"; fail "push/PR readiness runs must not hold the host lock"; }
echo "$out" | grep -q 'HOST_LOCK=clear' || { echo "$out"; fail "push/PR lock token"; }
pass "push/PR rollback readiness runs are not host mutators"

out="$(
  GITHUB_REPOSITORY=fad16papa/Cohestra \
  GITHUB_RUN_ID=7 \
  UAT_HOST_LOCK_RUNS_JSON='{"workflow_runs":[{"id":9,"path":".github/workflows/deploy-production.yml","status":"in_progress"}]}' \
  bash "$LOCK" actions
)" || { echo "$out"; fail "Production runs must not hold the UAT lock"; }
echo "$out" | grep -q 'HOST_LOCK=clear' || { echo "$out"; fail "Production isolation"; }
pass "Production workflow runs do not hold the UAT lock"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
LOCK_A="$TMP/host.lock"
UAT_HOST_LOCK_FILE="$LOCK_A" UAT_HOST_LOCK_HOLD_SECONDS=3 bash "$LOCK" host &
HOLDER=$!
sleep 0.3
if out="$(UAT_HOST_LOCK_FILE="$LOCK_A" bash "$LOCK" host 2>&1)"; then
  kill "$HOLDER" >/dev/null 2>&1 || true
  wait "$HOLDER" >/dev/null 2>&1 || true
  echo "$out"
  fail "second host flock must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; kill "$HOLDER" >/dev/null 2>&1 || true; fail "held flock RESULT=REFUSE"; }
kill "$HOLDER" >/dev/null 2>&1 || true
wait "$HOLDER" >/dev/null 2>&1 || true
pass "host flock refuses a second mutator"

REMOTE="$ROOT_DIR/deploy/remote-deploy.sh"
HELD="$TMP/remote.lock"
flock -n "$HELD" -c "sleep 3" &
REMOTE_HOLDER=$!
sleep 0.3
if out="$(UAT_HOST_LOCK_FILE="$HELD" bash "$REMOTE" 2>&1)"; then
  kill "$REMOTE_HOLDER" >/dev/null 2>&1 || true
  wait "$REMOTE_HOLDER" >/dev/null 2>&1 || true
  echo "$out"
  fail "remote-deploy must refuse while the UAT host lock is held"
fi
echo "$out" | grep -q 'REFUSE: UAT host mutation lock is held' \
  || { echo "$out"; kill "$REMOTE_HOLDER" >/dev/null 2>&1 || true; fail "remote-deploy lock refusal"; }
kill "$REMOTE_HOLDER" >/dev/null 2>&1 || true
wait "$REMOTE_HOLDER" >/dev/null 2>&1 || true
pass "remote-deploy shares the UAT host mutation lock"

if grep -qiE 'adcp|workflow_dispatch:.*true' "$LOCK"; then
  fail "lock helper must not dispatch or restore ADCP"
fi
if grep -q 'PROD_' "$LOCK"; then
  fail "lock helper must not reference Production secrets"
fi
pass "lock helper stays read-only and UAT-scoped"

echo "uat-host-mutation-lock contract OK"
