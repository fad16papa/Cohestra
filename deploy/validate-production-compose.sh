#!/usr/bin/env bash
# Repo-side Production compose contract (Story 46.1).
# Does not deploy. Does not talk to a droplet. Does not create secrets.
#
# Usage: bash deploy/validate-production-compose.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT_DIR/docker-compose.production.yml"
ENV_EXAMPLE="$ROOT_DIR/.env.production.example"
OVERLAY="$ROOT_DIR/docker-compose.prod.yml"
UAT="$ROOT_DIR/docker-compose.uat.yml"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
DI="$ROOT_DIR/src/Infrastructure/DependencyInjection.cs"
COLLECTOR="$ROOT_DIR/deploy/otel/production-collector.yaml"
WRAPPER="$ROOT_DIR/deploy/production-compose.sh"
PROD_WF="$ROOT_DIR/.github/workflows/deploy-production.yml"
DOCS="$ROOT_DIR/docs/deploy/production-launch-program.md"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "== Cohestra Production compose contract =="

if [[ -f "$COMPOSE" ]]; then
  pass "docker-compose.production.yml exists"
else
  fail "Missing docker-compose.production.yml"
  echo "Passed: $PASS  Failed: $FAIL"
  exit 1
fi

if grep -qE '^name:[[:space:]]*cohestra-production[[:space:]]*$' "$COMPOSE"; then
  pass "Compose project name is cohestra-production"
else
  fail "Compose project name must be exactly cohestra-production"
fi

for name in cohestra-prod-web cohestra-prod-api cohestra-prod-postgres cohestra-prod-redis cohestra-prod-nginx cohestra-prod-otelcol; do
  if grep -qE "container_name:[[:space:]]*${name}[[:space:]]*$" "$COMPOSE"; then
    pass "container_name ${name}"
  else
    fail "Missing container_name ${name}"
  fi
done

if grep -qE 'image:[[:space:]]*postgres:16' "$COMPOSE"; then
  pass "PostgreSQL 16 image (OPTION A self-hosted)"
else
  fail "Production postgres must use postgres:16"
fi

if grep -qiE 'digitalocean.*managed|managed postgresql|OPTION B' "$COMPOSE"; then
  fail "OPTION B managed PostgreSQL must not be implemented in 46.1"
else
  pass "OPTION B is not implemented"
fi

if grep -q 'name: cohestra_production_internal' "$COMPOSE"; then
  pass "Dedicated network cohestra_production_internal"
else
  fail "Missing dedicated network cohestra_production_internal"
fi

if grep -vE '^[[:space:]]*#' "$COMPOSE" | grep -qE 'cohestra_uat|lead-generation-crm'; then
  fail "Production compose must not reference UAT or lead-generation-crm networks"
else
  pass "Production compose does not join UAT/CRM networks"
fi

# Postgres/Redis must not have a ports: block at all.
if awk '
  $0 ~ /^  (postgres|redis):/ { svc=$1; gsub(":","",svc); in_svc=1; next }
  in_svc && $0 ~ /^  [a-z]/ && $0 !~ /^  (postgres|redis):/ { in_svc=0 }
  in_svc && $0 ~ /^    ports:/ { found=1 }
  END { exit found+0 }
' "$COMPOSE"; then
  pass "Postgres and Redis have no host ports"
else
  fail "Postgres or Redis still publishes a host port"
fi

if grep -qE '5432:' "$COMPOSE"; then
  fail "Compose must not publish host port 5432"
else
  pass "No public 5432 binding"
fi

if grep -qE '6379:' "$COMPOSE"; then
  fail "Compose must not publish host port 6379"
else
  pass "No public 6379 binding"
fi

if awk '
  $0 ~ /^  (api|web):/ { svc=$1; gsub(":","",svc); in_svc=1; next }
  in_svc && $0 ~ /^  [a-z]/ && $0 !~ /^  (api|web):/ { in_svc=0 }
  in_svc && $0 ~ /^    ports:/ { found=1 }
  END { exit found+0 }
' "$COMPOSE"; then
  pass "API and web do not publish host ports"
else
  fail "API or web still publishes a host port (nginx is the public edge)"
fi

if grep -qE '^[[:space:]]*-[[:space:]]*"80:80"' "$COMPOSE"; then
  pass "nginx publishes 80:80 as Production HTTP edge"
else
  fail "nginx must publish 80:80 (TLS 443 is Story 46.13)"
fi

