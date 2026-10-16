#!/usr/bin/env bash
# Repo-side contract for the UAT Playwright harness. Does not hit live UAT.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$ROOT_DIR/web/playwright.uat.config.ts"
ANON="$ROOT_DIR/web/e2e-uat/anonymous.spec.ts"
AUTH="$ROOT_DIR/web/e2e-uat/authenticated.spec.ts"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$CFG" ]] || fail "missing web/playwright.uat.config.ts"
[[ -f "$ANON" ]] || fail "missing anonymous UAT spec"
[[ -f "$AUTH" ]] || fail "missing authenticated UAT spec"

grep -q 'UAT_PUBLIC_BASE_URL' "$CFG" || fail "config must read UAT_PUBLIC_BASE_URL"
grep -q '1440' "$CFG" && grep -q '900' "$CFG" || fail "desktop viewport 1440x900 required"
grep -q '390' "$CFG" && grep -q '844' "$CFG" || fail "mobile viewport 390x844 required"
grep -q 'thesocialcollectivesg.com' "$CFG" || fail "config must refuse the shared CRM host"
grep -q 'retain-on-failure' "$CFG" || fail "failure artifacts (trace/screenshot) required"
grep -q 'https://uat.cohestra.app' "$CFG" && fail "do not hardcode the UAT host in the Playwright config"
grep -q 'test.skip' "$AUTH" || fail "authenticated flow must skip without dedicated secrets"
grep -q 'UAT_AUTO_BASIC_EMAIL' "$AUTH" || fail "authenticated flow must use dedicated automation env names"
LAYER_A="$ROOT_DIR/web/e2e-uat/recaptcha-layer-a.spec.ts"
[[ -f "$LAYER_A" ]] || fail "missing Layer A recaptcha spec"
grep -q 'does not solve a live Google challenge' "$LAYER_A" || fail "Layer A must not solve the live challenge"
grep -q 'empty CAPTCHA token is rejected' "$LAYER_A" || fail "Layer A must reject empty CAPTCHA"
grep -q 'invalid CAPTCHA token is rejected' "$LAYER_A" || fail "Layer A must reject invalid CAPTCHA"
grep -q 'waits for real UAT recaptcha keys' "$LAYER_A" && fail "Layer A must not skip after the real UAT recaptcha gate"
HELPER="$ROOT_DIR/web/e2e-uat/otp-mailbox.ts"
[[ -f "$HELPER" ]] || fail "missing web/e2e-uat/otp-mailbox.ts"
grep -q 'UAT_OTP_MAILBOX_HOST' "$HELPER" || fail "mailbox helper must read Environment uat names"
grep -q 'personal mailbox credentials are forbidden' "$HELPER" || fail "mailbox helper must refuse personal inboxes"
grep -q 'readSignupOtp' "$AUTH" || fail "authenticated UAT must use the dedicated OTP mailbox helper"
pass "UAT Playwright contract"

echo "uat-playwright contract OK"
