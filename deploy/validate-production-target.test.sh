#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/validate-production-target.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

run() {
  env "$@" bash "$SCRIPT" >"$out" 2>&1
}

ok=(
  PROD_DROPLET_HOST=159.223.55.242
  PROD_DROPLET_USER=deploy
  PROD_DROPLET_DEPLOY_PATH=/home/deploy/cohestra-production
  PROD_COMPOSE_PROJECT=cohestra-production
  PROD_PUBLIC_BASE_URL=http://159.223.55.242
)

if ! run "${ok[@]}"; then
  fail "canonical Production target must pass"
fi
grep -q 'RESULT=PASS' "$out" || fail "PASS marker"
pass "Production IPv4 and default path are accepted"

if run "${ok[@]}" PROD_DROPLET_HOST=129.212.235.2; then
  fail "UAT IPv4 must be refused"
fi
pass "UAT IPv4 is refused"

if run "${ok[@]}" PROD_DROPLET_HOST=2001:db8::1; then
  fail "IPv6 must be refused"
fi
pass "IPv6 is refused"

if run "${ok[@]}" PROD_DROPLET_HOST=uat.cohestra.app; then
  fail "UAT hostname must be refused"
fi
pass "UAT hostname is refused"

if run "${ok[@]}" PROD_PUBLIC_BASE_URL=https://uat.cohestra.app; then
  fail "UAT public URL must be refused"
fi
pass "UAT public URL is refused"

if run "${ok[@]}" PROD_DROPLET_DEPLOY_PATH=/tmp/../etc; then
  fail ".. path must be refused"
fi
pass ".. path is refused"

if run "${ok[@]}" PROD_DROPLET_DEPLOY_PATH=relative/path; then
  fail "relative path must be refused"
fi
pass "relative path is refused"

if run "${ok[@]}" PROD_DROPLET_DEPLOY_PATH=/home/deploy/cohestra; then
  fail "UAT checkout must be refused"
fi
pass "UAT checkout path is refused"

if run "${ok[@]}" PROD_COMPOSE_PROJECT=cohestra-uat; then
  fail "wrong compose project must be refused"
fi
pass "wrong compose project is refused"

if run "${ok[@]}" PROD_DROPLET_USER=root; then
  fail "non-deploy SSH user must be refused"
fi
pass "non-deploy SSH user is refused"

if run "${ok[@]}" PROD_PUBLIC_BASE_URL=https://www.cohestra.app; then
  fail "customer cutover URL must be refused"
fi
pass "customer cutover URL is refused"

if run "${ok[@]}" PROD_PUBLIC_BASE_URL=http://129.212.235.2; then
  fail "UAT IPv4 URL must be refused"
fi
pass "UAT IPv4 URL is refused"

echo "validate-production-target contract OK"