if grep -q './deploy/nginx/app.conf:/etc/nginx/conf.d/default.conf' "$COMPOSE" \
  && ! grep -q 'NGINX_CONFIG_PATH' "$COMPOSE"; then
  pass "nginx config is pinned to deploy/nginx/app.conf"
else
  fail "Production nginx must pin ./deploy/nginx/app.conf (no NGINX_CONFIG_PATH override)"
fi

if grep -qE '443:' "$COMPOSE"; then
  fail "Story 46.1 must not publish 443 (TLS is 46.13)"
else
  pass "No host 443 publish yet"
fi

if grep -qE '^[[:space:]]*(worker|hangfire|jobs):' "$COMPOSE"; then
  fail "No worker/hangfire/jobs service is allowed"
else
  pass "No worker service"
fi

ALLOWED='postgres redis api web nginx otelcol'
set +e
python3 - "$COMPOSE" "$ALLOWED" <<'PY'
import re, sys
path, allowed = sys.argv[1], set(sys.argv[2].split())
text = open(path).read()
body = text.split("services:", 1)[1].split("\nnetworks:", 1)[0]
names = re.findall(r"^  ([a-z0-9_-]+):$", body, re.M)
extra = [n for n in names if n not in allowed]
missing = [n for n in sorted(allowed) if n not in names]
if extra or missing:
    if extra:
        print("EXTRA_SERVICES " + " ".join(extra))
    if missing:
        print("MISSING_SERVICES " + " ".join(missing))
    sys.exit(1)
print("SERVICE_SET_OK")
sys.exit(0)
PY
svc_rc=$?
set -e
if [[ "$svc_rc" -eq 0 ]]; then
  pass "Service set is postgres redis api web nginx otelcol"
else
  fail "Unexpected Production compose services"
fi

if grep -q -- '--requirepass' "$COMPOSE" && grep -q 'REDIS_PASSWORD' "$COMPOSE" && ! grep -qE -- '--requirepass[[:space:]]+[^$]' "$COMPOSE"; then
  set +e
  python3 - "$COMPOSE" <<'PY'
import sys
lines = open(sys.argv[1]).read().splitlines()
for i, line in enumerate(lines):
    if "--requirepass" in line:
        nxt = next((ln.strip() for ln in lines[i + 1:] if ln.strip()), "")
        if "${REDIS_PASSWORD" not in nxt:
            print("REQUIREPASS_NEXT", nxt)
            sys.exit(1)
sys.exit(0)
PY
  rp_rc=$?
  set -e
  if [[ "$rp_rc" -eq 0 ]]; then
    pass "Redis requirepass uses REDIS_PASSWORD variable"
  else
    fail "Production Redis must requirepass \${REDIS_PASSWORD} (not a hardcoded password)"
  fi
else
  fail "Production Redis must requirepass \${REDIS_PASSWORD} (not a hardcoded password)"
fi

if grep -q 'password=${REDIS_PASSWORD' "$COMPOSE" || grep -q 'password=\${REDIS_PASSWORD' "$COMPOSE"; then
  pass "API Redis connection includes password variable"
else
  fail "API ConnectionStrings__Redis must include password=\${REDIS_PASSWORD}"
fi

if grep -qE 'ASPNETCORE_ENVIRONMENT:[[:space:]]*Production' "$COMPOSE"; then
  pass "API ASPNETCORE_ENVIRONMENT is Production"
else
  fail "API must lock ASPNETCORE_ENVIRONMENT=Production"
fi

for seed in OperatorSeed__Enabled PlatformAdminSeed__Enabled DemoDataSeed__Enabled LoadTestSeed__Enabled FollowUpDigest__Enabled; do
  if grep -qE "${seed}:[[:space:]]*\"false\"" "$COMPOSE"; then
    pass "${seed} locked false"
  else
    fail "${seed} must be locked false"
  fi
done

if grep -q 'DEV_TENANT_SLUG' "$COMPOSE"; then
  fail "DEV_TENANT_SLUG must be absent from Production compose"
else
  pass "DEV_TENANT_SLUG is unset/absent"
fi

if grep -qE 'Paddle__AllowLive:[[:space:]]*"false"' "$COMPOSE"; then
  pass "Paddle__AllowLive locked false"
else
  fail "Paddle live capability must stay false in 46.1"
fi

if grep -qE 'Paddle__Environment:[[:space:]]*sandbox[[:space:]]*$' "$COMPOSE" \
  && ! grep -qE 'Paddle__Environment:.*\$' "$COMPOSE"; then
  pass "Paddle environment is locked sandbox"
