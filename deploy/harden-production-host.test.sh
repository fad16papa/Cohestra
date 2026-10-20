#!/usr/bin/env bash
# Behavioral fail-closed tests for Production host UFW reconcile.
# Uses an isolated mock ufw. Never invokes live firewall, SSH, or UAT hosts.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CIDR_LIB="$ROOT_DIR/deploy/lib/production-ssh-cidr.sh"
UFW_LIB="$ROOT_DIR/deploy/lib/production-ufw-reconcile.sh"
HARDEN="$ROOT_DIR/deploy/harden-production-host.sh"
UAT_COMPOSE="$ROOT_DIR/docker-compose.uat.yml"
UAT_WF="$ROOT_DIR/.github/workflows/deploy.yml"
OWNER="116.86.142.14/32"
EXTRA="198.51.100.10/32"
SECOND="203.0.113.10/32"
RANGE="198.51.100.0/24"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

UAT_COMPOSE_HASH=""
UAT_WF_HASH=""
if [[ -f "$UAT_COMPOSE" ]]; then
  UAT_COMPOSE_HASH="$(sha256sum "$UAT_COMPOSE" | awk '{print $1}')"
fi
if [[ -f "$UAT_WF" ]]; then
  UAT_WF_HASH="$(sha256sum "$UAT_WF" | awk '{print $1}')"
fi

create_mock_ufw() {
  local dir="$1"
  mkdir -p "$dir"
  : >"$dir/commands"
  : >"$dir/rules"
  echo 0 >"$dir/active"
  echo deny >"$dir/default_in"
  echo allow >"$dir/default_out"
  cat >"$dir/ufw" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
STATE="${MOCK_UFW_STATE_DIR:?}"
printf '%s\n' "$*" >>"$STATE/commands"

fail_on="${MOCK_UFW_FAIL_ON-}"
if [[ -n "$fail_on" ]]; then
  case "$*" in
    *$fail_on*) echo "mock-ufw induced failure: $*" >&2; exit 1 ;;
  esac
fi
if [[ "${MOCK_UFW_FAIL_NEXT:-}" == "1" ]]; then
  unset MOCK_UFW_FAIL_NEXT
  echo "mock-ufw induced one-shot failure: $*" >&2
  exit 1
fi

cmd="$1"
shift || true
if [[ "$cmd" == "--force" ]]; then
  cmd="${1-}"
  shift || true
fi

case "$cmd" in
  status)
    if [[ "$(cat "$STATE/active")" == "1" ]]; then
      echo "Status: active"
      echo ""
      echo "To                         Action      From"
      echo "--                         ------      ----"
      if [[ -f "$STATE/rules" ]]; then
        while IFS='|' read -r to frm; do
          [[ -z "${to:-}" ]] && continue
          printf '%-26s ALLOW       %s\n' "$to" "$frm"
        done <"$STATE/rules"
      fi
    else
      echo "Status: inactive"
    fi
    ;;
  show)
    if [[ "${1-}" != "added" ]]; then
      echo "mock-ufw: unhandled show $*" >&2
      exit 1
    fi
    echo "Added user rules (see 'ufw status' for running firewall):"
    if [[ -f "$STATE/rules" ]]; then
      while IFS='|' read -r to frm; do
        [[ -z "${to:-}" ]] && continue
        if [[ "$to" == "22/tcp" || "$to" == "OpenSSH" || "$to" == "22" ]]; then
          if [[ "$frm" == "Anywhere" || "$frm" == "Anywhere (v6)" || "$frm" == "0.0.0.0/0" || "$frm" == "::/0" ]]; then
            echo "ufw allow ${to}"
          else
            echo "ufw allow from ${frm} to any port 22 proto tcp"
          fi
        elif [[ "$to" == "80/tcp" ]]; then
          echo "ufw allow 80/tcp"
        elif [[ "$to" == "443/tcp" ]]; then
          echo "ufw allow 443/tcp"
        fi
      done <"$STATE/rules"
    fi
    ;;
  reset)
    echo 0 >"$STATE/active"
    : >"$STATE/rules"
    echo "RESET" >>"$STATE/destructive"
    exit 0
    ;;
  disable)
    echo 0 >"$STATE/active"
    echo "DISABLE" >>"$STATE/destructive"
    exit 0
    ;;
  delete)
    echo "DELETE $*" >>"$STATE/destructive"
    exit 0
    ;;
  enable)
    echo 1 >"$STATE/active"
    ;;
  default)
    if [[ "${1-}" == "deny" && "${2-}" == "incoming" ]]; then
      echo deny >"$STATE/default_in"
    elif [[ "${1-}" == "allow" && "${2-}" == "outgoing" ]]; then
      echo allow >"$STATE/default_out"
    fi
    ;;
  allow)
    if [[ "${1-}" == "from" && "${3-}" == "to" && "${5-}" == "port" ]]; then
      echo "22/tcp|$2" >>"$STATE/rules"
    elif [[ "${1-}" == "80/tcp" ]]; then
      echo "80/tcp|Anywhere" >>"$STATE/rules"
    elif [[ "${1-}" == "443/tcp" ]]; then
      echo "443/tcp|Anywhere" >>"$STATE/rules"
    else
      echo "22/tcp|Anywhere" >>"$STATE/rules"
    fi
    ;;
  *)
    echo "mock-ufw: unhandled $cmd $*" >&2
    exit 1
    ;;
