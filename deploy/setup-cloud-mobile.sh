#!/usr/bin/env bash
set -euo pipefail

# Cloud mobile testing: HTTPS nip.io + Story 14.3 signup defaults.
# Run on the DigitalOcean droplet after copying .env.cloud-mobile.example → .env
#
# Usage:
#   cp .env.cloud-mobile.example .env
#   nano .env
#   bash deploy/setup-cloud-mobile.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing. Copy .env.cloud-mobile.example to .env first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "ERROR: Set LETSENCRYPT_EMAIL in .env for Let's Encrypt."
  exit 1
fi

echo "== Cloud mobile setup =="
echo "Repo: $ROOT_DIR"

# Ensure signup-friendly defaults (idempotent).
ensure_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env 2>/dev/null; then
    return 0
  fi
  echo "${key}=${value}" >> .env
  echo "Added ${key} to .env"
}

ensure_env "SelfServeSignup__RegistrationClosed" "false"
ensure_env "SelfServeSignup__Recaptcha__Enabled" "false"
ensure_env "SelfServeSignup__Recaptcha__TestBypassToken" "test-captcha-pass"
ensure_env "NEXT_PUBLIC_RECAPTCHA_ENABLED" "false"
ensure_env "NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN" "test-captcha-pass"

echo ""
echo "== HTTPS (nip.io + Let's Encrypt) =="
bash deploy/setup-temporary-https.sh

set -a
# shellcheck disable=SC1091
source .env
set +a

echo ""
echo "== Smoke checks =="
bash deploy/uat-smoke.sh

echo ""
echo "== Mobile testing URLs =="
BASE="${PUBLIC_BASE_URL%/}"
echo "  Marketing:  ${BASE}/"
echo "  Signup:     ${BASE}/signup"
echo "  Pricing:    ${BASE}/pricing"
echo ""
echo "After signup, tenant dashboard:"
echo "  https://YOUR-SLUG.$(echo "${HTTPS_DOMAIN:-${DROPLET_IP//./-}.nip.io}")/dashboard"
echo ""
echo "See docs/deploy/cloud-mobile-testing.md for the full checklist."
