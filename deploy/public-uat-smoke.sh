#!/usr/bin/env bash
# Public UAT smoke from GitHub Actions. No SSH. No secret values.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT_DIR/artifacts/uat-public-smoke.json}"
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  OUT="${2:-$ROOT_DIR/artifacts/uat-public-smoke.json}"
fi

BASE="${UAT_PUBLIC_BASE_URL:-https://uat.cohestra.app}"
BASE="${BASE%/}"

if [[ "$BASE" == *thesocialcollectivesg.com* || "$BASE" == *129.212.235.2* ]]; then
  echo "REFUSE: public smoke must not target the shared CRM host"
  exit 1
fi
if [[ "$BASE" != https://* ]]; then
  echo "REFUSE: public smoke requires https://"
  exit 1
fi

mkdir -p "$(dirname "$OUT")"

python3 - "$OUT" "$BASE" "$DRY_RUN" <<'PY'
import json, sys, urllib.error, urllib.request
from datetime import datetime, timezone

out, base, dry = sys.argv[1], sys.argv[2].rstrip("/"), sys.argv[3] == "true"
paths = ["/ready", "/", "/signup"]
checks = []
failures = []

def probe(path: str) -> dict:
    url = base + path
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8", "replace")[:400]
            code = resp.status
    except urllib.error.HTTPError as exc:
        code, body = exc.code, ""
    except Exception:
        code, body = 0, ""
    ok = False
    if path == "/ready":
        ok = code == 200 and '"status"' in body and "Healthy" in body
    else:
        ok = code in {200, 301, 302, 307, 308}
    return {"path": path, "http": code, "ok": ok}

if dry:
    payload = {
        "result": "dry_run",
        "base": base,
        "checks": [{"path": p, "http": None, "ok": None} for p in paths],
        "failures": [],
        "recordedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
else:
    for path in paths:
        row = probe(path)
        checks.append(row)
        if not row["ok"]:
            failures.append(path)
    payload = {
        "result": "fail" if failures else "pass",
        "base": base,
        "checks": checks,
        "failures": failures,
        "recordedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

open(out, "w", encoding="utf-8").write(json.dumps(payload, indent=2) + "\n")
print(f"wrote {out}")
print(f"UAT_PUBLIC_SMOKE_RESULT={payload['result']}")
if payload["result"] == "fail":
    sys.exit(1)
PY