esac
EOF
  chmod +x "$dir/ufw"
}

seed_rule() {
  local dir="$1"
  local to="$2"
  local frm="$3"
  echo "${to}|${frm}" >>"$dir/rules"
}

assert_no_destructive() {
  local dir="$1"
  local label="$2"
  if [[ -f "$dir/destructive" ]]; then
    fail "$label invoked reset/disable/delete: $(tr '\n' ' ' <"$dir/destructive")"
  fi
  if grep -Eq '(^| )(reset|disable|delete)( |$)' "$dir/commands"; then
    fail "$label command log contains reset/disable/delete"
  fi
}

assert_no_commands() {
  local dir="$1"
  local label="$2"
  if [[ -s "$dir/commands" ]]; then
    fail "$label must not invoke ufw; log=$(tr '\n' ';' <"$dir/commands")"
  fi
}

load_reconcile() {
  # shellcheck disable=SC1090
  source "$CIDR_LIB"
  # shellcheck disable=SC1090
  source "$UFW_LIB"
}

run_reconcile() {
  local dir="$1"
  shift
  (
    load_reconcile
    export MOCK_UFW_STATE_DIR="$dir"
    export UFW_BIN="$dir/ufw"
    unset COHESTRA_ALLOW_LIVE_UFW || true
    "$@"
    reconcile_production_ufw
  )
}

# --- Missing SSH source list ---
missing_dir="$WORKDIR/missing"
create_mock_ufw "$missing_dir"
set +e
missing_out="$(
  run_reconcile "$missing_dir" unset PRODUCTION_SSH_SOURCES 2>&1
)"
missing_rc=$?
set -e
[[ "$missing_rc" -ne 0 ]] || fail "missing PRODUCTION_SSH_SOURCES must fail"
[[ "$missing_out" == *"PRODUCTION_SSH_SOURCES is required"* ]] || fail "missing sources must name the required variable"
assert_no_commands "$missing_dir" "missing sources"
assert_no_destructive "$missing_dir" "missing sources"
pass "missing SSH source list exits without UFW mutation"

# --- Empty source list ---
empty_dir="$WORKDIR/empty"
create_mock_ufw "$empty_dir"
set +e
empty_out="$(
  PRODUCTION_SSH_SOURCES='' run_reconcile "$empty_dir" true 2>&1
)"
empty_rc=$?
set -e
[[ "$empty_rc" -ne 0 ]] || fail "empty PRODUCTION_SSH_SOURCES must fail"
assert_no_commands "$empty_dir" "empty sources"
pass "empty SSH source list exits without UFW mutation"

