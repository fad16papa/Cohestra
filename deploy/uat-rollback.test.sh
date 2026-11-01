#!/usr/bin/env bash
# TDD contract for dedicated UAT previous-SHA recovery.
# Does not SSH, restore databases, or change release controls.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/uat-rollback.sh"
WF="$ROOT_DIR/.github/workflows/deploy-uat-rollback.yml"
DEPLOY_WF="$ROOT_DIR/.github/workflows/deploy.yml"
PROD_WF="$ROOT_DIR/.github/workflows/deploy-production.yml"
VALIDATE="$ROOT_DIR/deploy/validate-uat-rollback-workflow.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$SCRIPT" ]] || fail "uat-rollback.sh missing"
[[ -f "$WF" ]] || fail "deploy-uat-rollback.yml missing"
[[ -f "$VALIDATE" ]] || fail "validate-uat-rollback-workflow.sh missing"

if grep -qiE 'adcp|autonomous delivery control plane' "$SCRIPT" "$WF"; then
  fail "UAT rollback must not restore ADCP"
fi
pass "rollback does not restore ADCP"

if grep -nE '^[[:space:]]*(psql|pg_restore|pg_dump)|down -v' "$SCRIPT" "$WF"; then
  fail "rollback must not invoke database commands"
fi
if grep -q 'DATABASE_MUTATED=false' "$SCRIPT" "$WF"; then
  fail "DATABASE_MUTATED=false is a misleading data-state claim"
fi
grep -q 'DB_RESTORE_NOT_ATTEMPTED=true' "$SCRIPT" \
  || fail "execute must record DB_RESTORE_NOT_ATTEMPTED"
grep -q 'DB_MIGRATION_EFFECT=UNVERIFIED' "$SCRIPT" \
  || fail "execute must record DB_MIGRATION_EFFECT=UNVERIFIED"
pass "rollback has no database commands and does not claim the DB is unchanged"

if grep -qE 'PROD_|deploy-production|cohestra-production' "$SCRIPT" "$WF"; then
  fail "UAT rollback must not reference Production"
fi
pass "rollback is isolated from Production"

# Normal Deploy UAT tip-pin must remain untouched.
if ! grep -q 'DEPLOY_SHA is not the current origin' "$DEPLOY_WF"; then
  fail "workstream A must not weaken Deploy UAT tip-pin"
fi
pass "Deploy UAT current-tip policy remains"

# shellcheck disable=SC1091
source "$ROOT_DIR/deploy/lib/production-provenance-fixture.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
build_provenance_fixture "$TMP/fix"
cd "$PROVENANCE_LOCAL"

run() {
  env UAT_ROLLBACK_AUTHORIZED="${UAT_ROLLBACK_AUTHORIZED:-true}" \
    UAT_ROLLBACK_CONFIRM="${UAT_ROLLBACK_CONFIRM:-UAT ROLLBACK: AUTHORIZED}" \
    UAT_ROLLBACK_EXECUTE="${UAT_ROLLBACK_EXECUTE:-false}" \
    ROLLBACK_SHA="${1:-}" \
    ORIGIN_MAIN_REF=origin/main \
    bash "$SCRIPT"
}

if out="$(ROLLBACK_SHA= UAT_ROLLBACK_AUTHORIZED=true UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' bash "$SCRIPT" 2>&1)"; then
  echo "$out"
  fail "missing SHA must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "missing SHA RESULT=REFUSE"; }
pass "missing SHA is refused"

if run "not-a-sha" >/dev/null 2>&1; then
  fail "malformed SHA must refuse"
fi
pass "malformed SHA is refused"

if UAT_ROLLBACK_AUTHORIZED=false UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' \
  ROLLBACK_SHA="$PROVENANCE_PARENT" bash "$SCRIPT" >/dev/null 2>&1; then
  fail "unauthorized rollback must refuse"
fi
pass "missing owner authorization is refused"

if UAT_ROLLBACK_AUTHORIZED=true UAT_ROLLBACK_CONFIRM='please' \
  ROLLBACK_SHA="$PROVENANCE_PARENT" bash "$SCRIPT" >/dev/null 2>&1; then
  fail "wrong confirm phrase must refuse"
