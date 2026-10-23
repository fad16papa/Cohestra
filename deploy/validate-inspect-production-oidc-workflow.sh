#!/usr/bin/env bash
# Static contract for the Production OIDC inspection workflow.
# Legitimate in-process reads of ACTIONS_ID_TOKEN_REQUEST_URL/TOKEN are required
# and allowed. Echo, print, upload, persist, and output of those values or the
# raw JWT are leaks and must fail.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT_DIR/.github/workflows/inspect-production-oidc.yml"
UAT="$ROOT_DIR/.github/workflows/deploy.yml"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

inspect_contract() {
  python3 - "$1" <<'PY'
import re
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text()

def fail(reason: str) -> None:
    print(reason)
    raise SystemExit(1)

if not re.search(r"^name:\s*Inspect Production OIDC\s*$", text, re.M):
    fail("name")
if not re.search(r"^\s*workflow_dispatch:", text, re.M):
    fail("workflow_dispatch")
if re.search(r"^on:\s*\[", text, re.M):
    fail("on_list")
for key in (
    "push",
    "pull_request",
    "pull_request_target",
    "workflow_run",
    "workflow_call",
    "repository_dispatch",
    "schedule",
    "release",
    "deployment",
):
    if re.search(rf"^\s*{key}:", text, re.M):
        fail(f"trigger_{key}")
if not re.search(r"^\s+environment:\s*production\s*$", text, re.M):
    fail("environment_production")
if re.search(r"environment:\s*uat", text):
    fail("environment_uat")
if not re.search(r"id-token:\s*write", text):
    fail("id_token")
if re.search(r"contents:\s*write|actions:\s*write|pull-requests:\s*write|packages:\s*write", text):
    fail("write_permissions")
if re.search(r"actions/checkout|appleboy/ssh-action|tailscale/github-action", text):
    fail("forbidden_step")
if re.search(r"secrets\.|PROD_|DROPLET_|oauth-secret|authkey", text):
    fail("named_secrets")

# Required, allowed in-process reads. These are not leaks.
if 'os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL"' not in text:
    fail("must_read_request_url")
if 'os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN"' not in text:
    fail("must_read_request_token")

leak_patterns = (
    r"print\(\s*jwt\s*\)",
    r"print\(\s*request_token\s*\)",
    r"print\(\s*request_url\s*\)",
    r"print\(os\.environ\.get\(\"ACTIONS_ID_TOKEN_REQUEST_TOKEN\"",
    r"echo\s+.*ACTIONS_ID_TOKEN_REQUEST_TOKEN",
    r"echo\s+.*ACTIONS_ID_TOKEN_REQUEST_URL",
    r"echo\s+\$\{?JWT",
    r"print\(.*Authorization",
    r"actions/upload-artifact",
    r"upload-artifact",
    r"GITHUB_OUTPUT",
    r"GITHUB_ENV",
    r"GITHUB_STEP_SUMMARY",
    r"^\s+outputs:",
    r"open\([^\n]*(jwt|request_token)",
    r"write_text\([^\n]*(jwt|request_token)",
    r"Path\([^\n]*(jwt|token)",
)
for pat in leak_patterns:
    if re.search(pat, text, re.M | re.I):
        fail(f"leak:{pat}")

if "JWT_PRINTED=false" not in text or "REQUEST_TOKEN_PRINTED=false" not in text:
    fail("sanitized_markers")
if "cohestra-production-oidc-inspect" not in text:
    fail("inspect_audience")
if "ABSENT" not in text:
    fail("absent_claims")
if "iss" not in text or "sub" not in text or "job_workflow_ref" not in text:
    fail("required_claims")
PY
}

if ! inspect_contract "$WF" >/dev/null; then
  echo "Missing or invalid $WF" >&2
  inspect_contract "$WF" || true
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
pass "legitimate in-process OIDC request URL/token reads are required and allowed"
pass "raw JWT, request token, artifacts, and outputs are not leaked"
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
  if inspect_contract "$copy" >/dev/null; then
    fail "mutation '${label}' must fail the contract"
  else
    pass "mutation '${label}' is detected"
  fi
}

# The current file itself is the allowed-read fixture.
if inspect_contract "$WF" >/dev/null; then
  pass "current workflow's request-token read is not treated as a leak"
else
  fail "legitimate request-token read was incorrectly flagged as a leak"
fi

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("on:\n  workflow_dispatch:\n", "on:\n  push:\n  workflow_dispatch:\n"))'
check_mutation "automatically triggered by push"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("on:\n  workflow_dispatch:\n", "on:\n  pull_request:\n  workflow_dispatch:\n"))'
check_mutation "automatically triggered by pull_request"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("print(\"JWT_PRINTED=false\")", "print(jwt)\n              print(\"JWT_PRINTED=false\")"))'
check_mutation "prints raw JWT"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("print(\"REQUEST_TOKEN_PRINTED=false\")", "print(request_token)\n              print(\"REQUEST_TOKEN_PRINTED=false\")"))'
check_mutation "prints request token"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("set -euo pipefail\n", "set -euo pipefail\n          echo \"${ACTIONS_ID_TOKEN_REQUEST_TOKEN}\"\n"))'
check_mutation "echoes request token"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("      - name: Request and decode OIDC payload only\n", "      - uses: actions/upload-artifact@v4\n        with:\n          name: oidc-jwt\n          path: jwt.txt\n      - name: Request and decode OIDC payload only\n"))'
check_mutation "uploads raw JWT"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("print(\"RESULT=PASS\")", "print(\"jwt<<EOF\", file=open(\"/tmp/jwt\", \"w\"))\n              print(\"RESULT=PASS\")"))'
check_mutation "persists raw JWT"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("    environment: production\n", "    environment: production\n    outputs:\n      jwt: ${{ steps.inspect.outputs.jwt }}\n"))'
check_mutation "exposes JWT through job outputs"

cp "$WF" "$copy"
python3 -c 'from pathlib import Path; p=Path("'"$copy"'"); t=p.read_text(); p.write_text(t.replace("print(\"RESULT=PASS\")", "Path(\"/tmp/request_token\").write_text(request_token)\n              print(\"RESULT=PASS\")"))'
check_mutation "persists request token"

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
