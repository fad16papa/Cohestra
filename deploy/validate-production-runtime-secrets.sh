#!/usr/bin/env bash
# Story 46.4 — dedicated Production runtime / secrets isolation contract.
# Non-destructive. Does not SSH, compose-up, or create .env.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT_DIR/docker-compose.production.yml"
ENV_EXAMPLE="$ROOT_DIR/.env.production.example"
UAT="$ROOT_DIR/docker-compose.uat.yml"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
VALIDATOR="$ROOT_DIR/src/Infrastructure/Auth/ProductionSecurityValidator.cs"
CORS="$ROOT_DIR/src/Infrastructure/Auth/ProductionCorsOrigins.cs"
PLANE="$ROOT_DIR/src/Infrastructure/Auth/DeploymentPlane.cs"
PADDLE="$ROOT_DIR/src/Infrastructure/Billing/PaddleCredentialGuard.cs"
SENDGRID="$ROOT_DIR/src/Infrastructure/Email/SendGridSettings.cs"
PROGRAM="$ROOT_DIR/src/Api/Program.cs"
DOCS="$ROOT_DIR/docs/deploy/production-runtime-secrets.md"
LAUNCH="$ROOT_DIR/docs/deploy/production-launch-program.md"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "== Cohestra Production runtime / secrets isolation (46.4) =="

if [[ -f "$COMPOSE" ]] && grep -qE 'Cohestra__DeploymentPlane:[[:space:]]*Production[[:space:]]*$' "$COMPOSE" \
  && ! grep -qE 'Cohestra__DeploymentPlane:.*\$' "$COMPOSE"; then
  pass "compose locks Cohestra__DeploymentPlane=Production"
else
  fail "compose must lock Cohestra__DeploymentPlane=Production (not interpolatable)"
fi

if grep -qE 'ASPNETCORE_ENVIRONMENT:[[:space:]]*Production' "$COMPOSE"; then
  pass "ASPNETCORE_ENVIRONMENT is Production"
else
  fail "API must lock ASPNETCORE_ENVIRONMENT=Production"
fi

if grep -qE 'image:[[:space:]]*postgres:16' "$COMPOSE"; then
  pass "PostgreSQL 16 image"
else
  fail "Production postgres must remain postgres:16"
fi

if grep -qE 'image:[[:space:]]*redis:7' "$COMPOSE"; then
  pass "Redis 7 image"
else
  fail "Production redis must remain redis:7"
fi

if grep -q -- '--requirepass' "$COMPOSE" && grep -q 'REDIS_PASSWORD' "$COMPOSE"; then
  pass "Redis requirepass remains mandatory"
else
  fail "Redis authentication is mandatory"
fi

if awk '
  $0 ~ /^  (postgres|redis):/ { in_svc=1; next }
  in_svc && $0 ~ /^  [a-z]/ && $0 !~ /^  (postgres|redis):/ { in_svc=0 }
  in_svc && $0 ~ /^    ports:/ { found=1 }
  END { exit found+0 }
' "$COMPOSE" && ! grep -qE '5432:|6379:' "$COMPOSE"; then
  pass "Postgres and Redis ports unpublished"
else
  fail "Postgres/Redis must not publish host ports"
fi

if grep -q 'DEV_TENANT_SLUG' "$COMPOSE"; then
  fail "DEV_TENANT_SLUG must stay absent from Production compose"
else
  pass "DEV_TENANT_SLUG absent from compose"
fi

for seed in OperatorSeed__Enabled PlatformAdminSeed__Enabled DemoDataSeed__Enabled LoadTestSeed__Enabled; do
  if grep -qE "${seed}:[[:space:]]*\"false\"" "$COMPOSE"; then
    pass "${seed} locked false"
  else
    fail "${seed} must be locked false"
  fi
done

if grep -qE 'Paddle__AllowLive:[[:space:]]*"false"' "$COMPOSE" \
  && grep -qE 'Paddle__Environment:[[:space:]]*sandbox[[:space:]]*$' "$COMPOSE"; then
  pass "Paddle remains locked sandbox / AllowLive false"
else
  fail "PaddleCredentialGuard must stay backed by locked sandbox compose"
fi

if grep -qE 'SendGrid__UseSandbox:[[:space:]]*"false"' "$COMPOSE"; then
  pass "SendGrid UseSandbox locked false"
else
  fail "Production SendGrid must not use sandbox"
fi

if [[ -f "$PLANE" && -f "$CORS" && -f "$VALIDATOR" ]]; then
  pass "dedicated Production plane + CORS + validator types exist"
else
  fail "missing DeploymentPlane / ProductionCorsOrigins / ProductionSecurityValidator"
fi

if grep -q 'IsDedicatedProduction' "$VALIDATOR" \
  && grep -q 'DEV_TENANT_SLUG' "$VALIDATOR" \
  && grep -q 'ValidateDedicatedProductionRedis' "$VALIDATOR" \
  && grep -q 'ValidateDedicatedProductionCors' "$VALIDATOR" \
  && grep -q 'ValidateDedicatedProductionSendGrid' "$VALIDATOR" \
  && grep -q 'PaddleCredentialGuard.Validate' "$VALIDATOR"; then
  pass "validator covers plane, slug, Redis, CORS, SendGrid, Paddle"
