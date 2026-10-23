#!/usr/bin/env bash
# Static contract for the Production OIDC inspection workflow.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT_DIR/.github/workflows/inspect-production-oidc.yml"
UAT="$ROOT_DIR/.github/workflows/deploy.yml"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

inspect_contract() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  grep -qE '^name:[[:space:]]*Inspect Production OIDC[[:space:]]*$' "$file" || return 1
  grep -qE '^[[:space:]]*workflow_dispatch:' "$file" || return 1
  ! grep -qE '^on:[[:space:]]*\[' "$file" || return 1
  for key in push pull_request pull_request_target workflow_run workflow_call repository_dispatch schedule release deployment; do
    ! grep -qE "^[[:space:]]*${key}:" "$file" || return 1
  done
  grep -qE '^[[:space:]]+environment:[[:space:]]*production[[:space:]]*$' "$file" || return 1
  ! grep -qE 'environment:[[:space:]]*uat' "$file" || return 1
  grep -qE 'id-token:[[:space:]]*write' "$file" || return 1
  ! grep -qE 'contents:[[:space:]]*write|actions:[[:space:]]*write|pull-requests:[[:space:]]*write|packages:[[:space:]]*write' "$file" || return 1
  ! grep -qE 'actions/checkout|appleboy/ssh-action|tailscale/github-action' "$file" || return 1
  ! grep -qiE 'appleboy|tailscale/github-action' "$file" || return 1
  ! grep -qE 'secrets\.|PROD_|DROPLET_|oauth-secret|authkey' "$file" || return 1
  ! grep -qE 'print\(jwt\)|print\(request_token\)|echo .*ACTIONS_ID_TOKEN_REQUEST_TOKEN|echo \$\{?JWT' "$file" || return 1
  grep -q 'JWT_PRINTED=false' "$file" || return 1
  grep -q 'REQUEST_TOKEN_PRINTED=false' "$file" || return 1
  grep -q 'cohestra-production-oidc-inspect' "$file" || return 1
  grep -q 'ABSENT' "$file" || return 1
  return 0
}

if ! inspect_contract "$WF"; then
  echo "Missing or invalid $WF" >&2
  exit 1
fi

echo "== Inspect Production OIDC workflow contract =="

pass "workflow name is Inspect Production OIDC"
pass "workflow_dispatch is present"
pass "automatic triggers are absent"
pass "job uses environment: production"
pass "Environment uat is absent"
pass "job can request an OIDC token"
pass "repository-write permissions are absent"
pass "no checkout, SSH, or Tailscale steps"
pass "named secrets are absent"
pass "raw JWT and request token are not printed"
pass "inspection audience is local and not a Tailscale exchange"
pass "missing claims are reported as ABSENT"

if [[ -f "$UAT" ]] && ! grep -q 'inspect-production-oidc' "$UAT"; then
  pass "UAT workflow does not invoke OIDC inspection"
else
  fail "OIDC inspection must not run on UAT"
fi

copy="$(mktemp)"
trap 'rm -f "$copy"' EXIT

check_mutation() {
  local label="$1"
  if inspect_contract "$copy"; then
    fail "mutation '${label}' must fail the contract"
  else
    pass "mutation '${label}' is detected"
  fi
}

python3 - "$WF" "$copy" <<'PY'
from pathlib import Path
import sys
src = Path(sys.argv[1]).read_text()
dst = Path(sys.argv[2])
# placeholder; mutations applied by the shell below
dst.write_text(src)
PY

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("on:\n  workflow_dispatch:\n", "on:\n  push:\n  workflow_dispatch:\n"))'
check_mutation "automatically triggered by push"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("on:\n  workflow_dispatch:\n", "on:\n  pull_request:\n  workflow_dispatch:\n"))'
check_mutation "automatically triggered by pull_request"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("print(\"JWT_PRINTED=false\")", "print(jwt)\n              print(\"JWT_PRINTED=false\")"))'
check_mutation "accidentally prints raw JWT"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("print(\"REQUEST_TOKEN_PRINTED=false\")", "print(request_token)\n              print(\"REQUEST_TOKEN_PRINTED=false\")"))'
check_mutation "prints ACTIONS_ID_TOKEN_REQUEST_TOKEN"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("contents: read\n      id-token: write", "contents: write\n      id-token: write"))'
check_mutation "requests repository write permission"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("      - name: Request and decode OIDC payload only\n", "      - uses: appleboy/ssh-action@2ead5e36573f08b82fbfce1504f1a4b05a647c6f\n      - name: Request and decode OIDC payload only\n"))'
check_mutation "SSH step added"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("      - name: Request and decode OIDC payload only\n", "      - uses: tailscale/github-action@99a8333667fff04fdd6cffb46dfd409f8329a7bf\n      - name: Request and decode OIDC payload only\n"))'
check_mutation "Tailscale step added"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("    environment: production\n", ""))'
check_mutation "Environment removed"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("environment: production", "environment: uat"))'
check_mutation "wrong Environment"

echo "Passed: ${PASS} | Failed: ${FAIL}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
