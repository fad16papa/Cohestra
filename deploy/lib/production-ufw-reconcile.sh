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
  # Bare command name or a path that is (or resolves to) the system binary.
  case "$UFW_BIN" in
    ufw|/usr/sbin/ufw|/usr/bin/ufw|/sbin/ufw|/bin/ufw)
      return 0
      ;;
  esac
  local have=""
  have="$(readlink -f -- "$UFW_BIN" 2>/dev/null || printf '%s' "$UFW_BIN")"
  case "$have" in
    /usr/sbin/ufw|/usr/bin/ufw|/sbin/ufw|/bin/ufw)
      return 0
      ;;
  esac
  if command -v ufw >/dev/null 2>&1; then
    local want
    want="$(readlink -f -- "$(command -v ufw)" 2>/dev/null || command -v ufw)"
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

_ufw_forbidden() {
  local joined=" $* "
  if [[ "$joined" == *" reset "* || "$joined" == *" disable "* || "$joined" == *" delete "* ]]; then
    echo "REFUSE: reset, disable, or delete verbs are forbidden during Production reconcile" >&2
    return 0
  fi
  return 1
}

_ufw_exec() {
  assert_ufw_not_live_unless_allowed || return 1
  if _ufw_forbidden "$@"; then
    return 1
  fi
  LC_ALL=C LANG=C "$UFW_BIN" "$@"
}

ufw_read() { _ufw_exec "$@"; }
ufw_mutate() { _ufw_exec "$@"; }

# Reads `ufw status` and `ufw show added` (both are non-mutating).
# `ufw status` omits rules while inactive; `show added` still lists user.rules.
# Prints:
#   active=0|1
#   world_open_22=0|1
#   http=0|1
#   https=0|1
#   ssh:<cidr>
parse_ufw_inventory() {
  local status added
  status="$(ufw_read status)" || return 1
  added="$(ufw_read show added)" || return 1
  python3 - "$status" "$added" <<'PY'
import ipaddress, sys

WORLD = {"0.0.0.0/0", "::/0", "0:0:0:0:0:0:0:0/0", "anywhere", "anywhere (v6)", "any"}
SSH_TO = {"22", "22/tcp", "22/tcp(v6)", "openssh", "openssh(v6)"}

def is_ssh_to(to):
    t = to.lower().replace(" ", "")
    return t in SSH_TO or t.startswith("22/tcp") or t.startswith("openssh")

def is_http_to(to, v6=False):
    t = to.lower().replace(" ", "")
    if v6:
        return False
    return t == "80/tcp"

def is_https_to(to, v6=False):
    t = to.lower().replace(" ", "")
    if v6:
        return False
    return t == "443/tcp"

def is_world(frm):
    f = " ".join(frm.lower().split())
    return f in WORLD or "anywhere" in f

def is_public_v4(frm):
    f = " ".join(frm.lower().split())
    return f in {"anywhere", "0.0.0.0/0", "any"}

def normalize_cidr(raw):
    token = raw.split()[0]
    net = ipaddress.ip_network(token, strict=False)
    return str(net)

active = 0
world_open = 0
http = 0
https = 0
ssh = []
seen = set()
broad = []

status, added = sys.argv[1], sys.argv[2]
in_rules = False
for raw in status.splitlines():
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
    to = parts[0]
    rest = parts[1:]
    v6 = False
    if rest and rest[0] == "(v6)":
        to = to + "(v6)"
        v6 = True
        rest = rest[1:]
    if not rest:
        continue
    action = rest[0].upper()
    rest = rest[1:]
    if rest and rest[0].upper() == "IN":
        rest = rest[1:]
    if action not in {"ALLOW", "LIMIT"}:
        continue
    frm = " ".join(rest)
    if is_http_to(to, v6) and is_public_v4(frm):
        http = 1
        continue
    if is_https_to(to, v6) and is_public_v4(frm):
        https = 1
        continue
    if not is_ssh_to(to):
        continue
    if is_world(frm):
        world_open = 1
        continue
    try:
        norm = normalize_cidr(frm)
    except ValueError:
        world_open = 1
        continue
    if norm in ("0.0.0.0/0", "::/0"):
        world_open = 1
        continue
    try:
        net = ipaddress.ip_network(norm, strict=False)
        if net.version != 4 or net.prefixlen < 24 or net.prefixlen > 32:
            broad.append(norm)
            continue
    except ValueError:
        world_open = 1
        continue
    if norm not in seen:
        seen.add(norm)
        ssh.append(norm)

for raw in added.splitlines():
    line = raw.strip()
    if not line.startswith("ufw "):
        continue
    parts = line.split()
    if len(parts) < 3:
        continue
    action = parts[1].lower()
    if action not in {"allow", "limit"}:
        continue
    rest = parts[2:]
    if rest and rest[0] == "from":
        if "port" in rest:
            port = rest[rest.index("port") + 1] if rest.index("port") + 1 < len(rest) else ""
            proto = rest[rest.index("proto") + 1] if "proto" in rest and rest.index("proto") + 1 < len(rest) else "tcp"
            if port not in {"22", "22/tcp"} and not (port == "22" or (port == "22" and proto == "tcp")):
                if port in {"80", "80/tcp"} and is_public_v4(rest[1]):
                    http = 1
                if port in {"443", "443/tcp"} and is_public_v4(rest[1]):
                    https = 1
                continue
            if port in {"80", "80/tcp"}:
                continue
            if port not in {"22", "22/tcp"}:
                continue
            frm = rest[1]
            if is_world(frm):
                world_open = 1
                continue
            try:
                norm = normalize_cidr(frm)
                net = ipaddress.ip_network(norm, strict=False)
            except ValueError:
                world_open = 1
                continue
            if norm in ("0.0.0.0/0", "::/0"):
                world_open = 1
                continue
            if net.version != 4 or net.prefixlen < 24 or net.prefixlen > 32:
                broad.append(norm)
                continue
            if norm not in seen:
                seen.add(norm)
                ssh.append(norm)
        continue
    dest = rest[0].lower()
    if dest in {"22", "22/tcp", "openssh"}:
        world_open = 1
        continue
    if dest == "80/tcp":
        http = 1
        continue
    if dest == "443/tcp":
        https = 1

print(f"active={active}")
print(f"world_open_22={world_open}")
print(f"http={http}")
print(f"https={https}")
for cidr in ssh:
    print(f"ssh:{cidr}")
for cidr in broad:
    print(f"broad:{cidr}")
PY
}

