#!/usr/bin/env bash
# Classify local → UAT env keys. Never print secret values.
# Usage (owner workstation, with local .env):
#   bash deploy/classify-uat-env.sh
#   bash deploy/classify-uat-env.sh /path/to/.env

set -euo pipefail

ENV_FILE="${1:-}"
if [[ -z "$ENV_FILE" && -f .env ]]; then
  ENV_FILE=".env"
fi
if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

presence() {
  local value="${1:-}"
  if [[ -z "${value// }" ]]; then
    echo "MISSING"
  else
    echo "PRESENT"
  fi
}

echo "== Local → UAT env classification (no secret values) =="
printf '%-40s %-18s %s\n' "KEY" "ACTION" "PRESENCE"

row() {
  local key="$1" action="$2" value="${3:-}"
  printf '%-40s %-18s %s\n' "$key" "$action" "$(presence "$value")"
}

row "PUBLIC_BASE_URL" "CHANGE FOR UAT" "${PUBLIC_BASE_URL:-}"
row "NEXT_PUBLIC_API_URL" "CHANGE FOR UAT" "${NEXT_PUBLIC_API_URL:-}"
row "NEXT_PUBLIC_PADDLE_RETURN_ORIGIN" "CHANGE FOR UAT" "${NEXT_PUBLIC_PADDLE_RETURN_ORIGIN:-}"
row "EmailBranding__WebsiteUrl" "CHANGE FOR UAT" "${EmailBranding__WebsiteUrl:-}"
row "Cors / PublicWeb__BaseUrl" "CHANGE FOR UAT" "${PublicWeb__BaseUrl:-${PUBLIC_BASE_URL:-}}"
row "LETSENCRYPT_EMAIL" "CHANGE FOR UAT" "${LETSENCRYPT_EMAIL:-}"
row "DROPLET_IP" "CHANGE FOR UAT" "${DROPLET_IP:-}"
row "HTTPS_DOMAIN" "CHANGE FOR UAT" "${HTTPS_DOMAIN:-}"
row "NGINX_CONFIG_PATH" "CHANGE FOR UAT" "${NGINX_CONFIG_PATH:-}"
row "WEB_HOST_PORT" "PRESERVE" "${WEB_HOST_PORT:-}"
row "API_HOST_PORT" "PRESERVE" "${API_HOST_PORT:-}"
row "NGINX_HOST_PORT" "PRESERVE" "${NGINX_HOST_PORT:-}"
row "Paddle__WebhookSecret" "CHANGE FOR UAT" "${Paddle__WebhookSecret:-}"

row "Paddle__ApiKey" "PRESERVE" "${Paddle__ApiKey:-}"
row "Paddle__ClientToken" "PRESERVE" "${Paddle__ClientToken:-}"
row "Paddle__Environment" "PRESERVE" "${Paddle__Environment:-}"
row "Paddle__PriceCoreMonthly" "PRESERVE" "${Paddle__PriceCoreMonthly:-}"
row "Paddle__PriceCoreAnnual" "PRESERVE" "${Paddle__PriceCoreAnnual:-}"
row "Paddle__PriceProMonthly" "PRESERVE" "${Paddle__PriceProMonthly:-}"
row "Paddle__PriceProAnnual" "PRESERVE" "${Paddle__PriceProAnnual:-}"
row "Paddle__TrialPeriodDays" "PRESERVE" "${Paddle__TrialPeriodDays:-}"
row "SendGrid__ApiKey" "PRESERVE" "${SendGrid__ApiKey:-}"
row "SendGrid__FromEmail" "PRESERVE" "${SendGrid__FromEmail:-}"
row "SendGrid__FromName" "PRESERVE" "${SendGrid__FromName:-}"
row "SendGrid__RegistrationFromEmail" "PRESERVE" "${SendGrid__RegistrationFromEmail:-}"
row "SendGrid__RegistrationFromName" "PRESERVE" "${SendGrid__RegistrationFromName:-}"
row "EmailBranding__FooterLegalName" "PRESERVE" "${EmailBranding__FooterLegalName:-}"
row "JWT_ISSUER" "PRESERVE" "${JWT_ISSUER:-}"
row "JWT_AUDIENCE" "PRESERVE" "${JWT_AUDIENCE:-}"
row "POSTGRES_DB" "PRESERVE" "${POSTGRES_DB:-}"
row "POSTGRES_USER" "PRESERVE" "${POSTGRES_USER:-}"

row "POSTGRES_PASSWORD" "PRESERVE" "${POSTGRES_PASSWORD:-}"
row "JWT_SIGNING_KEY" "PRESERVE" "${JWT_SIGNING_KEY:-}"

row "SelfServeSignup__Recaptcha__Enabled" "DEFER" "${SelfServeSignup__Recaptcha__Enabled:-}"
row "SelfServeSignup__Recaptcha__SecretKey" "DEFER" "${SelfServeSignup__Recaptcha__SecretKey:-}"
row "NEXT_PUBLIC_RECAPTCHA_ENABLED" "DEFER" "${NEXT_PUBLIC_RECAPTCHA_ENABLED:-}"
row "NEXT_PUBLIC_RECAPTCHA_SITE_KEY" "DEFER" "${NEXT_PUBLIC_RECAPTCHA_SITE_KEY:-}"
row "Intelligence__ApiKey" "DEFER" "${Intelligence__ApiKey:-}"
row "Intelligence__SynthesisEnabled" "DEFER" "${Intelligence__SynthesisEnabled:-}"

row "DEV_TENANT_SLUG" "REMOVE LOCAL-ONLY" "${DEV_TENANT_SLUG:-}"
row "OperatorSeed__Enabled" "REMOVE LOCAL-ONLY" "${OperatorSeed__Enabled:-}"
row "OperatorSeed__Password" "REMOVE LOCAL-ONLY" "${OperatorSeed__Password:-}"
row "DemoDataSeed__Enabled" "REMOVE LOCAL-ONLY" "${DemoDataSeed__Enabled:-}"
row "LoadTestSeed__Enabled" "REMOVE LOCAL-ONLY" "${LoadTestSeed__Enabled:-}"
row "PlatformAdminSeed__Enabled" "REMOVE LOCAL-ONLY" "${PlatformAdminSeed__Enabled:-}"
row "POSTGRES_HOST_PORT" "REMOVE LOCAL-ONLY" "${POSTGRES_HOST_PORT:-}"
row "REDIS_HOST_PORT" "REMOVE LOCAL-ONLY" "${REDIS_HOST_PORT:-}"
row "NGINX_HTTP_PORT" "REMOVE LOCAL-ONLY" "${NGINX_HTTP_PORT:-}"
row "SelfServeSignup__Recaptcha__TestBypassToken" "REMOVE LOCAL-ONLY" "${SelfServeSignup__Recaptcha__TestBypassToken:-}"

echo ""
echo "Compose on the droplet sets postgres/redis hosts to service names."
echo "Do not copy local Host=localhost connection strings onto UAT."
echo "Shared-host UAT host binds stay 127.0.0.1:3100 / 5100 / 8180 after port audit."
echo "Do not publish Postgres or Redis. Do not bind Cohestra nginx to :80/:443."
if [[ -n "${Paddle__ApiKey:-}" ]]; then
  bash "$(dirname "$0")/classify-paddle-env.sh" "${ENV_FILE:-}"
fi