else
  fail "Paddle__Environment must be locked sandbox until 46.10 (not interpolatable)"
fi

if grep -q 'TestBypassToken\|NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN\|test-captcha-pass' "$COMPOSE"; then
  fail "Production compose must not inject recaptcha test bypass"
else
  pass "No recaptcha test bypass in Production compose"
fi

if [[ -f "$COLLECTOR" ]] && grep -q 'otlp:' "$COLLECTOR" \
  && ! grep -vE '^[[:space:]]*#' "$COLLECTOR" | grep -qiE 'grafana|prometheus|loki|tempo|alertmanager'; then
  pass "OTel collector contract is OTLP-only (no dashboards/alerts)"
else
  fail "deploy/otel/production-collector.yaml must receive OTLP without Grafana/Prometheus/Loki/Tempo"
fi

if grep -q 'grafana\|prometheus\|loki\|tempo' "$COMPOSE"; then
  fail "46.1 must not add Grafana/Prometheus/Loki/Tempo services"
else
  pass "No dashboard/backend services in 46.1"
fi

if [[ -f "$DI" ]] \
  && grep -q 'AddHostedService<OutboxDispatcherHostedService>' "$DI" \
  && grep -q 'AddHostedService<BillingJobsHostedService>' "$DI" \
  && grep -q 'AddHostedService<ActivityExpirationHostedService>' "$DI" \
  && grep -q 'AddHostedService<FollowUpDigestHostedService>' "$DI"; then
  pass "API still owns hosted jobs"
else
  fail "Hosted jobs must remain registered in DependencyInjection.cs"
fi

if [[ -f "$ENV_EXAMPLE" ]]; then
  pass ".env.production.example exists"
  for name in POSTGRES_PASSWORD REDIS_PASSWORD JWT_SIGNING_KEY SendGrid__ApiKey PUBLIC_BASE_URL GIT_SHA OTEL_EXPORTER_OTLP_ENDPOINT Paddle__AllowLive; do
    if grep -q "$name" "$ENV_EXAMPLE"; then
      pass "env example names ${name}"
    else
      fail "env example missing name ${name}"
    fi
  done
  if grep -qE 'DEV_TENANT_SLUG' "$ENV_EXAMPLE" && grep -qiE 'do not set DEV_TENANT_SLUG' "$ENV_EXAMPLE"; then
    pass "env example forbids DEV_TENANT_SLUG"
  elif grep -qE '^[[:space:]]*DEV_TENANT_SLUG=' "$ENV_EXAMPLE"; then
    fail "DEV_TENANT_SLUG must not be assigned in Production env example"
  else
    pass "DEV_TENANT_SLUG is not assigned"
  fi
  if grep -qE 'SG\.|pdl_|BEGIN (OPENSSH |RSA )?PRIVATE KEY|sk_live|live_[A-Za-z0-9]{8,}' "$ENV_EXAMPLE"; then
    fail ".env.production.example contains a secret-like value"
  else
    pass ".env.production.example has names only (no secret-like values)"
  fi
  if grep -qE '^[[:space:]]*#?[[:space:]]*PROD_DROPLET_' "$ENV_EXAMPLE"; then
    fail "PROD_DROPLET_* host/SSH names must not be listed in the application env template (Story 46.3)"
  else
    pass "env example does not list PROD_DROPLET_* SSH/host secrets"
  fi
  if grep -qE '^[[:space:]]*[A-Za-z0-9_.]+=[^#[:space:]]+' "$ENV_EXAMPLE"; then
    fail ".env.production.example must not assign values"
  else
    pass ".env.production.example does not assign values"
  fi
else
  fail "Missing .env.production.example"
fi

if [[ -f "$OVERLAY" ]] && grep -q 'Launch-hardening overlay' "$OVERLAY" && grep -q 'local overlay' "$OVERLAY"; then
  pass "docker-compose.prod.yml documented as local overlay"
else
  fail "docker-compose.prod.yml must remain a local overlay, not Production topology"
fi

if [[ -f "$UAT" ]] && grep -qE '^name:[[:space:]]*cohestra-uat[[:space:]]*$' "$UAT" \
  && grep -q 'container_name: cohestra-uat-redis' "$UAT" \
  && ! grep -q 'requirepass' "$UAT"; then
  pass "UAT compose project and passwordless Redis unchanged"
else
  fail "docker-compose.uat.yml Redis/project contract drifted"
