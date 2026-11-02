#!/usr/bin/env bash
# Two-branch AD-25 fixture: seven-path gap, corrected allowlist, negatives.
# Local git only. Does not create a live release/uat branch.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRC_SHA="${PRC_BASE_SHA:-1c57633fa607dec4a31aca8928c4c02adb231822}"
PRD_SHA="${PRD_HEAD_SHA:-$(git -C "$ROOT_DIR" rev-parse HEAD)}"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

# --- 1. Reproduce the seven-path gap on a PR-C baseline ---
out="$(PRC_BASE_SHA="$PRC_SHA" PRD_HEAD_SHA="$PRD_SHA" bash "$ROOT_DIR/deploy/reproduce-ad25-seven-path-gap.sh")" \
  || { echo "$out"; fail "seven-path reproduction must exit 0 after recording failures"; }
echo "$out" | grep -q 'ABSENT deploy/validate-prd-ad23.test.sh' \
  || { echo "$out"; fail "reproduction must record missing validate-prd-ad23.test.sh"; }
echo "$out" | grep -q 'ABSENT deploy/validate-ad25-sync-procedure.sh' \
  || { echo "$out"; fail "reproduction must record missing validate-ad25-sync-procedure.sh"; }
echo "$out" | grep -q 'RC validate-prd-ad23=127' \
  || { echo "$out"; fail "missing isolation script must be exit 127"; }
echo "$out" | grep -q 'RC validate-inline-suppression=1' \
  || { echo "$out"; fail "stale inline validator must fail"; }
echo "$out" | grep -q 'REPRODUCED: seven-path sync fails mandatory postmerge-isolation' \
  || { echo "$out"; fail "reproduction must declare the gap"; }
pass "seven-path sync on PR-C baseline fails postmerge-isolation"

# --- 2. Corrected allowlist sync fixture ---
ensure_commit() {
  local sha="$1"
  if git -C "$ROOT_DIR" cat-file -e "${sha}^{commit}" 2>/dev/null; then
    return 0
  fi
  git -C "$ROOT_DIR" fetch --no-tags -q origin "$sha" 2>/dev/null \
    || git -C "$ROOT_DIR" fetch --no-tags -q origin main 2>/dev/null \
    || true
  git -C "$ROOT_DIR" cat-file -e "${sha}^{commit}"
}
ensure_commit "$PRC_SHA"
ensure_commit "$PRD_SHA"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git init -q -b main "$TMP/src"
git -C "$TMP/src" config user.email t@t
git -C "$TMP/src" config user.name t
git -C "$TMP/src" fetch -q "$ROOT_DIR" "$PRC_SHA" "$PRD_SHA"
git -C "$TMP/src" checkout -q -B release/uat "$PRC_SHA"
git -C "$TMP/src" checkout -q -B prd "$PRD_SHA"
PARENT="$(git -C "$TMP/src" rev-parse release/uat)"

ALLOW_TXT="$(python3 - "$ROOT_DIR" <<'PY'
from pathlib import Path
import sys
sys.path.insert(0, str(Path(sys.argv[1]) / "deploy" / "lib"))
from ad25_sync_allowlist import load_allowlist
print("\n".join(load_allowlist(Path(sys.argv[1]))))
PY
)" || fail "could not load AD-25 allowlist"
mapfile -t ALLOW <<<"$ALLOW_TXT"
[[ ${#ALLOW[@]} -gt 0 ]] || fail "allowlist is empty"

git -C "$TMP/src" checkout -q release/uat
for p in "${ALLOW[@]}"; do
  git -C "$TMP/src" cat-file -e "prd:$p" || fail "allowlist path missing on PR-D: $p"
  git -C "$TMP/src" checkout -q prd -- "$p"
done
git -C "$TMP/src" add -A
git -C "$TMP/src" commit -q -m "corrected AD-25 allowlist sync"
DEST="$(git -C "$TMP/src" rev-parse HEAD)"

python3 - "$TMP/src" "$PRD_SHA" "$DEST" "$PARENT" "$ROOT_DIR" <<'PY' || fail "exact-tree contract"
import sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[5]) / "deploy" / "lib"))
from ad25_sync_allowlist import load_allowlist, exact_tree_errors, stale_validator_reasons
repo = Path(sys.argv[1])
allow = load_allowlist(repo)
errors = exact_tree_errors(repo, sys.argv[2], sys.argv[3], sys.argv[4], allow)
if errors:
    raise SystemExit("; ".join(errors))
stale = stale_validator_reasons(repo)
if stale:
    raise SystemExit("; ".join(stale))
print("exact-tree-ok")
PY
pass "corrected allowlist exact-tree matches PR-D"

