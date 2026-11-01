#!/usr/bin/env bash
# Contract test for deploy/uat-acceptance-summary.sh. No secrets. No live UAT.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/uat-acceptance-summary.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

SHA="74958f1ad4695ea8358b57ed6dc4b0be8f3ba9de"

write_ok_inputs() {
  local dir="$1"
  mkdir -p "$dir/artifacts" "$dir/web/test-results"
  cat >"$dir/artifacts/uat-deploy-dispatch.json" <<JSON
{
  "workflow": "deploy-uat",
  "environment": "uat",
  "event": "workflow_run",
  "sha": "${SHA}",
  "ref": "main",
  "runId": "38753266777",
  "result": "dispatched"
}
JSON
  cat >"$dir/artifacts/uat-acceptance.json" <<JSON
{
  "story": "45.2",
  "sha": "${SHA}",
  "result": "pass",
  "failures": [],
  "deployment": {"repoSha": "${SHA}", "deployShaRequested": "${SHA}", "shaMatch": true},
  "runtime": {
    "mode": "runtime",
    "compose": {"available": true, "requiredPresent": {"postgres": true, "redis": true, "web": true, "api": true, "nginx": true}},
    "ready": {"nginxLoopbackHealthy": true, "apiLoopbackHealthy": true, "nginxHttp": 200, "apiHttp": 200},
    "https": {"publicReadyHealthy": true, "http": 200},
    "sharedCrm": {"healthy": null, "http": 0, "reason": "EXISTING_APP_PUBLIC_URL missing"},
    "apiGitSha": "${SHA}"
  },
  "security": {
    "recaptcha": {"serverEnabled": false, "bypassTokenAbsent": true, "webTestTokenAbsent": true},
    "seeds": {"demoDataSeed": false, "loadTestSeed": false, "devTenantSlugSet": false},
    "bypassTokensAbsent": true,
    "portIsolation": {"nginxNotPublicEdge": true, "webNotPublicEdge": true, "apiNotPublicEdge": true}
  },
  "provider": {
    "paddle": {"apiKey": "sandbox", "clientToken": "sandbox", "webhookSecret": "present", "environment": "sandbox", "refusedForUat": false},
    "tenantAlignment": {"publicBaseHttps": true, "publicBaseLooksLikeUat": true, "aligned": true}
  }
}
JSON
  cat >"$dir/artifacts/uat-public-smoke.json" <<JSON
{
  "result": "pass",
  "base": "https://uat.cohestra.app",
  "checks": [{"path": "/ready", "http": 200, "ok": true}],
  "failures": []
}
JSON
  python3 - "$dir/web/test-results/uat-playwright.json" <<'PY'
import json, sys
required = [
    ("dedicated automation login when credentials exist", "authenticated.spec.ts"),
    ("Basic dashboard metrics load", "operator-core-flows.spec.ts"),
    ("Basic activities room loads", "operator-core-flows.spec.ts"),
    ("Basic website is Core-locked and public stub home loads", "operator-core-flows.spec.ts"),
    ("Basic campaigns room is Pro-locked", "operator-core-flows.spec.ts"),
    ("Pro dashboard metrics load", "operator-core-flows.spec.ts"),
    ("Pro analytics room loads", "operator-core-flows.spec.ts"),
    ("Pro website studio and public branding load", "operator-core-flows.spec.ts"),
    ("Pro campaigns room loads without sending a blast", "operator-core-flows.spec.ts"),
]
payload = {
  "stats": {"expected": 10, "skipped": 2, "unexpected": 0, "flaky": 0},
  "suites": [{
    "title": "e2e-uat",
    "suites": [
      {
        "title": "45.4 authenticated UAT",
        "specs": [{
          "title": title,
          "file": file_name,
          "tests": [{"status": "expected", "results": [{"status": "expected"}]}],
        } for title, file_name in required if file_name == "authenticated.spec.ts"],
      },
      {
        "title": "19.5 operator core flows",
        "specs": [{
          "title": title,
          "file": file_name,
          "tests": [{"status": "expected", "results": [{"status": "expected"}]}],
        } for title, file_name in required if file_name == "operator-core-flows.spec.ts"],
      },
      {
        "title": "45.5 OTP mailbox",
        "specs": [{
          "title": "signup OTP is read from the dedicated mailbox when configured",
          "file": "authenticated.spec.ts",
          "tests": [{"status": "skipped", "results": [{"status": "skipped"}]}],
        }],
      },
    ],
  }],
}
json.dump(payload, open(sys.argv[1], "w"))
PY
}