ws_dir="$WORKDIR/whitespace"
create_mock_ufw "$ws_dir"
set +e
PRODUCTION_SSH_SOURCES='   ,,,  ' run_reconcile "$ws_dir" true >/dev/null 2>&1
ws_rc=$?
set -e
[[ "$ws_rc" -ne 0 ]] || fail "whitespace-only sources must fail"
assert_no_commands "$ws_dir" "whitespace sources"
pass "whitespace-only SSH source list exits without UFW mutation"

# --- Invalid CIDR ---
invalid_dir="$WORKDIR/invalid"
create_mock_ufw "$invalid_dir"
set +e
invalid_out="$(
  PRODUCTION_SSH_SOURCES='not-a-cidr' run_reconcile "$invalid_dir" true 2>&1
)"
invalid_rc=$?
set -e
[[ "$invalid_rc" -ne 0 ]] || fail "invalid CIDR must fail"
[[ "$invalid_out" == *"approved IPv4 /24-/32"* ]] || fail "invalid CIDR must cite the /24-/32 contract"
assert_no_commands "$invalid_dir" "invalid CIDR"
pass "invalid CIDR exits without UFW mutation"

broad_dir="$WORKDIR/broad"
create_mock_ufw "$broad_dir"
set +e
PRODUCTION_SSH_SOURCES='10.0.0.0/16' run_reconcile "$broad_dir" true >/dev/null 2>&1
broad_rc=$?
set -e
[[ "$broad_rc" -ne 0 ]] || fail "IPv4 /16 must fail the /24-/32 contract"
assert_no_commands "$broad_dir" "IPv4 /16"
pass "over-broad IPv4 /16 exits without UFW mutation"

# --- World-open IPv4 / IPv6 ---
world4_dir="$WORKDIR/world4"
create_mock_ufw "$world4_dir"
set +e
world4_out="$(
  PRODUCTION_SSH_SOURCES='0.0.0.0/0' run_reconcile "$world4_dir" true 2>&1
)"
world4_rc=$?
set -e
[[ "$world4_rc" -ne 0 ]] || fail "world-open IPv4 must fail"
[[ "$world4_out" == *"0.0.0.0/0"* || "$world4_out" == *"::/0"* ]] || fail "world-open IPv4 must be named"
assert_no_commands "$world4_dir" "world-open IPv4"
pass "world-open IPv4 source exits without UFW mutation"

world6_dir="$WORKDIR/world6"
create_mock_ufw "$world6_dir"
set +e
PRODUCTION_SSH_SOURCES='::/0' run_reconcile "$world6_dir" true >/dev/null 2>&1
world6_rc=$?
set -e
[[ "$world6_rc" -ne 0 ]] || fail "world-open IPv6 must fail"
assert_no_commands "$world6_dir" "world-open IPv6"
pass "world-open IPv6 source exits without UFW mutation"

mixed_dir="$WORKDIR/mixed-world"
create_mock_ufw "$mixed_dir"
set +e
PRODUCTION_SSH_SOURCES="$OWNER 0.0.0.0/0" run_reconcile "$mixed_dir" true >/dev/null 2>&1
mixed_rc=$?
set -e
[[ "$mixed_rc" -ne 0 ]] || fail "mixed world-open list must fail"
assert_no_commands "$mixed_dir" "mixed world-open"
pass "valid CIDR plus world-open source exits without UFW mutation"

# --- Valid approved owner CIDR ---
owner_dir="$WORKDIR/owner"
create_mock_ufw "$owner_dir"
set +e
owner_out="$(
  PRODUCTION_SSH_SOURCES="$OWNER" run_reconcile "$owner_dir" true 2>&1
)"
owner_rc=$?
set -e
[[ "$owner_rc" -eq 0 ]] || fail "valid owner CIDR must succeed: $owner_out"
[[ "$owner_out" == *"UFW_RECONCILE_OK"* ]] || fail "valid owner CIDR must report UFW_RECONCILE_OK"
[[ "$(cat "$owner_dir/active")" == "1" ]] || fail "valid owner CIDR must enable UFW"
grep -q "22/tcp|${OWNER}" "$owner_dir/rules" || fail "owner CIDR must be allowed on 22/tcp"
grep -q "80/tcp|Anywhere" "$owner_dir/rules" || fail "80/tcp must be public"
grep -q "443/tcp|Anywhere" "$owner_dir/rules" || fail "443/tcp must be public"
grep -q "default deny incoming" "$owner_dir/commands" || fail "defaults must deny incoming"
grep -q "default allow outgoing" "$owner_dir/commands" || fail "defaults must allow outgoing"
assert_no_destructive "$owner_dir" "valid owner CIDR"
pass "valid approved owner CIDR enables UFW with SSH + public HTTP/HTTPS"

