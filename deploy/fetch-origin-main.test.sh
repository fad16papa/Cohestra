#!/usr/bin/env bash
# TDD contract for authenticated origin/main fetch and disabled-gate HOLD-first.
# No live GitHub write, SSH, or UAT deploy.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FETCH="$ROOT_DIR/deploy/fetch-origin-main.sh"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
GATE="$ROOT_DIR/deploy/validate-uat-predeploy-gate.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$FETCH" ]] || fail "fetch-origin-main.sh missing"
[[ -f "$WF" ]] || fail "deploy.yml missing"
[[ -f "$GATE" ]] || fail "validate-uat-predeploy-gate.sh missing"

if grep -qiE 'adcp|autonomous delivery control plane' "$FETCH"; then
  fail "fetch helper must not restore ADCP"
fi
pass "fetch helper does not restore ADCP"

grep -q 'http.${HEADER_SCOPE}.extraheader' "$FETCH" \
  || fail "fetch must use URL-scoped http.<origin>/.extraheader"
grep -q 'AUTHORIZATION: basic' "$FETCH" \
  || fail "fetch must use Basic x-access-token auth"
grep -q 'x-access-token' "$FETCH" \
  || fail "fetch must mint x-access-token Basic material"
grep -q 'urlsplit' "$FETCH" \
  || fail "fetch must derive extraheader scope from the origin URL"
if grep -qiE 'AUTHORIZATION:[[:space:]]*bearer' "$FETCH" "$WF"; then
  fail "Bearer extraheader is the live 41289603719 failure mode"
fi
pass "fetch uses URL-scoped Basic auth, not Bearer"

if grep -n 'git -c http.extraheader="AUTHORIZATION: bearer' "$WF"; then
  fail "deploy.yml still has the broken unscoped Bearer fetch"
fi
pass "deploy.yml no longer uses the broken Bearer fetch"

# Missing / empty token must refuse without printing secrets.
if out="$(GITHUB_TOKEN= bash "$FETCH" 2>&1)"; then
  echo "$out"
  fail "empty GITHUB_TOKEN must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "missing token RESULT=REFUSE"; }
echo "$out" | grep -qiE 'ghp_|github_pat_|xox' && fail "token-like material leaked"
pass "missing GITHUB_TOKEN refuses closed"

if out="$(unset GITHUB_TOKEN; bash "$FETCH" 2>&1)"; then
  echo "$out"
  fail "unset GITHUB_TOKEN must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "unset token RESULT=REFUSE"; }
pass "unset GITHUB_TOKEN refuses closed"

# Missing token must still write both refusal evidence files.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export UAT_GATE_EVIDENCE_DIR="$TMP/missing-token-evidence"
export CANDIDATE_SHA="74958f1ad4695ea8358b57ed6dc4b0be8f3ba9de"
if out="$(unset GITHUB_TOKEN; bash "$FETCH" 2>&1)"; then
  echo "$out"
  fail "unset token must refuse"
fi
[[ -f "$UAT_GATE_EVIDENCE_DIR/uat-predeploy-gate.json" ]] \
  || fail "fetch refuse must write uat-predeploy-gate.json"
[[ -f "$UAT_GATE_EVIDENCE_DIR/uat-delivery-status.json" ]] \
  || fail "fetch refuse must write uat-delivery-status.json"
python3 - "$UAT_GATE_EVIDENCE_DIR/uat-predeploy-gate.json" \
  "$UAT_GATE_EVIDENCE_DIR/uat-delivery-status.json" <<'PY'
import json, sys
gate, status = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
assert gate["result"] == "REFUSE", gate
blob = json.dumps(gate) + json.dumps(status)
assert "ghp_" not in blob and "github_pat_" not in blob
assert "DROPLET_" not in blob
assert status["eligibility"] == "REFUSE", status
assert status["uat_deployment_outcome"] == "REFUSED", status
assert status["ssh_executed"] is False
assert status["uat_deployed"] is False
assert status["deployment_phase"] == "NOT_STARTED"
PY
pass "missing token writes REFUSE evidence without invoking eligibility"

# Deterministic local HTTP Git Basic-auth fixture. No live GitHub.
HTTP_TOKEN="local-http-git-token-not-github"
python3 - "$TMP" "$HTTP_TOKEN" <<'PY' &
import base64, http.server, os, subprocess, sys
from pathlib import Path
from urllib.parse import urlparse

