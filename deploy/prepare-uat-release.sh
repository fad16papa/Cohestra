#!/usr/bin/env bash
# Local pre-flight before UAT deploy. Safe to run on any machine (no secrets printed).
#
# Usage:
#   bash deploy/prepare-uat-release.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "== Prepare UAT release =="
echo "Repo: $ROOT_DIR"
echo ""

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
if [[ "$branch" == "main" ]]; then
  pass "On main branch"
else
  fail "Not on main (on $branch) — merge to main before UAT deploy"
fi

if git fetch origin main --quiet 2>/dev/null; then
  local_sha=$(git rev-parse HEAD)
  remote_sha=$(git rev-parse origin/main)
  if [[ "$local_sha" == "$remote_sha" ]]; then
    pass "Local HEAD matches origin/main ($(git rev-parse --short HEAD))"
  else
    fail "Local HEAD differs from origin/main (local $(git rev-parse --short HEAD) vs remote $(git rev-parse --short origin/main))"
  fi
else
  fail "Could not fetch origin/main"
fi

echo ""
echo "== Isolation contract =="
if bash deploy/validate-uat-isolation.sh >/dev/null; then
  pass "UAT isolation contract"
else
  fail "UAT isolation contract"
fi

echo ""
echo "== Web tests =="
if (cd web && npm run test -- --run 2>/dev/null); then
  pass "Web vitest"
else
  fail "Web vitest"
fi

echo ""
echo "== Public UAT probe (no SSH) =="
if curl -fsS --connect-timeout 10 https://uat.cohestra.app/ready >/dev/null 2>&1; then
  pass "https://uat.cohestra.app/ready is Healthy"
else
  fail "https://uat.cohestra.app/ready unreachable — first deploy may need owner SSH"
fi

echo ""
echo "== GitHub Actions deploy secrets =="
if gh secret list 2>/dev/null | rg -q DROPLET_HOST; then
  pass "DROPLET_HOST secret configured"
else
  echo "WARN: GitHub DROPLET_* secrets not visible from this token — use owner SSH deploy if Actions deploy fails"
fi

echo ""
echo "Passed: $PASS  Failed: $FAIL"
echo ""
if [[ "$FAIL" -gt 0 ]]; then
  echo "Fix failures before deploying."
  exit 1
fi

echo "Ready to deploy. Owner workstation:"
echo "  eval \"\$(ssh-agent -s)\" && ssh-add ~/.ssh/cohestra_uat"
echo "  bash deploy/uat-deploy-from-workstation.sh"
echo ""
echo "Or configure GitHub Actions secrets and run: gh workflow run deploy.yml"