run_summary() {
  local tree="$1"
  local out="$2"
  TARGET_SHA="$SHA" \
  ACCEPTANCE_STORY=45.7 \
  UAT_ACCEPTANCE_JSON="$tree/artifacts/uat-acceptance.json" \
  UAT_PUBLIC_SMOKE_JSON="$tree/artifacts/uat-public-smoke.json" \
  UAT_DISPATCH_JSON="$tree/artifacts/uat-deploy-dispatch.json" \
  UAT_PLAYWRIGHT_JSON="$tree/web/test-results/uat-playwright.json" \
    bash "$SCRIPT" "$out"
}

write_ok_inputs "$TMP/ok"
if ! run_summary "$TMP/ok" "$TMP/summary-ok.json" >"$TMP/ok.out"; then
  fail "complete evidence must pass"
fi

python3 - "$TMP/summary-ok.json" "$SHA" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
sha = sys.argv[2]
required = ("story", "sha", "deployment", "runtime", "browser", "security", "provider", "tests", "result")
assert all(k in p and p[k] not in (None, "", {}) for k in required), p
assert p["result"] == "pass", p
assert p["story"] == "45.7"
assert p["sha"] == sha
assert p["deployment"]["shaMatch"] is True
assert p["deployment"]["apiGitSha"] == sha
assert p["runtime"]["publicSmoke"] == "pass"
assert p["browser"]["expected"] == 10
assert p["browser"]["skipped"] == 2
assert p["browser"]["unexpected"] == 0
assert p["security"]["bypassTokensAbsent"] is True
assert p["provider"]["paddle"]["apiKey"] == "sandbox"
assert p["tests"]["hostAcceptance"] == "pass"
text = open(sys.argv[1], encoding="utf-8").read()
for leak in ("BEGIN ", "PRIVATE KEY", "pdl_live_", "whsec_", "SG."):
    assert leak not in text, leak
PY
pass "complete evidence writes required sections and passes"

if ! bash "$SCRIPT" --evaluate "$TMP/summary-ok.json" >"$TMP/eval.out"; then
  fail "evaluate of a valid pass summary must succeed"
fi
pass "evaluate accepts a complete pass summary"

python3 - "$TMP/summary-ok.json" "$TMP/missing.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
del p["browser"]
p["result"] = "pass"
json.dump(p, open(sys.argv[2], "w"), indent=2)
PY
if bash "$SCRIPT" --evaluate "$TMP/missing.json" >"$TMP/missing.out" 2>"$TMP/missing.err"; then
  fail "missing required section must not evaluate as pass"
fi
grep -qE 'missing_section:browser|REFUSE: summary claimed pass' "$TMP/missing.out" "$TMP/missing.err" \
  || fail "missing section must be named"
pass "missing required section fails and never stays a fake PASS"

write_ok_inputs "$TMP/badhost"
python3 - "$TMP/badhost/artifacts/uat-acceptance.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
p["result"] = "fail"
p["failures"] = ["compose_unhealthy"]
json.dump(p, open(sys.argv[1], "w"), indent=2)
PY
if run_summary "$TMP/badhost" "$TMP/summary-fail.json" >"$TMP/fail.out" 2>"$TMP/fail.err"; then
  fail "failed host acceptance must fail the summary"
fi
python3 - "$TMP/summary-fail.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
assert p["result"] == "fail"
assert any("host_acceptance" in x for x in p["failures"]), p
PY
pass "failed host acceptance cannot become PASS"

write_ok_inputs "$TMP/noweb"
rm -f "$TMP/noweb/web/test-results/uat-playwright.json"
if TARGET_SHA="$SHA" \
  ACCEPTANCE_STORY=45.7 \
  UAT_ACCEPTANCE_JSON="$TMP/noweb/artifacts/uat-acceptance.json" \
  UAT_PUBLIC_SMOKE_JSON="$TMP/noweb/artifacts/uat-public-smoke.json" \
  UAT_DISPATCH_JSON="$TMP/noweb/artifacts/uat-deploy-dispatch.json" \
  UAT_PLAYWRIGHT_JSON="$TMP/noweb/web/test-results/uat-playwright.json" \
  bash "$SCRIPT" "$TMP/summary-nobrowser.json" >"$TMP/nobrowser.out" 2>"$TMP/nobrowser.err"; then
  fail "missing Playwright artifact must fail closed"
