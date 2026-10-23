#!/usr/bin/env bash
# Owner-run Production Tailscale bootstrap. Cursor / Cloud Agent must not execute
# this against the live Production host. No auth keys, OAuth secrets, or owner
# credentials are embedded.

set -euo pipefail

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  exit 1
}

if [[ "${COHESTRA_BOOTSTRAP_UNDER_TEST:-}" == "1" ]]; then
  refuse "test_harness_must_not_install_live_tailscale"
fi

if [[ "$(id -u)" -ne 0 ]]; then
  refuse "must_run_as_root"
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  refuse "linux_only"
fi

if [[ ! -r /etc/os-release ]]; then
  refuse "os_release_missing"
fi
# shellcheck disable=SC1091
. /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  refuse "ubuntu_only"
fi

HOSTNAME_NOW="$(hostname -s 2>/dev/null || hostname)"
if [[ "$HOSTNAME_NOW" == *uat* || "$HOSTNAME_NOW" == *UAT* ]]; then
  refuse "uat_hostname_forbidden"
fi
if [[ "$HOSTNAME_NOW" != "cohestra-production" && "${COHESTRA_CONFIRM_PRODUCTION_HOST:-}" != "I_UNDERSTAND" ]]; then
  refuse "hostname_is_not_cohestra-production"
fi

if ip -4 addr show 2>/dev/null | grep -q '129.212.235.2'; then
  refuse "uat_public_ipv4_present_on_host"
fi

if command -v tailscale >/dev/null 2>&1; then
  if tailscale status --json >/dev/null 2>&1; then
    backend="$(tailscale status --json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin).get("BackendState",""))' || true)"
    if [[ "$backend" == "Running" ]]; then
      refuse "tailscale_already_running_owner_must_inspect"
    fi
  fi
else
  echo "Installing Tailscale from the official install script."
  echo "Review: https://tailscale.com/download/linux"
  curl -fsSL https://tailscale.com/install.sh | sh
fi

if ! command -v tailscale >/dev/null 2>&1; then
  refuse "tailscale_install_failed"
fi

echo "RESULT=INSTALLED_NOT_JOINED"
echo "CODE_PATH_IMPLEMENTED=true"
echo "LIVE_OVERLAY_BOOTSTRAPPED=false"
echo "EXIT_NODE=false"
echo "SUBNET_ROUTES=false"
echo "TAILSCALE_SSH=false"
echo "NODE_TAG=tag:cohestra-production"
echo
echo "OWNER ACTION REQUIRED from an approved owner session:"
echo "  sudo tailscale up --advertise-tags=tag:cohestra-production --accept-routes=false --advertise-exit-node=false --ssh=false"
echo
echo "Do not paste auth keys, OAuth secrets, or owner credentials into this script."
echo "Do not enable exit nodes, subnet routes, or Tailscale SSH."
echo "After join, record the 100.64.0.0/10 IPv4 as GitHub Environment variable PROD_TAILSCALE_HOST."
echo "Cursor must not become the Production SSH client."