else
  fail "ProductionSecurityValidator is missing dedicated-plane checks"
fi

if grep -q 'SetIsOriginAllowed(ProductionCorsOrigins.IsAllowed)' "$PROGRAM"; then
  pass "API uses Production CORS origin pattern on dedicated plane"
else
  fail "Program.cs must use ProductionCorsOrigins on dedicated plane"
fi

if grep -qE 'Cors__AllowedOrigins__1:[[:space:]]*""' "$COMPOSE" \
  && grep -qE 'Cors__AllowedOrigins__2:[[:space:]]*""' "$COMPOSE"; then
  pass "compose clears leftover appsettings CORS localhost slots"
else
  fail "compose must blank Cors__AllowedOrigins__1 and __2 so appsettings localhost cannot merge"
fi

if grep -q 'ValidateForDedicatedProduction' "$SENDGRID"; then
  pass "independent Production SendGrid validator exists"
else
  fail "SendGrid dedicated Production validation missing"
fi

if grep -q 'IsUatPublicHost' "$PADDLE" && grep -q 'AllowLive' "$PADDLE"; then
  pass "PaddleCredentialGuard still refuses UAT hosts and live mix"
else
  fail "PaddleCredentialGuard must not be weakened"
fi

if [[ -f "$ENV_EXAMPLE" ]] \
  && ! grep -qE '^[[:space:]]*[A-Za-z0-9_.]+=[^#[:space:]]+' "$ENV_EXAMPLE" \
  && grep -qi 'do not set DEV_TENANT_SLUG' "$ENV_EXAMPLE"; then
  pass ".env.production.example remains names-only and forbids DEV_TENANT_SLUG"
else
  fail ".env.production.example contract drifted"
fi

if find "$ROOT_DIR" -maxdepth 1 -name '.env' -o -name '.env.production' | grep -q .; then
  fail "repository root must not contain Production .env"
else
  pass "no Production .env in repository root"
fi

if [[ -f "$UAT" ]] && grep -qE '^name:[[:space:]]*cohestra-uat[[:space:]]*$' "$UAT" \
  && ! grep -q 'requirepass' "$UAT" \
  && ! grep -q 'Cohestra__DeploymentPlane' "$UAT"; then
  pass "UAT compose remains passwordless Redis without Production plane marker"
else
  fail "UAT compose isolation drifted"
fi

if [[ -f "$WF" ]] \
  && grep -qE 'name:[[:space:]]*Deploy UAT' "$WF" \
  && grep -qE 'group:[[:space:]]*deploy-uat' "$WF" \
  && ! grep -qE 'environment:[[:space:]]*production' "$WF"; then
  pass "UAT deploy workflow unchanged"
else
  fail "deploy.yml must stay uat-only"
fi

if [[ -f "$DOCS" && -f "$LAUNCH" ]] \
  && grep -q 'OWNER_GATE' "$DOCS" \
  && grep -qi 'classified' "$DOCS" \
  && grep -q 'NO-GO' "$DOCS" \
  && grep -q '46.4' "$LAUNCH"; then
  pass "owner procedure and launch program document 46.4"
else
  fail "missing production-runtime-secrets.md or launch-program 46.4 section"
fi

# Telemetry / 46.9 ownership freeze — isolated 46.4 must not add OTel SDK usage or 46.9 audit files.
# After 46.6 and 46.9 land, those files are expected and the freeze retires.
# Compare trees (two-dot) so shallow CI checkouts do not need a merge-base.
if [[ -f "$ROOT_DIR/_bmad-output/implementation-artifacts/46-6-production-observability-instrumentation.md" \
   && -f "$ROOT_DIR/_bmad-output/implementation-artifacts/46-9-production-security-and-tenant-isolation-hardening.md" ]]; then
  pass "46.6 / 46.9 stories landed; isolated 46.4 ownership freeze retired"
else
  if ! git -C "$ROOT_DIR" rev-parse --verify origin/main >/dev/null 2>&1; then
    git -C "$ROOT_DIR" fetch --no-tags --depth=1 origin main:refs/remotes/origin/main >/dev/null 2>&1 || true
  fi
  if ! git -C "$ROOT_DIR" rev-parse --verify origin/main >/dev/null 2>&1; then
    fail "origin/main is required to prove the 46.6 / 46.9 ownership freeze"
  elif git -C "$ROOT_DIR" diff --name-only origin/main HEAD | grep -qE 'OpenTelemetry|46-9-|46-6-'; then
    fail "46.4 must not edit 46.6 telemetry or 46.9 audit artifacts"
  else
    pass "no 46.6 / 46.9 owned artifact edits versus origin/main"
  fi
fi

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "Production runtime / secrets isolation contract PASS"
