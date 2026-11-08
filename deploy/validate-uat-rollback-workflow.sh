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

python3 - "$WF" <<'PY' || fail "deploy-uat-rollback.yml is not valid YAML"
from pathlib import Path
import sys
import yaml
yaml.safe_load(Path(sys.argv[1]).read_text())
PY
pass "rollback workflow YAML parses"

grep -qE '^name:[[:space:]]*UAT rollback' "$WF" || fail "workflow name must be UAT rollback"
grep -qE '^[[:space:]]*workflow_dispatch:' "$WF" || fail "workflow_dispatch is required"
grep -q 'dispatch-readiness' "$WF" || fail "push/PR must register a dispatch-readiness job"
grep -q "github.event_name == 'workflow_dispatch'" "$WF" \
  || fail "host-mutating jobs must no-op unless the event is workflow_dispatch"

for key in pull_request_target workflow_run workflow_call repository_dispatch schedule release deployment; do
  if grep -qE "^[[:space:]]*${key}:" "$WF"; then
    fail "forbidden trigger ${key} is present"
  fi
done
pass "workflow_dispatch plus push/PR readiness only"

grep -q 'UAT ROLLBACK: AUTHORIZED' "$WF" || fail "owner confirm phrase missing"
grep -q 'UAT_ROLLBACK_AUTHORIZED' "$WF" || fail "script authorization env missing"
grep -q 'backup_attested' "$WF" || fail "backup attestation input missing"
grep -q 'compat_reviewed' "$WF" || fail "compatibility attestation input missing"
grep -q 'default: false' "$WF" || fail "execute must default false"
grep -q 'environment: uat' "$WF" || fail "Environment uat required for SSH path"
grep -q 'persist-credentials: false' "$WF" || fail "persist-credentials: false required"
grep -q 'fail-closed-uat-secrets.sh' "$WF" || fail "fail-closed UAT secrets required before SSH"
grep -q 'refs/heads/main' "$WF" || fail "non-main dispatch must be refused"
grep -q 'github.sha' "$WF" || fail "runner helpers must come from the dispatch SHA"
grep -q 'fetch-origin-main.sh' "$WF" || fail "validate job must use authenticated fetch-origin-main.sh"
if grep -q 'git fetch --no-tags origin main' "$WF"; then
  fail "workflow must not raw-fetch origin/main after persist-credentials: false"
fi
if grep -q 'needs.validate.outputs.rollback_sha' "$WF" && grep -A2 'Checkout dispatch SHA' "$WF" | grep -q 'rollback_sha'; then
  fail "execute job must not checkout the rollback SHA for runner helpers"
fi
if grep -A20 'Rollback previous SHA over SSH' "$WF" | grep -q 'bash deploy/uat-rollback.sh'; then
  fail "droplet SSH must be inline; old trees do not have uat-rollback.sh"
fi
if ! python3 - "$WF" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text()
export_at = text.find("export GIT_SHA")
build_at = text.find("bash deploy/uat-compose.sh build api")
if export_at < 0 or build_at < 0 or export_at > build_at:
    raise SystemExit("GIT_SHA must be exported before compose rebuild")
PY
then
  fail "GIT_SHA must be exported before compose rebuild"
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
grep -q 'inputs.backup_attested' "$WF" || fail "SSH must require backup attestation"
grep -q 'inputs.compat_reviewed' "$WF" || fail "SSH must require compatibility review"
grep -q 'refuse-unattested-execute' "$WF" || fail "execute without attestation must fail the workflow"
grep -q 'uat-host-mutation-lock.sh' "$WF" || fail "execute must take the Actions host mutation lock"
grep -q 'flock' "$WF" || fail "droplet execute must flock the host mutation lock"
grep -q '/ready' "$WF" || fail "SSH execute must probe post-rollback /ready"
grep -q 'POST_ROLLBACK_ACCEPTANCE' "$WF" || fail "SSH execute must emit post-rollback acceptance"
grep -q 'DB_RESTORE_NOT_ATTEMPTED=true' "$WF" || fail "SSH execute must record DB_RESTORE_NOT_ATTEMPTED"
grep -q 'DB_MIGRATION_EFFECT=UNVERIFIED' "$WF" || fail "SSH execute must record unverified migration effect"
if grep -q 'DATABASE_MUTATED=false' "$WF"; then
  fail "workflow must not claim DATABASE_MUTATED=false"
fi
pass "attestation, lock, honest DB, and post-rollback acceptance are required"

if grep -qE 'group:[[:space:]]*deploy-production' "$WF"; then
  fail "must not use deploy-production concurrency"
fi
if grep -qE 'group:[[:space:]]*deploy-uat-rollback' "$WF"; then
  fail "independent rollback concurrency permits overlap with Deploy UAT"
fi
grep -qE 'group:[[:space:]]*deploy-uat$' "$WF" || fail "concurrency must share deploy-uat"
grep -q 'cancel-in-progress: false' "$WF" || fail "must not cancel an in-flight Deploy UAT"
pass "shared UAT host mutation lock"

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
