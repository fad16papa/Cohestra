#!/usr/bin/env bash
# Repo-side contract for the Production deploy workflow. Does not talk to the droplet.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT_DIR/.github/workflows/deploy-production.yml"
UAT="$ROOT_DIR/.github/workflows/deploy.yml"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if [[ ! -f "$WF" ]]; then
  echo "Missing $WF" >&2
  exit 1
fi

echo "== Deploy Production workflow contract =="

if grep -qE '^name:[[:space:]]*Deploy Production[[:space:]]*$' "$WF"; then
  pass "workflow name is Deploy Production"
else
  fail "workflow name must be Deploy Production"
fi

if grep -qE '^[[:space:]]*workflow_dispatch:' "$WF"; then
  pass "workflow_dispatch is present"
else
  fail "only workflow_dispatch may trigger Production"
fi

if grep -qE '^on:[[:space:]]*\[' "$WF"; then
  fail "on: list form is forbidden; use workflow_dispatch only"
else
  pass "on: list form is absent"
fi

for key in push pull_request pull_request_target workflow_run workflow_call repository_dispatch schedule release deployment; do
  if grep -qE "^[[:space:]]*${key}:" "$WF"; then
    fail "forbidden trigger ${key} is present"
  else
    pass "forbidden trigger ${key} is absent"
  fi
done

if grep -qE 'deploy_sha:' "$WF" && ! grep -qE 'default:.*[0-9a-fA-F]{7,}' "$WF"; then
  pass "deploy_sha has no implicit default SHA"
else
  fail "deploy_sha must be required without a default SHA"
fi

if grep -qE 'github\.sha' "$WF"; then
  fail "workflow must not deploy github.sha"
else
  pass "github.sha is not a deploy target"
fi

if grep -qE 'group:[[:space:]]*deploy-production' "$WF" \
  && grep -qE 'cancel-in-progress:[[:space:]]*false' "$WF"; then
  pass "concurrency is deploy-production with cancel-in-progress false"
else
  fail "concurrency must be deploy-production / cancel-in-progress: false"
fi

if grep -q 'refs/heads/main' "$WF" && grep -q 'Refuse non-main dispatch' "$WF"; then
  pass "non-main dispatch is refused"
else
  fail "workflow must fail closed unless dispatched from main"
fi

if grep -qE 'group:[[:space:]]*deploy-uat' "$WF"; then
  fail "UAT concurrency must not appear on Production workflow"
else
  pass "deploy-uat concurrency is absent"
fi

for perm in 'contents: read' 'actions: read' 'checks: read' 'pull-requests: read'; do
  if grep -qE "$perm" "$WF"; then
    pass "permission ${perm}"
  else
    fail "missing permission ${perm}"
  fi
done

for perm in 'contents: write' 'actions: write' 'checks: write' 'pull-requests: write' 'id-token: write'; do
  if grep -qE "$perm" "$WF"; then
    fail "write permission ${perm} is forbidden"
  else
    pass "write permission ${perm} is absent"
  fi
done

job_has_production_env() {
  local file="$1"
  local job="$2"
  awk -v job="$job" '
    $0 ~ "^  " job ":" { in_j=1; next }
    in_j && $0 ~ /^  [a-zA-Z0-9_-]+:/ { in_j=0 }
    in_j && $0 ~ /^    environment:/ {
      env_lines++
      if ($0 ~ /^    environment:[[:space:]]*production[[:space:]]*$/) found=1
      else other=1
    }
    END { exit (found && env_lines==1 && !other) ? 0 : 1 }
  ' "$file"
}

if job_has_production_env "$WF" "validate-sha"; then
  fail "validate-sha must not use environment: production"
else
  pass "validate-sha has no Environment production"
fi

if job_has_production_env "$WF" "deploy"; then
  pass "deploy job has environment: production"
else
  fail "deploy job must declare environment: production"
fi

if job_has_production_env "$WF" "rollback"; then
  pass "rollback job has environment: production"
else
  fail "rollback job must declare environment: production"
fi

strip_job_environment() {
  local job="$1"
  awk -v job="$job" '
    $0 ~ "^  " job ":" { in_j=1 }
    in_j && $0 ~ /^  [a-zA-Z0-9_-]+:/ && $0 !~ "^  " job ":" { in_j=0 }
    in_j && $0 ~ /^[[:space:]]+environment:[[:space:]]*production[[:space:]]*$/ { next }
    { print }
  '
}

copy="$(mktemp)"
trap 'rm -f "$copy"' EXIT
strip_job_environment deploy <"$WF" >"$copy"
if job_has_production_env "$copy" deploy; then
  fail "contract must detect deploy missing environment: production"
