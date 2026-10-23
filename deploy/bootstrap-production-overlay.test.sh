#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TS="$ROOT_DIR/deploy/bootstrap-production-tailscale.sh"
USER="$ROOT_DIR/deploy/bootstrap-production-deploy-user.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

for script in "$TS" "$USER"; do
  [[ -x "$script" ]] || fail "$(basename "$script") must be executable"
  if grep -qE 'tskey-|BEGIN (OPENSSH|RSA|EC) PRIVATE KEY|oauth.secret|PROD_TAILSCALE_AUTHKEY' "$script"; then
    fail "$(basename "$script") must not embed credentials"
  fi
done
pass "bootstrap scripts contain no embedded credentials"

set +e
env COHESTRA_BOOTSTRAP_UNDER_TEST=1 bash "$TS" >"$out" 2>&1
ts_test_rc=$?
env COHESTRA_BOOTSTRAP_UNDER_TEST=1 bash "$USER" >"$out" 2>&1
user_test_rc=$?
set -e
[[ "$ts_test_rc" -ne 0 && "$user_test_rc" -ne 0 ]] || fail "test harness must refuse live mutation"
pass "test harness cannot install Tailscale or mutate accounts"

set +e
bash "$TS" >"$out" 2>&1
ts_rc=$?
set -e
[[ "$ts_rc" -ne 0 ]] || fail "non-root Tailscale bootstrap must refuse"
grep -q 'must_run_as_root' "$out" || fail "non-root Tailscale bootstrap reason"
pass "Tailscale bootstrap refuses unless root"

set +e
bash "$USER" >"$out" 2>&1
user_rc=$?
set -e
[[ "$user_rc" -ne 0 ]] || fail "non-root deploy-user bootstrap must refuse"
grep -q 'must_run_as_root' "$out" || fail "non-root deploy-user bootstrap reason"
pass "deploy-user bootstrap refuses unless root"

grep -q 'tag:cohestra-production' "$TS" || fail "Tailscale bootstrap must name tag:cohestra-production"
grep -q -- '--advertise-exit-node=false' "$TS" || fail "exit node must stay disabled"
grep -q -- '--accept-routes=false' "$TS" || fail "subnet routes must stay disabled"
grep -q -- '--ssh=false' "$TS" || fail "Tailscale SSH must stay disabled"
if grep -qE 'tailscale up .*tskey|tailscale up .*--authkey' "$TS"; then
  fail "bootstrap must not auto-join with an embedded key"
fi
pass "Tailscale bootstrap leaves join to the owner and disables exit/subnet/SSH"

grep -q '/home/deploy/cohestra-production' "$USER" || fail "deploy path missing"
grep -q 'passwd -l' "$USER" || fail "deploy password must be locked"
grep -q 'passwordless_sudo_forbidden' "$USER" || fail "passwordless sudo must be refused"
if grep -qE 'ssh-ed25519|ssh-rsa AAAA|BEGIN OPENSSH' "$USER"; then
  fail "deploy-user bootstrap must not embed an SSH public key"
fi
if grep -qE 'NOPASSWD|sudoers' "$USER" && grep -qE 'echo .*deploy ALL' "$USER"; then
  fail "deploy-user bootstrap must not write sudoers"
fi
pass "deploy-user bootstrap prepares the account without keys or sudo"

echo "bootstrap-production-overlay contract OK"
