#!/usr/bin/env bash
# Idempotent Production host UFW reconcile (Story 46.2).
# Validates SSH sources before any firewall mutation. Never resets or disables UFW.
# Safe to source. Live `ufw` requires COHESTRA_ALLOW_LIVE_UFW=1.
set -euo pipefail

if ! declare -F validate_production_ssh_sources >/dev/null; then
  echo "REFUSE: production-ssh-cidr.sh must be sourced before production-ufw-reconcile.sh" >&2
  return 1 2>/dev/null || exit 1
fi

UFW_BIN="${UFW_BIN:-ufw}"

_ufw_is_live_binary() {
  # A bare `ufw` command name, or a path that resolves to the system binary,
  # is live. A mock executable whose basename happens to be "ufw" is not.
  if [[ "$UFW_BIN" == "ufw" ]]; then
    return 0
  fi
  local sys=""
  if command -v ufw >/dev/null 2>&1; then
    sys="$(command -v ufw)"
    local want have
    have="$(readlink -f -- "$UFW_BIN" 2>/dev/null || printf '%s' "$UFW_BIN")"
    want="$(readlink -f -- "$sys" 2>/dev/null || printf '%s' "$sys")"
    [[ -n "$have" && "$have" == "$want" ]]
    return $?
  fi
  return 1
}

assert_ufw_not_live_unless_allowed() {
  if _ufw_is_live_binary && [[ "${COHESTRA_ALLOW_LIVE_UFW:-}" != "1" ]]; then
    echo "REFUSE: live ufw invocation is disabled (set COHESTRA_ALLOW_LIVE_UFW=1 on the target host only)" >&2
    return 1
  fi
}

# Refuse destructive verbs even if a caller tries to use the wrapper.
_ufw_forbidden() {
  local joined=" $* "
  if [[ "$joined" == *" reset "* || "$joined" == *" disable "* || "$joined" == *" delete "* || "$joined" == *" reset --force "* ]]; then
    echo "REFUSE: reset, disable, or delete verbs are forbidden during Production reconcile" >&2
    return 0
  fi
  return 1
}

ufw_read() {
  assert_ufw_not_live_unless_allowed || return 1
  "$UFW_BIN" "$@"
}

ufw_mutate() {
  assert_ufw_not_live_unless_allowed || return 1
  if _ufw_forbidden "$@"; then
    return 1
  fi
  "$UFW_BIN" "$@"
}

# Prints:
#   active=0|1
#   world_open_22=0|1
#   http=0|1
#   https=0|1
#   ssh:<cidr>   (one per existing SSH allow source, normalized)
parse_ufw_status() {
  local text
  text="$(ufw_read status)" || return 1
  python3 - "$text" <<'PY'
import ipaddress, sys
text = sys.argv[1]
active = 0
world_open = 0
http = 0
https = 0
ssh = []
seen = set()
in_rules = False
for raw in text.splitlines():
    line = raw.strip()
    if line.lower().startswith("status:"):
        value = line.split(":", 1)[1].strip().lower()
        active = 1 if value == "active" else 0
        continue
    if set(line.replace(" ", "")) == {"-"} or line.startswith("--"):
        in_rules = True
        continue
    if not in_rules or not line:
        continue
    parts = line.split()
    if len(parts) < 3:
        continue
    # Formats:
    #   22/tcp ALLOW 116.86.142.14
    #   22/tcp (v6) ALLOW Anywhere (v6)
    #   80/tcp ALLOW Anywhere
    to = parts[0].lower()
    rest = parts[1:]
    if rest and rest[0] == "(v6)":
        to = to + "(v6)"
        rest = rest[1:]
    if not rest or rest[0].upper() != "ALLOW":
        continue
    frm = " ".join(rest[1:])
    frm_l = frm.lower()
    is_http = to.startswith("80/tcp")
    is_https = to.startswith("443/tcp")
    is_ssh = to.startswith("22/tcp")
    if is_http:
        http = 1
        continue
    if is_https:
        https = 1
        continue
    if not is_ssh:
        continue
    if "anywhere" in frm_l or frm in ("0.0.0.0/0", "::/0", "0:0:0:0:0:0:0:0/0"):
        world_open = 1
        continue
    try:
        norm = str(ipaddress.ip_network(frm.split()[0], strict=False))
    except ValueError:
        world_open = 1
        continue
    if norm in ("0.0.0.0/0", "::/0"):
        world_open = 1
        continue
    if norm not in seen:
        seen.add(norm)
        ssh.append(norm)
print(f"active={active}")
print(f"world_open_22={world_open}")
print(f"http={http}")
print(f"https={https}")
for cidr in ssh:
    print(f"ssh:{cidr}")
PY
}

