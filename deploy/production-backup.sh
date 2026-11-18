#!/usr/bin/env bash
# Production backup: GnuPG-encrypted pg_dump to owner-supplied BACKUP_OFFHOST_DIR.
# restore-isolated targets localhost disposable databases only. No network upload.

set -euo pipefail

usage() {
  echo "usage: production-backup.sh backup|verify-artifact|restore-isolated --database NAME [options]" >&2
  exit 2
}

invalidate_attestation() {
  [[ "${attestation_committed:-0}" == "1" ]] && return 0
  [[ -n "${attestation_path:-}" ]] || return 0
  mkdir -p "$(dirname "$attestation_path")" 2>/dev/null || return 0
  python3 - "$attestation_path" <<'PY' || true
import json
import sys
with open(sys.argv[1], "w", encoding="utf-8") as handle:
    json.dump({"status": "failed", "production_recovery_proven": False}, handle)
    handle.write("\n")
PY
}

refuse() {
  invalidate_attestation
  echo "REFUSED: $1" >&2
  exit 2
}

fail() {
  invalidate_attestation
  echo "FAILED: $1" >&2
  exit 1
}

FORBIDDEN_MARKERS=(
  159.223.55.242
  129.212.235.2
  cohestra.app
  uat.cohestra
)

contains_forbidden_text() {
  local value="$1"
  local marker
  for marker in "${FORBIDDEN_MARKERS[@]}"; do
    if [[ "$value" == *"$marker"* ]]; then
      return 0
    fi
  done
  return 1
}

scan_env_for_forbidden() {
  local key value
  while IFS= read -r line; do
  key="${line%%=*}"
  value="${line#*=}"
  if contains_forbidden_text "$value"; then
    refuse "environment value for ${key} contains a forbidden host marker"
  fi
  done < <(env)
}

require_plain_database_name() {
  local name="$1"
  if [[ ! "$name" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]]; then
    refuse "database name must be a plain identifier"
  fi
}

validate_disposable_target_name() {
  local database="$1"
  require_plain_database_name "$database"
  local database_lc="${database,,}"
  if [[ "$database_lc" != *_disposable ]]; then
    refuse "restore database must end with _disposable"
  fi
  if [[ "$database_lc" == *uat* || "$database_lc" == *prod* || "$database_lc" == *production* || "$database_lc" == *cohestra* ]]; then
    refuse "database name '$database' is not an allowed disposable target"
  fi
  case "$database_lc" in
    cohestra|cohestra_test|cohestra_uat|postgres|template0|template1)
      refuse "database '$database' is protected"
      ;;
  esac
}

refuse_outbound_restore_credentials() {
  if [[ -n "${PADDLE_API_KEY:-}" || -n "${SENDGRID_API_KEY:-}" || -n "${SENDGRID_API_KEY_ID:-}" ]]; then
    refuse "outbound API credentials must not be set for isolated restore"
  fi
}