fi

if [[ -f "$WF" ]] \
  && grep -qE 'name:[[:space:]]*Deploy UAT' "$WF" \
  && grep -qE 'group:[[:space:]]*deploy-uat' "$WF" \
  && grep -qE 'environment:[[:space:]]*uat' "$WF" \
  && ! grep -qE 'group:[[:space:]]*deploy-production' "$WF" \
  && ! grep -qE 'environment:[[:space:]]*production' "$WF"; then
  pass "UAT deploy workflow remains uat-only (no Production auto-deploy)"
else
  fail "deploy.yml must stay Environment uat / deploy-uat with no production environment"
fi

if [[ -f "$PROD_WF" ]] && bash "$ROOT_DIR/deploy/validate-deploy-production-workflow.sh" >/dev/null; then
  pass "Production CD workflow matches the 46.3 contract"
else
  fail "deploy-production.yml must exist and satisfy validate-deploy-production-workflow.sh"
fi

prod_env_ok=1
while IFS= read -r wf; do
  base="$(basename "$wf")"
  if [[ "$base" == "deploy-production.yml" ]]; then
    continue
  fi
  if grep -qE '^[[:space:]]*environment:[[:space:]]*production[[:space:]]*$' "$wf"; then
    prod_env_ok=0
  fi
done < <(find "$ROOT_DIR/.github/workflows" -name '*.yml' -print)
if [[ "$prod_env_ok" -eq 1 ]]; then
  pass "Only deploy-production.yml may reference Environment production"
else
  fail "UAT or other workflows must not reference Environment production"
fi

if [[ -f "$WRAPPER" ]] && grep -q -- '--project-name cohestra-production' "$WRAPPER"; then
  pass "production-compose.sh locks project cohestra-production"
else
  fail "deploy/production-compose.sh must force --project-name cohestra-production"
fi

if [[ -f "$WRAPPER" ]] && grep -q -- '--file' "$WRAPPER" && grep -q 'COHESTRA_SHARED_HOST_UAT' "$WRAPPER"; then
  pass "production-compose.sh refuses extra compose files and UAT shared host"
else
  fail "production-compose.sh must refuse -f/--file and COHESTRA_SHARED_HOST_UAT=true"
fi

if [[ -x "$WRAPPER" ]] || [[ -f "$WRAPPER" ]]; then
  set +e
  wrap_out="$(bash "$WRAPPER" -p sneaky config 2>&1)"
  wrap_rc=$?
  set -e
  if [[ "$wrap_rc" -ne 0 ]] && grep -q 'REFUSE' <<<"$wrap_out"; then
    pass "production-compose.sh refuses -p override"
  else
    fail "production-compose.sh must refuse -p / --project-name"
  fi
  set +e
  wrap_f="$(bash "$WRAPPER" -f docker-compose.uat.yml config 2>&1)"
  wrap_f_rc=$?
  wrap_feq="$(bash "$WRAPPER" -f=docker-compose.uat.yml config 2>&1)"
  wrap_feq_rc=$?
  wrap_envf="$(bash "$WRAPPER" --env-file .env.uat.example config 2>&1)"
  wrap_envf_rc=$?
  set -e
  if [[ "$wrap_f_rc" -ne 0 ]] && grep -q 'REFUSE' <<<"$wrap_f" \
    && [[ "$wrap_feq_rc" -ne 0 ]] && grep -q 'REFUSE' <<<"$wrap_feq" \
    && [[ "$wrap_envf_rc" -ne 0 ]] && grep -q 'REFUSE' <<<"$wrap_envf"; then
    pass "production-compose.sh refuses -f override"
  else
    fail "production-compose.sh must refuse extra -f compose files"
  fi
  set +e
  wrap_uat="$(COHESTRA_SHARED_HOST_UAT=true bash "$WRAPPER" config 2>&1)"
  wrap_uat_rc=$?
  set -e
  if [[ "$wrap_uat_rc" -ne 0 ]] && grep -q 'REFUSE' <<<"$wrap_uat"; then
    pass "production-compose.sh refuses UAT shared-host flag"
  else
    fail "production-compose.sh must refuse COHESTRA_SHARED_HOST_UAT=true"
  fi
  set +e
  wrap_run="$(bash "$WRAPPER" run --publish 5432:5432 postgres 2>&1)"
  wrap_run_rc=$?
  set -e
  if [[ "$wrap_run_rc" -ne 0 ]] && grep -q 'REFUSE' <<<"$wrap_run"; then
    pass "production-compose.sh refuses ad-hoc run/publish"
  else
    fail "production-compose.sh must refuse run/exec and publish overrides"
  fi
  set +e
  wrap_out="$(bash "$WRAPPER" config -o /tmp/cohestra-prod-compose.yml 2>&1)"
  wrap_out_rc=$?
  set -e
  if [[ "$wrap_out_rc" -ne 0 ]] && grep -q 'REFUSE' <<<"$wrap_out"; then
    pass "production-compose.sh refuses config --output"
  else
    fail "production-compose.sh must refuse config --output/-o"
  fi
