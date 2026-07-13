#!/usr/bin/env bash
set -euo pipefail

# Renew Let's Encrypt certificates (safe to run from cron weekly).
# Usage: bash deploy/renew-letsencrypt.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

docker compose -f docker-compose.uat.yml --profile tools run --rm certbot renew --webroot -w /var/www/certbot
docker compose -f docker-compose.uat.yml exec nginx nginx -s reload

echo "Certificate renewal check complete."
