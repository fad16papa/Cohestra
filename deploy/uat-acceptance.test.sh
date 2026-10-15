#!/usr/bin/env bash
# Contract test for deploy/uat-acceptance.sh — classify-only, no droplet.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/uat-acceptance.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat >"$TMP/.env" <<'ENV'
PUBLIC_BASE_URL=https://uat.cohestra.app
POSTGRES_PASSWORD=super-secret-db-password-123
JWT_SIGNING_KEY=super-secret-jwt-signing-key-value
SendGrid__ApiKey=SG.super-secret-sendgrid-key
Paddle__ApiKey=pdl_sdbx_examplekeynotreal
Paddle__ClientToken=test_exampleclient
Paddle__WebhookSecret=whsec_super_secret_webhook
Paddle__Environment=sandbox
SelfServeSignup__Recaptcha__Enabled=true
SelfServeSignup__Recaptcha__SecretKey=recaptcha-super-secret-key
NEXT_PUBLIC_RECAPTCHA_ENABLED=true
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=site-key-value-not-for-logs
OperatorSeed__Enabled=false
DemoDataSeed__Enabled=false
LoadTestSeed__Enabled=false
NGINX_HOST_PORT=8180
WEB_HOST_PORT=3100
API_HOST_PORT=5100
ENV

if ! bash "$SCRIPT" --classify-only --env "$TMP/.env" --out "$TMP/ok.json"; then
  fail "clean classify-only must pass"
fi
python3 - "$TMP/ok.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
assert p["result"] in {"pass", "classify_only"}, p
assert p["security"]["recaptcha"]["serverEnabled"] is True
assert p["security"]["recaptcha"]["secretConfigured"] is True
assert p["security"]["recaptcha"]["bypassTokenAbsent"] is True
assert p["provider"]["paddle"]["apiKey"] == "sandbox"
assert p["provider"]["paddle"]["refusedForUat"] is False
text = open(sys.argv[1], encoding="utf-8").read()
for leak in (
    "super-secret-db-password-123",
    "super-secret-jwt-signing-key-value",
    "SG.super-secret-sendgrid-key",
    "whsec_super_secret_webhook",
    "recaptcha-super-secret-key",
    "site-key-value-not-for-logs",
    "pdl_sdbx_examplekeynotreal",
):
    assert leak not in text, leak
PY
pass "classify-only passes and redacts secret values"

cat >>"$TMP/.env" <<'ENV'
SelfServeSignup__Recaptcha__TestBypassToken=test-captcha-pass
Paddle__ApiKey=pdl_live_should_refuse
Paddle__ClientToken=live_should_refuse
DemoDataSeed__Enabled=true
NGINX_HOST_PORT=80
ENV

if bash "$SCRIPT" --classify-only --env "$TMP/.env" --out "$TMP/bad.json"; then
  fail "forbidden flags must fail closed"
fi
python3 - "$TMP/bad.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
assert p["result"] == "fail"
assert "recaptcha_bypass_token_present" in p["failures"]
assert "live_paddle" in p["failures"]
assert "forbidden_seed_or_dev_slug" in p["failures"]
assert "public_edge_port_bind" in p["failures"]
text = open(sys.argv[1], encoding="utf-8").read()
assert "pdl_live_should_refuse" not in text
assert "test-captcha-pass" not in text
PY
pass "forbidden UAT config fails without leaking values"

echo "uat-acceptance contract OK"