# --- Multiple valid SSH sources ---
multi_dir="$WORKDIR/multi"
create_mock_ufw "$multi_dir"
set +e
multi_out="$(
  PRODUCTION_SSH_SOURCES="$OWNER $SECOND $RANGE" run_reconcile "$multi_dir" true 2>&1
)"
multi_rc=$?
set -e
[[ "$multi_rc" -eq 0 ]] || fail "multiple valid sources must succeed: $multi_out"
grep -q "22/tcp|${OWNER}" "$multi_dir/rules" || fail "multi run missing owner"
grep -q "22/tcp|${SECOND}" "$multi_dir/rules" || fail "multi run missing second CIDR"
grep -q "22/tcp|${RANGE}" "$multi_dir/rules" || fail "multi run missing /24"
[[ "$(cat "$multi_dir/active")" == "1" ]] || fail "multi run must leave UFW active"
assert_no_destructive "$multi_dir" "multiple sources"
pass "multiple valid SSH sources are all allowed"

# --- Repeated execution / idempotency ---
idem_dir="$WORKDIR/idem"
create_mock_ufw "$idem_dir"
set +e
PRODUCTION_SSH_SOURCES="$OWNER $SECOND" run_reconcile "$idem_dir" true >/dev/null 2>&1
first_rc=$?
PRODUCTION_SSH_SOURCES="$OWNER $SECOND" run_reconcile "$idem_dir" true >/dev/null 2>&1
second_rc=$?
set -e
[[ "$first_rc" -eq 0 && "$second_rc" -eq 0 ]] || fail "repeated reconcile must succeed twice"
[[ "$(cat "$idem_dir/active")" == "1" ]] || fail "idempotent run must keep UFW active"
owner_count="$(grep -c "22/tcp|${OWNER}" "$idem_dir/rules" || true)"
[[ "$owner_count" -ge 1 ]] || fail "owner CIDR missing after second run"
assert_no_destructive "$idem_dir" "idempotent reconcile"
# Second run may re-add (ufw allow is additive/skip); it must not reset or drop access.
pass "repeated execution is idempotent and keeps UFW active"

# --- Simulated firewall-command failure ---
fail_dir="$WORKDIR/fail-enable"
create_mock_ufw "$fail_dir"
echo 1 >"$fail_dir/active"
seed_rule "$fail_dir" "22/tcp" "$OWNER"
set +e
fail_out="$(
  MOCK_UFW_FAIL_ON=enable PRODUCTION_SSH_SOURCES="$OWNER $SECOND" \
    run_reconcile "$fail_dir" true 2>&1
)"
fail_rc=$?
set -e
[[ "$fail_rc" -ne 0 ]] || fail "simulated enable failure must fail closed"
[[ "$fail_out" == *"enable failed"* ]] || fail "enable failure must be reported"
[[ "$(cat "$fail_dir/active")" == "1" ]] || fail "failed enable must not disable an already-active UFW"
grep -q "22/tcp|${OWNER}" "$fail_dir/rules" || fail "enable failure must preserve owner SSH rule"
assert_no_destructive "$fail_dir" "simulated enable failure"
pass "simulated ufw enable failure does not disable UFW or drop owner SSH"

