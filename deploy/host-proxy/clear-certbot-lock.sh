#!/usr/bin/env bash
# Remove stale certbot lock from the shared edge cert volume.
# Safe only when NO certbot/certbot container is running.
#
# Usage (as deploy): bash deploy/host-proxy/clear-certbot-lock.sh

set -euo pipefail

CERT_VOL="${COHESTRA_EDGE_CERTBOT_CERTS_VOLUME:-lead-generation-crm_certbot_certs}"

if docker ps -q --filter ancestor=certbot/certbot | grep -q .; then
  echo "REFUSE: certbot container still running. Stop it first:" >&2
  docker ps --filter ancestor=certbot/certbot
  exit 1
fi

if ! docker volume inspect "$CERT_VOL" >/dev/null 2>&1; then
  echo "REFUSE: volume $CERT_VOL missing" >&2
  exit 1
fi

docker run --rm --entrypoint sh \
  -v "${CERT_VOL}:/etc/letsencrypt" \
  certbot/certbot:latest \
  -c 'rm -f /etc/letsencrypt/.certbot.lock /etc/letsencrypt/certbot.lock 2>/dev/null; if [ -f /etc/letsencrypt/.certbot.lock ]; then echo STALE_LOCK_REMAIN=YES; exit 1; else echo CERTBOT_LOCK=cleared; fi'

echo "OK: safe to run certbot again"
