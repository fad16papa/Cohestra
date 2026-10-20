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
SSH_DEST = {"22", "22/tcp", "ssh", "openssh"}

def is_world(frm):
    return " ".join(str(frm).lower().split()) in WORLD or "anywhere" in str(frm).lower()

def is_public_v4(frm):
    return " ".join(str(frm).lower().split()) in {"anywhere", "0.0.0.0/0", "any"}

def normalize_cidr(raw):
    return str(ipaddress.ip_network(str(raw).split()[0], strict=False))

def port_includes_22(token):
    t = token.lower()
    if t in {"22", "22/tcp", "22/any"}:
        return True
    if ":" in t:
        rng, _, proto = t.partition("/")
        try:
            a, b = rng.split(":")
            return int(a) <= 22 <= int(b) and proto in {"", "tcp", "any"}
        except ValueError:
            return False
    if "," in t:
        return any(port_includes_22(p) for p in t.split(","))
    return False

def mentions_ssh(tokens):
    low = [t.lower() for t in tokens]
    joined = " ".join(low)
    if "openssh" in joined or " app ssh" in f" {joined}" or joined.endswith(" app ssh"):
        return True
    if any(t in SSH_DEST or t.startswith("22/tcp") for t in low):
        return True
    if "port" in low:
        i = low.index("port")
        if i + 1 < len(low) and port_includes_22(low[i + 1]):
            return True
    return any(port_includes_22(t) for t in low)

def record_source(frm):
    global world_open
    if is_world(frm):
        world_open = 1
        return
    try:
        norm = normalize_cidr(frm)
        net = ipaddress.ip_network(norm, strict=False)
    except ValueError:
        world_open = 1
        return
    if norm in ("0.0.0.0/0", "::/0"):
        world_open = 1
        return
    if net.version != 4 or net.prefixlen < 24 or net.prefixlen > 32:
        if norm not in broad:
            broad.append(norm)
        return
    if norm not in seen:
        seen.add(norm)
        ssh.append(norm)

def skip_qualifiers(tokens):
    i = 0
    while i < len(tokens):
        t = tokens[i].lower()
        if t in {"log", "log-all", "in", "out"}:
            i += 1
            continue
        if t == "on" and i + 1 < len(tokens):
            i += 2
            continue
        break
    return tokens[i:]

active = 0
world_open = 0
denied = 0
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
    rest = skip_qualifiers(rest)
    if not rest:
        continue
    action = rest[0].upper()
    rest = rest[1:]
    if rest and rest[0].upper() == "IN":
        rest = rest[1:]
    frm = " ".join(rest)
    to_l = to.lower().replace(" ", "")
    ssh_row = to_l in SSH_DEST or to_l.startswith("22/tcp") or to_l.startswith("openssh") or to_l in {"anywhere", "any"}
    if action in {"DENY", "REJECT"} and ssh_row:
        denied = 1
        continue
    if action not in {"ALLOW", "LIMIT"}:
        continue
    if to_l == "80/tcp" and not v6 and is_public_v4(frm):
        http = 1
        continue
    if to_l == "443/tcp" and not v6 and is_public_v4(frm):
        https = 1
        continue
    if not ssh_row:
        continue
    if to_l in {"anywhere", "any"}:
        world_open = 1
        continue
    record_source(frm.split()[0] if frm else "Anywhere")

for raw in added.splitlines():
    line = raw.strip()
    if not line.startswith("ufw "):
        continue
    parts = line.split()
    i = 1
    if i < len(parts) and parts[i].lower() == "insert":
        i += 2
    if i >= len(parts):
        continue
    action = parts[i].lower()
    i += 1
    rest = skip_qualifiers(parts[i:])
    if action in {"deny", "reject"}:
        if mentions_ssh(rest):
            denied = 1
        continue
    if action not in {"allow", "limit"}:
        if mentions_ssh(parts[i:]):
            world_open = 1
        continue
    if not rest:
        continue
    if rest[0].lower() == "from":
        frm = rest[1] if len(rest) > 1 else "Anywhere"
        app_ssh = "app" in [t.lower() for t in rest] and mentions_ssh(rest)
        has_port = "port" in [t.lower() for t in rest]
        if "app" in [t.lower() for t in rest] and not app_ssh:
            continue
        if has_port and not mentions_ssh(rest):
            low = [t.lower() for t in rest]
            p = low[low.index("port") + 1] if "port" in low and low.index("port") + 1 < len(low) else ""
            if p in {"80", "80/tcp"} and is_public_v4(frm):
                http = 1
            if p in {"443", "443/tcp"} and is_public_v4(frm):
                https = 1
            continue
        record_source(frm)
        continue
    if rest[0].lower() in {"to", "proto"}:
        if mentions_ssh(rest):
            world_open = 1
        continue
    dest = rest[0].lower()
    if dest in SSH_DEST or dest.startswith("22/tcp"):
        world_open = 1
        continue
    if dest == "80/tcp":
        http = 1
        continue
    if dest == "443/tcp":
        https = 1
        continue
    if mentions_ssh(rest):
        world_open = 1

print(f"active={active}")
print(f"world_open_22={world_open}")
print(f"denied_22={denied}")
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
  UFW_INV_DENIED=0
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
      denied_22=1) UFW_INV_DENIED=1 ;;
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
  if [[ "$UFW_INV_DENIED" -eq 1 ]]; then
    echo "REFUSE: existing UFW denies or rejects SSH; refusing to mutate (needs a separate reviewed action)" >&2
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