fail_allow_dir="$WORKDIR/fail-allow"
create_mock_ufw "$fail_allow_dir"
echo 1 >"$fail_allow_dir/active"
seed_rule "$fail_allow_dir" "22/tcp" "$OWNER"
set +e
fail_allow_out="$(
  MOCK_UFW_FAIL_ON='allow from' PRODUCTION_SSH_SOURCES="$OWNER $SECOND" \
    run_reconcile "$fail_allow_dir" true 2>&1
)"
fail_allow_rc=$?
set -e
[[ "$fail_allow_rc" -ne 0 ]] || fail "simulated allow failure must fail closed"
[[ "$(cat "$fail_allow_dir/active")" == "1" ]] || fail "failed allow must not disable UFW"
grep -q "22/tcp|${OWNER}" "$fail_allow_dir/rules" || fail "allow failure must preserve owner SSH rule"
assert_no_destructive "$fail_allow_dir" "simulated allow failure"
pass "simulated ufw allow failure preserves active UFW and owner access"

# --- Preservation of existing owner access ---
preserve_dir="$WORKDIR/preserve"
create_mock_ufw "$preserve_dir"
echo 1 >"$preserve_dir/active"
seed_rule "$preserve_dir" "22/tcp" "$OWNER"
seed_rule "$preserve_dir" "22/tcp" "$EXTRA"
seed_rule "$preserve_dir" "80/tcp" "Anywhere"
seed_rule "$preserve_dir" "443/tcp" "Anywhere"
set +e
preserve_out="$(
  PRODUCTION_SSH_SOURCES="$SECOND" run_reconcile "$preserve_dir" true 2>&1
)"
preserve_rc=$?
set -e
[[ "$preserve_rc" -eq 0 ]] || fail "preserve-existing must succeed: $preserve_out"
grep -q "22/tcp|${OWNER}" "$preserve_dir/rules" || fail "owner CIDR must be preserved even when omitted from this run's list"
grep -q "22/tcp|${EXTRA}" "$preserve_dir/rules" || fail "previously authorized extra SSH source must be preserved"
grep -q "22/tcp|${SECOND}" "$preserve_dir/rules" || fail "new approved SSH source must be added"
assert_no_destructive "$preserve_dir" "owner preservation"
pass "existing owner and authorized SSH sources are preserved"

# Reconcile with owner-only input still keeps extra authorized source.
set +e
PRODUCTION_SSH_SOURCES="$OWNER" run_reconcile "$preserve_dir" true >/dev/null 2>&1
preserve2_rc=$?
set -e
[[ "$preserve2_rc" -eq 0 ]] || fail "second preserve run must succeed"
grep -q "22/tcp|${EXTRA}" "$preserve_dir/rules" || fail "second run dropped a previously authorized SSH source"
pass "later owner-only reconcile does not remove other authorized sources"

# Owner CIDR is merged even when omitted from this run and UFW is empty.
fresh_owner_dir="$WORKDIR/fresh-owner"
create_mock_ufw "$fresh_owner_dir"
set +e
fresh_out="$(
  PRODUCTION_SSH_SOURCES="$SECOND" run_reconcile "$fresh_owner_dir" true 2>&1
)"
fresh_rc=$?
set -e
[[ "$fresh_rc" -eq 0 ]] || fail "fresh UFW with non-owner sources must succeed: $fresh_out"
grep -q "22/tcp|${OWNER}" "$fresh_owner_dir/rules" || fail "owner CIDR must be auto-merged onto an empty UFW"
grep -q "22/tcp|${SECOND}" "$fresh_owner_dir/rules" || fail "requested SSH source must be added"
assert_no_destructive "$fresh_owner_dir" "owner auto-merge"
pass "empty UFW auto-merges owner CIDR 116.86.142.14/32"

# Glob tokens must not expand into filenames.
glob_dir="$WORKDIR/glob"
create_mock_ufw "$glob_dir"
set +e
PRODUCTION_SSH_SOURCES='*' run_reconcile "$glob_dir" true >/dev/null 2>&1
glob_rc=$?
set -e
[[ "$glob_rc" -ne 0 ]] || fail "glob SSH source must fail"
assert_no_commands "$glob_dir" "glob SSH source"
pass "glob SSH source tokens are rejected without UFW mutation"