cd "$TMP/src"
bash deploy/validate-prd-ad23.test.sh
bash deploy/validate-inline-suppression.test.sh
bash deploy/validate-ad25-sync-procedure.sh
bash deploy/validate-deploy-uat-workflow.sh
bash deploy/validate-deploy-production-workflow.sh
bash deploy/validate-uat-predeploy-gate.test.sh
bash deploy/commission-uat-hold.test.sh
bash deploy/fetch-origin-uat.test.sh
bash deploy/fetch-origin-main.test.sh
bash deploy/write-uat-deploy-provenance.test.sh
bash deploy/validate-uat-gate-activation.test.sh
python3 deploy/simulate-merge-token-trigger.py
pass "corrected synchronized tree passes mandatory isolation and workflow contracts"

# --- 3. Deterministic negatives ---
python3 - "$TMP/src" "$PRD_SHA" "$DEST" "$PARENT" "$ROOT_DIR" <<'PY' || fail "missing-script negative"
import sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[5]) / "deploy" / "lib"))
from ad25_sync_allowlist import load_allowlist, exact_tree_errors
repo = Path(sys.argv[1])
allow = load_allowlist(repo)
# Pretend dest omitted a required script by checking against dest_parent (pre-sync).
errors = exact_tree_errors(repo, sys.argv[2], sys.argv[4], sys.argv[4], allow)
if not any("missing on dest tree: deploy/validate-prd-ad23.test.sh" in e for e in errors):
    raise SystemExit("expected missing dest script: " + "; ".join(errors))
print("missing-script-negative-ok")
PY
pass "missing required script is refused"

python3 - "$TMP/src" "$PRC_SHA" "$DEST" "$PARENT" "$ROOT_DIR" <<'PY' || fail "wrong source tree negative"
import sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[5]) / "deploy" / "lib"))
from ad25_sync_allowlist import load_allowlist, exact_tree_errors
repo = Path(sys.argv[1])
allow = load_allowlist(repo)
errors = exact_tree_errors(repo, sys.argv[2], sys.argv[3], sys.argv[4], allow)
if not any("wrong SHA for .github/workflows/deploy.yml" in e for e in errors):
    raise SystemExit("expected wrong source SHA: " + "; ".join(errors))
print("wrong-source-negative-ok")
PY
pass "incorrect source tree is refused"

# Wrong dest SHA: dest still at the PR-C parent, source is PR-D.
python3 - "$TMP/src" "$PRD_SHA" "$PARENT" "$PARENT" "$ROOT_DIR" <<'PY' || fail "wrong dest SHA negative"
import sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[5]) / "deploy" / "lib"))
from ad25_sync_allowlist import load_allowlist, exact_tree_errors
repo = Path(sys.argv[1])
allow = load_allowlist(repo)
errors = exact_tree_errors(repo, sys.argv[2], sys.argv[3], sys.argv[4], allow)
if not any("wrong SHA for .github/workflows/deploy.yml" in e for e in errors):
    raise SystemExit("expected dest SHA mismatch: " + "; ".join(errors))
print("wrong-sha-negative-ok")
PY
pass "wrong dest SHA is refused"

# Extra unapproved file
git -C "$TMP/src" checkout -q release/uat
mkdir -p "$TMP/src/src/Api"
echo extra >"$TMP/src/src/Api/Program.cs"
git -C "$TMP/src" add src/Api/Program.cs
git -C "$TMP/src" commit -q -m "unapproved extra"
EXTRA="$(git -C "$TMP/src" rev-parse HEAD)"
python3 - "$TMP/src" "$PRD_SHA" "$EXTRA" "$DEST" "$ROOT_DIR" <<'PY' || fail "extra-file negative"
import sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[5]) / "deploy" / "lib"))
from ad25_sync_allowlist import load_allowlist, exact_tree_errors
repo = Path(sys.argv[1])
allow = load_allowlist(repo)
errors = exact_tree_errors(repo, sys.argv[2], sys.argv[3], sys.argv[4], allow)
if not any("unapproved extra file in sync: src/Api/Program.cs" in e for e in errors):
    raise SystemExit("expected extra file: " + "; ".join(errors))
print("extra-file-negative-ok")
PY
pass "unapproved extra file is refused"

# Stale validator retained
git -C "$TMP/src" checkout -q "$DEST"
git -C "$TMP/src" checkout -q "$PRC_SHA" -- deploy/validate-inline-suppression.test.sh
if python3 - "$TMP/src" <<'PY'
from pathlib import Path
import sys
sys.path.insert(0, str(Path(sys.argv[1]) / "deploy" / "lib"))
from ad25_sync_allowlist import stale_validator_reasons
stale = stale_validator_reasons(Path(sys.argv[1]))
if not stale:
    raise SystemExit("expected stale inline validator")
print("stale:", "; ".join(stale))
PY
then
  pass "stale legacy validator is refused"
else
  fail "stale inline validator must be detected"
fi
git -C "$TMP/src" checkout -q prd -- deploy/validate-inline-suppression.test.sh

echo "validate-ad25-sync-fixture contract OK"
