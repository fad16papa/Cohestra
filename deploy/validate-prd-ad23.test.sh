#!/usr/bin/env bash
# PR-D / AD-23 / AD-14 / N14 / N25 / N30 contract. No live SSH. No GitHub settings.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
CI="$ROOT_DIR/.github/workflows/ci.yml"
PROD="$ROOT_DIR/.github/workflows/deploy-production.yml"
GATE="$ROOT_DIR/deploy/validate-uat-predeploy-gate.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$WF" && -f "$GATE" ]] || fail "PR-D files missing"

python3 - "$WF" "$CI" "$PROD" <<'PY' || fail "AD-23 YAML contract"
from pathlib import Path
import re, sys

wf, ci, prod = (Path(p).read_text() for p in sys.argv[1:4])
on = wf.split("jobs:", 1)[0]
if "workflow_run:" in on:
    raise SystemExit("N25 leftover workflow_run")
if "repository_dispatch:" in on or "workflow_call:" in on:
    raise SystemExit("forbidden trigger")
if "pull_request:" in on or "pull_request_target:" in on:
    raise SystemExit("PR triggers forbidden on Deploy UAT")
if "\n  push:" not in on or "release/uat" not in on:
    raise SystemExit("AD-23 requires push to release/uat")
if re.search(r"branches:\n\s+- main", on):
    raise SystemExit("Deploy UAT on: must not listen on main")
if "workflow_dispatch:" not in on:
    raise SystemExit("optional guarded workflow_dispatch required")

forbidden = ("workflow_run", "repository_dispatch", "workflow_call", "pull_request_target")
for name in forbidden:
    if f"{name}:" in on:
        raise SystemExit(f"{name} forbidden")

required = [
    "UAT post-merge — .NET build and test",
    "UAT post-merge — API integration tests",
    "UAT post-merge — Next.js build",
    "UAT post-merge — Frontend unit tests",
    "UAT post-merge — AuthN AuthZ regression",
    "UAT post-merge — Billing entitlement regression",
    "UAT post-merge — Docker stack smoke",
    "UAT post-merge — UAT isolation contract",
    "UAT post-merge — Exact-SHA security scan",
    "UAT post-merge — GitGuardian exact-SHA API scan",
    "UAT post-merge — Deploy artifact provenance",
]
for name in required:
    if f"name: {name}" not in wf:
        raise SystemExit(f"missing AD-17 job {name}")

# predeploy must need every AD-17 job id
pre_start = wf.find("  predeploy-gate:")
if pre_start < 0:
    raise SystemExit("predeploy-gate missing")
rest = wf[pre_start:]
m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
pre = rest if not m else rest[: m.start() + 1]
for job_id in (
    "postmerge-dotnet",
    "postmerge-integration",
    "postmerge-nextjs",
    "postmerge-frontend",
    "postmerge-authz",
    "postmerge-billing",
    "postmerge-docker",
    "postmerge-isolation",
    "postmerge-exact-sha",
    "postmerge-gg-api",
    "postmerge-provenance",
):
    if job_id not in pre.split("name: Pre-UAT", 1)[0] and f"- {job_id}" not in pre:
        # needs list is at the top of the job
        head = pre[: pre.find("steps:")]
        if f"- {job_id}" not in head:
            raise SystemExit(f"predeploy must need {job_id}")

if "environment:" in pre:
    raise SystemExit("predeploy must not use environment: uat")
if "DROPLET_" in pre:
    raise SystemExit("predeploy must not read DROPLET secrets")

deploy_start = wf.find("  deploy:")
drest = wf[deploy_start:]
dm = re.search(r"\n  [A-Za-z0-9_-]+:", drest[1:])
deploy = drest if not dm else drest[: dm.start() + 1]
if "needs: predeploy-gate" not in deploy and "needs:\n      - predeploy-gate" not in deploy:
    if "predeploy-gate" not in deploy.split("steps:", 1)[0]:
        raise SystemExit("deploy must need predeploy-gate")
if "environment: uat" not in deploy:
    raise SystemExit("SSH job must use environment: uat")
if "needs.predeploy-gate.result == 'success'" not in deploy:
    raise SystemExit("SSH requires predeploy success")
if "outputs.eligible == 'true'" not in deploy:
    raise SystemExit("SSH requires eligible==true")

# AD-17 jobs must not use Environment uat or DROPLET
ad17 = wf[:pre_start]
if "environment: uat" in ad17:
    raise SystemExit("AD-17 jobs must not use environment: uat")
if "secrets.DROPLET_" in ad17:
    raise SystemExit("AD-17 jobs must not read DROPLET secrets")
if "pull_request_target" in wf:
    raise SystemExit("pull_request_target forbidden")

if "environment: uat" in ci or "secrets.DROPLET_" in ci:
    raise SystemExit("ci.yml must stay free of UAT secrets")
if "workflow_run:" in prod:
    raise SystemExit("Production must not gain workflow_run")

# TARGET_SHA is github.sha, not workflow_run.head_sha
if "workflow_run.head_sha" in wf:
    raise SystemExit("PR-D must not derive TARGET_SHA from workflow_run.head_sha")