validate_offhost_dir() {
  local dir="${BACKUP_OFFHOST_DIR:-}"
  [[ -n "$dir" ]] || refuse "BACKUP_OFFHOST_DIR is not set"
  [[ "$dir" == /* ]] || refuse "BACKUP_OFFHOST_DIR must be an absolute path"
  if contains_forbidden_text "$dir"; then
    refuse "BACKUP_OFFHOST_DIR contains a forbidden marker"
  fi
  if [[ -n "${PGDATA:-}" ]]; then
  local resolved_offhost resolved_pgdata
  resolved_offhost="$(readlink -f "$dir" 2>/dev/null || realpath "$dir" 2>/dev/null || echo "$dir")"
  resolved_pgdata="$(readlink -f "$PGDATA" 2>/dev/null || realpath "$PGDATA" 2>/dev/null || echo "$PGDATA")"
  if [[ "$resolved_offhost" == "$resolved_pgdata" ]]; then
    refuse "BACKUP_OFFHOST_DIR must not resolve to PGDATA"
  fi
  fi
  mkdir -p "$dir"
}

validate_gpg_public_key_file() {
  local key_file="${BACKUP_GPG_PUBLIC_KEY_FILE:-}"
  [[ -n "$key_file" ]] || refuse "BACKUP_GPG_PUBLIC_KEY_FILE is not set"
  [[ -f "$key_file" ]] || refuse "BACKUP_GPG_PUBLIC_KEY_FILE is missing"
  if grep -q 'BEGIN PGP PRIVATE KEY BLOCK' "$key_file"; then
    refuse "BACKUP_GPG_PUBLIC_KEY_FILE must contain a public key only"
  fi
  if ! grep -q 'BEGIN PGP PUBLIC KEY BLOCK' "$key_file"; then
    refuse "BACKUP_GPG_PUBLIC_KEY_FILE is not an armored public key"
  fi
}

import_gpg_public_key() {
  local tmp_home
  tmp_home="$(mktemp -d)"
  chmod 700 "$tmp_home"
  if ! GNUPGHOME="$tmp_home" gpg --batch --import "$BACKUP_GPG_PUBLIC_KEY_FILE" >/dev/null 2>&1; then
    rm -rf "$tmp_home"
    return 1
  fi
  echo "$tmp_home"
}

encrypt_file() {
  local plain="$1"
  local cipher="$2"
  local gpg_home="$3"
  local recipient
  recipient="$(GNUPGHOME="$gpg_home" gpg --batch --list-keys --with-colons | awk -F: '$1=="fpr" {print $10; exit}')"
  [[ -n "$recipient" ]] || return 1
  GNUPGHOME="$gpg_home" gpg --batch --yes --quiet --trust-model always --recipient "$recipient" \
    --output "$cipher" --encrypt "$plain"
}

decrypt_file() {
  local cipher="$1"
  local plain="$2"
  local gpg_home="$3"
  GNUPGHOME="$gpg_home" gpg --batch --yes --quiet --trust-model always --output "$plain" --decrypt "$cipher"
}

sha256_file() {
  sha256sum "$1" | awk '{print $1}'
}

write_manifest() {
  local path="$1"
  local status="$2"
  local sha256="$3"
  local basename="$4"
  local bytes="$5"
  local database="$6"
  local created_at="$7"
  python3 - "$path" "$status" "$sha256" "$basename" "$bytes" "$database" "$created_at" <<'PY'
import json
import sys
path, status, sha256, basename, nbytes, database, created_at = sys.argv[1:8]
payload = {
    "status": status,
    "sha256": sha256,
    "artifact": basename,
    "byte_size": int(nbytes),
    "database": database,
    "created_at": created_at,
}
with open(path, "w", encoding="utf-8") as f:
    json.dump(payload, f, separators=(",", ":"))
    f.write("\n")
PY
}

write_attestation() {
  local path="$1"
  local sha256="$2"
  local basename="$3"
  local database="$4"
  python3 - "$path" "$sha256" "$basename" "$database" <<'PY'
import json
import sys
path, sha256, artifact, database = sys.argv[1:5]
payload = {
    "status": "verified",
    "production_recovery_proven": False,
    "isolation": "localhost",
    "sha256": sha256,
    "artifact": artifact,
    "database": database,
}
with open(path, "w", encoding="utf-8") as f:
    json.dump(payload, f, separators=(",", ":"))
    f.write("\n")
PY
}

command="${1:-}"
shift || usage

database=""
artifact_basename=""
attestation_path="${Backup__AttestationPath:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --database) database="${2:-}"; shift 2 ;;
    --artifact-basename) artifact_basename="${2:-}"; shift 2 ;;
    --attestation-path) attestation_path="${2:-}"; shift 2 ;;
    *) refuse "unknown argument $1" ;;
  esac
done

scan_env_for_forbidden

case "$command" in
  backup)
    [[ -n "$database" ]] || usage
    require_plain_database_name "$database"
    database_lc="${database,,}"
    if [[ "$database_lc" == *uat* || "$database_lc" == "cohestra_test" || "$database_lc" == "cohestra_uat" ]]; then
      refuse "database '$database' is not a backup source"
    fi
    case "$database_lc" in
      postgres|template0|template1)
        refuse "database '$database' is protected"
        ;;
      cohestra)
        if [[ "${BACKUP_SOURCE_PLANE:-}" != "dedicated-local" ]]; then
          refuse "database cohestra requires BACKUP_SOURCE_PLANE=dedicated-local"
        fi
        ;;
    esac

    host="${PGHOST:-localhost}"
    case "$host" in
      localhost|127.0.0.1|::1|postgres) ;;
      *) refuse "host '$host' is not allowed for backup" ;;
    esac

    if [[ -n "${PGHOSTADDR:-}" || -n "${PGSERVICE:-}" || -n "${PGSERVICEFILE:-}" ]]; then
      refuse "PGHOSTADDR, PGSERVICE, and PGSERVICEFILE are not allowed"
    fi
    unset PGHOSTADDR PGSERVICE PGSERVICEFILE

    validate_offhost_dir
    validate_gpg_public_key_file
    command -v gpg >/dev/null 2>&1 || fail "gpg is not available"
    command -v pg_dump >/dev/null 2>&1 || fail "pg_dump is not available"
    gpg_home="$(import_gpg_public_key)" || fail "gpg public key import failed"
    gpg_home_owned=1
    trap '[[ "${gpg_home_owned:-0}" == "1" && -n "${gpg_home:-}" ]] && rm -rf "$gpg_home"; [[ -n "${tmp_dir:-}" ]] && rm -rf "$tmp_dir"' EXIT
    encrypt_recipient="$(GNUPGHOME="$gpg_home" gpg --batch --list-keys --with-colons | awk -F: '$1=="fpr" {print $10; exit}')"
    [[ -n "${encrypt_recipient:-}" ]] || fail "gpg encryption failed"

    if [[ -z "$artifact_basename" ]]; then
      artifact_basename="cohestra-${database}-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"
    fi
    if [[ "$artifact_basename" == */* ]]; then
      refuse "artifact basename must not contain a slash"
    fi

    tmp_dir="$(mktemp -d)"
    plain_dump="$tmp_dir/plain.dump"
    cipher_dump="$tmp_dir/cipher.dump.gpg"

    pg_dump --host="$host" --format=custom --no-owner --file="$plain_dump" "$database"
    if ! encrypt_file "$plain_dump" "$cipher_dump" "$gpg_home"; then
      fail "gpg encryption failed"
    fi

    digest="$(sha256_file "$cipher_dump")"
    byte_size="$(wc -c <"$cipher_dump" | tr -d ' ')"
    created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    dest="$BACKUP_OFFHOST_DIR/$artifact_basename"
    cp "$cipher_dump" "$dest"
    manifest_path="$BACKUP_OFFHOST_DIR/${artifact_basename}.manifest.json"
    write_manifest "$manifest_path" "backup_complete" "$digest" "$artifact_basename" "$byte_size" "$database" "$created_at"
    echo "BACKUP_COMPLETE artifact=$artifact_basename sha256=$digest"
    ;;

  verify-artifact)
    [[ -n "$artifact_basename" ]] || refuse "--artifact-basename is required"
    [[ "$artifact_basename" != */* ]] || refuse "artifact basename must not contain a slash"
    validate_offhost_dir
    artifact_path="$BACKUP_OFFHOST_DIR/$artifact_basename"
    manifest_path="$BACKUP_OFFHOST_DIR/${artifact_basename}.manifest.json"
    [[ -f "$artifact_path" ]] || fail "encrypted artifact is missing"
    [[ -f "$manifest_path" ]] || fail "manifest is missing"
    expected="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("sha256",""))' "$manifest_path")" || fail "manifest is not valid JSON"
    [[ "$expected" =~ ^[0-9a-f]{64}$ ]] || fail "manifest sha256 is invalid"
    actual="$(sha256_file "$artifact_path")"
    if [[ "$actual" != "$expected" ]]; then
      fail "sha256 mismatch"
    fi
    echo "VERIFY_OK artifact=$artifact_basename sha256=$actual"
    ;;

  restore-isolated)
    [[ -n "$database" ]] || usage
    [[ -n "$artifact_basename" ]] || refuse "--artifact-basename is required"
    validate_disposable_target_name "$database"
    refuse_outbound_restore_credentials

    host="${PGHOST:-localhost}"
    case "$host" in
      localhost|127.0.0.1|::1) ;;
      *) refuse "host '$host' is not local for restore" ;;
    esac

    if [[ -n "${PGHOSTADDR:-}" || -n "${PGSERVICE:-}" || -n "${PGSERVICEFILE:-}" ]]; then
      refuse "PGHOSTADDR, PGSERVICE, and PGSERVICEFILE are not allowed"
    fi
    unset PGHOSTADDR PGSERVICE PGSERVICEFILE

    validate_offhost_dir
    validate_gpg_public_key_file
    command -v gpg >/dev/null 2>&1 || fail "gpg is not available"
    command -v pg_restore >/dev/null 2>&1 || fail "pg_restore is not available"
    command -v dropdb >/dev/null 2>&1 || fail "dropdb is not available"
    command -v createdb >/dev/null 2>&1 || fail "createdb is not available"
    command -v psql >/dev/null 2>&1 || fail "psql is not available"

    artifact_path="$BACKUP_OFFHOST_DIR/$artifact_basename"
    manifest_path="$BACKUP_OFFHOST_DIR/${artifact_basename}.manifest.json"
    [[ -f "$artifact_path" ]] || fail "encrypted artifact is missing"
    [[ -f "$manifest_path" ]] || fail "manifest is missing"
    expected="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("sha256",""))' "$manifest_path")" || fail "manifest is not valid JSON"
    [[ "$expected" =~ ^[0-9a-f]{64}$ ]] || fail "manifest sha256 is invalid"
    digest="$(sha256_file "$artifact_path")"
    if [[ "$digest" != "$expected" ]]; then
      fail "sha256 mismatch"
    fi

    tmp_dir="$(mktemp -d)"
    plain_dump="$tmp_dir/plain.dump"
    gpg_home=""
    gpg_home_owned=0
    trap '[[ "${gpg_home_owned:-0}" == "1" && -n "${gpg_home:-}" ]] && rm -rf "$gpg_home"; rm -f "$plain_dump"; [[ -n "${tmp_dir:-}" ]] && rm -rf "$tmp_dir"' EXIT

    if [[ -n "${GNUPGHOME:-}" && -d "$GNUPGHOME" ]]; then
      gpg_home="$GNUPGHOME"
    else
      gpg_home="$(import_gpg_public_key)" || fail "gpg decryption failed"
      gpg_home_owned=1
    fi
    if ! decrypt_file "$artifact_path" "$plain_dump" "$gpg_home"; then
      fail "gpg decryption failed"
    fi

    dropdb --host="$host" --if-exists --force "$database"
    createdb --host="$host" "$database"
    pg_restore --host="$host" --dbname="$database" --no-owner --no-privileges "$plain_dump"
    rm -f "$plain_dump"

    current_db="$(psql --host="$host" --dbname="$database" --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 -c "SELECT current_database();")"
    [[ "$current_db" == "$database" ]] || fail "current_database mismatch"

    marker_count=""
    if psql --host="$host" --dbname="$database" --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 \
      -c "SELECT count(*)::text FROM information_schema.tables WHERE table_schema='public' AND table_name='rehearsal_marker';" | grep -qx '1'; then
      marker_count="$(psql --host="$host" --dbname="$database" --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 \
        -c "SELECT count(*)::text FROM rehearsal_marker;")"
      if [[ -n "$marker_count" && "$marker_count" =~ ^[0-9]+$ ]]; then
        :
      else
        fail "rehearsal_marker count is invalid"
      fi
      echo "REHEARSAL_MARKER_COUNT=$marker_count"
    fi

    [[ -n "$attestation_path" ]] || refuse "attestation path is required (Backup__AttestationPath or --attestation-path)"
    mkdir -p "$(dirname "$attestation_path")"
    write_attestation "$attestation_path" "$digest" "$artifact_basename" "$database"
    attestation_committed=1
    echo "RESTORE_ISOLATED verified database=$database artifact=$artifact_basename"
    ;;

  *)
    usage
    ;;
esac