# Reconcile host UFW:
# 1. Validate PRODUCTION_SSH_SOURCES with zero firewall commands.
# 2. Merge the owner CIDR into the desired set.
# 3. Read current rules. Refuse world-open SSH without mutating.
# 4. Preserve every existing authorized SSH source (never delete).
# 5. Add missing desired SSH CIDRs, then 80/443, then enable.
# 6. Any mutation failure exits without reset/disable.
reconcile_production_ufw() {
  local validated=""
  if ! validated="$(validate_production_ssh_sources "${PRODUCTION_SSH_SOURCES-}")"; then
    return 1
  fi
  if [[ -z "${validated//[[:space:]]/}" ]]; then
    echo "REFUSE: PRODUCTION_SSH_SOURCES is required; refusing to open 22/tcp to the world" >&2
    return 1
  fi

  local desired=()
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] && desired+=("$line")
  done < <(printf '%s\n' "$validated" | merge_owner_production_ssh_cidr)

  if [[ ${#desired[@]} -lt 1 ]]; then
    echo "REFUSE: PRODUCTION_SSH_SOURCES is required; refusing to open 22/tcp to the world" >&2
    return 1
  fi

  assert_ufw_not_live_unless_allowed || return 1

  local parsed
  parsed="$(parse_ufw_status)" || {
    echo "REFUSE: could not read ufw status; no firewall mutation performed after a failed status read" >&2
    return 1
  }

  local was_active=0
  local world_open=0
  local have_http=0
  local have_https=0
  local existing=()
  while IFS= read -r line; do
    case "$line" in
      active=1) was_active=1 ;;
      world_open_22=1) world_open=1 ;;
      http=1) have_http=1 ;;
      https=1) have_https=1 ;;
      ssh:*) existing+=("${line#ssh:}") ;;
    esac
  done <<<"$parsed"

  if [[ "$world_open" -eq 1 ]]; then
    echo "REFUSE: existing UFW already allows world-open SSH; refusing to mutate (needs a separate reviewed action)" >&2
    return 1
  fi

  local merged=()
  local seen=""
  local cidr
  for cidr in "${existing[@]}" "${desired[@]}"; do
    if [[ " ${seen} " != *" ${cidr} "* ]]; then
      seen+=" ${cidr}"
      merged+=("$cidr")
    fi
  done

  local owner
  owner="$(owner_production_ssh_cidr)" || return 1
  if [[ " ${seen} " != *" ${owner} "* ]]; then
    merged+=("$owner")
  fi

  if ! ufw_mutate default deny incoming; then
    echo "REFUSE: ufw default deny incoming failed; UFW was not reset or disabled" >&2
    return 1
  fi
  if ! ufw_mutate default allow outgoing; then
    echo "REFUSE: ufw default allow outgoing failed; UFW was not reset or disabled" >&2
    return 1
  fi

  for cidr in "${merged[@]}"; do
    if ! ufw_mutate allow from "$cidr" to any port 22 proto tcp; then
      echo "REFUSE: failed to allow SSH from an approved CIDR; UFW was not reset or disabled" >&2
      _assert_ufw_not_silently_disabled "$was_active"
      return 1
    fi
  done

  if [[ "$have_http" -ne 1 ]]; then
    if ! ufw_mutate allow 80/tcp; then
      echo "REFUSE: failed to allow 80/tcp; UFW was not reset or disabled" >&2
      _assert_ufw_not_silently_disabled "$was_active"
      return 1
    fi
  fi
  if [[ "$have_https" -ne 1 ]]; then
    if ! ufw_mutate allow 443/tcp; then
      echo "REFUSE: failed to allow 443/tcp; UFW was not reset or disabled" >&2
      _assert_ufw_not_silently_disabled "$was_active"
      return 1
    fi
  fi

  if ! ufw_mutate --force enable; then
    echo "REFUSE: ufw enable failed; UFW was not reset or disabled" >&2
    _assert_ufw_not_silently_disabled "$was_active"
    return 1
  fi

  parsed="$(parse_ufw_status)" || {
    echo "REFUSE: could not re-read ufw status after reconcile" >&2
    return 1
  }
  local now_active=0
  world_open=0
  have_http=0
  have_https=0
  existing=()
  while IFS= read -r line; do
    case "$line" in
      active=1) now_active=1 ;;
      world_open_22=1) world_open=1 ;;
      http=1) have_http=1 ;;
      https=1) have_https=1 ;;
      ssh:*) existing+=("${line#ssh:}") ;;
    esac
  done <<<"$parsed"

  if [[ "$now_active" -ne 1 ]]; then
    echo "REFUSE: UFW is not active after reconcile" >&2
    return 1
  fi
  if [[ "$world_open" -eq 1 ]]; then
    echo "REFUSE: UFW SSH is world-open after reconcile" >&2
    return 1
  fi
  if [[ "$have_http" -ne 1 || "$have_https" -ne 1 ]]; then
    echo "REFUSE: UFW is missing public HTTP/HTTPS after reconcile" >&2
    return 1
  fi

  local present=" ${existing[*]} "
  for cidr in "${merged[@]}"; do
    if [[ "$present" != *" ${cidr} "* ]]; then
      echo "REFUSE: UFW is missing authorized SSH source ${cidr} after reconcile" >&2
      return 1
    fi
  done
  if [[ "$present" != *" ${owner} "* ]]; then
    echo "REFUSE: owner SSH CIDR was not preserved" >&2
    return 1
  fi

  echo "UFW_RECONCILE_OK"
}

_assert_ufw_not_silently_disabled() {
  local was_active="${1:-0}"
  [[ "$was_active" -eq 1 ]] || return 0
  local parsed
  parsed="$(parse_ufw_status)" || return 0
  if [[ "$parsed" != *$'\n'active=1* && "$parsed" != active=1* ]]; then
    echo "REFUSE: UFW was active and is no longer active after a failed reconcile" >&2
  fi
}