if "github.sha" not in wf:
    raise SystemExit("TARGET_SHA must use github.sha")

# polarity: suppressed != true HOLDs
inline = pre.find("Trusted inline suppressors before candidate checkout")
checkout = pre.find("name: Checkout accepted SHA")
if inline < 0 or checkout < 0 or inline > checkout:
    raise SystemExit("inline suppressor must precede checkout")
block = pre[inline:checkout]
if 'UAT_MAIN_DEPLOY_SUPPRESSED:-}" != "true"' not in block:
    raise SystemExit("PR-D inline must HOLD when suppressed is not exact true")
if 'UAT_DEPLOY_GATE_ACTIVE:-}" != "true"' not in block:
    raise SystemExit("gate-false HOLD must remain")
if "CUTOVER_INCOMPLETE_MAIN_SOURCE" not in block:
    raise SystemExit("wrong ref must HOLD CUTOVER_INCOMPLETE_MAIN_SOURCE")
if "actions/checkout" in block:
    raise SystemExit("inline must not checkout")
if "DEPLOY_BRANCH:-release/uat" not in wf and 'DEPLOY_BRANCH:-release/uat' not in wf:
    if "release/uat" not in wf[wf.find("Deploy over SSH"): wf.find("Record SSH step")]:
        raise SystemExit("SSH must tip-pin release/uat")

print("ad23-yaml-ok")
PY
pass "AD-23 YAML: push release/uat, no workflow_run, AD-17 needs, polarity flipped"

# Script-level negatives with a tiny fixture
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git init -q -b main "$TMP/r"
git -C "$TMP/r" config user.email t@t
git -C "$TMP/r" config user.name t
echo x >"$TMP/r/f"
git -C "$TMP/r" add f
git -C "$TMP/r" commit -q -m base
SHA="$(git -C "$TMP/r" rev-parse HEAD)"
git -C "$TMP/r" branch release/uat
git clone -q "$TMP/r" "$TMP/l"
git -C "$TMP/l" fetch -q origin main
git -C "$TMP/l" fetch -q origin release/uat:refs/remotes/origin/release/uat
cd "$TMP/l"

run_gate() {
  CANDIDATE_SHA="$SHA" \
  ORIGIN_UAT_REF=origin/release/uat \
  UAT_GATE_EVIDENCE_DIR="$TMP/ev" \
  UAT_AD17_IN_RUN=true \
  bash "$GATE" 2>&1 || true
}

mkdir -p "$TMP/ev"

out="$(UAT_DEPLOY_GATE_ACTIVE=false UAT_MAIN_DEPLOY_SUPPRESSED=true \
  GITHUB_REF=refs/heads/release/uat GITHUB_EVENT_NAME=push run_gate)"
echo "$out" | grep -q 'UAT_DEPLOY_GATE_ACTIVE is not true' || fail "gate false must HOLD"
pass "N1 gate false HOLD"

out="$(UAT_DEPLOY_GATE_ACTIVE=true UAT_MAIN_DEPLOY_SUPPRESSED=false \
  GITHUB_REF=refs/heads/release/uat GITHUB_EVENT_NAME=push run_gate)"
echo "$out" | grep -q 'UAT_MAIN_DEPLOY_SUPPRESSED is not true' || fail "suppressed false must HOLD"
pass "release/uat + suppressed false HOLD"

out="$(UAT_DEPLOY_GATE_ACTIVE=true UAT_MAIN_DEPLOY_SUPPRESSED=true \
  GITHUB_REF=refs/heads/main GITHUB_EVENT_NAME=push run_gate)"
echo "$out" | grep -q 'CUTOVER_INCOMPLETE_MAIN_SOURCE' || fail "main ref must HOLD N14"
pass "N14 main ref HOLD"

out="$(UAT_DEPLOY_GATE_ACTIVE=true UAT_MAIN_DEPLOY_SUPPRESSED=true \
  GITHUB_REF=refs/heads/feature GITHUB_EVENT_NAME=workflow_dispatch run_gate)"
echo "$out" | grep -q 'CUTOVER_INCOMPLETE_MAIN_SOURCE' || fail "feature dispatch must HOLD"
pass "feature-ref dispatch HOLD"

out="$(UAT_DEPLOY_GATE_ACTIVE=true UAT_MAIN_DEPLOY_SUPPRESSED=true \
  GITHUB_REF=refs/heads/release/uat GITHUB_EVENT_NAME=workflow_run run_gate)"
echo "$out" | grep -qE 'workflow_run|wrong trigger|must be push' || fail "workflow_run event must HOLD"
pass "N25 workflow_run event HOLD"

# stale SHA: advance release/uat
echo stale >"$TMP/r/stale"
git -C "$TMP/r" add stale
git -C "$TMP/r" commit -q -m stale
git -C "$TMP/r" checkout -q release/uat
git -C "$TMP/r" merge --ff-only -q main
git -C "$TMP/l" fetch -q origin release/uat:refs/remotes/origin/release/uat
out="$(UAT_DEPLOY_GATE_ACTIVE=true UAT_MAIN_DEPLOY_SUPPRESSED=true \
  GITHUB_REF=refs/heads/release/uat GITHUB_EVENT_NAME=push run_gate)"
