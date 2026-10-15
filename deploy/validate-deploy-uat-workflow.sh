#!/usr/bin/env bash
# Repo-side contract for the UAT deploy workflow. Does not talk to the droplet.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT_DIR/.github/workflows/deploy.yml"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if [[ ! -f "$WF" ]]; then
  echo "Missing $WF" >&2
  exit 1
fi

echo "== Deploy UAT workflow contract =="

if grep -qE 'group:[[:space:]]*deploy-uat' "$WF"; then
  pass "concurrency group is deploy-uat"
else
  fail "concurrency group must be deploy-uat"
fi

if grep -qE 'group:[[:space:]]*deploy-production' "$WF"; then
  fail "deploy-production concurrency is forbidden on the UAT path"
else
  pass "deploy-production concurrency is absent"
fi

if grep -qE 'environment:[[:space:]]*uat' "$WF"; then
  pass "job uses environment uat"
else
  fail "job must use environment: uat"
fi

if grep -q 'fail-closed-uat-secrets.sh' "$WF"; then
  pass "fail-closed secret check is invoked"
else
  fail "workflow must run deploy/fail-closed-uat-secrets.sh"
fi

if grep -q 'remote-deploy.sh' "$WF"; then
  pass "on-host entry remains remote-deploy.sh"
else
  fail "workflow must call deploy/remote-deploy.sh"
fi

if grep -q 'workflow_run.head_sha' "$WF"; then
  pass "workflow_run uses head_sha"
else
  fail "workflow_run must pin github.event.workflow_run.head_sha"
fi

if grep -q 'secrets.DROPLET_DEPLOY_PATH' "$WF" && grep -A2 'script:' "$WF" | grep -q 'secrets.DROPLET_DEPLOY_PATH'; then
  fail "DROPLET_DEPLOY_PATH must not be interpolated into the SSH script body"
else
  pass "DROPLET_DEPLOY_PATH is not interpolated into the SSH script body"
fi

if grep -q 'envs: DROPLET_DEPLOY_PATH' "$WF"; then
  pass "DROPLET_DEPLOY_PATH passed via appleboy envs"
else
  fail "appleboy must receive DROPLET_DEPLOY_PATH via envs"
fi

if grep -q 'uat-deploy-dispatch' "$WF"; then
  pass "dispatch evidence artifact is uploaded"
else
  fail "workflow must upload uat-deploy-dispatch evidence"
fi

echo "Passed: ${PASS} | Failed: ${FAIL}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
