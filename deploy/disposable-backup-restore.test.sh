#!/usr/bin/env bash
# Rehearses disposable backup/restore. Refusals always run.
# The restore rehearsal runs only when local Postgres accepts connections.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/deploy/disposable-backup-restore.sh"
chmod +x "$SCRIPT"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

expect_refuse() {
  local label="$1"
  shift
  if "$@" >"$TMP/out" 2>"$TMP/err"; then
    fail "$label was allowed"
  fi
  if ! grep -q '^REFUSED:' "$TMP/err"; then
    cat "$TMP/err" >&2
    fail "$label did not refuse"
  fi
  pass "$label"
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

expect_refuse "remote host" \
  env PGHOST=159.223.55.242 "$SCRIPT" dump --database beta_src_disposable --file "$TMP/x.dump"
expect_refuse "uat host" \
  env PGHOST=129.212.235.2 "$SCRIPT" restore --database beta_dst_disposable --file "$TMP/x.dump"
expect_refuse "protected database" \
  "$SCRIPT" restore --database cohestra_test --file "$TMP/x.dump"
expect_refuse "mixed-case protected database" \
  "$SCRIPT" dump --database COHESTRA --file "$TMP/x.dump"
expect_refuse "mixed-case uat name" \
  "$SCRIPT" restore --database Cohestra_UAT_disposable --file "$TMP/missing.dump"
expect_refuse "uat-like disposable name" \
  "$SCRIPT" restore --database cohestra_uat_disposable --file "$TMP/missing.dump"
expect_refuse "live database url" \
  env DATABASE_URL="postgres://crm@159.223.55.242/cohestra" \
  "$SCRIPT" dump --database beta_src_disposable --file "$TMP/x.dump"

LOCK="$TMP/held.lock"
touch "$TMP/present.dump"
flock -n "$LOCK" -c "sleep 3" &
sleep 0.4
if PGHOST=localhost "$SCRIPT" restore --database beta_dst_disposable --file "$TMP/present.dump" --lock-file "$LOCK" >"$TMP/out" 2>"$TMP/err"; then
  fail "locked restore was allowed"
fi
if ! grep -q 'another disposable restore' "$TMP/err"; then
  cat "$TMP/err" >&2
  fail "locked restore did not refuse"
fi
pass "concurrent restore lock"
wait || true

if ! command -v pg_dump >/dev/null || ! pg_isready --host=localhost --username="${PGUSER:-crm}" >/dev/null 2>&1; then
  if [[ "${CI:-}" == "true" ]]; then
    fail "CI requires local Postgres and pg_dump for the restore rehearsal"
  fi
  echo "SKIP: local Postgres is not available for the restore rehearsal"
  exit 0
fi

export PGHOST=localhost
export PGUSER="${PGUSER:-crm}"
export PGPASSWORD="${PGPASSWORD:-crm}"

SRC="beta_src_disposable"
DST="beta_dst_disposable"
dropdb --if-exists --force "$SRC" >/dev/null
dropdb --if-exists --force "$DST" >/dev/null
createdb "$SRC"

psql --dbname="$SRC" --no-psqlrc --set=ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE rehearsal_tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE rehearsal_clients (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES rehearsal_tenants(id),
  full_name text NOT NULL,
  phone text NOT NULL
);
INSERT INTO rehearsal_tenants (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Alpha'),
  ('22222222-2222-2222-2222-222222222222', 'Beta');
INSERT INTO rehearsal_clients (id, tenant_id, full_name, phone) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ava Alpha', '+6590000001'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Ben Beta', '+6590000002');
SQL

"$SCRIPT" dump --database "$SRC" --file "$TMP/rehearsal.dump"
printf '\nSET transaction_timeout = 0;\n' >>"$TMP/rehearsal.dump"
"$SCRIPT" restore --database "$DST" --file "$TMP/rehearsal.dump" --lock-file "$TMP/restore.lock"
"$SCRIPT" verify --database "$DST"

phone="$(psql --dbname="$DST" --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 \
  -c "SELECT phone FROM rehearsal_clients WHERE full_name = 'Ava Alpha';")"
other="$(psql --dbname="$DST" --tuples-only --no-align --set=ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM rehearsal_clients WHERE tenant_id = '22222222-2222-2222-2222-222222222222';")"
src_still="$(psql --dbname="$SRC" --tuples-only --no-align --set=ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM rehearsal_clients;")"

[[ "$phone" == "+6590000001" ]] || fail "restored phone mismatch: $phone"
[[ "$other" == "1" ]] || fail "second tenant client missing"
[[ "$src_still" == "2" ]] || fail "source database was mutated"
pass "representative restore"

dropdb --if-exists --force "$SRC" >/dev/null
dropdb --if-exists --force "$DST" >/dev/null
pass "disposable databases removed"