_reset_ufw_inventory() {
  UFW_INV_ACTIVE=0
  UFW_INV_WORLD_OPEN=0
  UFW_INV_HTTP=0
  UFW_INV_HTTPS=0
  UFW_INV_SSH=()
  UFW_INV_BROAD=()
}

_load_ufw_inventory() {
  local parsed="$1"
  _reset_ufw_inventory
  local line
  while IFS= read -r line; do
    case "$line" in
      active=1) UFW_INV_ACTIVE=1 ;;
      world_open_22=1) UFW_INV_WORLD_OPEN=1 ;;
      http=1) UFW_INV_HTTP=1 ;;
      https=1) UFW_INV_HTTPS=1 ;;
      ssh:*) UFW_INV_SSH+=("${line#ssh:}") ;;
      broad:*) UFW_INV_BROAD+=("${line#broad:}") ;;
    esac
  done <<<"$parsed"
}

# Reconcile host UFW:
# 1. Validate PRODUCTION_SSH_SOURCES with zero firewall commands.
# 2. Always merge owner CIDR 116.86.142.14/32.
# 3. Read status + show added. Refuse world-open or over-broad SSH without mutating.
# 4. Preserve every existing authorized /24–/32 SSH source (never delete).
# 5. If UFW is already active, add SSH allows before changing defaults.
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

  local merged_out=""
  if ! merged_out="$(printf '%s\n' "$validated" | merge_owner_production_ssh_cidr)"; then
    echo "REFUSE: owner SSH CIDR could not be merged; no firewall mutation performed" >&2
    return 1
  fi
  local desired=()
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] && desired+=("$line")
  done <<<"$merged_out"
  if [[ ${#desired[@]} -lt 1 ]]; then
    echo "REFUSE: owner SSH CIDR could not be merged; no firewall mutation performed" >&2
    return 1
  fi

  assert_ufw_not_live_unless_allowed || return 1

  local parsed
  parsed="$(parse_ufw_inventory)" || {
    echo "REFUSE: could not read ufw status/added; no firewall mutation performed" >&2
    return 1
  }

  _load_ufw_inventory "$parsed"

  if [[ "$UFW_INV_WORLD_OPEN" -eq 1 ]]; then
    echo "REFUSE: existing UFW already allows world-open SSH; refusing to mutate (needs a separate reviewed action)" >&2
    return 1
  fi
  if [[ ${#UFW_INV_BROAD[@]} -gt 0 ]]; then
    echo "REFUSE: existing SSH source is broader than IPv4 /24-/32; refusing to mutate (needs a separate reviewed action)" >&2
    return 1
  fi

  local was_active="$UFW_INV_ACTIVE"
  local have_http="$UFW_INV_HTTP"
  local have_https="$UFW_INV_HTTPS"
  local existing=("${UFW_INV_SSH[@]+"${UFW_INV_SSH[@]}"}")

  local merged=()
  local seen=""
  local cidr
  for cidr in "${existing[@]+"${existing[@]}"}" "${desired[@]}"; do
    if [[ " ${seen} " != *" ${cidr} "* ]]; then
      seen+=" ${cidr}"
      merged+=("$cidr")
    fi
  done

  local owner="$PRODUCTION_OWNER_SSH_CIDR_DEFAULT"
  if [[ " ${seen} " != *" ${owner} "* ]]; then
    merged+=("$owner")
  fi

  if [[ "$was_active" -eq 1 ]]; then
    _apply_ssh_allows "$was_active" "${merged[@]}" || return 1
    _apply_defaults "$was_active" || return 1
    _apply_public_http "$was_active" "$have_http" "$have_https" || return 1
  else
    _apply_defaults "$was_active" || return 1
    _apply_ssh_allows "$was_active" "${merged[@]}" || return 1
    _apply_public_http "$was_active" "$have_http" "$have_https" || return 1
  fi

  if ! ufw_mutate --force enable; then
    echo "REFUSE: ufw enable failed; UFW was not reset or disabled" >&2
    _assert_ufw_not_silently_disabled "$was_active" || true
    return 1
  fi

  parsed="$(parse_ufw_inventory)" || {
    echo "REFUSE: could not re-read ufw inventory after reconcile" >&2
    return 1
  }
  _load_ufw_inventory "$parsed"

  if [[ "$UFW_INV_ACTIVE" -ne 1 ]]; then
    echo "REFUSE: UFW is not active after reconcile" >&2
    return 1
  fi
  if [[ "$UFW_INV_WORLD_OPEN" -eq 1 ]]; then
    echo "REFUSE: UFW SSH is world-open after reconcile" >&2
    return 1
  fi
  if [[ ${#UFW_INV_BROAD[@]} -gt 0 ]]; then
    echo "REFUSE: UFW SSH source is broader than IPv4 /24-/32 after reconcile" >&2
    return 1
  fi
  if [[ "$UFW_INV_HTTP" -ne 1 || "$UFW_INV_HTTPS" -ne 1 ]]; then
    echo "REFUSE: UFW is missing public HTTP/HTTPS after reconcile" >&2
    return 1
  fi

  local present=" ${UFW_INV_SSH[*]} "
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

_apply_defaults() {
  local was_active="$1"
  if ! ufw_mutate default deny incoming; then
    echo "REFUSE: ufw default deny incoming failed; UFW was not reset or disabled" >&2
    _assert_ufw_not_silently_disabled "$was_active" || true
    return 1
  fi
  if ! ufw_mutate default allow outgoing; then
    echo "REFUSE: ufw default allow outgoing failed; UFW was not reset or disabled" >&2
    _assert_ufw_not_silently_disabled "$was_active" || true
    return 1
  fi
}

_apply_ssh_allows() {
  local was_active="$1"
  shift
  local cidr
  for cidr in "$@"; do
    if ! ufw_mutate allow from "$cidr" to any port 22 proto tcp; then
      echo "REFUSE: failed to allow SSH from an approved CIDR; UFW was not reset or disabled" >&2
      _assert_ufw_not_silently_disabled "$was_active" || true
      return 1
    fi
  done
}

_apply_public_http() {
  local was_active="$1"
  local have_http="$2"
  local have_https="$3"
  if [[ "$have_http" -ne 1 ]]; then
    if ! ufw_mutate allow 80/tcp; then
      echo "REFUSE: failed to allow 80/tcp; UFW was not reset or disabled" >&2
      _assert_ufw_not_silently_disabled "$was_active" || true
      return 1
    fi
  fi
  if [[ "$have_https" -ne 1 ]]; then
    if ! ufw_mutate allow 443/tcp; then
      echo "REFUSE: failed to allow 443/tcp; UFW was not reset or disabled" >&2
      _assert_ufw_not_silently_disabled "$was_active" || true
      return 1
    fi
  fi
}

_assert_ufw_not_silently_disabled() {
  local was_active="${1:-0}"
  [[ "$was_active" -eq 1 ]] || return 0
  local parsed
  parsed="$(parse_ufw_inventory)" || {
    echo "REFUSE: could not re-read UFW after a failed reconcile" >&2
    return 1
  }
  _load_ufw_inventory "$parsed"
  if [[ "$UFW_INV_ACTIVE" -ne 1 ]]; then
    echo "REFUSE: UFW was active and is no longer active after a failed reconcile" >&2
    return 1
  fi
}