# Existing over-broad SSH CIDR must refuse without mutation.
broad_exist_dir="$WORKDIR/broad-exist"
create_mock_ufw "$broad_exist_dir"
echo 1 >"$broad_exist_dir/active"
seed_rule "$broad_exist_dir" "22/tcp" "10.0.0.0/8"
set +e
broad_exist_out="$(
  PRODUCTION_SSH_SOURCES="$OWNER" run_reconcile "$broad_exist_dir" true 2>&1
)"
broad_exist_rc=$?
set -e
[[ "$broad_exist_rc" -ne 0 ]] || fail "existing /8 SSH source must refuse"
[[ "$broad_exist_out" == *"broader than IPv4 /24-/32"* ]] || fail "over-broad existing SSH must be reported"
if grep -Eq '(^| )(allow|enable|default|reset|disable|delete)( |$)' "$broad_exist_dir/commands"; then
  fail "over-broad existing SSH refuse must not mutate UFW"
fi
assert_no_destructive "$broad_exist_dir" "over-broad existing SSH"
pass "existing over-broad SSH CIDR refuses without mutating UFW"

# OpenSSH Anywhere must be treated as world-open SSH.
openssh_dir="$WORKDIR/openssh"
create_mock_ufw "$openssh_dir"
echo 1 >"$openssh_dir/active"
seed_rule "$openssh_dir" "OpenSSH" "Anywhere"
set +e
openssh_out="$(
  PRODUCTION_SSH_SOURCES="$OWNER" run_reconcile "$openssh_dir" true 2>&1
)"
openssh_rc=$?
set -e
[[ "$openssh_rc" -ne 0 ]] || fail "OpenSSH Anywhere must refuse"
[[ "$openssh_out" == *"world-open SSH"* ]] || fail "OpenSSH Anywhere must be reported as world-open"
if grep -Eq '(^| )(allow|enable|default|reset|disable|delete)( |$)' "$openssh_dir/commands"; then
  fail "OpenSSH world-open refuse must not mutate UFW"
fi
pass "OpenSSH Anywhere is treated as world-open SSH"

# Latent world-open rules while UFW is inactive must refuse before enable.
latent_dir="$WORKDIR/latent"
create_mock_ufw "$latent_dir"
echo 0 >"$latent_dir/active"
seed_rule "$latent_dir" "22/tcp" "Anywhere"
set +e
latent_out="$(
  PRODUCTION_SSH_SOURCES="$OWNER" run_reconcile "$latent_dir" true 2>&1
)"
latent_rc=$?
set -e
[[ "$latent_rc" -ne 0 ]] || fail "inactive UFW with latent world-open SSH must refuse"
[[ "$latent_out" == *"world-open SSH"* ]] || fail "latent world-open SSH must be reported"
[[ "$(cat "$latent_dir/active")" == "0" ]] || fail "latent world-open refuse must not enable UFW"
if grep -Eq '(^| )(allow|enable|default|reset|disable|delete)( |$)' "$latent_dir/commands"; then
  fail "latent world-open refuse must not mutate UFW: $(tr '\n' ';' <"$latent_dir/commands")"
fi
assert_no_destructive "$latent_dir" "latent world-open SSH"
pass "inactive UFW with latent world-open 22 refuses without enable"

# Existing world-open SSH must refuse without mutation.
world_exist_dir="$WORKDIR/world-exist"
create_mock_ufw "$world_exist_dir"
echo 1 >"$world_exist_dir/active"
seed_rule "$world_exist_dir" "22/tcp" "Anywhere"
seed_rule "$world_exist_dir" "22/tcp" "$OWNER"
before_cmds="$(wc -l <"$world_exist_dir/commands")"
set +e
world_exist_out="$(
  PRODUCTION_SSH_SOURCES="$OWNER" run_reconcile "$world_exist_dir" true 2>&1
)"
world_exist_rc=$?
set -e
[[ "$world_exist_rc" -ne 0 ]] || fail "existing world-open SSH must refuse"
[[ "$world_exist_out" == *"world-open SSH"* ]] || fail "existing world-open SSH must be reported"
[[ "$(cat "$world_exist_dir/active")" == "1" ]] || fail "world-open refuse must not disable UFW"
after_cmds="$(wc -l <"$world_exist_dir/commands")"
# status is a read; no defaults/allow/enable/reset
if grep -Eq '(^| )(allow|enable|default|reset|disable|delete)( |$)' "$world_exist_dir/commands"; then
  fail "existing world-open SSH refuse must not mutate UFW: $(tr '\n' ';' <"$world_exist_dir/commands")"