root, token = Path(sys.argv[1]), sys.argv[2]
bare = root / "http-origin.git"
work = root / "seed"
subprocess.check_call(["git", "init", "-q", "--bare", str(bare)])
subprocess.check_call(["git", "init", "-q", str(work)])
subprocess.check_call(["git", "-C", str(work), "checkout", "-q", "-b", "main"])
(work / "readme").write_text("http-git\n", encoding="utf-8")
subprocess.check_call(["git", "-C", str(work), "add", "readme"])
subprocess.check_call(
    ["git", "-C", str(work), "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "seed"]
)
subprocess.check_call(["git", "-C", str(work), "remote", "add", "origin", str(bare)])
subprocess.check_call(["git", "-C", str(work), "push", "-q", "origin", "main"])
expected = "Basic " + base64.b64encode(f"x-access-token:{token}".encode()).decode()
seen = root / "http-auth-seen.txt"

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        self._git()

    def do_POST(self):
        self._git()

    def _git(self):
        auth = self.headers.get("Authorization", "")
        seen.write_text(auth or "MISSING", encoding="utf-8")
        if auth.lower() != expected.lower():
            self.send_response(401)
            self.send_header("WWW-Authenticate", 'Basic realm="git"')
            self.end_headers()
            return
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else b""
        env = os.environ.copy()
        env.update(
            {
                "GIT_PROJECT_ROOT": str(root),
                "GIT_HTTP_EXPORT_ALL": "1",
                "PATH_INFO": parsed.path,
                "QUERY_STRING": parsed.query,
                "REQUEST_METHOD": self.command,
                "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                "CONTENT_LENGTH": str(length),
            }
        )
        proc = subprocess.run(
            ["git", "http-backend"],
            input=body,
            capture_output=True,
            env=env,
            check=False,
        )
        raw = proc.stdout
        headers, _, rest = raw.partition(b"\r\n\r\n")
        if not rest:
            headers, _, rest = raw.partition(b"\n\n")
        status = 200
        out_headers = []
        for line in headers.splitlines():
            if not line:
                continue
            key, _, value = line.partition(b":")
            if key.lower() == b"status":
                status = int(value.strip().split(b" ")[0] or b"200")
            else:
                out_headers.append((key.decode(), value.strip().decode()))
        self.send_response(status)
        for key, value in out_headers:
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(rest)

httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
(root / "http-port").write_text(str(httpd.server_address[1]), encoding="utf-8")
httpd.serve_forever()
PY
HTTP_PID=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do
  [[ -f "$TMP/http-port" ]] && break
  sleep 0.1
done
[[ -f "$TMP/http-port" ]] || fail "local HTTP git fixture did not start"
HTTP_PORT="$(cat "$TMP/http-port")"
cleanup() { kill "$HTTP_PID" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

git init -q "$TMP/http-client"
git -C "$TMP/http-client" checkout -q -b main
git -C "$TMP/http-client" remote add origin "http://127.0.0.1:${HTTP_PORT}/http-origin.git"

export UAT_GATE_EVIDENCE_DIR="$TMP/http-wrong-evidence"
if out="$(
  cd "$TMP/http-client" &&
  GITHUB_TOKEN="wrong-token" GIT_TERMINAL_PROMPT=0 ORIGIN_MAIN_REF=origin/main bash "$FETCH" 2>&1
)"; then
  echo "$out"
  fail "wrong HTTP Basic token must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "wrong HTTP token RESULT=REFUSE"; }
echo "$out" | grep -q 'wrong-token' && fail "wrong token printed"
[[ -f "$UAT_GATE_EVIDENCE_DIR/uat-predeploy-gate.json" ]] \
  || fail "HTTP 401 must write gate evidence"
[[ -f "$UAT_GATE_EVIDENCE_DIR/uat-delivery-status.json" ]] \
  || fail "HTTP 401 must write delivery-status evidence"
pass "wrong HTTP Basic token refuses and writes evidence"

export UAT_GATE_EVIDENCE_DIR="$TMP/http-ok-evidence"
out="$(
  cd "$TMP/http-client" &&
  GITHUB_TOKEN="$HTTP_TOKEN" GIT_TERMINAL_PROMPT=0 ORIGIN_MAIN_REF=origin/main bash "$FETCH" 2>&1
)" || { echo "$out"; fail "correct HTTP Basic token must fetch"; }
echo "$out" | grep -q "$HTTP_TOKEN" && fail "HTTP token printed"
seen_auth="$(cat "$TMP/http-auth-seen.txt")"
echo "$seen_auth" | grep -qiE '^basic ' || { echo "auth=$seen_auth"; fail "HTTP fixture did not receive Basic auth"; }
echo "$seen_auth" | grep -qi bearer && fail "HTTP fixture received Bearer"
git -C "$TMP/http-client" rev-parse --verify origin/main >/dev/null \
  || fail "HTTP fetch did not update origin/main"
