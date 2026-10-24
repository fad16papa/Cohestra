#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HELPER="$ROOT_DIR/deploy/lib/production-compose-config-placeholders.sh"
WRAPPER="$ROOT_DIR/deploy/production-compose.sh"
COMPOSE="$ROOT_DIR/docker-compose.production.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

# shellcheck disable=SC1090
. "$HELPER"

out="$(mktemp)"
TMP="$(mktemp -d)"
trap 'rm -f "$out"; rm -rf "$TMP"' EXIT

required_now="$(production_compose_required_var_names "$COMPOSE")"
for name in POSTGRES_PASSWORD REDIS_PASSWORD JWT_SIGNING_KEY PUBLIC_BASE_URL SendGrid__ApiKey SendGrid__FromEmail; do
  grep -qxF "$name" <<<"$required_now" || fail "compose must require $name via :?"
done
[[ "$(grep -c . <<<"$required_now")" -eq 6 ]] || fail "expected exactly six ${VAR:?} names"
pass "compose currently requires the six mandatory interpolation names"

if production_compose_assert_placeholder_contract "$COMPOSE" >"$out" 2>&1; then
  :
else
  cat "$out"
  fail "canonical placeholder contract must match docker-compose.production.yml"
fi
pass "canonical placeholder names match compose :? requirements"

cp "$COMPOSE" "$TMP/drift.yml"
printf '\n      New__Secret: ${NEW_VAR:?Set NEW_VAR in .env}\n' >>"$TMP/drift.yml"
if production_compose_assert_placeholder_contract "$TMP/drift.yml" >"$out" 2>&1; then
  fail "new ${VAR:?} requirement must fail the placeholder contract"
fi
grep -q 'MISSING_CONFIG_PLACEHOLDER=NEW_VAR' "$out" || { cat "$out"; fail "drift must name NEW_VAR"; }
if grep -q 'bootstrap-config-check' "$out"; then
  fail "drift output must not print placeholder values"
fi
pass "new mandatory interpolation variable fails until explicitly handled"

mkdir -p "$TMP/mock-docker"
: >"$TMP/docker-invocations.log"
cat >"$TMP/mock-docker/docker" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"${COHESTRA_TEST_DOCKER_LOG:?}"
if [[ "${1:-}" == "info" ]]; then
  echo "ERROR: Cannot connect to the Docker daemon" >&2
  exit 1
fi
if [[ " $* " == *" up "* ]]; then
  echo "REFUSE: compose up must not run" >&2
  exit 1
fi
if [[ "${1:-}" == "compose" ]] && [[ " $* " == *" config "* ]]; then
  missing=0
  for name in POSTGRES_PASSWORD REDIS_PASSWORD JWT_SIGNING_KEY PUBLIC_BASE_URL SendGrid__ApiKey SendGrid__FromEmail; do
    if [[ -z "${!name:-}" ]]; then
      echo "required variable ${name} is missing a value" >&2
      missing=1
    fi
  done
  if [[ "$missing" -ne 0 ]]; then
    exit 1
  fi
  echo "name: cohestra-production"
  exit 0
fi
echo "REFUSE: unexpected docker invocation: $*" >&2
exit 1
EOF
chmod +x "$TMP/mock-docker/docker"

unset POSTGRES_PASSWORD REDIS_PASSWORD JWT_SIGNING_KEY PUBLIC_BASE_URL SendGrid__ApiKey SendGrid__FromEmail || true
[[ ! -f "$ROOT_DIR/.env" ]] || fail "test must not run against a repo .env"

set +e
PATH="$TMP/mock-docker:$PATH" \
  COHESTRA_TEST_DOCKER_LOG="$TMP/docker-invocations.log" \
  bash "$WRAPPER" config >"$out" 2>&1
cfg_rc=$?
set -e
[[ "$cfg_rc" -eq 0 ]] || { cat "$out"; fail "config without .env must pass using process-only placeholders"; }
grep -q 'compose config OK' "$out" || fail "config success marker"
if grep -q 'bootstrap-config-check' "$out"; then
  fail "placeholder values must never be printed"
fi
if grep -Eq '(^| )up( |$)' "$TMP/docker-invocations.log"; then
  fail "config must not invoke compose up"
fi
[[ ! -f "$ROOT_DIR/.env" ]] || fail "placeholders must not create .env"
[[ ! -f "$TMP/.env" ]] || fail "placeholders must not write .env into the fixture dir"
pass "config without .env applies process-only placeholders and does not persist them"

unset POSTGRES_PASSWORD REDIS_PASSWORD JWT_SIGNING_KEY PUBLIC_BASE_URL SendGrid__ApiKey SendGrid__FromEmail || true
: >"$TMP/docker-invocations.log"
set +e
PATH="$TMP/mock-docker:$PATH" \
  COHESTRA_TEST_DOCKER_LOG="$TMP/docker-invocations.log" \
  bash "$WRAPPER" config -o "$TMP/leaked.yml" >"$out" 2>&1
leak_rc=$?
set -e
[[ "$leak_rc" -ne 0 ]] || fail "config --output must still be refused"
[[ ! -f "$TMP/leaked.yml" ]] || fail "refused config must not write interpolated compose"
pass "config refuses interpolated output files"

echo "production-compose-config-placeholders contract OK"
