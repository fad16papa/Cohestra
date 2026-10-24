#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/prepare-production-host-env.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
tmp_env="$(mktemp -p /tmp cohestra-46-4-env.XXXXXX)"
trap 'rm -f "$out" "$tmp_env"' EXIT

if ! bash "$SCRIPT" --print-procedure >"$out"; then
  fail "procedure must print"
fi
grep -q 'cp .env.production.example .env' "$out" || fail "procedure copy step"
grep -q 'NO-GO' "$out" || fail "procedure NO-GO"
if grep -qiE 'SG\.[A-Za-z0-9]|BEGIN (OPENSSH |RSA )?PRIVATE KEY|pdl_' "$out"; then
  fail "procedure leaked a secret-like value"
fi
pass "print-procedure is names-only"

if ! bash "$SCRIPT" --check-template >"$out"; then
  fail "template check must pass"
fi
grep -q 'TEMPLATE=names_only' "$out" || fail "template marker"
pass "template names are present"

if bash "$SCRIPT" --check-names "$ROOT_DIR/.env.production.example" >"$out" 2>&1; then
  fail "must refuse paths inside the git worktree"
fi
grep -q 'REFUSE' "$out" || fail "worktree refuse marker"
pass "refuses in-repo paths"

if bash "$SCRIPT" --write >"$out" 2>&1; then
  fail "--write must refuse"
fi
grep -q 'REFUSE' "$out" || fail "write refuse marker"
pass "refuses --write"

cat >"$tmp_env" <<'EOF'
POSTGRES_PASSWORD=synthetic-host-postgres-aaaa
REDIS_PASSWORD=synthetic-host-redis-bbbb
JWT_SIGNING_KEY=synthetic-host-jwt-signing-key-32xx
SendGrid__ApiKey=SG.syntheticHostKeyIndependent
SendGrid__FromEmail=noreply@cohestra.app
PUBLIC_BASE_URL=https://cohestra.app
OperatorSeed__Enabled=false
DEV_TENANT_SLUG=
EOF

if ! bash "$SCRIPT" --check-names "$tmp_env" >"$out"; then
  fail "synthetic host env should pass name check"
fi
grep -q 'HOST_ENV_NAMES=present' "$out" || fail "present marker"
if grep -q 'synthetic-host' "$out" || grep -q 'SG.synthetic' "$out"; then
  fail "must not print host env values"
fi
pass "outside-repo synthetic host env names pass without values"

cat >"$tmp_env" <<'EOF'
POSTGRES_PASSWORD=crm
REDIS_PASSWORD=synthetic-host-redis-bbbb
JWT_SIGNING_KEY=synthetic-host-jwt-signing-key-32xx
SendGrid__ApiKey=SG.syntheticHostKeyIndependent
SendGrid__FromEmail=noreply@cohestra.app
PUBLIC_BASE_URL=https://cohestra.app
EOF

if bash "$SCRIPT" --check-names "$tmp_env" >"$out" 2>&1; then
  fail "placeholder postgres password must fail"
fi
grep -q 'PLACEHOLDER_SECRET=POSTGRES_PASSWORD' "$out" || fail "placeholder name"
if grep -q 'crm' "$out"; then
  fail "must not print placeholder value"
fi
pass "placeholder secrets fail closed without values"

cat >"$tmp_env" <<'EOF'
POSTGRES_PASSWORD=synthetic-host-postgres-aaaa
REDIS_PASSWORD=synthetic-host-redis-bbbb
JWT_SIGNING_KEY=synthetic-host-jwt-signing-key-32xx
SendGrid__ApiKey=SG.syntheticHostKeyIndependent
SendGrid__FromEmail=noreply@cohestra.app
PUBLIC_BASE_URL=https://uat.cohestra.app
EOF

if bash "$SCRIPT" --check-names "$tmp_env" >"$out" 2>&1; then
  fail "UAT public URL must fail"
fi
grep -q 'INVALID_PUBLIC_BASE_URL_HOST' "$out" || fail "UAT host marker"
pass "UAT PUBLIC_BASE_URL is rejected"

echo "prepare-production-host-env contract OK"
