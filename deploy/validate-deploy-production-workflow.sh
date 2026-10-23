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

for perm in 'contents: write' 'actions: write' 'checks: write' 'pull-requests: write'; do
  if grep -qE "$perm" "$WF"; then
    fail "write permission ${perm} is forbidden"
  else
    pass "write permission ${perm} is absent"
  fi
done

workflow_global_has_id_token_write() {
  awk '
    /^permissions:/ { in_p=1; next }
    in_p && /^[a-zA-Z]/ { in_p=0 }
    in_p && $0 ~ /id-token:[[:space:]]*write/ { found=1 }
    END { exit found ? 0 : 1 }
  ' "$1"
}

job_has_id_token_write() {
  local file="$1"
  local job="$2"
  awk -v job="$job" '
    $0 ~ "^  " job ":" { in_j=1; next }
    in_j && $0 ~ /^  [a-zA-Z0-9_-]+:/ { in_j=0 }
    in_j && $0 ~ /^    permissions:/ { in_p=1; next }
    in_j && in_p && $0 ~ /^    [a-zA-Z0-9_-]+:/ && $0 !~ /^    permissions:/ { in_p=0 }
    in_j && in_p && $0 ~ /id-token:[[:space:]]*write/ { found=1 }
    END { exit found ? 0 : 1 }
  ' "$file"
}

job_has_required_oidc_permissions() {
  local file="$1"
  local job="$2"
  awk -v job="$job" '
    $0 ~ "^  " job ":" { in_j=1; next }
    in_j && $0 ~ /^  [a-zA-Z0-9_-]+:/ { in_j=0 }
    in_j && $0 ~ /^    permissions:/ { in_p=1; next }
    in_j && in_p && $0 ~ /^    [a-zA-Z0-9_-]+:/ && $0 !~ /^    permissions:/ { in_p=0 }
    in_j && in_p {
      line=$0
      sub(/^[[:space:]]+/, "", line)
      if (line=="contents: read") c=1
      if (line=="actions: read") a=1
      if (line=="checks: read") k=1
      if (line=="pull-requests: read") p=1
      if (line=="id-token: write") i=1
      if (line ~ /:[[:space:]]*write/ && line !~ /id-token:[[:space:]]*write/) bad=1
    }
    END { exit (c && a && k && p && i && !bad) ? 0 : 1 }
  ' "$file"
}

if workflow_global_has_id_token_write "$WF"; then
  fail "workflow-global id-token: write is forbidden"
else
  pass "workflow-global id-token: write is absent"
fi

if job_has_id_token_write "$WF" "require-main"; then
  fail "require-main must not have id-token: write"
else
  pass "require-main has no id-token: write"
fi

if job_has_id_token_write "$WF" "validate-sha"; then
  fail "validate-sha must not have id-token: write"
else
  pass "validate-sha has no id-token: write"
fi

if job_has_required_oidc_permissions "$WF" "deploy"; then
  pass "deploy has job-level OIDC permissions"
else
  fail "deploy must grant job-level id-token: write with read-only extras"
fi

if job_has_required_oidc_permissions "$WF" "rollback"; then
  pass "rollback has job-level OIDC permissions"
else
  fail "rollback must grant job-level id-token: write with read-only extras"
fi

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
  && grep -q 'uses: appleboy/ssh-action@2ead5e36573f08b82fbfce1504f1a4b05a647c6f' "$WF" \
  && grep -q 'uses: tailscale/github-action@99a8333667fff04fdd6cffb46dfd409f8329a7bf' "$WF"; then
  pass "actions are pinned to reviewed commit SHAs"
else
  fail "checkout, appleboy, and tailscale/github-action must be pinned to reviewed SHAs"
fi

if python3 - "$WF" <<'PY'
import re
import sys
from pathlib import Path
text = Path(sys.argv[1]).read_text()
expected = {
    "tailscale/github-action": "99a8333667fff04fdd6cffb46dfd409f8329a7bf",
    "appleboy/ssh-action": "2ead5e36573f08b82fbfce1504f1a4b05a647c6f",
}
pins = re.findall(r"uses:\s*(tailscale/github-action|appleboy/ssh-action)@([0-9a-fA-F]+)", text)
if not pins:
    raise SystemExit(1)
for name, sha in pins:
    if len(sha) != 40 or sha.lower() != expected[name]:
        raise SystemExit(1)
raise SystemExit(0)
PY
then
  pass "Tailscale and appleboy pins are the exact 40-character reviewed SHAs"
else
  fail "Tailscale/appleboy pins must be the exact 40-character reviewed SHAs"
fi

if grep -E 'uses: (actions/checkout|appleboy/ssh-action|tailscale/github-action)@v' "$WF"; then
  fail "workflow must not use mutable action version tags"
else
  pass "no mutable action version tags"
fi

if awk '
  $0 ~ /^  [a-zA-Z0-9_-]+:/ { job=$1; sub(":", "", job) }
  $0 ~ /tailscale\/github-action/ { ts[job]=1 }
  END {
    if (!ts["deploy"] || !ts["rollback"]) exit 1
    for (j in ts) if (j != "deploy" && j != "rollback") exit 1
    exit 0
  }
' "$WF"; then
  pass "Tailscale action exists only on deploy and rollback"
else
  fail "Tailscale action must exist only on deploy and rollback"
fi

if grep -qE 'tags:[[:space:]]*tag:gha-production' "$WF"; then
  pass "runner tag is tag:gha-production"
else
  fail "Tailscale tags must be exactly tag:gha-production"
fi

