#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/verify-production-overlay-connectivity.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

ok=(
  PROD_TAILSCALE_CLIENT_ID=k123456CNTRL
  PROD_TAILSCALE_AUDIENCE=https://tailscale.com/cap/example
  PROD_TAILSCALE_HOST=100.64.0.10
)

if grep -nE '159\.223\.55\.242|129\.212\.235\.2' "$SCRIPT" | grep -vqE 'public_ip_fallback|159\.223\.55\.242|129\.212\.235\.2'; then
  :
fi
if grep -qE 'nc |nmap |ssh .*159\.223|ssh .*129\.212' "$SCRIPT"; then
  fail "connectivity helper must not probe public TCP 22"
fi
pass "connectivity helper has no public TCP 22 fallback"

if grep -qE 'echo .*PROD_TAILSCALE_HOST|printf .*PROD_TAILSCALE_HOST' "$SCRIPT"; then
  fail "connectivity helper must not print the overlay host"
fi
pass "connectivity helper does not print the overlay host"

set +e
env "${ok[@]}" bash "$SCRIPT" >"$out" 2>&1
rc=$?
set -e
if [[ "$rc" -eq 0 ]]; then
  fail "missing tailscale CLI must refuse"
fi
if ! grep -qE 'tailscale_cli_missing|overlay_unreachable|host_is_not_tailscale_cgnat' "$out"; then
  # Local PATH may already contain a tailscale binary; still must not PASS without a live overlay.
  grep -q 'RESULT=REFUSE' "$out" || fail "must refuse when overlay is not live"
fi
grep -q 'PUBLIC_SSH_FALLBACK=false' "$out" || fail "must declare no public fallback"
pass "live overlay is not assumed in contract tests"

set +e
env "${ok[@]}" PROD_TAILSCALE_HOST=159.223.55.242 bash "$SCRIPT" >"$out" 2>&1
rc=$?
set -e
[[ "$rc" -ne 0 ]] || fail "public Production IPv4 must be refused"
grep -q 'RESULT=REFUSE' "$out" || fail "public Production IPv4 refuse marker"
pass "public Production IPv4 cannot be used as overlay ping target"

set +e
env "${ok[@]}" PROD_TAILSCALE_HOST=129.212.235.2 bash "$SCRIPT" >"$out" 2>&1
rc=$?
set -e
[[ "$rc" -ne 0 ]] || fail "UAT IPv4 must be refused"
pass "UAT IPv4 cannot be used as overlay ping target"

echo "verify-production-overlay-connectivity contract OK"