fi
[[ "$after_cmds" -ge "$before_cmds" ]] || fail "command log should include the status read"
assert_no_destructive "$world_exist_dir" "existing world-open SSH"
pass "existing world-open SSH refuses without mutating UFW"

# --- Harden script: validate-before-root, UAT refuse, no reset in source ---
if grep -Eq '(^|[[:space:]])ufw[[:space:]]+(--force[[:space:]]+)?reset([[:space:]]|$)' "$HARDEN" "$UFW_LIB"; then
  fail "harden/reconcile must not call ufw reset"
fi
if grep -Eq '(^|[[:space:]])ufw[[:space:]]+disable([[:space:]]|$)' "$HARDEN" "$UFW_LIB"; then
  fail "harden/reconcile must not call ufw disable"
fi
pass "harden/reconcile sources contain no ufw reset/disable"

set +e
harden_missing="$(
  env -u PRODUCTION_SSH_SOURCES COHESTRA_HARDEN_SKIP_METADATA=1 bash "$HARDEN" 2>&1
)"
harden_missing_rc=$?
set -e
[[ "$harden_missing_rc" -ne 0 ]] || fail "standalone harden with missing sources must fail"
[[ "$harden_missing" == *"PRODUCTION_SSH_SOURCES is required"* ]] || fail "standalone harden must refuse missing sources"
[[ "$harden_missing" != *"must run as root"* ]] || fail "missing sources must fail before the root check"
pass "standalone harden validates SSH sources before root/apt/UFW"

set +e
harden_uat="$(
  COHESTRA_HARDEN_SKIP_METADATA=1 COHESTRA_SHARED_HOST_UAT=true PRODUCTION_SSH_SOURCES="$OWNER" \
    bash "$HARDEN" 2>&1
)"
harden_uat_rc=$?
set -e
[[ "$harden_uat_rc" -ne 0 ]] || fail "harden must refuse a UAT-marked host"
[[ "$harden_uat" == *"COHESTRA_SHARED_HOST_UAT=true"* ]] || fail "UAT refuse must name the shared-host marker"
[[ "$harden_uat" != *"UFW_RECONCILE_OK"* ]] || fail "UAT refuse must not reconcile UFW"
pass "harden refuses UAT without touching firewall"

# Live ufw must stay blocked unless the host explicitly opts in.
live_dir="$WORKDIR/live-guard"
create_mock_ufw "$live_dir"
set +e
live_out="$(
  (
    load_reconcile
    export PRODUCTION_SSH_SOURCES="$OWNER"
    export UFW_BIN="ufw"
    unset COHESTRA_ALLOW_LIVE_UFW || true
    reconcile_production_ufw
  ) 2>&1
)"
live_rc=$?
set -e
[[ "$live_rc" -ne 0 ]] || fail "live ufw must be refused without COHESTRA_ALLOW_LIVE_UFW=1"
[[ "$live_out" == *"live ufw invocation is disabled"* ]] || fail "live ufw guard message missing"
pass "reconcile refuses live ufw unless explicitly allowed on the target host"

# --- No UAT changes ---
if [[ -n "$UAT_COMPOSE_HASH" ]]; then
  now="$(sha256sum "$UAT_COMPOSE" | awk '{print $1}')"
  [[ "$now" == "$UAT_COMPOSE_HASH" ]] || fail "docker-compose.uat.yml changed during harden tests"
fi
if [[ -n "$UAT_WF_HASH" ]]; then
  now="$(sha256sum "$UAT_WF" | awk '{print $1}')"
  [[ "$now" == "$UAT_WF_HASH" ]] || fail ".github/workflows/deploy.yml changed during harden tests"
fi
pass "UAT compose and deploy workflow are unchanged"

echo "harden-production-host fail-closed contract OK"
