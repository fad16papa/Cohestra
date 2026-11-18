#!/usr/bin/env bash
# Reproduce the AD-25 seven-path sync gap. Local fixture only.
# Does not create a live release/uat branch or change GitHub settings.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRC_SHA="${PRC_BASE_SHA:-1c57633fa607dec4a31aca8928c4c02adb231822}"
PRD_SHA="${PRD_HEAD_SHA:-$(git -C "$ROOT_DIR" rev-parse HEAD)}"

OLD_SEVEN=(
  ".github/workflows/deploy.yml"
  "deploy/validate-uat-predeploy-gate.sh"
  "deploy/validate-deploy-uat-workflow.sh"
  "deploy/commission-uat-hold.sh"
  "deploy/fetch-origin-uat.sh"
  "deploy/write-uat-deploy-provenance.sh"
  "deploy/lib/uat-predeploy-gate.py"
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

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

git init -q -b main "$TMP/src"
git -C "$TMP/src" config user.email t@t
git -C "$TMP/src" config user.name t
# Seed from the real objects so trees match the reviewed SHAs.
git -C "$TMP/src" fetch -q "$ROOT_DIR" "$PRC_SHA" "$PRD_SHA"

git -C "$TMP/src" checkout -q -B release/uat "$PRC_SHA"
git -C "$TMP/src" checkout -q -B prd "$PRD_SHA"

# Apply only the seven-path sync onto the PR-C baseline branch.
git -C "$TMP/src" checkout -q release/uat
for p in "${OLD_SEVEN[@]}"; do
  if git -C "$TMP/src" cat-file -e "prd:$p" 2>/dev/null; then
    git -C "$TMP/src" checkout -q prd -- "$p"
  else
    echo "MISSING_ON_PRD=$p"
  fi
done
git -C "$TMP/src" add -A
if ! git -C "$TMP/src" diff --cached --quiet; then
  git -C "$TMP/src" commit -q -m "seven-path AD-25 sync from PR-D"
fi

echo "FIXTURE=$TMP/src"
echo "RELEASE_UAT_SHA=$(git -C "$TMP/src" rev-parse HEAD)"
echo "==== isolation scripts after seven-path sync ===="
for p in \
  deploy/validate-prd-ad23.test.sh \
  deploy/validate-ad25-sync-procedure.sh \
  deploy/validate-inline-suppression.test.sh \
  deploy/validate-deploy-uat-workflow.sh \
  deploy/validate-deploy-production-workflow.sh
do
  if [[ -f "$TMP/src/$p" ]]; then
    echo "PRESENT $p"
  else
    echo "ABSENT $p"
  fi
done

echo "==== running postmerge-isolation scripts ===="
cd "$TMP/src"
set +e
bash deploy/validate-prd-ad23.test.sh >"$TMP/prd-ad23.out" 2>&1
rc_ad23=$?
bash deploy/validate-inline-suppression.test.sh >"$TMP/inline.out" 2>&1
rc_inline=$?
bash deploy/validate-ad25-sync-procedure.sh >"$TMP/ad25.out" 2>&1
rc_ad25=$?
bash deploy/validate-deploy-uat-workflow.sh >"$TMP/wf.out" 2>&1
rc_wf=$?
bash deploy/validate-deploy-production-workflow.sh >"$TMP/prod.out" 2>&1
rc_prod=$?
set -e

echo "RC validate-prd-ad23=$rc_ad23"
echo "RC validate-inline-suppression=$rc_inline"
echo "RC validate-ad25-sync-procedure=$rc_ad25"
echo "RC validate-deploy-uat-workflow=$rc_wf"
echo "RC validate-deploy-production-workflow=$rc_prod"
echo "----- validate-prd-ad23 -----"
cat "$TMP/prd-ad23.out"
echo "----- validate-inline-suppression -----"
cat "$TMP/inline.out"
echo "----- validate-ad25-sync-procedure -----"
cat "$TMP/ad25.out"

if [[ "$rc_ad23" -eq 0 && "$rc_inline" -eq 0 && "$rc_ad25" -eq 0 ]]; then
  echo "UNEXPECTED: seven-path sync passed isolation"
  exit 2
fi
echo "REPRODUCED: seven-path sync fails mandatory postmerge-isolation"
exit 0
