#!/usr/bin/env bash
# After EDGE TLS PROOF: PASS, flip only the three public UAT URL keys
# from http://uat.cohestra.app to https://uat.cohestra.app.
# Never prints secret values. Does not rebuild. Does not touch the existing app.
#
# Usage (as deploy, cwd /home/deploy/cohestra):
#   bash deploy/host-proxy/flip-public-base-https.sh
#   bash deploy/uat-compose.sh up -d --build web
#   bash deploy/uat-compose.sh up -d --no-deps api

set -euo pipefail

CANONICAL="${COHESTRA_ENV_FILE:-/home/deploy/cohestra/.env}"
HTTP_ORIGIN="http://uat.cohestra.app"
HTTPS_ORIGIN="https://uat.cohestra.app"

if [[ "$(id -u)" -eq 0 && "${COHESTRA_ALLOW_ROOT:-}" != "1" ]]; then
  echo "REFUSE: run as deploy, not root." >&2
  exit 1
fi
if [[ ! -f "$CANONICAL" ]]; then
  echo "REFUSE: canonical env missing (path not printed)." >&2
  exit 1
fi

python3 - "$CANONICAL" "$HTTP_ORIGIN" "$HTTPS_ORIGIN" <<'PY'
import pathlib, re, sys

path = pathlib.Path(sys.argv[1])
http_origin = sys.argv[2]
https_origin = sys.argv[3]
keys = (
    "PUBLIC_BASE_URL",
    "NEXT_PUBLIC_PADDLE_RETURN_ORIGIN",
    "EmailBranding__WebsiteUrl",
)
allowed = {http_origin, https_origin, ""}

text = path.read_text(encoding="utf-8")
text = text.replace("\r\n", "\n").replace("\r", "\n")

def current(src: str, key: str) -> str:
    match = re.search(rf"^[ \t]*(?:export[ \t]+)?{re.escape(key)}=(.*)$", src, re.M)
    if not match:
        return ""
    return match.group(1).strip().strip("'").strip('"')

def upsert(src: str, key: str, value: str) -> str:
    pat = re.compile(rf"^[ \t]*(?:export[ \t]+)?{re.escape(key)}=.*$", re.M)
    line = f"{key}={value}"
    if pat.search(src):
        return pat.sub(line, src)
    if src and not src.endswith("\n"):
        src += "\n"
    return src + line + "\n"

changed = []
for key in keys:
    value = current(text, key)
    if value not in allowed:
        print(f"REFUSE: {key} is not the locked UAT origin (value not printed).", file=sys.stderr)
        sys.exit(1)
    if value != https_origin:
        changed.append(key)
    text = upsert(text, key, https_origin)

tmp = path.with_name(".env.https-flip.tmp")
tmp.write_text(text, encoding="utf-8")
tmp.replace(path)
print("public_origin=" + https_origin)
print("keys_flipped=" + (",".join(changed) if changed else "already_https"))
print("secrets_not_printed=yes")
PY

chmod 600 "$CANONICAL"
echo "FLIP PUBLIC BASE HTTPS PASS. Rebuild web (bake-time NEXT_PUBLIC_*), then recreate api."
echo "Do not compose up lead-generation-crm. Do not edit active-ssl.conf."
