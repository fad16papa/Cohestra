#!/usr/bin/env bash
# Contract for authenticated origin/release/uat fetch. No live GitHub write or SSH.
# HTTP Basic auth is proven by fetch-origin-main.test.sh (same extraheader recipe).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FETCH="$ROOT_DIR/deploy/fetch-origin-uat.sh"
WF="$ROOT_DIR/.github/workflows/deploy.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$FETCH" ]] || fail "fetch-origin-uat.sh missing"
[[ -f "$WF" ]] || fail "deploy.yml missing"

grep -q 'http.${HEADER_SCOPE}.extraheader' "$FETCH" \
  || fail "fetch must use URL-scoped http.<origin>/.extraheader"
grep -q 'AUTHORIZATION: basic' "$FETCH" || fail "fetch must use Basic x-access-token auth"
grep -q 'x-access-token' "$FETCH" || fail "fetch must mint x-access-token Basic material"
grep -q 'release/uat:refs/remotes/origin/release/uat' "$FETCH" \
  || fail "fetch must update origin/release/uat"
if grep -qiE 'AUTHORIZATION:[[:space:]]*bearer' "$FETCH" "$WF"; then
  fail "Bearer extraheader is forbidden"
fi
if grep -q 'origin/main' "$FETCH"; then
  fail "fetch-origin-uat.sh must not tip-pin origin/main"
fi
pass "fetch-origin-uat uses URL-scoped Basic auth for release/uat"

if out="$(GITHUB_TOKEN= bash "$FETCH" 2>&1)"; then
  echo "$out"
  fail "empty GITHUB_TOKEN must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "missing token RESULT=REFUSE"; }
echo "$out" | grep -qiE 'ghp_|github_pat_' && fail "token-like material leaked"
pass "missing GITHUB_TOKEN refuses closed"

if out="$(unset GITHUB_TOKEN; bash "$FETCH" 2>&1)"; then
  echo "$out"
  fail "unset GITHUB_TOKEN must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "unset token RESULT=REFUSE"; }
pass "unset GITHUB_TOKEN refuses closed"

python3 - "$WF" <<'PY' || fail "deploy.yml must HOLD-first then fetch origin/release/uat"
from pathlib import Path
import re, sys
text = Path(sys.argv[1]).read_text()

def job(name: str) -> str:
    start = text.find(f"  {name}:")
    if start < 0:
        raise SystemExit(f"{name} missing")
    rest = text[start:]
    m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
    return rest if not m else rest[: m.start() + 1]

pre = job("predeploy-gate")
deploy = job("deploy")
if "fetch-origin-uat.sh" not in pre or "fetch-origin-uat.sh" not in deploy:
    raise SystemExit("enabled path must call fetch-origin-uat.sh")
if "fetch-origin-main.sh" in pre or "fetch-origin-main.sh" in deploy:
    raise SystemExit("PR-D must not tip-pin origin/main")
for label, block in (
    ("predeploy evaluate", pre[pre.find("Evaluate UAT predeploy gate"):]),
    ("SSH revalidate", deploy[deploy.find("Re-run UAT predeploy gate before SSH"):]),
):
    gate_at = block.find("validate-uat-predeploy-gate.sh")
    fetch_at = block.find("fetch-origin-uat.sh")
    if gate_at < 0 or fetch_at < 0:
        raise SystemExit(f"{label} must contain validator and fetch-origin-uat.sh")
print("fetch-origin-uat-yaml-ok")
PY
pass "deploy.yml fetches origin/release/uat after HOLD-first"

echo "fetch-origin-uat contract OK"
