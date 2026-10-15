#!/usr/bin/env bash
# Contract test for deploy/uat-otp-mailbox.sh. No live mailbox. No secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/uat-otp-mailbox.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if env -u UAT_OTP_MAILBOX_HOST -u UAT_OTP_MAILBOX_USER -u UAT_OTP_MAILBOX_SECRET \
  bash "$SCRIPT" --check-secrets >"$TMP/missing.out" 2>&1; then
  fail "unset mailbox secrets must fail closed"
fi
grep -q 'OWNER_GATE=missing_protected_secret' "$TMP/missing.out" || fail "owner-gate marker missing"
grep -q 'MISSING_SECRET=UAT_OTP_MAILBOX_HOST' "$TMP/missing.out" || fail "must name HOST"
grep -q 'MISSING_SECRET=UAT_OTP_MAILBOX_USER' "$TMP/missing.out" || fail "must name USER"
grep -q 'MISSING_SECRET=UAT_OTP_MAILBOX_SECRET' "$TMP/missing.out" || fail "must name SECRET"
pass "missing mailbox secret NAMES are reported"

if ! UAT_OTP_MAILBOX_HOST=imap.example.test \
  UAT_OTP_MAILBOX_USER=uat-auto@example.test \
  UAT_OTP_MAILBOX_SECRET=placeholder \
  bash "$SCRIPT" --check-secrets >"$TMP/present.out"; then
  fail "present mailbox secrets must pass check-secrets"
fi
grep -q 'UAT_OTP_MAILBOX_SECRETS=present' "$TMP/present.out" || fail "present marker missing"
if grep -q 'placeholder' "$TMP/present.out"; then
  fail "must not print the mailbox secret"
fi
pass "present mailbox secrets pass without printing values"

cat >"$TMP/ok.eml" <<'EML'
From: Cohestra <noreply@cohestra.app>
To: uat-auto-basic+abc123@mailbox.test
Subject: Verify your Cohestra account
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

Hi there, Your verification code is: 482913
If you did not create an account, you can ignore this email.
EML

if ! bash "$SCRIPT" --extract-from-file "$TMP/ok.eml" \
  --to 'uat-auto-basic+abc123@mailbox.test' \
  --out "$TMP/ok.json" >"$TMP/ok.out"; then
  fail "matching fixture must extract OTP"
fi
grep -q 'OTP_CODE=482913' "$TMP/ok.out" || fail "OTP_CODE must be emitted for the test runner"
python3 - "$TMP/ok.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
assert p["result"] == "pass"
assert p["matched"] is True
assert p["otpDigits"] == 6
text = open(sys.argv[1], encoding="utf-8").read()
assert "482913" not in text
assert "placeholder" not in text
PY
pass "matching message extracts OTP and does not archive the code"

cat >"$TMP/other.eml" <<'EML'
From: Other <other@example.com>
To: someone-else@mailbox.test
Subject: Unrelated invoice
Content-Type: text/plain; charset=utf-8

Your verification code is: 111111
Please pay invoice 999999.
EML

if bash "$SCRIPT" --extract-from-file "$TMP/other.eml" \
  --to 'uat-auto-basic+abc123@mailbox.test' \
  --out "$TMP/other.json" >"$TMP/other.out" 2>"$TMP/other.err"; then
  fail "unrelated message must not yield an OTP"
fi
grep -q 'does not match the unique correlation address' "$TMP/other.err" || fail "unrelated reject reason"
if grep -q '111111' "$TMP/other.out" "$TMP/other.err"; then
  fail "unrelated OTP must not be printed"
fi
pass "unrelated email bodies are ignored"

if bash "$SCRIPT" --extract-from-file "$TMP/ok.eml" \
  --to 'owner@gmail.com' \
  --out "$TMP/personal.json" >"$TMP/personal.out" 2>"$TMP/personal.err"; then
  fail "personal mailbox addresses must be refused"
fi
grep -q 'personal mailbox credentials are forbidden' "$TMP/personal.err" || fail "personal refuse reason"
pass "personal mailbox addresses are forbidden"

echo "uat-otp-mailbox contract OK"