else
  pass "deploy missing environment production is detected"
fi
if ! job_has_production_env "$copy" rollback; then
  fail "stripping deploy environment must not drop rollback environment"
fi

strip_job_environment rollback <"$WF" >"$copy"
if job_has_production_env "$copy" rollback; then
  fail "contract must detect rollback missing environment: production"
else
  pass "rollback missing environment production is detected"
fi
if ! job_has_production_env "$copy" deploy; then
  fail "stripping rollback environment must not drop deploy environment"
fi

if grep -q 'persist-credentials: false' "$WF"; then
  pass "checkout persist-credentials is false"
else
  fail "checkout must set persist-credentials: false"
fi

if awk '
  $0 ~ /^  [a-zA-Z0-9_-]+:/ { job=$1; sub(":", "", job) }
  $0 ~ /appleboy\/ssh-action/ { ssh[job]=1 }
  $0 ~ /^    environment:[[:space:]]*production[[:space:]]*$/ { env[job]=1 }
  END {
    for (j in ssh) if (!env[j]) exit 1
    exit 0
  }
' "$WF"; then
  pass "every appleboy SSH job declares environment: production"
else
  fail "every appleboy SSH job must declare environment: production"
fi

if grep -q 'uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262' "$WF" \
  && grep -q 'uses: appleboy/ssh-action@2ead5e36573f08b82fbfce1504f1a4b05a647c6f' "$WF"; then
  pass "actions are pinned to reviewed commit SHAs"
else
  fail "checkout and appleboy must be pinned to reviewed SHAs"
fi

if grep -E 'uses: (actions/checkout|appleboy/ssh-action)@v' "$WF"; then
  fail "workflow must not use mutable action version tags"
else
  pass "no mutable action version tags"
fi

if grep -qE 'debug:[[:space:]]*true' "$WF"; then
  fail "appleboy debug must not be true"
else
  pass "appleboy debug is not true"
fi

if grep -qE 'command_timeout:[[:space:]]*60m' "$WF"; then
  pass "SSH command_timeout is 60m"
else
  fail "SSH command_timeout must be 60m"
fi

if grep -q 'host: 159.223.55.242' "$WF"; then
  pass "SSH host is the literal Production IPv4"
else
  fail "appleboy host must be literal 159.223.55.242"
fi

if grep -q '129.212.235.2' "$WF" || grep -qE '[^_]DROPLET_|secrets\.DROPLET_' "$WF"; then
  fail "UAT host or DROPLET_* secrets must not appear"
else
  pass "UAT host and DROPLET_* are absent"
fi

if grep -q 'validate-production-provenance.sh' "$WF" \
  && grep -q 'fail-closed-production-secrets.sh' "$WF" \
  && grep -q 'validate-production-target.sh' "$WF"; then
  pass "provenance, secrets, and target validators are invoked"
else
  fail "workflow must run provenance, secret, and target validators"
fi

if grep -qE '(^|[^a-z-])remote-deploy\.sh' "$WF" || grep -q 'docker-compose.uat.yml' "$WF"; then
  fail "UAT remote-deploy or UAT compose must not be used"
else
  pass "UAT deploy helpers are not used"
fi

if grep -q 'production-remote-deploy.sh' "$WF" && grep -q 'reset-production-sha.sh' "$WF"; then
  pass "Production reset and remote dry-run helpers are used"
else
  fail "workflow must call reset-production-sha.sh and production-remote-deploy.sh"
fi

if grep -q 'NOT_IMPLEMENTED_46_5' "$WF"; then
  pass "restore_dump is refused"
else
  fail "workflow must refuse restore_dump"
fi

if [[ -f "$UAT" ]] && grep -qE 'group:[[:space:]]*deploy-uat' "$UAT" \
  && grep -qE 'environment:[[:space:]]*uat' "$UAT" \
  && ! grep -qE 'environment:[[:space:]]*production' "$UAT"; then
  pass "UAT workflow remains isolated"
else
  fail "deploy.yml UAT contract drifted"
fi

if [[ -f "$ROOT_DIR/deploy/production-provenance-anchor.txt" ]] \
  && [[ "$(tr -d '[:space:]' <"$ROOT_DIR/deploy/production-provenance-anchor.txt")" == "c39f2618bcdcb71875d2da5b654f3a999b39ae35" ]]; then
  pass "immutable Production provenance anchor is the 46.3 baseline"
else
  fail "deploy/production-provenance-anchor.txt must contain c39f2618bcdcb71875d2da5b654f3a999b39ae35"
fi

echo "Passed: ${PASS} | Failed: ${FAIL}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