fi
pass "wrong owner confirm phrase is refused"

if run "$PROVENANCE_MERGE" >/dev/null 2>&1; then
  fail "current origin/main tip must refuse (use Deploy UAT)"
fi
pass "current tip is refused"

RANDOM_SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
if run "$RANDOM_SHA" >/dev/null 2>&1; then
  fail "unknown object must refuse"
fi
pass "unknown git object is refused"

git -C "$PROVENANCE_LOCAL" checkout -q --orphan rollback-side
echo orphan >"$PROVENANCE_LOCAL/orphan"
git -C "$PROVENANCE_LOCAL" add orphan
git -C "$PROVENANCE_LOCAL" -c user.email=t@t -c user.name=t commit -q -m orphan
ORPHAN="$(git -C "$PROVENANCE_LOCAL" rev-parse HEAD)"
git -C "$PROVENANCE_LOCAL" checkout -q main
if run "$ORPHAN" >/dev/null 2>&1; then
  fail "non-ancestor commit must refuse"
fi
pass "SHA that is not an ancestor of origin/main is refused"

if UAT_ROLLBACK_AUTHORIZED=true UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' \
  ROLLBACK_SHA="$PROVENANCE_PARENT" bash "$SCRIPT" --restore-dump x >/dev/null 2>&1; then
  fail "database restore flag must refuse"
fi
if RESTORE_DUMP=x UAT_ROLLBACK_AUTHORIZED=true UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' \
  ROLLBACK_SHA="$PROVENANCE_PARENT" bash "$SCRIPT" >/dev/null 2>&1; then
  fail "RESTORE_DUMP env must refuse"
fi
if grep -nE 'bash .*remote-deploy\.sh|deploy/remote-deploy\.sh"' "$SCRIPT"; then
  fail "execute must not call remote-deploy.sh (old copies reset to origin/main)"
fi
pass "database restore is refused and remote-deploy is not used"

BEFORE="$(git rev-parse HEAD)"
out="$(run "$PROVENANCE_PARENT")" || { echo "$out"; fail "authorized dry-run should hold"; }
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "dry-run RESULT=HOLD"; }
echo "$out" | grep -q 'DRY_RUN=true' || { echo "$out"; fail "dry-run must set DRY_RUN"; }
echo "$out" | grep -q "ROLLBACK_SHA=${PROVENANCE_PARENT}" || { echo "$out"; fail "dry-run must echo SHA"; }
echo "$out" | grep -q 'DB_RESTORE_NOT_ATTEMPTED=true' || { echo "$out"; fail "dry-run must not claim a restore"; }
echo "$out" | grep -q 'DB_MIGRATION_EFFECT=UNVERIFIED' || { echo "$out"; fail "dry-run must mark migration effect unverified"; }
echo "$out" | grep -q 'DATABASE_MUTATED=false' && fail "dry-run must not print DATABASE_MUTATED=false"
[[ "$(git rev-parse HEAD)" == "$BEFORE" ]] || fail "dry-run must not move HEAD"
pass "authorized dry-run holds without mutating the tree"

run_execute() {
  local dir="$1"
  shift
  (
    cd "$dir" &&
      env \
        UAT_ROLLBACK_AUTHORIZED=true \
        UAT_ROLLBACK_CONFIRM='UAT ROLLBACK: AUTHORIZED' \
        UAT_ROLLBACK_EXECUTE=true \
        ROLLBACK_SHA="$PROVENANCE_PARENT" \
        ORIGIN_MAIN_REF=origin/main \
        COHESTRA_UAT_COMPOSE_STUB=true \
        "$@" \
        bash "$SCRIPT"
  )
}

EXECUTE_DIR="$TMP/execute"
git clone -q "$PROVENANCE_LOCAL" "$EXECUTE_DIR"
git -C "$EXECUTE_DIR" fetch -q origin main
if out="$(run_execute "$EXECUTE_DIR" COHESTRA_UAT_HOST_LOCK_STUB=clear COHESTRA_UAT_POSTCHECK_STUB=pass 2>&1)"; then
  echo "$out"
  fail "execute without backup attestation must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "missing backup RESULT=REFUSE"; }
