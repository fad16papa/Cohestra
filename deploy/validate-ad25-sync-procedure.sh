#!/usr/bin/env bash
# AD-25 owner sync procedure contract. Does not create branches or merge.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

EXCLUSIVE=(
  ".github/workflows/deploy.yml"
  "deploy/validate-uat-predeploy-gate.sh"
  "deploy/validate-deploy-uat-workflow.sh"
  "deploy/commission-uat-hold.sh"
  "deploy/fetch-origin-uat.sh"
  "deploy/write-uat-deploy-provenance.sh"
  "deploy/lib/uat-predeploy-gate.py"
)

for p in "${EXCLUSIVE[@]}"; do
  [[ -e "$ROOT_DIR/$p" ]] || fail "exclusive path missing: $p"
done
pass "AD-25 exclusive control-plane paths exist on this tree"

# FORBIDDEN live operations (this script must never execute them):
#   git push --ff-only origin/main:release/uat
#   git push --force origin main:release/uat
#   gh api .../rulesets (live ruleset change)
# Owner procedure after PR-D merges to main:
#   1. Drain Deploy UAT (AD-21) with UAT_MAIN_DEPLOY_SUPPRESSED=true.
#   2. Create protected release/uat if missing (OWNER, no admin-bypass).
#   3. Open a control-plane PR into release/uat whose ls-tree for exclusive
#      paths equals this PR-D-on-main tree. Cherry-pick / same-patch only.
#   4. Human OWNER merge only. Never GITHUB_TOKEN. Never AD-15 auto-merge.

grep -q 'git push --ff-only origin/main:release/uat' "$0" || fail "must name FF"
grep -q 'FORBIDDEN' "$0" || fail "must mark FF forbidden"
pass "AD-25 names and forbids git push --ff-only origin/main:release/uat"

echo "AD-25 owner sync procedure contract OK"
