#!/usr/bin/env bash
# Host-side HTTP-01 renew for thesocialcollectivesg.com ONLY.
#
# Certbot runs in a throwaway container. nginx -t and nginx -s reload run on
# the HOST via docker exec — never inside a certbot deploy-hook (that container
# has no Docker socket).
#
# Reload only when live fullchain fingerprint changes.
# Does not recreate lead-generation-crm-nginx-1.
# Does not touch uat.cohestra.app / *.uat.cohestra.app.
#
# Live run (owner-authorized only):
#   COHESTRA_AUTHORIZE_EXISTING_RENEW=1 bash deploy/host-proxy/renew-existing-site-http01.sh
# Dry-run (still talks to Let's Encrypt staging if authorized):
#   COHESTRA_AUTHORIZE_EXISTING_RENEW=1 bash deploy/host-proxy/renew-existing-site-http01.sh --dry-run
#
# Do not enable the systemd timer without a separate owner authorization.

set -euo pipefail

EXISTING_CERT_NAME="${EXISTING_CERT_NAME:-thesocialcollectivesg.com}"
EDGE_NGINX="${EXISTING_EDGE_NGINX_CONTAINER:-lead-generation-crm-nginx-1}"
CERT_VOL="${COHESTRA_EDGE_CERTBOT_CERTS_VOLUME:-lead-generation-crm_certbot_certs}"
WWW_VOL="${COHESTRA_EDGE_CERTBOT_WWW_VOLUME:-lead-generation-crm_certbot_www}"
LIVE_FULLCHAIN="/etc/letsencrypt/live/${EXISTING_CERT_NAME}/fullchain.pem"

cohestra_docker() { docker "$@"; }

refuse_wrong_lineage() {
  case "$EXISTING_CERT_NAME" in
    *uat.cohestra.app*|*"*"*|cohestra.app|www.cohestra.app)
      echo "REFUSE: cert-name must be the existing site lineage only (got ${EXISTING_CERT_NAME})" >&2
      return 1
      ;;
  esac
  if [[ "$EXISTING_CERT_NAME" != "thesocialcollectivesg.com" ]]; then
    echo "REFUSE: locked cert-name is thesocialcollectivesg.com" >&2
    return 1
  fi
}

fingerprint_live_fullchain() {
  cohestra_docker exec "$EDGE_NGINX" sha256sum "$LIVE_FULLCHAIN" | awk '{print $1}'
}

run_certbot_renew() {
  local extra=()
  if [[ "${1:-}" == "--dry-run" ]]; then
    extra+=(--dry-run)
  fi
  # Reload is host-side after fingerprint compare. Do not hook certbot.
  cohestra_docker run --rm \
    -v "${CERT_VOL}:/etc/letsencrypt" \
    -v "${WWW_VOL}:/var/www/certbot" \
    certbot/certbot:latest \
    renew --cert-name "$EXISTING_CERT_NAME" --non-interactive "${extra[@]}"
}

nginx_test() {
  cohestra_docker exec "$EDGE_NGINX" nginx -t
}

nginx_reload() {
  cohestra_docker exec "$EDGE_NGINX" nginx -s reload
}

renew_existing_site_http01() {
  local mode="${1:-}"
  refuse_wrong_lineage || return 1

  if [[ "${COHESTRA_AUTHORIZE_EXISTING_RENEW:-}" != "1" ]]; then
    echo "REFUSE: set COHESTRA_AUTHORIZE_EXISTING_RENEW=1 for a live or dry-run renew" >&2
    echo "RESULT=REFUSED_NO_AUTH"
    return 1
  fi

  local before after
  before=$(fingerprint_live_fullchain) || {
    echo "RESULT=FINGERPRINT_FAIL"
    return 1
  }
  echo "fingerprint_before=${before}"

  if ! run_certbot_renew "$mode"; then
    echo "RESULT=CERTBOT_FAIL"
    return 1
  fi

  if [[ "$mode" == "--dry-run" ]]; then
    echo "RESULT=DRY_RUN_OK"
    echo "reload=skipped"
    return 0
  fi

  after=$(fingerprint_live_fullchain) || {
    echo "RESULT=FINGERPRINT_FAIL"
    return 1
  }
  echo "fingerprint_after=${after}"

  if [[ "$before" == "$after" ]]; then
    echo "RESULT=NOOP"
    echo "reload=skipped"
    return 0
  fi

  if ! nginx_test; then
    echo "RESULT=NGINX_TEST_FAIL"
    echo "reload=skipped — new lineage is on disk; nginx still serves the previous in-memory cert until a successful reload"
    return 2
  fi

  nginx_reload
  echo "RESULT=RENEWED"
  echo "reload=done"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  if [[ "$(id -u)" -eq 0 && "${COHESTRA_ALLOW_ROOT:-}" != "1" ]]; then
    echo "REFUSE: run as deploy, not root." >&2
    exit 1
  fi
  renew_existing_site_http01 "${1:-}"
fi
