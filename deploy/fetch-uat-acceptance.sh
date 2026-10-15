#!/usr/bin/env bash
# Copy sanitized uat-acceptance.json off the droplet. Never prints secret values.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT_DIR/artifacts/uat-acceptance.json}"

missing=()
for name in DROPLET_HOST DROPLET_USER DROPLET_SSH_KEY; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
done
if ((${#missing[@]} > 0)); then
  echo "OWNER_GATE=missing_protected_secret"
  for name in "${missing[@]}"; do
    echo "MISSING_SECRET=${name}"
  done
  exit 1
fi

REMOTE_ROOT="${DROPLET_DEPLOY_PATH:-/home/deploy/cohestra}"
REMOTE_FILE="${REMOTE_ROOT%/}/artifacts/uat-acceptance.json"

umask 077
KEY="$(mktemp)"
cleanup() { rm -f "$KEY"; }
trap cleanup EXIT
printf '%s\n' "$DROPLET_SSH_KEY" >"$KEY"
chmod 600 "$KEY"

mkdir -p "$(dirname "$OUT")"
scp -i "$KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new \
  "${DROPLET_USER}@${DROPLET_HOST}:${REMOTE_FILE}" "$OUT"

python3 - "$OUT" "${TARGET_SHA:-}" <<'PY'
import json, os, sys
path, target_sha = sys.argv[1], sys.argv[2].strip().lower()
text = open(path, encoding="utf-8").read()
for needle in ("BEGIN OPENSSH PRIVATE KEY", "BEGIN RSA PRIVATE KEY", "-----BEGIN"):
    if needle in text:
        os.remove(path)
        raise SystemExit("REFUSE: fetched artifact looks like key material")
payload = json.loads(text)
if not isinstance(payload, dict) or "result" not in payload:
    os.remove(path)
    raise SystemExit("fetched file is not an acceptance payload")
payload_sha = str(payload.get("sha") or "").strip().lower()
if target_sha and payload_sha != target_sha:
    os.remove(path)
    raise SystemExit("REFUSE: fetched acceptance SHA does not match TARGET_SHA")
if payload.get("result") != "pass":
    raise SystemExit(f"REFUSE: fetched acceptance result={payload.get('result')}")
print(f"FETCHED_UAT_ACCEPTANCE_RESULT={payload.get('result')}")
print(f"FETCHED_UAT_ACCEPTANCE_SHA={payload_sha}")
PY
