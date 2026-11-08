#!/usr/bin/env bash
# Dump, restore, and verify a Postgres database on localhost only.
# Restore targets must be named *_disposable. Live UAT and Production names
# and hosts are refused. This script does not open SSH or change secrets.

set -euo pipefail

usage() {
  echo "usage: disposable-backup-restore.sh dump|restore|verify --database NAME [--file PATH]" >&2
  exit 2
}

refuse() {
  echo "REFUSED: $1" >&2
  exit 2
}

host="${PGHOST:-localhost}"
case "$host" in
  localhost|127.0.0.1|::1) ;;
  *) refuse "host '$host' is not local" ;;
esac

if [[ "${DATABASE_URL:-}" == *159.223.55.242* || "${DATABASE_URL:-}" == *129.212.235.2* ]]; then
  refuse "DATABASE_URL points at a known live host"
fi

command="${1:-}"
shift || usage

database=""
file=""
lock_file="${DISPOSABLE_RESTORE_LOCK:-/tmp/cohestra-disposable-restore.lock}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --database) database="${2:-}"; shift 2 ;;
    --file) file="${2:-}"; shift 2 ;;
    --lock-file) lock_file="${2:-}"; shift 2 ;;
    *) refuse "unknown argument $1" ;;
  esac
done

[[ -n "$database" ]] || usage

database_lc="${database,,}"
if [[ "$database_lc" == *uat* || "$database_lc" == *prod* || "$database_lc" == *production* ]]; then
  refuse "database name '$database' looks like a live environment"
fi

case "$database_lc" in
  cohestra|cohestra_test|cohestra_uat|postgres|template0|template1)
    refuse "database '$database' is protected"
    ;;
esac

case "$command" in
  dump)
    [[ -n "$file" ]] || usage
    # Plain SQL so a newer client can be filtered before restore onto Postgres 16.
    pg_dump --host="$host" --format=plain --no-owner --file="$file" "$database"
    echo "DUMPED $database"
    ;;
  restore)
    [[ -n "$file" ]] || usage
    [[ "$database_lc" == *_disposable ]] || refuse "restore database must end with _disposable"
    mkdir -p "$(dirname "$lock_file")"
    exec 9>"$lock_file"
    if ! flock -w 1 9; then
      refuse "another disposable restore holds the lock"
    fi
    [[ -f "$file" ]] || refuse "dump file is missing"
    dropdb --host="$host" --if-exists --force "$database"
    createdb --host="$host" "$database"
    # Postgres 17+ pg_dump emits SET transaction_timeout, which Postgres 16 rejects.
    filtered="$(mktemp)"
    grep -v -E "^[[:space:]]*SET transaction_timeout[[:space:]]*=" "$file" >"$filtered"
    psql --host="$host" --dbname="$database" --no-psqlrc --set=ON_ERROR_STOP=1 \
      --single-transaction --file="$filtered"
    rm -f "$filtered"
    echo "RESTORED $database"
    ;;
  verify)
    [[ "$database_lc" == *_disposable ]] || refuse "verify database must end with _disposable"
    psql --host="$host" --dbname="$database" --no-psqlrc --set=ON_ERROR_STOP=1 <<'SQL'
SELECT
  (SELECT count(*) FROM rehearsal_tenants) AS tenants,
  (SELECT count(*) FROM rehearsal_clients) AS clients,
  (SELECT count(*) FROM rehearsal_clients c
     WHERE NOT EXISTS (
       SELECT 1 FROM rehearsal_tenants t WHERE t.id = c.tenant_id)) AS orphans;
SQL
    orphans="$(psql --host="$host" --dbname="$database" --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 \
      -c "SELECT count(*) FROM rehearsal_clients c WHERE NOT EXISTS (SELECT 1 FROM rehearsal_tenants t WHERE t.id = c.tenant_id);")"
    if [[ "$orphans" != "0" ]]; then
      refuse "orphan client rows: $orphans"
    fi
    echo "VERIFIED $database"
    ;;
  *)
    usage
    ;;
esac
