#!/usr/bin/env bash
# Repo-side 45.6 recaptcha contract. Does not hit live UAT. Does not print secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

COMPOSE="$ROOT_DIR/docker-compose.uat.yml"
UAT_ENV="$ROOT_DIR/.env.uat.example"
LAYER_A="$ROOT_DIR/web/e2e-uat/recaptcha-layer-a.spec.ts"
LAYER_B="$ROOT_DIR/src/Api.IntegrationTests/RecaptchaLayerBIntegrationTests.cs"
FACTORY="$ROOT_DIR/src/Api.IntegrationTests/Infrastructure/RecaptchaLayerBWebApplicationFactory.cs"

[[ -f "$LAYER_A" ]] || fail "missing Layer A Playwright spec"
[[ -f "$LAYER_B" ]] || fail "missing Layer B isolated integration tests"
[[ -f "$FACTORY" ]] || fail "missing Layer B factory"
grep -q 'does not solve a live Google challenge' "$LAYER_A" || fail "Layer A must refuse to solve the live challenge"
grep -q 'empty CAPTCHA token is rejected' "$LAYER_A" || fail "Layer A must probe empty CAPTCHA against live UAT"
grep -q 'invalid CAPTCHA token is rejected' "$LAYER_A" || fail "Layer A must probe invalid CAPTCHA against live UAT"
grep -q 'IsolatedOfficialBehaviorHandler' "$FACTORY" || fail "Layer B must stub siteverify instead of embedding Google keys"
grep -q 'layer-b-isolated-placeholder' "$FACTORY" || fail "Layer B must use a non-Google placeholder secret"
# Split so this script does not contain a contiguous official-key prefix.
OFFICIAL_TEST_KEY_PREFIX="6LeIx"
OFFICIAL_TEST_KEY_PREFIX+="AcT"
if grep -R -n --exclude-dir=.git --exclude-dir=bin --exclude-dir=obj -E "$OFFICIAL_TEST_KEY_PREFIX" \
  "$FACTORY" "$LAYER_B" "$COMPOSE" "$UAT_ENV" "$ROOT_DIR/src/Api.IntegrationTests" \
  "$ROOT_DIR/docker-compose.uat.yml" "$ROOT_DIR/.env.uat.example"; then
  fail "official Google recaptcha test keys must not appear in UAT or Layer B source"
fi
grep -q 'SelfServeSignup__Recaptcha__Enabled: \${SelfServeSignup__Recaptcha__Enabled:-false}' "$COMPOSE" \
  || fail "UAT compose must not default recaptcha on"
grep -q 'TestBypassToken' "$COMPOSE" && fail "UAT compose must not set a recaptcha bypass token"
pass "Layer A/B contract: isolated stub, live UAT not weakened, no embedded Google keys"

echo "uat-recaptcha contract OK"