pass "execute without backup attestation is refused"

git -C "$EXECUTE_DIR" reset --hard -q origin/main
if out="$(
  run_execute "$EXECUTE_DIR" \
    UAT_ROLLBACK_BACKUP_ATTESTED=true \
    COHESTRA_UAT_HOST_LOCK_STUB=clear \
    COHESTRA_UAT_POSTCHECK_STUB=pass
)"; then
  echo "$out"
  fail "execute without compatibility review must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "missing compat RESULT=REFUSE"; }
pass "execute without compatibility review is refused"

git clone -q "$PROVENANCE_LOCAL" "$TMP/locked"
git -C "$TMP/locked" fetch -q origin main
if out="$(
  run_execute "$TMP/locked" \
    UAT_ROLLBACK_BACKUP_ATTESTED=true \
    UAT_ROLLBACK_COMPAT_REVIEWED=true \
    COHESTRA_UAT_HOST_LOCK_STUB=held \
    COHESTRA_UAT_POSTCHECK_STUB=pass
)"; then
  echo "$out"
  fail "held host lock must refuse execute"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "held lock RESULT=REFUSE"; }
pass "held UAT host mutation lock refuses execute"

git clone -q "$PROVENANCE_LOCAL" "$TMP/unhealthy"
git -C "$TMP/unhealthy" fetch -q origin main
if out="$(
  run_execute "$TMP/unhealthy" \
    UAT_ROLLBACK_BACKUP_ATTESTED=true \
    UAT_ROLLBACK_COMPAT_REVIEWED=true \
    COHESTRA_UAT_HOST_LOCK_STUB=clear \
    COHESTRA_UAT_POSTCHECK_STUB=fail
)"; then
  echo "$out"
  fail "failed post-rollback acceptance must refuse"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "failed postcheck RESULT=REFUSE"; }
pass "failed post-rollback acceptance refuses closed"

git -C "$EXECUTE_DIR" reset --hard -q origin/main
out="$(
  run_execute "$EXECUTE_DIR" \
    UAT_ROLLBACK_BACKUP_ATTESTED=true \
    UAT_ROLLBACK_COMPAT_REVIEWED=true \
    COHESTRA_UAT_HOST_LOCK_STUB=clear \
    COHESTRA_UAT_POSTCHECK_STUB=pass
)" || { echo "$out"; fail "authorized execute should pass on previous SHA"; }
echo "$out" | grep -q 'RESULT=PASS' || { echo "$out"; fail "execute RESULT=PASS"; }
echo "$out" | grep -q "DEPLOYED_SHA=${PROVENANCE_PARENT}" || { echo "$out"; fail "execute must reset to previous SHA"; }
echo "$out" | grep -q 'DB_RESTORE_NOT_ATTEMPTED=true' || { echo "$out"; fail "execute must record DB_RESTORE_NOT_ATTEMPTED"; }
echo "$out" | grep -q 'DB_MIGRATION_EFFECT=UNVERIFIED' || { echo "$out"; fail "execute must record unverified migration effect"; }
echo "$out" | grep -q 'POST_ROLLBACK_ACCEPTANCE=pass' || { echo "$out"; fail "execute must record post-rollback acceptance"; }
echo "$out" | grep -q 'RECOVERY_RESTORE_READY=false' || { echo "$out"; fail "execute must not claim restore readiness"; }
echo "$out" | grep -q 'DATABASE_MUTATED=false' && fail "execute must not print DATABASE_MUTATED=false"
[[ "$(git -C "$EXECUTE_DIR" rev-parse HEAD)" == "$PROVENANCE_PARENT" ]] \
  || fail "execute must leave HEAD on the previous SHA"
pass "authorized execute resets host tree and reports honest DB/recovery state"

# persist-credentials:false equivalent: no stored GitHub credentials, HTTP Basic fixture.
HTTP_TOKEN="local-http-git-token-not-github"
python3 - "$TMP" "$HTTP_TOKEN" <<'PY' &
import base64, http.server, os, subprocess, sys
from pathlib import Path
from urllib.parse import urlparse

