#!/usr/bin/env bash
# Fail-closed Production Tailscale overlay configuration.
# Distinguishes inventory identity (PROD_DROPLET_HOST) from transport identity
# (PROD_TAILSCALE_HOST). Never prints configuration values.

set -euo pipefail

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  echo "PUBLIC_SSH_FALLBACK=false"
  exit 1
}

CLIENT_ID="${PROD_TAILSCALE_CLIENT_ID:-}"
AUDIENCE="${PROD_TAILSCALE_AUDIENCE:-}"
HOST="${PROD_TAILSCALE_HOST:-}"
PROD_PUBLIC_IP="159.223.55.242"
UAT_PUBLIC_IP="129.212.235.2"

CLIENT_ID="${CLIENT_ID//[[:space:]]/}"
AUDIENCE="${AUDIENCE//[[:space:]]/}"
HOST="${HOST//[[:space:]]/}"

missing=()
if [[ -z "$CLIENT_ID" ]]; then
  missing+=("PROD_TAILSCALE_CLIENT_ID")
fi
if [[ -z "$AUDIENCE" ]]; then
  missing+=("PROD_TAILSCALE_AUDIENCE")
fi
if [[ -z "$HOST" ]]; then
  missing+=("PROD_TAILSCALE_HOST")
fi
if ((${#missing[@]} > 0)); then
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=overlay_config_missing"
  echo "PUBLIC_SSH_FALLBACK=false"
  for name in "${missing[@]}"; do
    echo "MISSING_OVERLAY_CONFIG=${name}"
  done
  exit 1
fi

looks_like_secret() {
  local value="$1"
  [[ "$value" == tskey-* ]] && return 0
  [[ "$value" == *BEGIN*PRIVATE*KEY* ]] && return 0
  [[ "$value" == *BEGIN*OPENSSH* ]] && return 0
  [[ "$value" == *oauth_secret* ]] && return 0
  return 1
}

if looks_like_secret "$CLIENT_ID" || looks_like_secret "$AUDIENCE"; then
  refuse "reusable_secret_material_forbidden"
fi

if [[ "$HOST" == *:* ]] || [[ "$HOST" == *\[* ]]; then
  refuse "ipv6_or_port_substitution_forbidden"
fi

if [[ "$HOST" == *[!0-9.]* ]]; then
  refuse "hostname_substitution_forbidden"
fi

if [[ "$HOST" == "$PROD_PUBLIC_IP" ]]; then
  refuse "public_production_ipv4_is_inventory_not_transport"
fi
if [[ "$HOST" == "$UAT_PUBLIC_IP" ]]; then
  refuse "uat_ipv4_forbidden"
fi

if [[ ! "$HOST" =~ ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$ ]]; then
  refuse "host_is_not_dotted_decimal_ipv4"
fi

IFS=. read -r o1 o2 o3 o4 <<<"$HOST"
if [[ "$o1" -eq 127 ]]; then
  refuse "loopback_forbidden"
fi
if [[ "$o1" -eq 10 ]]; then
  refuse "rfc1918_forbidden"
fi
if [[ "$o1" -eq 192 && "$o2" -eq 168 ]]; then
  refuse "rfc1918_forbidden"
fi
if [[ "$o1" -eq 172 && "$o2" -ge 16 && "$o2" -le 31 ]]; then
  refuse "rfc1918_forbidden"
fi
if [[ "$o1" -eq 169 && "$o2" -eq 254 ]]; then
  refuse "link_local_forbidden"
fi

# Tailscale CGNAT: 100.64.0.0/10
if [[ "$o1" -ne 100 || "$o2" -lt 64 || "$o2" -gt 127 ]]; then
  refuse "host_is_not_tailscale_cgnat"
fi

echo "RESULT=PASS"
echo "OVERLAY_CONFIG=present"
echo "OVERLAY_HOST_RANGE=cgnat_100_64_0_0_10"
echo "PUBLIC_SSH_FALLBACK=false"
echo "PROD_TAILSCALE_CLIENT_ID=present"
echo "PROD_TAILSCALE_AUDIENCE=present"
echo "PROD_TAILSCALE_HOST=present"
echo "INVENTORY_IDENTITY_SEPARATE=true"