fi
python3 - "$TMP/summary-nobrowser.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
assert p["result"] == "fail"
assert p["browser"]["available"] is False
assert any("browser" in x or "missing_playwright" in x for x in p["failures"]), p
assert all(k in p for k in ("story", "sha", "deployment", "runtime", "browser", "security", "provider", "tests", "result"))
PY
pass "missing Playwright artifact is FAIL with all sections still present"

write_ok_inputs "$TMP/dispatchdrift"
python3 - "$TMP/dispatchdrift/artifacts/uat-deploy-dispatch.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
p["sha"] = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
json.dump(p, open(sys.argv[1], "w"), indent=2)
PY
if run_summary "$TMP/dispatchdrift" "$TMP/summary-dispatch.json" >"$TMP/dispatch.out" 2>"$TMP/dispatch.err"; then
  fail "dispatch SHA drift must fail closed"
fi
python3 - "$TMP/summary-dispatch.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
assert p["result"] == "fail"
assert "dispatch_sha_mismatch" in p["failures"], p
PY
pass "dispatch SHA must match TARGET_SHA"

write_ok_inputs "$TMP/secret"
python3 - "$TMP/secret/artifacts/uat-acceptance.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
p["note"] = "-----BEGIN OPENSSH " + "PRIVATE KEY-----"
json.dump(p, open(sys.argv[1], "w"), indent=2)
PY
if run_summary "$TMP/secret" "$TMP/summary-secret.json" >"$TMP/secret.out" 2>"$TMP/secret.err"; then
  fail "key-like input must be refused"
fi
grep -qE 'key material|secret-like' "$TMP/secret.err" || fail "secret refuse reason missing"
if [[ -f "$TMP/summary-secret.json" ]]; then
  fail "must not write a summary from secret-like input"
fi
pass "secret-like evidence is refused and not written"

write_ok_inputs "$TMP/authskip"
python3 - "$TMP/authskip/web/test-results/uat-playwright.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
for suite in p["suites"][0]["suites"]:
    if suite["title"] in {"45.4 authenticated UAT", "19.5 operator core flows"}:
        for spec in suite["specs"]:
            spec["tests"][0]["status"] = "skipped"
            spec["tests"][0]["results"] = [{"status": "skipped"}]
json.dump(p, open(sys.argv[1], "w"), indent=2)
PY
if run_summary "$TMP/authskip" "$TMP/summary-authskip.json" >"$TMP/authskip.out" 2>"$TMP/authskip.err"; then
  fail "skipped Basic/Pro coverage must fail the summary"
fi
python3 - "$TMP/summary-authskip.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
assert p["result"] == "fail", p
assert p["browser"]["authenticatedSkipped"] is True, p
assert p["browser"]["coverage"] == "skipped_required", p
PY
pass "skipped mandatory Basic/Pro coverage fails acceptance summary"

write_ok_inputs "$TMP/partial"
python3 - "$TMP/partial/web/test-results/uat-playwright.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
for spec in p["suites"][0]["suites"][1]["specs"]:
    if spec["title"] == "Pro campaigns room loads without sending a blast":
        spec["tests"][0]["status"] = "skipped"
        spec["tests"][0]["results"] = [{"status": "skipped"}]
json.dump(p, open(sys.argv[1], "w"), indent=2)
PY
if run_summary "$TMP/partial" "$TMP/summary-partial.json" >"$TMP/partial.out" 2>"$TMP/partial.err"; then
  fail "partial Pro skip must fail the summary"
fi
python3 - "$TMP/summary-partial.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
assert p["result"] == "fail", p
assert p["browser"]["coverage"] == "skipped_required", p
assert p["browser"]["authenticatedSkipped"] is True, p
PY
pass "one required Pro pass plus another required Pro skip fails acceptance summary"

echo "uat-acceptance-summary contract OK"
