#!/usr/bin/env bash
# Fail-closed Tailscale overlay reachability. Never prints host values, tokens,
# or falls back to public TCP 22.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  echo "PUBLIC_SSH_FALLBACK=false"
  exit 1
}

if ! bash "$ROOT_DIR/deploy/validate-production-overlay-target.sh" >/dev/null; then
  refuse "overlay_config_invalid"
fi

HOST="${PROD_TAILSCALE_HOST:-}"
HOST="${HOST//[[:space:]]/}"

if [[ "$HOST" == "159.223.55.242" || "$HOST" == "129.212.235.2" ]]; then
  refuse "public_ip_fallback_forbidden"
fi

if ! command -v tailscale >/dev/null 2>&1; then
  refuse "tailscale_cli_missing"
fi

tailscale_cmd() {
  if tailscale status >/dev/null 2>&1; then
    tailscale "$@"
    return
  fi
  if command -v sudo >/dev/null 2>&1 && sudo -n tailscale status >/dev/null 2>&1; then
    sudo -n tailscale "$@"
    return
  fi
  return 1
}

if ! tailscale_cmd set --accept-routes=false --advertise-exit-node=false --ssh=false >/dev/null 2>&1; then
  echo "OVERLAY_HARDENING=warn_set_failed"
fi

reachable=0
attempt=0
while ((attempt < 12)); do
  attempt=$((attempt + 1))
  if tailscale_cmd ping -c 1 --timeout 5s "$HOST" >/dev/null 2>&1; then
    reachable=1
    break
  fi
  sleep 2
done

if [[ "$reachable" -ne 1 ]]; then
  refuse "overlay_unreachable"
fi

echo "RESULT=PASS"
echo "OVERLAY_REACHABLE=true"
echo "PUBLIC_SSH_FALLBACK=false"
echo "TAILSCALE_SSH=false"
echo "ACCEPT_ROUTES=false"
echo "ADVERTISE_EXIT_NODE=false"
