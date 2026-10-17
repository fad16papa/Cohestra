#!/usr/bin/env bash
# Contract for Story 19.5 UAT-only PlatformAdmin lifecycle automation.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

WF="$ROOT_DIR/.github/workflows/deploy.yml"
ONESHOT="$ROOT_DIR/deploy/uat-platform-admin-oneshot.sh"
GUARDS="$ROOT_DIR/web/e2e-uat/lifecycle/guards.ts"
HARNESS="$ROOT_DIR/web/e2e-uat/lifecycle/harness.ts"
RUNNER="$ROOT_DIR/web/e2e-uat/lifecycle/run.ts"
TESTS="$ROOT_DIR/web/e2e-uat/lifecycle/guards.test.ts"
HTESTS="$ROOT_DIR/web/e2e-uat/lifecycle/harness.test.ts"
GATE="$ROOT_DIR/_bmad-output/implementation-artifacts/19-5-lifecycle-gate.json"
COMPOSE="$ROOT_DIR/docker-compose.uat.yml"
PROD="$ROOT_DIR/docker-compose.prod.yml"
PROG="$ROOT_DIR/src/Api/Program.cs"
SEEDER="$ROOT_DIR/src/Infrastructure/Auth/PlatformAdminSeeder.cs"
ONESHOT_CS="$ROOT_DIR/src/Infrastructure/Auth/PlatformAdminSeedOneShot.cs"

for f in "$WF" "$ONESHOT" "$GUARDS" "$HARNESS" "$RUNNER" "$TESTS" "$HTESTS" "$GATE" "$ONESHOT_CS"; do
  if [[ -f "$f" ]]; then
    pass "present $(basename "$f")"
  else
    fail "missing $f"
  fi
done

if grep -q 'name: UAT Story 19.5 lifecycle acceptance' "$WF" \
  && grep -q 'UAT_AUTO_LIFECYCLE_ENABLED' "$WF" \
  && grep -q 'UAT_AUTO_PLATFORM_ADMIN_EMAIL' "$WF" \
  && grep -q 'UAT_AUTO_PLATFORM_ADMIN_PASSWORD' "$WF" \
  && grep -q 'environment: uat' "$WF"; then
  pass "lifecycle job is attached to Deploy UAT with environment uat"
else
  fail "deploy.yml must include an opt-in UAT lifecycle job"
fi

if awk '
  /permissions:/ { perm=1 }
  perm && /contents: read/ { read=1 }
  perm && /contents: write/ { write=1 }
  END { exit(read && !write ? 0 : 1) }
' "$WF"; then
  pass "workflow stays contents: read"
else
  fail "lifecycle automation must not add GITHUB_TOKEN write permissions"
fi

if grep -q 'id-token: write' "$WF" || grep -q 'contents: write' "$WF" || grep -q 'pull-requests: write' "$WF"; then
  fail "workflow must not gain new write permissions"
else
  pass "no new write permission scopes"
fi

if grep -q 'UAT_AUTO_LIFECYCLE_ENABLED != "true"' "$WF" || grep -q 'UAT_AUTO_LIFECYCLE_ENABLED:-}' "$WF" || grep -q 'UAT_AUTO_LIFECYCLE_ENABLED' "$WF"; then
  pass "lifecycle remains opt-in"
else
  fail "lifecycle job must stay opt-in"
fi

if grep -n 'UAT_AUTO_PLATFORM_ADMIN_PASSWORD' "$WF" | grep -E 'echo |printf '; then
  fail "workflow must not echo the PlatformAdmin password"
else
  pass "workflow does not echo the PlatformAdmin password"
fi

if grep -q 'set -x' "$ONESHOT" || grep -Eq 'echo .*PASSWORD|printf .*PASSWORD' "$ONESHOT"; then
  fail "oneshot script must not echo secrets or use set -x"
else
  pass "oneshot script does not echo secrets"
fi

if grep -q 'uat-compose.sh' "$ONESHOT" && grep -q -- '-e PlatformAdminSeed__Password' "$ONESHOT" && grep -q 'unset' "$ONESHOT"; then
  pass "oneshot uses isolated compose run with name-only env injection"
else
  fail "oneshot must use uat-compose run and must not persist seed env"
fi

if grep -q 'PlatformAdminSeed__Enabled: "true"' "$COMPOSE"; then
  fail "UAT compose must not permanently enable PlatformAdminSeed"
else
  pass "UAT compose leaves PlatformAdminSeed disabled"
fi

if grep -q 'PLATFORM_ADMIN_SEED_ONESHOT' "$PROD" || grep -q 'PlatformAdminSeed__Enabled: "true"' "$PROD"; then
  fail "production compose must not contain PlatformAdmin seed/oneshot"
else
  pass "production compose has no PlatformAdmin seed/oneshot"
fi

if grep -q 'PlatformAdminSeedOneShot.IsRequested' "$PROG" \
  && grep -q 'exiting without hosting HTTP' "$PROG"; then
  pass "API one-shot exits before hosting HTTP"
else
  fail "Program.cs must exit after the PlatformAdmin one-shot"
fi

if grep -q 'seed blocked for' "$SEEDER"; then
  fail "PlatformAdminSeeder exceptions must not interpolate the seed email"
else
  pass "PlatformAdminSeeder collision errors do not interpolate email"
fi

for slug in default picklemania creativorare; do
  if grep -q "$slug" "$TESTS"; then
    pass "guard tests refuse $slug"
  else
    fail "guard tests must refuse $slug"
  fi
done

if grep -q 'https://cohestra.app' "$TESTS" && grep -q 'UAT_LIFECYCLE_TENANT_ID' "$HTESTS"; then
  pass "tests refuse production hosts and external tenant ids"
else
  fail "tests must refuse production hosts and external tenant ids"
fi

if grep -Eqi 'paddle|checkout|subscription' "$HARNESS" && grep -q 'isAllowedLifecycleUrl' "$HARNESS"; then
  pass "harness allowlists URLs and refuses billing paths"
else
  fail "harness must allowlist URLs and refuse billing paths"
fi

if grep -q 'lifecycleOpen' "$GATE" && grep -q 'uat-19-5-lifecycle-' "$GATE"; then
  pass "committed lifecycle gate stays Story 19.5 scoped"
else
  fail "19-5-lifecycle-gate.json must stay open and prefixed"
fi


TSCONFIG="$ROOT_DIR/web/tsconfig.json"
if grep -q '"e2e-uat"' "$TSCONFIG"; then
  pass "Next.tsconfig excludes the lifecycle harness"
else
  fail "web/tsconfig.json must exclude e2e-uat so next build does not typecheck the Node runner"
fi


CFG="$ROOT_DIR/web/playwright.uat.config.ts"
if grep -q 'testMatch' "$CFG" && grep -q 'testIgnore' "$CFG" && grep -q 'lifecycle' "$CFG"; then
  pass "Playwright UAT ignores lifecycle unit tests"
else
  fail "playwright.uat.config.ts must ignore e2e-uat/lifecycle unit tests"
fi

echo "Passed: ${PASS} | Failed: ${FAIL}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
