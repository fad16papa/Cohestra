#!/usr/bin/env bash
# Shared Production SSH CIDR contract (Story 46.2).
# Approved sources are IPv4 /24–/32 only. Never 0.0.0.0/0 or ::/0.
# Safe to source. Never invokes ufw or doctl.
set -euo pipefail

PRODUCTION_OWNER_SSH_CIDR_DEFAULT="116.86.142.14/32"

is_world_open_ssh_cidr() {
  local cidr="${1-}"
  case "$cidr" in
    0.0.0.0/0|::/0|0:0:0:0:0:0:0:0/0|Anywhere|Anywhere/0|'Anywhere (v6)')
      return 0
      ;;
  esac
  return 1
}

production_ssh_cidr_valid() {
  local cidr="${1-}"
  if [[ -z "$cidr" ]]; then
    return 1
  fi
  if is_world_open_ssh_cidr "$cidr"; then
    return 1
  fi
  python3 - "$cidr" <<'PY'
import ipaddress, sys
raw = sys.argv[1]
try:
    net = ipaddress.ip_network(raw, strict=False)
except ValueError:
    raise SystemExit(1)
if net.version != 4 or net.prefixlen < 24 or net.prefixlen > 32:
    raise SystemExit(1)
if any(ch in raw for ch in (";", " ", ",", "address:")):
    raise SystemExit(1)
raise SystemExit(0)
PY
}

normalize_production_ssh_cidr() {
  local cidr="${1-}"
  python3 - "$cidr" <<'PY'
import ipaddress, sys
print(str(ipaddress.ip_network(sys.argv[1], strict=False)))
PY
}

# Parse PRODUCTION_SSH_SOURCES (space and/or comma separated).
# Prints unique normalized CIDRs, one per line, in first-seen order.
# Exit 1 and print REFUSE on missing, empty, invalid, or world-open input.
# Does not invoke any firewall command.
validate_production_ssh_sources() {
  local raw
  if [[ $# -gt 0 ]]; then
    raw="$1"
  else
    raw="${PRODUCTION_SSH_SOURCES-}"
  fi

  if [[ -z "${raw//[[:space:],]/}" ]]; then
    echo "REFUSE: PRODUCTION_SSH_SOURCES is required; refusing to open 22/tcp to the world" >&2
    return 1
  fi

  local tokens=()
  local token
  local glob_was_off=0
  case "$-" in *f*) glob_was_off=1 ;; esac
  set -f
  local IFS=$' \t\n,'
  # shellcheck disable=SC2206
  tokens=($raw)
  unset IFS
  if [[ "$glob_was_off" -eq 0 ]]; then
    set +f
  fi

  if [[ ${#tokens[@]} -eq 0 ]]; then
    echo "REFUSE: PRODUCTION_SSH_SOURCES is required; refusing to open 22/tcp to the world" >&2
    return 1
  fi

  local seen=""
  local out=()
  for token in "${tokens[@]}"; do
    token="${token// /}"
    [[ -z "$token" ]] && continue
    if [[ "$token" == *['*?[]']* ]]; then
      echo "REFUSE: SSH allowlist entry is not an approved IPv4 /24-/32 CIDR" >&2
      return 1
    fi
    if is_world_open_ssh_cidr "$token"; then
      echo "REFUSE: SSH allowlist must not include 0.0.0.0/0 or ::/0" >&2
      return 1
    fi
    if ! production_ssh_cidr_valid "$token"; then
      echo "REFUSE: SSH allowlist entry is not an approved IPv4 /24-/32 CIDR" >&2
      return 1
    fi
    local norm
    norm="$(normalize_production_ssh_cidr "$token")"
    if [[ " ${seen} " != *" ${norm} "* ]]; then
      seen+=" ${norm}"
      out+=("$norm")
    fi
  done

  if [[ ${#out[@]} -eq 0 ]]; then
    echo "REFUSE: PRODUCTION_SSH_SOURCES is required; refusing to open 22/tcp to the world" >&2
    return 1
  fi

  printf '%s\n' "${out[@]}"
}

owner_production_ssh_cidr() {
  local owner="${PRODUCTION_OWNER_SSH_CIDR:-$PRODUCTION_OWNER_SSH_CIDR_DEFAULT}"
  if ! production_ssh_cidr_valid "$owner"; then
    echo "REFUSE: owner SSH CIDR is not an approved IPv4 /24-/32 CIDR" >&2
    return 1
  fi
  normalize_production_ssh_cidr "$owner"
}

# Read desired CIDRs from stdin (one per line). Always include the owner CIDR.
# Never drops the owner CIDR from the desired set.
merge_owner_production_ssh_cidr() {
  local default_owner="$PRODUCTION_OWNER_SSH_CIDR_DEFAULT"
  if ! production_ssh_cidr_valid "$default_owner"; then
    echo "REFUSE: owner SSH CIDR is not an approved IPv4 /24-/32 CIDR" >&2
    return 1
  fi
  default_owner="$(normalize_production_ssh_cidr "$default_owner")"
  local seen=" ${default_owner} "
  echo "$default_owner"
  if [[ -n "${PRODUCTION_OWNER_SSH_CIDR-}" ]]; then
    local extra
    extra="$(owner_production_ssh_cidr)" || return 1
    if [[ " ${seen} " != *" ${extra} "* ]]; then
      seen+=" ${extra}"
      echo "$extra"
    fi
  fi
  local cidr
  while IFS= read -r cidr; do
    [[ -z "$cidr" ]] && continue
    if [[ " ${seen} " != *" ${cidr} "* ]]; then
      seen+=" ${cidr}"
      echo "$cidr"
    fi
  done
}
