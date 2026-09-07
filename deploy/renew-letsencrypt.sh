#!/usr/bin/env bash
set -euo pipefail

# Renew Let's Encrypt certificates (safe to run from cron weekly).
# Usage: bash deploy/renew-letsencrypt.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/cohestra-uat-guards.sh"
refuse_legacy_compose_project || exit 1
refuse_shared_host_cohestra_tls || exit 1

bash "$ROOT_DIR/deploy/uat-compose.sh" --profile tools run --rm certbot renew --webroot -w /var/www/certbot
bash "$ROOT_DIR/deploy/uat-compose.sh" exec nginx nginx -s reload

echo "Certificate renewal check complete."
