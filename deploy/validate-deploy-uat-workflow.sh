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

if grep -q 'envs: DROPLET_DEPLOY_PATH,DEPLOY_SHA' "$WF"; then
  pass "DROPLET_DEPLOY_PATH and DEPLOY_SHA passed via appleboy envs"
else
  fail "appleboy must receive DROPLET_DEPLOY_PATH and DEPLOY_SHA via envs"
fi

if grep -q 'DEPLOY_SHA: ${{ env.TARGET_SHA }}' "$WF" || grep -q 'DEPLOY_SHA: \${{ env.TARGET_SHA }}' "$WF"; then
  pass "DEPLOY_SHA is the accepted TARGET_SHA"
else
  fail "workflow must set DEPLOY_SHA from TARGET_SHA"
fi

if grep -q 'uat-deploy-dispatch' "$WF"; then
  pass "dispatch evidence artifact is uploaded"
else
  fail "workflow must upload uat-deploy-dispatch evidence"
fi

if grep -q 'fetch-uat-acceptance.sh' "$WF"; then
  pass "host acceptance JSON is fetched"
else
  fail "workflow must fetch uat-acceptance.json"
fi

if grep -q 'public-uat-smoke.sh' "$WF"; then
  pass "public UAT smoke is invoked"
else
  fail "workflow must run public-uat-smoke.sh"
fi

if grep -q 'uat-acceptance.json' "$WF" && grep -q 'uat-public-smoke.json' "$WF"; then
  pass "acceptance and public-smoke artifacts are listed"
else
  fail "workflow must upload uat-acceptance.json and uat-public-smoke.json"
fi

if grep -q 'TARGET_SHA:' "$WF" && grep -q 'workflow_run.head_sha' "$WF"; then
  pass "TARGET_SHA is derived for workflow_run"
else
  fail "workflow must define TARGET_SHA from workflow_run.head_sha"
fi

if grep -q 'TARGET_SHA must be a full 40-character hexadecimal Git SHA' "$WF"; then
  pass "runner refuses a missing or non-40-character TARGET_SHA"
else
  fail "workflow must fail closed if TARGET_SHA is not a 40-character SHA"
fi

if grep -qE 'workflow_run\.head_sha \|\| github\.sha' "$WF"; then
  fail "workflow_run TARGET_SHA must not fall back to github.sha"
else
  pass "workflow_run TARGET_SHA does not fall back to github.sha"
fi

if grep -q 'TARGET_SHA must equal workflow_run.head_sha' "$WF"; then
  pass "workflow_run TARGET_SHA is bound to head_sha"
else
  fail "workflow_run must refuse TARGET_SHA that is not head_sha"
fi

if grep -q 'EXPECTED_SHA' "$WF" && grep -q 'EXPECTED_SHA != DEPLOYED_SHA' "$WF"; then
  pass "post-deploy EXPECTED_SHA == DEPLOYED_SHA is asserted"
else
  fail "workflow must emit and assert EXPECTED_SHA == DEPLOYED_SHA"
fi

if grep -q 'autonomous UAT deploy requires a 40-character DEPLOY_SHA' "$WF"; then
  pass "Actions path refuses an empty or non-40-character DEPLOY_SHA"
else
  fail "Actions must never deploy an unpinned branch tip"
fi

if grep -q 'reset --hard origin/main' "$WF" || grep -q 'reset --hard "origin/$DEPLOY_BRANCH"' "$WF"; then
  fail "workflow SSH script must not reset to a branch tip"
else
  pass "workflow SSH script does not reset to origin/main"
fi

if awk '
  /script: \|/ { in_script=1 }
  in_script && /git reset --hard "\$DEPLOY_SHA"/ { reset=NR }
  in_script && /bash deploy\/remote-deploy.sh/ { deploy=NR }
  END { exit(reset && deploy && reset < deploy ? 0 : 1) }
' "$WF"; then
  pass "SSH pins DEPLOY_SHA before invoking on-disk remote-deploy.sh"
else
  fail "workflow must git reset --hard DEPLOY_SHA before remote-deploy.sh"
fi

if grep -q 'DEPLOY_PATH="/home/deploy/cohestra"' "$WF"; then
  pass "SSH default path matches the documented deploy user home"
else
  fail "workflow default DROPLET_DEPLOY_PATH must be /home/deploy/cohestra"
fi

if grep -q 'removed secret-like' "$WF"; then
  pass "secret-like evidence is removed before artifact upload"
else
  fail "workflow must delete secret-like evidence files before upload"
fi

if grep -q 'uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262' "$WF" \
  && grep -q 'uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02' "$WF" \
  && grep -q 'uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093' "$WF" \
  && grep -q 'uses: appleboy/ssh-action@2ead5e36573f08b82fbfce1504f1a4b05a647c6f' "$WF" \
  && grep -q 'uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020' "$WF"; then
  pass "deploy actions are pinned to reviewed commit SHAs"
else
  fail "deploy.yml actions must be pinned to exact commit SHAs"
fi

if grep -E 'uses: (actions/checkout|actions/upload-artifact|actions/download-artifact|actions/setup-node|appleboy/ssh-action)@v' "$WF"; then
  fail "deploy.yml must not use mutable action version tags"
else
  pass "deploy.yml does not use mutable action version tags"
fi

if grep -q 'name: UAT browser acceptance' "$WF" && grep -q 'test:e2e:uat' "$WF"; then
  pass "Deploy UAT runs the UAT Playwright harness after deploy"
else
  fail "workflow must run npm run test:e2e:uat after a successful deploy"
fi

if grep -q 'UAT_AUTO_BASIC_EMAIL' "$WF" && grep -q 'UAT_AUTO_PRO_EMAIL' "$WF" \
  && grep -q 'UAT_AUTO_PRO_PASSWORD' "$WF"; then
  pass "browser job receives Basic and Pro operator aliases"
else
  fail "browser job must pass UAT_AUTO_BASIC_* and UAT_AUTO_PRO_* aliases"
fi

if grep -q 'name: UAT acceptance summary' "$WF" && grep -q 'uat-acceptance-summary.sh' "$WF"; then
  pass "Deploy UAT builds acceptance-summary.json after deploy and browser"
else
  fail "workflow must run deploy/uat-acceptance-summary.sh after deploy and browser"
fi

if grep -q 'acceptance-summary.json' "$WF"; then
  pass "acceptance-summary.json is uploaded"
else
  fail "workflow must upload acceptance-summary.json"
fi

echo "Passed: ${PASS} | Failed: ${FAIL}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
