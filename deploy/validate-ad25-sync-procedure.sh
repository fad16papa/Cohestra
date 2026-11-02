#!/usr/bin/env bash
# AD-25 owner sync procedure + exact-tree contract. No live branches or merges.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

python3 - "$ROOT_DIR" <<'PY' || fail "allowlist or legacy-validator contract"
from pathlib import Path
import sys
sys.path.insert(0, str(Path(sys.argv[1]) / "deploy" / "lib"))
from ad25_sync_allowlist import (
    APPROVED_PATHS,
    load_allowlist,
    stale_validator_reasons,
    baseline_missing,
)

root = Path(sys.argv[1])
allow = load_allowlist(root)
if allow != list(APPROVED_PATHS):
    raise SystemExit("allowlist drifted from owner-approved 21-path set")
missing = [p for p in allow if not (root / p).exists()]
if missing:
    raise SystemExit("required sync path missing: " + ",".join(missing))
retained = baseline_missing(root)
if retained:
    raise SystemExit("baseline-retained script missing: " + ",".join(retained))
stale = stale_validator_reasons(root)
if stale:
    raise SystemExit("; ".join(stale))
ci = (root / ".github/workflows/ci.yml").read_text(encoding="utf-8")
deploy = (root / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
if "validate-ad25-sync-fixture.test.sh" not in ci or "validate-ad25-sync-fixture.test.sh" not in deploy:
    raise SystemExit("ci.yml and deploy.yml must run the AD-25 two-branch fixture")
print("allowlist-count", len(allow))
print("legacy-validators-absent")
print("baseline-retained-present")
print("fail-closed-allowlist")
PY
pass "allowlist paths exist and incompatible legacy validators are not retained"

# FORBIDDEN live operations (this script must never execute them):
#   git push --ff-only origin/main:release/uat
#   git push --force origin main:release/uat
#   gh api .../rulesets (live ruleset change)
# Owner procedure after PR-D merges to main:
#   1. Drain Deploy UAT (AD-21) with UAT_MAIN_DEPLOY_SUPPRESSED=true.
#   2. Create protected release/uat from immutable PR-C baseline SHA if missing.
#   3. Open a control-plane PR into release/uat whose ls-tree for every
#      path in deploy/ad25-sync-allowlist.txt equals the PR-D-on-main tree.
#      Cherry-pick / same-patch only. No application/Production/ADCP paths.
#   4. Human OWNER merge only. Never GITHUB_TOKEN. Never AD-15 auto-merge.
#   5. Run authorize_from_trusted_ref against origin/main (or an owner-pinned
#      SHA). PR-head validator/allowlist/workflow rewrites are not authority.
#   6. Refuse missing trusted-ref evidence, stale source SHA, altered dest SHA,
#      unexpected dest parent, or changed manifest without owner authorization.

grep -q 'git push --ff-only origin/main:release/uat' "$0" || fail "must name FF"
grep -q 'FORBIDDEN' "$0" || fail "must mark FF forbidden"
grep -q 'ad25-sync-allowlist.txt' "$0" || fail "must name the allowlist"
grep -q 'authorize_from_trusted_ref' "$0" || fail "must name trusted-ref authorization"
grep -q 'AD-15 auto-merge' "$0" || fail "must forbid AD-15 auto-merge"
pass "AD-25 names the allowlist and forbids git push --ff-only origin/main:release/uat"

echo "AD-25 owner sync procedure contract OK"
