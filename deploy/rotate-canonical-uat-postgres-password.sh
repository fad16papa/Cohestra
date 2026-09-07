#!/usr/bin/env bash
# Rotate the isolated Cohestra UAT Postgres role password in place.
# Never prints secret values. Never deletes volumes. Never touches
# lead-generation-crm.
#
# Usage (on the droplet as deploy):
#   bash deploy/rotate-canonical-uat-postgres-password.sh
#   bash deploy/uat-compose.sh up -d --no-deps --force-recreate api

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env}"
PG_CONTAINER="${COHESTRA_UAT_POSTGRES_CONTAINER:-cohestra-uat-postgres}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "REFUSE: missing $ENV_FILE" >&2
  exit 1
fi
if [[ "$ENV_FILE" == *lead-generation-crm* ]]; then
  echo "REFUSE: will not touch the existing application env" >&2
  exit 1
fi
if [[ "$PG_CONTAINER" != cohestra-uat-postgres ]]; then
  echo "REFUSE: refusing to ALTER a non-Cohestra UAT Postgres container" >&2
  exit 1
fi
if ! docker inspect "$PG_CONTAINER" >/dev/null 2>&1; then
  echo "REFUSE: $PG_CONTAINER is not available" >&2
  exit 1
fi

image=$(docker inspect "$PG_CONTAINER" --format '{{.Config.Image}}')
if [[ "$image" != postgres:16-alpine ]]; then
  echo "REFUSE: unexpected image on $PG_CONTAINER: $image" >&2
  exit 1
fi

umask 077
WORKDIR=$(mktemp -d)
SQL="$WORKDIR/rotate.sql"
NEWPASS="$WORKDIR/newpass"
trap 'rm -rf "$WORKDIR"' EXIT

python3 - "$ENV_FILE" "$SQL" "$NEWPASS" <<'PY'
import pathlib, re, secrets, sys

env_path = pathlib.Path(sys.argv[1])
sql_path = pathlib.Path(sys.argv[2])
pass_path = pathlib.Path(sys.argv[3])
text = env_path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")

def read_key(src: str, key: str) -> str:
    match = re.search(rf"^[ \t]*(?:export[ \t]+)?{re.escape(key)}=(.*)$", src, re.M)
    if not match:
        return ""
    return match.group(1).strip().strip("'").strip('"')

current = read_key(text, "POSTGRES_PASSWORD")
user = read_key(text, "POSTGRES_USER") or "crm"
if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", user):
    print("REFUSE: POSTGRES_USER failed identifier check", file=sys.stderr)
    sys.exit(1)
if current.strip().lower() != "crm":
    print("REFUSE: POSTGRES_PASSWORD is not the development placeholder; not rotating", file=sys.stderr)
    sys.exit(2)

new = secrets.token_urlsafe(32)
if new.lower() == "crm" or len(new) < 32:
    print("REFUSE: generated password failed strength check", file=sys.stderr)
    sys.exit(1)

sql_path.write_text(f"ALTER USER {user} PASSWORD $cohestra${new}$cohestra$;\n", encoding="utf-8")
sql_path.chmod(0o600)
pass_path.write_text(new, encoding="utf-8")
pass_path.chmod(0o600)
print("sql_ready=yes")
print(f"role={user}")
PY

docker cp "$SQL" "$PG_CONTAINER:/tmp/cohestra-rotate-password.sql"
if ! docker exec "$PG_CONTAINER" psql -U crm -d postgres -v ON_ERROR_STOP=1 \
  -f /tmp/cohestra-rotate-password.sql >/dev/null; then
  docker exec "$PG_CONTAINER" rm -f /tmp/cohestra-rotate-password.sql || true
  echo "REFUSE: ALTER USER failed; .env was not changed" >&2
  exit 1
fi
docker exec "$PG_CONTAINER" rm -f /tmp/cohestra-rotate-password.sql

python3 - "$ENV_FILE" "$NEWPASS" <<'PY'
import pathlib, re, sys

env_path = pathlib.Path(sys.argv[1])
new = pathlib.Path(sys.argv[2]).read_text(encoding="utf-8")
text = env_path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
pat = re.compile(r"^[ \t]*(?:export[ \t]+)?POSTGRES_PASSWORD=.*$", re.M)
line = "POSTGRES_PASSWORD=" + new
if pat.search(text):
    text = pat.sub(line, text)
else:
    if text and not text.endswith("\n"):
        text += "\n"
    text += line + "\n"
tmp = env_path.with_name(".env.rotate.tmp")
tmp.write_text(text, encoding="utf-8")
tmp.chmod(0o600)
tmp.replace(env_path)
print("env_password=ROTATED")
print("secrets_not_printed=yes")
PY

chmod 600 "$ENV_FILE"
if command -v chown >/dev/null && [[ "$(id -u)" -eq 0 ]]; then
  chown deploy:deploy "$ENV_FILE"
fi

echo "canonical_env_mode=$(stat -c %a "$ENV_FILE")"
echo "postgres_container=$PG_CONTAINER"
echo "volume_not_deleted=yes"
echo "existing_app_untouched=yes"
echo "NEXT: bash deploy/uat-compose.sh up -d --no-deps --force-recreate api"