fi

if [[ -f "$DOCS" ]] \
  && grep -q 'docker-compose.production.yml' "$DOCS" \
  && grep -q 'cohestra-production' "$DOCS" \
  && grep -qi 'dedicated droplet' "$DOCS" \
  && grep -qi 'forbidden' "$DOCS" \
  && grep -q 'NO-GO' "$DOCS"; then
  pass "production-launch-program.md states compose contract and NO-GO"
else
  fail "docs/deploy/production-launch-program.md must name compose file, project, dedicated droplet, NO-GO"
fi

GI="$ROOT_DIR/.gitignore"
if [[ -f "$GI" ]] && grep -qE '^\.env\.production$' "$GI" \
  && grep -qE '^\.env\.production\.\*$' "$GI" \
  && grep -qE '^!\.env\.production\.example$' "$GI"; then
  pass ".gitignore ignores .env.production"
else
  fail ".gitignore must ignore .env.production (keep .env.production.example tracked)"
fi

# docker compose config when Docker exists — never print interpolated secrets.
if command -v docker >/dev/null 2>&1; then
  cfg=$(mktemp)
  cfg_json="${cfg}.json"
  set +e
  export POSTGRES_PASSWORD=ci-contract
  export REDIS_PASSWORD=ci-contract
  export JWT_SIGNING_KEY=ci-contract-jwt-signing-key-32chars
  export PUBLIC_BASE_URL=http://example.invalid
  export SendGrid__ApiKey=ci-contract-sendgrid
  export SendGrid__FromEmail=noreply@example.invalid
  docker compose -f "$COMPOSE" --project-name cohestra-production config >"$cfg" 2>"${cfg}.err"
  yaml_rc=$?
  docker compose -f "$COMPOSE" --project-name cohestra-production config --format json >"$cfg_json" 2>>"${cfg}.err"
  json_rc=$?
  unset POSTGRES_PASSWORD REDIS_PASSWORD JWT_SIGNING_KEY PUBLIC_BASE_URL SendGrid__ApiKey SendGrid__FromEmail
  set -e
  if [[ "$yaml_rc" -ne 0 ]]; then
    fail "docker compose config failed (stderr suppressed to avoid secret leakage)"
  else
    pass "docker compose config parses"
    set +e
    if [[ "$json_rc" -eq 0 ]]; then
      python3 - "$cfg_json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
services = data.get("services") or {}
failed = False
for name in ("postgres", "redis", "api", "web", "otelcol"):
    ports = services.get(name, {}).get("ports") or []
    if ports:
        print("PUBLISHED", name)
        failed = True
nginx_ports = services.get("nginx", {}).get("ports") or []
published = []
for p in nginx_ports:
    if isinstance(p, dict):
        published.append(str(p.get("published")))
    else:
        published.append(str(p))
if "80" not in published:
    print("NGINX_MISSING_80")
    failed = True
if "443" in published:
    print("NGINX_HAS_443")
    failed = True
if "worker" in services:
    print("WORKER_PRESENT")
    failed = True
sys.exit(1 if failed else 0)
PY
      render_rc=$?
    else
      if grep -qE 'published: ["'\'']?(5432|6379|443|8080|3000|4317|4318)' "$cfg"; then
        render_rc=1
      else
        render_rc=0
      fi
    fi
    set -e
    if [[ "$render_rc" -eq 0 ]]; then
      pass "Rendered compose publishes only nginx :80 (no 5432/6379/443/worker)"
    else
      fail "Rendered compose host-port contract failed"
    fi
  fi
  rm -f "$cfg" "${cfg}.err" "$cfg_json"
else
  if [[ "${CI:-}" == "true" ]]; then
    fail "docker required in CI to render Production compose config"
  else
    pass "docker not present — skipped compose config parse (CI image has Docker)"
  fi
fi

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "Production compose contract PASS"
