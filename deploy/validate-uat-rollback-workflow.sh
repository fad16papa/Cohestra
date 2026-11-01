#!/usr/bin/env bash
# Static contract for the dedicated UAT rollback workflow. No live SSH.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT_DIR/.github/workflows/deploy-uat-rollback.yml"
DEPLOY_WF="$ROOT_DIR/.github/workflows/deploy.yml"
PROD_WF="$ROOT_DIR/.github/workflows/deploy-production.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$WF" ]] || fail "deploy-uat-rollback.yml missing"

grep -qE '^name:[[:space:]]*UAT rollback' "$WF" || fail "workflow name must be UAT rollback"
grep -qE '^[[:space:]]*workflow_dispatch:' "$WF" || fail "workflow_dispatch is required"

for key in push pull_request pull_request_target workflow_run workflow_call repository_dispatch schedule release deployment; do
  if grep -qE "^[[:space:]]*${key}:" "$WF"; then
    fail "forbidden trigger ${key} is present"
  fi
done
pass "workflow_dispatch only"

grep -q 'UAT ROLLBACK: AUTHORIZED' "$WF" || fail "owner confirm phrase missing"
grep -q 'UAT_ROLLBACK_AUTHORIZED' "$WF" || fail "script authorization env missing"
grep -q 'default: false' "$WF" || fail "execute must default false"
grep -q 'environment: uat' "$WF" || fail "Environment uat required for SSH path"
grep -q 'persist-credentials: false' "$WF" || fail "persist-credentials: false required"
grep -q 'fail-closed-uat-secrets.sh' "$WF" || fail "fail-closed UAT secrets required before SSH"
grep -q 'refs/heads/main' "$WF" || fail "non-main dispatch must be refused"
grep -q 'github.sha' "$WF" || fail "runner helpers must come from the dispatch SHA"
if grep -q 'needs.validate.outputs.rollback_sha' "$WF" && grep -A2 'Checkout dispatch SHA' "$WF" | grep -q 'rollback_sha'; then
  fail "execute job must not checkout the rollback SHA for runner helpers"
fi
if grep -A20 'Rollback previous SHA over SSH' "$WF" | grep -q 'bash deploy/uat-rollback.sh'; then
  fail "droplet SSH must be inline; old trees do not have uat-rollback.sh"
fi
grep -q 'bash deploy/uat-compose.sh build api' "$WF" || fail "host rebuild must build api first"
grep -q 'bash deploy/uat-compose.sh build web' "$WF" || fail "host rebuild must build web second"
grep -q 'bash deploy/uat-compose.sh up -d --no-build' "$WF" || fail "host rebuild must up --no-build after sequential builds"
if grep -q 'up -d --build' "$WF"; then
  fail "parallel up -d --build OOMs the UAT droplet"
fi
if grep -q 'remote-deploy.sh' "$WF"; then
  fail "workflow must not call remote-deploy.sh"
fi
if grep -q "inputs.execute && inputs.confirm == 'UAT ROLLBACK: AUTHORIZED'" "$WF"; then
  pass "SSH is gated on execute + confirm"
else
  fail "SSH must be gated on execute and confirm phrase"
fi

if grep -qE 'group:[[:space:]]*deploy-production' "$WF"; then
  fail "must not use deploy-production concurrency"
fi
if grep -qE 'group:[[:space:]]*deploy-uat$' "$WF"; then
  fail "must not share Deploy UAT concurrency"
fi
grep -qE 'group:[[:space:]]*deploy-uat-rollback' "$WF" || fail "concurrency must be deploy-uat-rollback"
pass "concurrency isolated"

if grep -q 'UAT_DEPLOY_GATE_ACTIVE' "$WF"; then
  fail "rollback must not change or require UAT_DEPLOY_GATE_ACTIVE"
fi
if grep -qE 'PROD_|deploy-production.yml' "$WF"; then
  fail "rollback workflow must not reference Production"
fi
if ! grep -q 'DEPLOY_SHA is not the current origin' "$DEPLOY_WF"; then
  fail "Deploy UAT tip-pin must remain"
fi
if ! grep -qE '^[[:space:]]*workflow_dispatch:' "$PROD_WF"; then
  fail "Production must remain workflow_dispatch only"
fi
pass "Production and Deploy UAT gates unchanged"

echo "uat-rollback workflow contract OK"