root, token = Path(sys.argv[1]), sys.argv[2]
bare = root / "http-origin.git"
work = root / "http-seed"
subprocess.check_call(["git", "init", "-q", "--bare", str(bare)])
subprocess.check_call(["git", "init", "-q", str(work)])
subprocess.check_call(["git", "-C", str(work), "checkout", "-q", "-b", "main"])
(work / "readme").write_text("http-git\n", encoding="utf-8")
subprocess.check_call(["git", "-C", str(work), "add", "readme"])
subprocess.check_call(
    ["git", "-C", str(work), "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "seed"]
)
subprocess.check_call(["git", "-C", str(work), "remote", "add", "origin", str(bare)])
subprocess.check_call(["git", "-C", str(work), "push", "-q", "origin", "HEAD:main"])
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
# No stored credentials — persist-credentials: false equivalent.
export UAT_GATE_EVIDENCE_DIR="$TMP/rollback-fetch-evidence"
export CANDIDATE_SHA="74958f1ad4695ea8358b57ed6dc4b0be8f3ba9de"
if out="$(
  cd "$TMP/http-client" &&
  unset GITHUB_TOKEN &&
  GIT_TERMINAL_PROMPT=0 \
  bash "$ROOT_DIR/deploy/fetch-origin-main.sh" 2>&1
)"; then
  echo "$out"
  fail "fetch without token must refuse after persist-credentials:false"
fi
out="$(
  cd "$TMP/http-client" &&
  GITHUB_TOKEN="$HTTP_TOKEN" GIT_TERMINAL_PROMPT=0 ORIGIN_MAIN_REF=origin/main \
    bash "$ROOT_DIR/deploy/fetch-origin-main.sh"
)" || { echo "$out"; fail "URL-scoped Basic fetch must succeed on the local HTTP fixture"; }
echo "$out" | grep -q "$HTTP_TOKEN" && fail "HTTP token printed"
seen_auth="$(cat "$TMP/http-auth-seen.txt")"
echo "$seen_auth" | grep -qiE '^basic ' || { echo "auth=$seen_auth"; fail "HTTP fixture did not receive Basic auth"; }
echo "$seen_auth" | grep -qi bearer && fail "HTTP fixture received Bearer"
git -C "$TMP/http-client" rev-parse --verify origin/main >/dev/null \
  || fail "HTTP fetch did not update origin/main"
pass "rollback fetch path uses authenticated HTTP Basic after persist-credentials:false"

python3 - "$WF" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text()
if "git fetch --no-tags origin main" in text:
    raise SystemExit("workflow must not raw-fetch after persist-credentials: false")
if "fetch-origin-main.sh" not in text:
    raise SystemExit("validate job must call fetch-origin-main.sh")
if "dispatch-readiness" not in text:
    raise SystemExit("push/PR must run a dispatch-readiness job")
if "workflow_dispatch:" not in text:
    raise SystemExit("workflow_dispatch inputs must remain")
if "LIVE_DISPATCH" not in text:
    raise SystemExit("readiness job must record that live dispatch was not performed")
if "backup_attested" not in text or "compat_reviewed" not in text:
    raise SystemExit("execute must require backup and compatibility attestation")
if "POST_ROLLBACK_ACCEPTANCE" not in text and "/ready" not in text:
    raise SystemExit("SSH execute must fail closed on post-rollback /ready")
if "DATABASE_MUTATED=false" in text:
    raise SystemExit("workflow must not print DATABASE_MUTATED=false")
if "group: deploy-uat-rollback" in text:
    raise SystemExit("independent rollback concurrency is forbidden")
if "group: deploy-uat" not in text:
    raise SystemExit("workflow must share deploy-uat concurrency")
PY
pass "workflow is dispatch-ready without live dispatch and shares the UAT host lock"

bash "$VALIDATE" || fail "workflow contract failed"
pass "rollback workflow contract"

echo "uat-rollback contract OK"
