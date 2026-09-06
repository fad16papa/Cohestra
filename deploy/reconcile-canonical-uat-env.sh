#!/usr/bin/env bash
# Reconcile staged owner env → canonical /home/deploy/cohestra/.env
# Never prints secret values. Generates JWT_SIGNING_KEY if missing.
#
# Usage (on the droplet as deploy):
#   bash deploy/reconcile-canonical-uat-env.sh
#   bash deploy/reconcile-canonical-uat-env.sh /home/deploy/cohestra.env /home/deploy/cohestra/.env

set -euo pipefail

STAGED="${1:-/home/deploy/cohestra.env}"
CANONICAL="${2:-/home/deploy/cohestra/.env}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$STAGED" ]]; then
  echo "REFUSE: staged env missing at $STAGED" >&2
  exit 1
fi

canon_dir=$(dirname "$CANONICAL")
if [[ ! -d "$canon_dir" ]]; then
  echo "REFUSE: canonical deploy directory missing: $canon_dir" >&2
  echo "Clone the PR branch to /home/deploy/cohestra first." >&2
  exit 1
fi

umask 077
python3 - "$STAGED" "$CANONICAL" <<'PY'
import pathlib, re, secrets, sys

staged = pathlib.Path(sys.argv[1])
canonical = pathlib.Path(sys.argv[2])
text = staged.read_text(encoding="utf-8")
text = text.replace("\r\n", "\n").replace("\r", "\n")

def upsert(src: str, key: str, value: str) -> str:
    pat = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    line = f"{key}={value}"
    if pat.search(src):
        return pat.sub(line, src)
    if src and not src.endswith("\n"):
        src += "\n"
    return src + line + "\n"

def remove_keys(src: str, keys: list[str]) -> str:
    for key in keys:
        src = re.sub(rf"^{re.escape(key)}=.*\n?", "", src, flags=re.M)
    return src

freeze = {
    "PUBLIC_BASE_URL": "http://uat.cohestra.app",
    "NEXT_PUBLIC_PADDLE_RETURN_ORIGIN": "http://uat.cohestra.app",
    "EmailBranding__WebsiteUrl": "http://uat.cohestra.app",
    "WEB_HOST_PORT": "3100",
    "API_HOST_PORT": "5100",
    "NGINX_HOST_PORT": "8180",
    "Paddle__Environment": "sandbox",
    "JWT_ISSUER": "cohestra",
    "JWT_AUDIENCE": "cohestra-api",
    "SelfServeSignup__Recaptcha__Enabled": "false",
    "NEXT_PUBLIC_RECAPTCHA_ENABLED": "false",
    "Intelligence__SynthesisEnabled": "false",
}

remove = [
    "OperatorSeed__Enabled",
    "OperatorSeed__Password",
    "OperatorSeed__Email",
    "DemoDataSeed__Enabled",
    "LoadTestSeed__Enabled",
    "PlatformAdminSeed__Enabled",
    "DEV_TENANT_SLUG",
    "POSTGRES_HOST_PORT",
    "REDIS_HOST_PORT",
    "NGINX_HTTP_PORT",
    "SelfServeSignup__Recaptcha__TestBypassToken",
    "NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN",
    "ConnectionStrings__DefaultConnection",
    "ConnectionStrings__Redis",
    "NEXT_PUBLIC_API_URL",
]

out = remove_keys(text, remove)
for key, value in freeze.items():
    out = upsert(out, key, value)

if not re.search(r"^JWT_SIGNING_KEY=\S", out, re.M):
    out = upsert(out, "JWT_SIGNING_KEY", secrets.token_urlsafe(48))
    jwt_status = "GENERATED"
else:
    jwt_status = "PRESERVED"

canonical.parent.mkdir(parents=True, exist_ok=True)
tmp = canonical.with_name(".env.reconcile.tmp")
tmp.write_text(out, encoding="utf-8")
tmp.replace(canonical)
print("jwt_signing_key=" + jwt_status)
print("canonical=" + str(canonical))
print("hostname=http://uat.cohestra.app")
print("local_only_keys_removed=yes")
print("secrets_not_printed=yes")
PY

chmod 600 "$CANONICAL"
if command -v chown >/dev/null && [[ "$(id -u)" -eq 0 ]]; then
  chown deploy:deploy "$CANONICAL"
fi

echo "== classifier on canonical env (no secret values) =="
bash "$ROOT_DIR/deploy/classify-uat-env.sh" "$CANONICAL"

stat_line=$(stat -c 'owner=%U group=%G mode=%a path=%n' "$CANONICAL" 2>/dev/null || stat -f 'path=%N' "$CANONICAL")
echo "canonical_meta $stat_line"
echo "Do not print $CANONICAL. Staging file left in place until you confirm."
