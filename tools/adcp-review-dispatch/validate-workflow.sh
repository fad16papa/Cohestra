#!/usr/bin/env bash
# Static + mocked contract for the ADCP review-only dispatcher.
# Does not use webhook secrets and does not send a live HTTP request.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WF="$ROOT_DIR/.github/workflows/adcp-review-dispatch.yml"
UAT="$ROOT_DIR/.github/workflows/deploy.yml"
PROD="$ROOT_DIR/.github/workflows/deploy-production.yml"
CI="$ROOT_DIR/.github/workflows/ci.yml"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if [[ ! -f "$WF" ]]; then
  echo "Missing $WF" >&2
  exit 1
fi

echo "== ADCP review dispatcher workflow contract =="

python3 - "$WF" "$UAT" "$PROD" "$CI" <<'PY'
import re
import sys
from pathlib import Path

wf, uat, prod, ci = (Path(p).read_text() for p in sys.argv[1:])

def fail(reason: str) -> None:
    print(reason)
    raise SystemExit(1)

if not re.search(r"^name:\s*ADCP review dispatch\s*$", wf, re.M):
    fail("name")
if not re.search(r"^\s*workflow_dispatch:", wf, re.M):
    fail("workflow_dispatch")
if re.search(r"^on:\s*\[", wf, re.M):
    fail("on_list")
on_match = re.search(r"^on:\n(.*?)(?=^[a-zA-Z].*:)", wf, re.M | re.S)
if not on_match:
    fail("on_block")
on_block = on_match.group(1)
for key in (
    "push",
    "pull_request",
    "pull_request_target",
    "workflow_run",
    "workflow_call",
    "repository_dispatch",
    "schedule",
    "release",
    "issues",
    "issue_comment",
    "label",
    "deployment",
):
    if re.search(rf"^\s*{key}:", on_block, re.M):
        fail(f"trigger_{key}")

for forbidden in (
    "model",
    "webhook_url",
    "command",
    "shell",
    "prompt",
    "instructions",
):
    if re.search(rf"^\s+{forbidden}:", wf, re.M):
        fail(f"input_{forbidden}")

if "environment: adcp" not in wf:
    fail("environment_adcp")
if re.search(r"environment:\s*uat", wf):
    fail("environment_uat")
if re.search(r"environment:\s*production", wf):
    fail("environment_production")
if re.search(r"contents:\s*write|actions:\s*write|pull-requests:\s*write|id-token:\s*write", wf):
    fail("write_permissions")
if "appleboy/ssh-action" in wf or "tailscale/github-action" in wf:
    fail("forbidden_action")
if re.search(r"uses:.*docker", wf, re.I):
    fail("docker")
if "secrets.DROPLET" in wf or "PROD_" in wf or "secrets.UAT_" in wf:
    fail("cross_env_secrets")
if "pull_request.head" in wf or "github.event.pull_request" in wf:
    fail("pr_head_checkout")
if "download-artifact" in wf:
    fail("download_artifact")
if re.search(r"\bcurl\b", wf):
    fail("curl")

if "actions/checkout@11d5960a326750d5838078e36cf38b85af677262" not in wf:
    fail("checkout_unpinned")
if wf.count("ref: ${{ github.sha }}") < 2:
    fail("checkout_ref_not_dispatch_sha")
if "persist-credentials: false" not in wf:
    fail("persist_credentials")

pre, dispatch = wf.split("name: Revalidate and dispatch", 1)
if "ADCP_CURSOR_WEBHOOK" in pre:
    fail("secret_in_preflight")
if "ADCP_ALLOW_LIVE_DISPATCH" in pre:
    fail("live_flag_in_preflight")
if "ADCP_CURSOR_WEBHOOK_URL" not in dispatch or "ADCP_CURSOR_WEBHOOK_AUTH" not in dispatch:
    fail("secrets_missing_from_dispatch")
if "ADCP_ALLOW_LIVE_DISPATCH" not in dispatch:
    fail("live_flag_missing")
if "run.mjs preflight" not in wf or "run.mjs dispatch" not in wf:
    fail("entrypoint")
if "permissions: {}" not in wf:
    fail("global_permissions")
if wf.count("issues: read") < 2:
    fail("issues_read")
if "GITHUB_TRIGGERING_ACTOR" not in wf:
    fail("triggering_actor_env")
refuse = wf.split("name: Checkout trusted dispatch SHA", 1)[0]
if "GITHUB_TRIGGERING_ACTOR" not in refuse:
    fail("triggering_actor_shell")
if 'GITHUB_TRIGGERING_ACTOR}" != "fad16papa"' not in refuse:
    fail("triggering_actor_compare")

if "name: Deploy UAT" not in uat:
    fail("uat_workflow_missing")
if "workflow_run:" not in uat:
    fail("uat_trigger_regressed")
if "name: Deploy Production" not in prod:
    fail("prod_workflow_missing")
if "ADCP review dispatcher contract" not in ci and "adcp-review-dispatch/validate-workflow.sh" not in ci:
    fail("ci_contract_step_missing")

print("workflow_contract_ok")
PY

pass "workflow YAML contract"

if grep -q 'environment: adcp' "$WF"; then
  pass "secret-bearing job uses environment adcp"
else
  fail "secret-bearing job must use environment: adcp"
fi

if grep -q 'pull_request.head\|github.event.pull_request' "$WF"; then
  fail "secrets job must not check out PR HEAD"
else
  pass "no PR HEAD checkout"
fi

echo "== mocked Node tests (no live HTTP) =="
node --test "$ROOT_DIR/tools/adcp-review-dispatch/dispatch.test.mjs"
pass "node mocked dispatcher tests"

if [[ "$FAIL" -ne 0 ]]; then
  echo "ADCP review dispatcher contract FAILED ($FAIL)"
  exit 1
fi

echo "ADCP review dispatcher contract OK ($PASS)"