echo "$out" | grep -q 'not the current origin/release/uat tip' || fail "stale SHA must HOLD"
pass "stale candidate HOLD"

# eligible simulated path: reset tip
git -C "$TMP/r" checkout -q release/uat
git -C "$TMP/r" reset -q --hard "$SHA"
git -C "$TMP/l" fetch -q --force origin release/uat:refs/remotes/origin/release/uat
out="$(UAT_DEPLOY_GATE_ACTIVE=true UAT_MAIN_DEPLOY_SUPPRESSED=true \
  GITHUB_REF=refs/heads/release/uat GITHUB_EVENT_NAME=push run_gate)"
echo "$out" | grep -q 'RESULT=PASS' || { echo "$out"; fail "valid conjuncts must PASS in simulation"; }
pass "simulated eligible: gate+suppressed+ref+tip+push"

out="$(UAT_DEPLOY_GATE_ACTIVE=true UAT_MAIN_DEPLOY_SUPPRESSED=true \
  GITHUB_REF=refs/heads/release/uat GITHUB_EVENT_NAME=workflow_dispatch run_gate)"
echo "$out" | grep -q 'RESULT=PASS' || fail "dispatch on release/uat is legal when conjuncts hold"
pass "N30-adjacent: dispatch on release/uat eligible in simulation"

# Production isolation
grep -q 'workflow_run:' "$PROD" && fail "Production gained workflow_run"
pass "Production remains isolated"

python3 - "$WF" "$CI" "$PROD" <<'PY' || fail "AD-17 needs fail-closed + no secret leak"
from pathlib import Path
import re, sys

wf, ci, prod = (Path(p).read_text() for p in sys.argv[1:4])

def job(text, name):
    start = text.find(f"  {name}:")
    if start < 0:
        raise SystemExit(f"missing job {name}")
    rest = text[start:]
    m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
    return rest if not m else rest[: m.start() + 1]

ad17 = [
    "postmerge-dotnet",
    "postmerge-integration",
    "postmerge-nextjs",
    "postmerge-frontend",
    "postmerge-authz",
    "postmerge-billing",
    "postmerge-docker",
    "postmerge-isolation",
    "postmerge-exact-sha",
    "postmerge-gg-api",
    "postmerge-provenance",
]
for name in ad17:
    block = job(wf, name)
    if re.search(r"(?m)^    if:", block):
        raise SystemExit(f"{name} must not have a job-level if that can skip AD-17")
    if "continue-on-error: true" in block:
        raise SystemExit(f"{name} must not continue-on-error")
    if "environment:" in block:
        raise SystemExit(f"{name} must not use an Environment")
    if "secrets.DROPLET_" in block:
        raise SystemExit(f"{name} must not read DROPLET secrets")

pre = job(wf, "predeploy-gate")
# Job-level if: always() would evaluate eligibility after failed AD-17 jobs.
head = pre.split("steps:", 1)[0]
if re.search(r"(?m)^    if:", head):
    raise SystemExit("predeploy must not have a job-level if (default success() required)")
if "continue-on-error: true" in pre:
    raise SystemExit("predeploy must not continue-on-error")

deploy = job(wf, "deploy")
if "needs.predeploy-gate.result == 'success'" not in deploy:
    raise SystemExit("SSH must require predeploy result success")
if "outputs.eligible == 'true'" not in deploy:
    raise SystemExit("SSH must require eligible==true")
if "github.event_name == 'workflow_dispatch' ||" in wf:
    raise SystemExit("dispatch must not OR-bypass tests")

# Other workflows must not grow privileged UAT execution
for label, text in (("ci.yml", ci), ("deploy-production.yml", prod)):
    if "environment: uat" in text or "secrets.DROPLET_" in text:
        raise SystemExit(f"{label} must not gain Environment uat or DROPLET secrets")
    if "pull_request_target:" in text:
        raise SystemExit(f"{label} must not use pull_request_target")
if "pull_request_target:" in wf:
    raise SystemExit("Deploy UAT must not use pull_request_target")
print("ad17-fail-closed-ok")
PY
pass "failed/skipped/canceled AD-17 jobs skip predeploy; dispatch cannot bypass"

# Malicious workflow modification: PR jobs never see DROPLET
for wf_extra in \
  "$ROOT_DIR/.github/workflows/uat-readiness.yml" \
  "$ROOT_DIR/.github/workflows/uat-correction.yml" \
  "$ROOT_DIR/.github/workflows/deploy-production.yml"; do
  if [[ -f "$wf_extra" ]] && grep -q 'secrets.DROPLET_' "$wf_extra"; then
    fail "non-deploy workflow ${wf_extra} must not read DROPLET secrets"
  fi
done
pass "malicious/non-deploy workflows cannot access DROPLET secrets"

echo "validate-prd-ad23 contract OK"