pass "local HTTP Git fixture requires URL-scoped Basic x-access-token"

# Disabled suppressor HOLDs and writes evidence without origin/main.
# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"
build_provenance_fixture "$TMP/gate"
cd "$PROVENANCE_LOCAL"
git remote remove origin
export COHESTRA_ROOT="$ROOT_DIR"
export UAT_GATE_EVIDENCE_DIR="$TMP/disabled-evidence"
export UAT_DEPLOY_GATE_ACTIVE=false
export CANDIDATE_SHA="$PROVENANCE_MERGE"
export GITHUB_EVENT_NAME=workflow_run
export WORKFLOW_RUN_HEAD_SHA="$PROVENANCE_MERGE"
export GITHUB_REPOSITORY=fad16papa/Cohestra
unset GITHUB_TOKEN || true
set +e
gate_out="$(bash "$GATE" 2>&1)"
gate_rc=$?
set -e
[[ "$gate_rc" -ne 0 ]] || { echo "$gate_out"; fail "disabled gate must HOLD"; }
echo "$gate_out" | grep -q 'RESULT=HOLD' || { echo "$gate_out"; fail "disabled gate RESULT=HOLD"; }
echo "$gate_out" | grep -q 'UAT_DEPLOY_GATE_ACTIVE' || { echo "$gate_out"; fail "HOLD must name the gate"; }
[[ -f "$UAT_GATE_EVIDENCE_DIR/uat-predeploy-gate.json" ]] \
  || fail "HOLD must write uat-predeploy-gate.json"
[[ -f "$UAT_GATE_EVIDENCE_DIR/uat-delivery-status.json" ]] \
  || fail "HOLD must write uat-delivery-status.json"
python3 - "$UAT_GATE_EVIDENCE_DIR/uat-predeploy-gate.json" \
  "$UAT_GATE_EVIDENCE_DIR/uat-delivery-status.json" "$PROVENANCE_MERGE" <<'PY'
import json, sys
gate, status, sha = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), sys.argv[3]
assert gate["result"] == "HOLD", gate
assert "UAT_DEPLOY_GATE_ACTIVE" in gate["reason"], gate
assert gate["candidate_sha"] == sha
assert gate["gate_active"] is False
assert status["eligibility"] == "HOLD", status
assert status["uat_deployment_outcome"] == "HELD", status
assert status["ssh_executed"] is False
assert status["uat_deployed"] is False
assert status["deployment_phase"] == "NOT_STARTED"
blob = json.dumps(gate) + json.dumps(status)
assert "DROPLET_" not in blob
assert "GITGUARDIAN_API_KEY=" not in blob
assert "BEGIN " not in blob
PY
pass "disabled gate HOLDs and writes nonsecret evidence without origin/main or token"

for value in "" false TRUE 1 yes True; do
  export UAT_DEPLOY_GATE_ACTIVE="$value"
  set +e
  out="$(bash "$GATE" 2>&1)"
  rc=$?
  set -e
  [[ "$rc" -ne 0 ]] || { echo "$out"; fail "UAT_DEPLOY_GATE_ACTIVE=${value:-unset} must HOLD"; }
  echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "${value:-unset} RESULT=HOLD"; }
done
pass "unset/false/TRUE/1/yes/True are HOLD, not eligible"

# Workflow path order: disabled suppressor evaluates the real gate before fetch.
python3 - "$WF" <<'PY'
from pathlib import Path
import re, sys

text = Path(sys.argv[1]).read_text()
if "AUTHORIZATION: bearer" in text.lower() or "AUTHORIZATION: Bearer" in text:
    raise SystemExit("deploy.yml must not use Bearer git extraheader")
if 'http.extraheader="AUTHORIZATION: bearer ${GITHUB_TOKEN}"' in text:
    raise SystemExit("live failure fetch line is still present")

def job(name: str) -> str:
    start = text.find(f"  {name}:")
    if start < 0:
        raise SystemExit(f"{name} missing")
    rest = text[start:]
    m = re.search(r"\n  [A-Za-z0-9_-]+:", rest[1:])
    return rest if not m else rest[: m.start() + 1]

