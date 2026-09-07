#!/usr/bin/env bash
# Phased Story 19.1 live operations. Run ON the droplet as deploy.
# Never prints secrets, private keys, or the deploy Linux password.
# Do not apt upgrade / dist-upgrade / reboot from this script.
#
#   bash deploy/host-proxy/live-19-1.sh discover
#   bash deploy/host-proxy/live-19-1.sh backup
#   bash deploy/host-proxy/live-19-1.sh attach
#   bash deploy/host-proxy/live-19-1.sh verify
#
# discover = read-only. backup = host files only. attach = docker network connect.
# This script never starts Cohestra and never writes zz-cohestra-uat.conf.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PHASE="${1:-}"

usage() {
  echo "Usage: bash deploy/host-proxy/live-19-1.sh {discover|backup|attach|verify}" >&2
  exit 2
}

[[ -n "$PHASE" ]] || usage

case "$PHASE" in
  discover)
    echo "== PHASE discover (read-only) =="
    bash "$ROOT_DIR/deploy/host-proxy/verify-existing-app.sh"
    echo ""
    bash "$ROOT_DIR/deploy/host-proxy/inspect-existing-nginx.sh"
    echo ""
    echo "LIVE EDGE DISCOVERY: PASS if inspect completed and existing app verified."
    echo "Next: bash deploy/host-proxy/live-19-1.sh backup"
    ;;
  backup)
    echo "== PHASE backup (no reload) =="
    bash "$ROOT_DIR/deploy/host-proxy/verify-existing-app.sh"
    echo ""
    bash "$ROOT_DIR/deploy/host-proxy/backup-existing-nginx.sh"
    echo ""
    echo "Next: bash deploy/host-proxy/live-19-1.sh attach"
    ;;
  attach)
    echo "== PHASE attach (docker network connect only) =="
    bash "$ROOT_DIR/deploy/host-proxy/verify-existing-app.sh"
    echo ""
    if [[ ! -d "${COHESTRA_EDGE_BACKUP_DIR:-$HOME/cohestra-uat-edge-backups}" ]] \
      || ! ls "${COHESTRA_EDGE_BACKUP_DIR:-$HOME/cohestra-uat-edge-backups}"/*/MANIFEST.txt >/dev/null 2>&1; then
      echo "REFUSE: no nginx backup manifest under \$HOME/cohestra-uat-edge-backups. Run backup first." >&2
      exit 1
    fi
    bash "$ROOT_DIR/deploy/host-proxy/reconcile-edge-network.sh"
    echo ""
    bash "$ROOT_DIR/deploy/host-proxy/verify-existing-app.sh"
    echo ""
    echo "EDGE NETWORK attach completed. Existing app must still be PASS above."
    echo "Do not start Cohestra until env reconciliation is ready."
    echo "Do not add zz-cohestra-uat.conf until Cohestra internal acceptance."
    ;;
  verify)
    echo "== PHASE verify =="
    bash "$ROOT_DIR/deploy/host-proxy/verify-existing-app.sh"
    ;;
  *)
    usage
    ;;
esac
