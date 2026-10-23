#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/validate-production-overlay-target.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

run() {
  env "$@" bash "$SCRIPT" >"$out" 2>&1
}

ok=(
  PROD_TAILSCALE_CLIENT_ID=k123456CNTRL
  PROD_TAILSCALE_AUDIENCE=https://tailscale.com/cap/example
  PROD_TAILSCALE_HOST=100.64.0.10
)

if ! run "${ok[@]}"; then
  fail "canonical CGNAT overlay target must pass"
fi
grep -q 'RESULT=PASS' "$out" || fail "PASS marker"
grep -q 'PROD_TAILSCALE_HOST=present' "$out" || fail "must not print host value"
grep -qv '100.64.0.10' "$out" || fail "must not print overlay host"
pass "CGNAT overlay target is accepted without printing values"

if run "${ok[@]}" PROD_TAILSCALE_CLIENT_ID=; then
  fail "missing client id must be refused"
fi
grep -q 'MISSING_OVERLAY_CONFIG=PROD_TAILSCALE_CLIENT_ID' "$out" || fail "missing client id name"
pass "missing client id is refused by name"

if run "${ok[@]}" PROD_TAILSCALE_AUDIENCE='   '; then
  fail "whitespace audience must be refused"
fi
pass "whitespace audience is refused"

if run "${ok[@]}" PROD_TAILSCALE_HOST=; then
  fail "empty host must be refused"
fi
grep -q 'MISSING_OVERLAY_CONFIG=PROD_TAILSCALE_HOST' "$out" || fail "missing host name"
pass "empty host is refused"

if run "${ok[@]}" PROD_TAILSCALE_HOST=159.223.55.242; then
  fail "public Production IPv4 must be refused as transport"
fi
grep -q 'public_production_ipv4_is_inventory_not_transport' "$out" || fail "inventory/transport distinction"
pass "public Production IPv4 is refused as overlay transport"

if run "${ok[@]}" PROD_TAILSCALE_HOST=129.212.235.2; then
  fail "UAT IPv4 must be refused"
fi
pass "UAT IPv4 is refused"

if run "${ok[@]}" PROD_TAILSCALE_HOST=127.0.0.1; then
  fail "loopback must be refused"
fi
pass "loopback is refused"

if run "${ok[@]}" PROD_TAILSCALE_HOST=10.1.2.3; then
  fail "RFC1918 10/8 must be refused"
fi
if run "${ok[@]}" PROD_TAILSCALE_HOST=192.168.1.10; then
  fail "RFC1918 192.168/16 must be refused"
fi
if run "${ok[@]}" PROD_TAILSCALE_HOST=172.16.0.5; then
  fail "RFC1918 172.16/12 must be refused"
fi
pass "RFC1918 substitution is refused"

if run "${ok[@]}" PROD_TAILSCALE_HOST=8.8.8.8; then
  fail "public resolver IPv4 must be refused"
fi
if run "${ok[@]}" PROD_TAILSCALE_HOST=100.63.255.255; then
  fail "address below CGNAT must be refused"
fi
if run "${ok[@]}" PROD_TAILSCALE_HOST=100.128.0.1; then
  fail "address above CGNAT must be refused"
fi
pass "non-CGNAT IPv4 is refused"

if run "${ok[@]}" PROD_TAILSCALE_HOST=fd7a:115c:a1e0::1; then
  fail "IPv6 must be refused"
fi
if run "${ok[@]}" PROD_TAILSCALE_HOST='[100.64.0.10]'; then
  fail "bracketed host must be refused"
fi
pass "IPv6 and bracketed hosts are refused"

if run "${ok[@]}" PROD_TAILSCALE_HOST=prod.tailnet.ts.net; then
  fail "MagicDNS hostname must be refused"
fi
if run "${ok[@]}" PROD_TAILSCALE_HOST=cohestra-production; then
  fail "hostname substitution must be refused"
fi
pass "hostname / MagicDNS substitution is refused"

if run "${ok[@]}" PROD_TAILSCALE_HOST=100.64.0.10:22; then
  fail "host:port must be refused"
fi
if run "${ok[@]}" PROD_TAILSCALE_HOST=0100.64.0.10; then
  fail "leading-zero IPv4 must be refused"
fi
if run "${ok[@]}" PROD_TAILSCALE_HOST=100.64.0; then
  fail "truncated IPv4 must be refused"
fi
pass "malformed IPv4 is refused"

if run "${ok[@]}" PROD_TAILSCALE_CLIENT_ID=tskey-auth-example; then
  fail "authkey-shaped client id must be refused"
fi
pass "authkey-shaped identifiers are refused"

echo "validate-production-overlay-target contract OK"