if grep -q 'oauth-client-id: ${{ vars.PROD_TAILSCALE_CLIENT_ID }}' "$WF" \
  && grep -q 'audience: ${{ vars.PROD_TAILSCALE_AUDIENCE }}' "$WF"; then
  pass "workload federation inputs use Environment variables"
else
  fail "Tailscale action must use vars.PROD_TAILSCALE_CLIENT_ID and AUDIENCE"
fi

if grep -qE 'authkey:|oauth-secret:|PROD_TAILSCALE_AUTHKEY|secrets\.PROD_TAILSCALE' "$WF"; then
  fail "authkey and OAuth client secret are forbidden"
else
  pass "no authkey or OAuth client secret"
fi

if grep -q -- '--accept-routes=false' "$WF" \
  && grep -q -- '--advertise-exit-node=false' "$WF" \
  && grep -q -- '--ssh=false' "$WF"; then
  pass "runner join disables accept-routes, exit node, and Tailscale SSH"
else
  fail "Tailscale join must disable accept-routes, exit node, and Tailscale SSH"
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

if grep -q 'host: ${{ vars.PROD_TAILSCALE_HOST }}' "$WF"; then
  pass "appleboy host uses the overlay transport identity"
else
  fail "appleboy host must be vars.PROD_TAILSCALE_HOST"
fi

if grep -q '159.223.55.242' "$WF"; then
  fail "public Production IPv4 must not be an SSH destination in the workflow"
else
  pass "public Production IPv4 is not an SSH destination"
fi

if grep -qE 'username: \$\{\{ secrets\.PROD_DROPLET_USER \}\}' "$WF"; then
  pass "SSH username remains PROD_DROPLET_USER"
else
  fail "appleboy username must stay secrets.PROD_DROPLET_USER"
fi

if grep -q '129.212.235.2' "$WF" || grep -qE '[^_]DROPLET_|secrets\.DROPLET_' "$WF"; then
  fail "UAT host or DROPLET_* secrets must not appear"
else
  pass "UAT host and DROPLET_* are absent"
fi

if grep -q 'validate-production-provenance.sh' "$WF" \
  && grep -q 'fail-closed-production-secrets.sh' "$WF" \
  && grep -q 'validate-production-target.sh' "$WF" \
  && grep -q 'validate-production-overlay-target.sh' "$WF" \
  && grep -q 'verify-production-overlay-connectivity.sh' "$WF"; then
  pass "provenance, secrets, inventory, overlay, and connectivity validators are invoked"
else
  fail "workflow must run provenance, secret, inventory, overlay, and connectivity validators"
fi

if awk '
  $0 ~ /^  [a-zA-Z0-9_-]+:/ { job=$1; sub(":", "", job) }
  $0 ~ /validate-production-overlay-target\.sh/ { overlay[job]=1 }
  $0 ~ /tailscale\/github-action/ { ts[job]=1 }
  $0 ~ /verify-production-overlay-connectivity\.sh/ { ping[job]=1 }
  $0 ~ /appleboy\/ssh-action/ { ssh[job]=1 }
  END {
    for (j in ssh) {
      if (!overlay[j] || !ts[j] || !ping[j]) exit 1
    }
    exit 0
  }
' "$WF"; then
  pass "overlay validate → Tailscale join → ping → SSH order is present on SSH jobs"
else
  fail "SSH jobs must validate overlay, join Tailscale, then ping before appleboy"
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

if grep -q 'PROD_IP="159.223.55.242"' "$ROOT_DIR/deploy/validate-production-target.sh" \
  && grep -q 'host is not the Production inventory IPv4' "$ROOT_DIR/deploy/validate-production-target.sh"; then
  pass "inventory validator still requires 159.223.55.242"
else
  fail "validate-production-target.sh must keep the public inventory identity"
fi

if [[ -f "$UAT" ]] && ! grep -qE 'tailscale/github-action|PROD_TAILSCALE_|tag:gha-production' "$UAT"; then
  pass "UAT workflow has no Production Tailscale config"
else
  fail "Production Tailscale config must not leak into deploy.yml"
fi

firewall_files=(
  "$ROOT_DIR/deploy/harden-production-host.sh"
  "$ROOT_DIR/deploy/lib/production-ssh-cidr.sh"
  "$ROOT_DIR/deploy/lib/production-ufw-reconcile.sh"
  "$ROOT_DIR/deploy/provision-production-droplet.sh"
)
firewall_ok=1
for f in "${firewall_files[@]}"; do
  if grep -nE '0\.0\.0\.0/0|::/0' "$f" | grep -E '22|ssh|SSH|OpenSSH' | grep -vqE 'Never|must not|REFUSE|forbidden|WORLD|die |assert .*not'; then
    firewall_ok=0
  fi
done
if grep -RqnE 'actions\.githubusercontent|githubusercontent|AzureCloud|13\.64\.|20\.37\.|52\.147\.' \
  "$ROOT_DIR/deploy/harden-production-host.sh" \
  "$ROOT_DIR/deploy/lib/production-ssh-cidr.sh" \
  "$ROOT_DIR/deploy/provision-production-droplet.sh"; then
  firewall_ok=0
fi
if [[ "$firewall_ok" -eq 1 ]]; then
  pass "Story 46.2 firewall scripts do not open SSH to the world or shared runner CIDRs"
else
  fail "firewall/hardening must not introduce 0.0.0.0/0:22, ::/0:22, or GitHub/Azure SSH allowlists"
fi

echo "Passed: ${PASS} | Failed: ${FAIL}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