pre = job("predeploy-gate")
deploy = job("deploy")
if "persist-credentials: false" not in pre or "persist-credentials: false" not in deploy:
    raise SystemExit("persist-credentials: false must remain")
if "fetch-origin-main.sh" not in pre or "fetch-origin-main.sh" not in deploy:
    raise SystemExit("enabled path must call fetch-origin-main.sh")
if "validate-uat-predeploy-gate.sh" not in pre:
    raise SystemExit("real validator must run on predeploy")
if "environment:" in pre:
    raise SystemExit("predeploy must not use an Environment")
if "DROPLET_" in pre:
    raise SystemExit("predeploy must not read DROPLET secrets")
if "needs.predeploy-gate.outputs.eligible == 'true'" not in deploy and \
   'needs.predeploy-gate.outputs.eligible == "true"' not in deploy:
    raise SystemExit("SSH remains gated on eligible==true")
if "github.event_name == 'workflow_dispatch' ||" in text:
    raise SystemExit("workflow_dispatch OR-bypass is forbidden")

# Disabled path must invoke the real validator before fetch-origin-main.sh
eval_idx = pre.find("Evaluate UAT predeploy gate")
rerun_idx = deploy.find("Re-run UAT predeploy gate before SSH")
for label, block in (("predeploy evaluate", pre[eval_idx:]), ("SSH revalidate", deploy[rerun_idx:])):
    if "UAT_DEPLOY_GATE_ACTIVE:-}" not in block or '!= "true"' not in block:
        raise SystemExit(f"{label} must HOLD-first when gate is not exact true")
    gate_at = block.find("validate-uat-predeploy-gate.sh")
    fetch_at = block.find("fetch-origin-main.sh")
    if gate_at < 0 or fetch_at < 0:
        raise SystemExit(f"{label} must contain both validator and fetch helper")
    # In the disabled branch the validator appears first.
    if gate_at > fetch_at:
        raise SystemExit(f"{label} must run real validator before fetch when gate is disabled")

# Durable HOLD upload must fail closed if files are missing.
require = pre[pre.find("Require both predeploy evidence files"):pre.find("Upload predeploy gate evidence")]
if "if: always()" not in require:
    raise SystemExit("both-files check must run if: always()")
if "require-uat-predeploy-evidence.sh" not in require:
    raise SystemExit("both-files check must use require-uat-predeploy-evidence.sh")
upload = pre[pre.find("Upload predeploy gate evidence"):]
if "if: always()" not in upload:
    raise SystemExit("predeploy upload must remain if: always()")
if "uat-predeploy-gate-evidence" not in upload:
    raise SystemExit("predeploy upload name missing")
if "uat-predeploy-gate.json" not in upload or "uat-delivery-status.json" not in upload:
    raise SystemExit("predeploy upload must include both HOLD files")
if "if-no-files-found: error" not in upload:
    raise SystemExit("missing HOLD evidence must fail closed")
if "if-no-files-found: warn" in upload:
    raise SystemExit("predeploy evidence upload must not warn-and-continue")
# Require step must appear before upload so a single missing file fails explicitly.
if pre.find("Require both predeploy evidence files") > pre.find("Upload predeploy gate evidence"):
    raise SystemExit("both-files check must run before upload")
# Fetch failure must not fall through to enabled-path eligibility.
enabled = pre[pre.find("fetch-origin-main.sh"):]
if enabled.find("fetch-origin-main.sh") > enabled.find("validate-uat-predeploy-gate.sh"):
    raise SystemExit("enabled path must not evaluate eligibility when fetch failed")
PY
pass "workflow HOLDs before fetch, keeps SSH eligibility, and fail-closes missing evidence"

REQUIRE="$ROOT_DIR/deploy/require-uat-predeploy-evidence.sh"
[[ -f "$REQUIRE" ]] || fail "require-uat-predeploy-evidence.sh missing"
mkdir -p "$TMP/partial"
echo '{"result":"HOLD"}' >"$TMP/partial/uat-predeploy-gate.json"
if out="$(UAT_GATE_EVIDENCE_DIR="$TMP/partial" bash "$REQUIRE" 2>&1)"; then
  echo "$out"
  fail "single missing evidence file must fail"
fi
echo "$out" | grep -q 'uat-delivery-status.json' || { echo "$out"; fail "must name the missing file"; }
pass "single missing predeploy evidence file fails closed"

echo "fetch-origin-main contract OK"
