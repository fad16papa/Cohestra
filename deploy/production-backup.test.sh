#!/usr/bin/env bash
# Refusal tests always run. Synthetic backup/restore roundtrip runs when Postgres and gpg exist.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/deploy/production-backup.sh"
chmod +x "$SCRIPT"

FIXTURE_SECRET="DO_NOT_LEAK_fixture_secret_46_5_xyz"
export FIXTURE_SECRET

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

expect_refuse() {
  local label="$1"
  shift
  if "$@" >"$TMP/out" 2>"$TMP/err"; then
    fail "$label was allowed"
  fi
  if ! grep -q '^REFUSED:' "$TMP/err"; then
    cat "$TMP/out" "$TMP/err" >&2
    fail "$label did not refuse"
  fi
  assert_no_fixture_leak "$label"
  pass "$label"
}

expect_fail() {
  local label="$1"
  shift
  if "$@" >"$TMP/out" 2>"$TMP/err"; then
    fail "$label succeeded unexpectedly"
  fi
  assert_no_fixture_leak "$label"
  pass "$label"
}

assert_no_fixture_leak() {
  local label="$1"
  if grep -q "$FIXTURE_SECRET" "$TMP/out" "$TMP/err" 2>/dev/null; then
    fail "$label leaked fixture secret"
  fi
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OFFHOST="$TMP/offhost"
mkdir -p "$OFFHOST"
export BACKUP_OFFHOST_DIR="$OFFHOST"

STUB_BIN="$TMP/stub-bin"
INVOCATION_LOG="$TMP/client-invocations.log"
mkdir -p "$STUB_BIN"
: >"$INVOCATION_LOG"
for tool in pg_dump pg_restore dropdb createdb psql; do
  cat >"$STUB_BIN/$tool" <<EOF
#!/bin/sh
printf '%s %s\n' "$tool" "\$*" >> "\${INVOCATION_LOG:?}"
exit 97
EOF
  chmod +x "$STUB_BIN/$tool"
done

expect_client_refused() {
  local label="$1"
  shift
  : >"$INVOCATION_LOG"
  if PATH="$STUB_BIN:$PATH" "$@" >"$TMP/out" 2>"$TMP/err"; then
    fail "$label was allowed"
  fi
  if ! grep -q '^REFUSED:' "$TMP/err"; then
    cat "$TMP/out" "$TMP/err" >&2
    fail "$label did not refuse"
  fi
  if [[ -s "$INVOCATION_LOG" ]]; then
    cat "$INVOCATION_LOG" >&2
    fail "$label invoked a database client"
  fi
  assert_no_fixture_leak "$label"
  pass "$label"
}

expect_refuse "missing offhost dir" \
  env -u BACKUP_OFFHOST_DIR "$SCRIPT" backup --database rehearsal_src
expect_refuse "relative offhost dir" \
  env BACKUP_OFFHOST_DIR="relative/path" "$SCRIPT" backup --database rehearsal_src
expect_refuse "forbidden offhost marker" \
  env BACKUP_OFFHOST_DIR="/var/backups/cohestra.app" "$SCRIPT" backup --database rehearsal_src

PRIVATE_KEY="$TMP/private.asc"
cat >"$PRIVATE_KEY" <<'PGP'
-----BEGIN PGP PRIVATE KEY BLOCK-----
version: test
x
-----END PGP PRIVATE KEY BLOCK-----
PGP
export BACKUP_GPG_PUBLIC_KEY_FILE="$PRIVATE_KEY"
expect_refuse "private key file rejected" \
  "$SCRIPT" backup --database rehearsal_src

unset BACKUP_GPG_PUBLIC_KEY_FILE
expect_refuse "missing gpg public key" \
  "$SCRIPT" backup --database rehearsal_src

PUBLIC_KEY="$TMP/public.asc"
GPG_HOME="$TMP/gnupg"
mkdir -p "$GPG_HOME"
chmod 700 "$GPG_HOME"
if command -v gpg >/dev/null 2>&1; then
  GNUPGHOME="$GPG_HOME" gpg --batch --passphrase '' \
    --quick-generate-key 'Cohestra Backup Test <backup-test@cohestra.local>' rsa4096 default 0
  fpr="$(GNUPGHOME="$GPG_HOME" gpg --batch --list-keys --with-colons | awk -F: '$1=="fpr" {print $10; exit}')"
  GNUPGHOME="$GPG_HOME" gpg --batch --passphrase '' --quick-add-key "$fpr" rsa4096 encr never
  GNUPGHOME="$GPG_HOME" gpg --armor --export 'Cohestra Backup Test <backup-test@cohestra.local>' >"$PUBLIC_KEY"
  export BACKUP_GPG_PUBLIC_KEY_FILE="$PUBLIC_KEY"
else
  echo "-----BEGIN PGP PUBLIC KEY BLOCK-----\ntest\n-----END PGP PUBLIC KEY BLOCK-----" >"$PUBLIC_KEY"
  export BACKUP_GPG_PUBLIC_KEY_FILE="$PUBLIC_KEY"
fi

expect_refuse "remote backup host" \
  env PGHOST=159.223.55.242 "$SCRIPT" backup --database rehearsal_src
expect_refuse "live ip in env var" \
  env PGHOST=localhost COHESTRA_TEST_HOST=159.223.55.242 \
  "$SCRIPT" backup --database rehearsal_src

expect_client_refused "protected backup database" \
  "$SCRIPT" backup --database cohestra

expect_refuse "restore production disposable name" \
  env PGHOST=localhost PADDLE_API_KEY="" SENDGRID_API_KEY="" SENDGRID_API_KEY_ID="" \
  "$SCRIPT" restore-isolated --database production_disposable --artifact-basename missing.gpg
expect_refuse "restore without disposable suffix" \
  env PGHOST=localhost "$SCRIPT" restore-isolated --database rehearsal_dst --artifact-basename missing.gpg
expect_refuse "restore protected cohestra" \
  env PGHOST=localhost "$SCRIPT" restore-isolated --database cohestra --artifact-basename missing.gpg
expect_refuse "restore cohestra_uat_disposable" \
  env PGHOST=localhost "$SCRIPT" restore-isolated --database cohestra_uat_disposable --artifact-basename missing.gpg
expect_refuse "restore remote host 159" \
  env PGHOST=159.223.55.242 "$SCRIPT" restore-isolated --database rehearsal_dst_disposable --artifact-basename x.gpg
expect_refuse "restore remote host 129" \
  env PGHOST=129.212.235.2 "$SCRIPT" restore-isolated --database rehearsal_dst_disposable --artifact-basename x.gpg
expect_refuse "restore with paddle api key set" \
  env PGHOST=localhost PADDLE_API_KEY=sk_test_dummy \
  "$SCRIPT" restore-isolated --database rehearsal_dst_disposable --artifact-basename x.gpg

CORRUPT_KEY="$TMP/corrupt.asc"
echo "-----BEGIN PGP PUBLIC KEY BLOCK-----
corrupt
-----END PGP PUBLIC KEY BLOCK-----" >"$CORRUPT_KEY"
if command -v gpg >/dev/null 2>&1; then
  expect_fail "encryption failure with corrupt key" \
    env BACKUP_GPG_PUBLIC_KEY_FILE="$CORRUPT_KEY" PATH="/usr/bin:/bin" \
    "$SCRIPT" backup --database rehearsal_src
else
  expect_fail "encryption failure without gpg" \
    env BACKUP_GPG_PUBLIC_KEY_FILE="$PUBLIC_KEY" PATH="$STUB_BIN" \
    "$SCRIPT" backup --database rehearsal_src
fi

ARTIFACT="synthetic.dump.gpg"
echo "cipher-bytes" >"$OFFHOST/$ARTIFACT"
printf '%s' '{"status":"backup_complete","sha256":"%s","artifact":"%s","byte_size":12,"database":"rehearsal_src","created_at":"2026-01-01T00:00:00Z"}\n' \
  "0000000000000000000000000000000000000000000000000000000000000000" "$ARTIFACT" \
  >"$OFFHOST/${ARTIFACT}.manifest.json"
expect_fail "sha mismatch on verify-artifact" \
  "$SCRIPT" verify-artifact --artifact-basename "$ARTIFACT"

ROUNDTRIP=0
if command -v gpg >/dev/null 2>&1 && command -v pg_dump >/dev/null 2>&1 \
  && pg_isready --host=localhost --username="${PGUSER:-crm}" >/dev/null 2>&1; then
  ROUNDTRIP=1
fi

if [[ "$ROUNDTRIP" -eq 0 ]]; then
  echo "SKIP: synthetic roundtrip (Postgres or gpg unavailable)"
  exit 0
fi

export PGHOST=localhost
export PGUSER="${PGUSER:-crm}"
export GNUPGHOME="$GPG_HOME"
if [[ -z "${PGPASSWORD:-}" ]]; then
  export PGPASSWORD=crm
fi

SRC="rehearsal_src"
DST="rehearsal_dst_disposable"
dropdb --if-exists --force "$SRC" >/dev/null 2>&1 || true
dropdb --if-exists --force "$DST" >/dev/null 2>&1 || true
createdb "$SRC"
psql --dbname="$SRC" --no-psqlrc --set=ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE rehearsal_marker (id serial PRIMARY KEY, label text NOT NULL);
INSERT INTO rehearsal_marker (label) VALUES ('roundtrip');
SQL

ART="rehearsal-roundtrip.dump.gpg"
ATTEST="$TMP/attestation.json"
export BACKUP_GPG_PUBLIC_KEY_FILE="$PUBLIC_KEY"
"$SCRIPT" backup --database "$SRC" --artifact-basename "$ART"
"$SCRIPT" verify-artifact --artifact-basename "$ART"
"$SCRIPT" restore-isolated --database "$DST" --artifact-basename "$ART" --attestation-path "$ATTEST"

status="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("status"))' "$ATTEST")"
proven="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("production_recovery_proven"))' "$ATTEST")"
[[ "$status" == "verified" ]] || fail "attestation status not verified"
[[ "$proven" == "False" || "$proven" == "false" ]] || fail "production_recovery_proven must be false"

count="$(psql --dbname="$DST" --tuples-only --no-align --set=ON_ERROR_STOP=1 -c 'SELECT count(*) FROM rehearsal_marker;')"
[[ "$count" == "1" ]] || fail "restored marker row count"
src_count="$(psql --dbname="$SRC" --tuples-only --no-align --set=ON_ERROR_STOP=1 -c 'SELECT count(*) FROM rehearsal_marker;')"
[[ "$src_count" == "1" ]] || fail "source database was mutated"

pass "synthetic gpg backup roundtrip"
dropdb --if-exists --force "$SRC" >/dev/null
dropdb --if-exists --force "$DST" >/dev/null