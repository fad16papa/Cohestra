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
grep -q 'OfficialTestSecretKey' "$FACTORY" || fail "Layer B must use official Google v2 test keys"
grep -q '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe' "$COMPOSE" && fail "official test secret must not appear in docker-compose.uat.yml"
grep -q '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' "$COMPOSE" && fail "official test site key must not appear in docker-compose.uat.yml"
grep -q '6LeIxAcT' "$UAT_ENV" && fail "official test keys must not appear in .env.uat.example"
grep -q 'SelfServeSignup__Recaptcha__Enabled: \${SelfServeSignup__Recaptcha__Enabled:-false}' "$COMPOSE" \
  || fail "UAT compose must not default recaptcha on"
grep -q 'TestBypassToken' "$COMPOSE" && fail "UAT compose must not set a recaptcha bypass token"
pass "Layer A/B contract: isolated test keys, live UAT not weakened"

echo "uat-recaptcha contract OK"
