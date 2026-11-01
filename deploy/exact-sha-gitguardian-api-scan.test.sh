#!/usr/bin/env bash
# Contract for deploy/exact-sha-gitguardian-api-scan.sh. No live API. No real key.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCAN="$ROOT_DIR/deploy/exact-sha-gitguardian-api-scan.sh"
CI="$ROOT_DIR/.github/workflows/ci.yml"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$SCAN" ]] || fail "exact-sha-gitguardian-api-scan.sh missing"
if grep -E '\$GGSHIELD_BIN.*--exit-zero|\$GGSHIELD_BIN.*--ignore-known-secrets|\$GGSHIELD_BIN.*--show-secrets' "$SCAN"; then
  fail "wrapper must not pass weakening flags to ggshield"
fi
grep -q 'GITGUARDIAN_EXIT_ZERO is forbidden' "$SCAN" || fail "wrapper must refuse GITGUARDIAN_EXIT_ZERO"
grep -q 'secret scan commit-range' "$SCAN" || fail "wrapper must scan an exact commit-range"
if grep -E '\$GGSHIELD_BIN.*secret scan ci|[[:space:]]ggshield secret scan ci' "$SCAN"; then
  fail "wrapper must not invoke the event-dependent CI scan subcommand"
fi
pass "wrapper forbids weakening ggshield flags and uses commit-range"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git init -q -b main "$TMP"
git -C "$TMP" config user.email test@example.com
git -C "$TMP" config user.name testd
echo parent >"$TMP/ok.txt"
git -C "$TMP" add ok.txt
git -C "$TMP" commit -q -m parent
echo clean >"$TMP/ok.txt"
git -C "$TMP" add ok.txt
git -C "$TMP" commit -q -m clean
CLEAN="$(git -C "$TMP" rev-parse HEAD)"
PARENT="$(git -C "$TMP" rev-parse HEAD^)"

cat >"$TMP/fake-ggshield" <<FAKE
#!/usr/bin/env bash
printf '%s\n' "\$@" >"$TMP/ggshield.args"
if [[ "\${GGSHIELD_FORCE_RC:-}" =~ ^[0-9]+$ ]]; then
  exit "\${GGSHIELD_FORCE_RC}"
fi
exit 0
FAKE
chmod +x "$TMP/fake-ggshield"

if out="$(cd "$TMP" && env -u GITGUARDIAN_API_KEY COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" GGSHIELD_BIN="$TMP/fake-ggshield" bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "missing API key must HOLD"
fi
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "missing key missing HOLD"; }
echo "$out" | grep -q 'GITGUARDIAN_API_KEY is missing' || { echo "$out"; fail "missing key reason"; }
echo "$out" | grep -qiE 'ggshield_[a-z0-9]|api[_-]?key=|GITGUARDIAN_API_KEY=.' && fail "output leaked a key"
pass "missing API key HOLDs without leaking secrets"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" GGSHIELD_BIN="$TMP/fake-ggshield" GITGUARDIAN_API_KEY='   ' bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "whitespace API key must HOLD"
fi
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "whitespace key missing HOLD"; }
pass "whitespace API key HOLDs"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" GGSHIELD_BIN="$TMP/missing-bin" GITGUARDIAN_API_KEY=placeholder-scan-only bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "missing ggshield must HOLD"
fi
echo "$out" | grep -q 'ggshield is not available' || { echo "$out"; fail "missing binary reason"; }
pass "missing ggshield HOLDs"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" GGSHIELD_BIN="$TMP/fake-ggshield" GITGUARDIAN_API_KEY=placeholder-scan-only GITGUARDIAN_EXIT_ZERO=true bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "GITGUARDIAN_EXIT_ZERO must REFUSE"
fi
echo "$out" | grep -q 'RESULT=REFUSE' || { echo "$out"; fail "EXIT_ZERO missing REFUSE"; }
pass "GITGUARDIAN_EXIT_ZERO REFUSES"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" GGSHIELD_BIN="$TMP/fake-ggshield" GITGUARDIAN_API_KEY=placeholder-scan-only bash "$SCAN" --exit-zero 2>&1)"; then
  echo "$out"
  fail "wrapper --exit-zero must REFUSE"
fi
echo "$out" | grep -q 'weakening flags are forbidden' || { echo "$out"; fail "flag refuse reason"; }
pass "wrapper --exit-zero REFUSES"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$PARENT" GGSHIELD_BIN="$TMP/fake-ggshield" GITGUARDIAN_API_KEY=placeholder-scan-only bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "HEAD != SCAN_SHA must HOLD"
fi
echo "$out" | grep -q 'HEAD does not equal SCAN_SHA' || { echo "$out"; fail "HEAD mismatch reason"; }
pass "HEAD != SCAN_SHA HOLDs"

out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" GGSHIELD_BIN="$TMP/fake-ggshield" GITGUARDIAN_API_KEY=placeholder-scan-only bash "$SCAN")" \
  || { echo "$out"; fail "clean mock scan must PASS"; }
echo "$out" | grep -q 'RESULT=PASS' || fail "clean mock missing RESULT=PASS"
echo "$out" | grep -q 'placeholder-scan-only' && fail "PASS output leaked the mock key"
grep -q 'secret' "$TMP/ggshield.args" || fail "ggshield was not invoked"
grep -q 'commit-range' "$TMP/ggshield.args" || fail "ggshield must use commit-range"
grep -q "${CLEAN}^..${CLEAN}" "$TMP/ggshield.args" || fail "ggshield range must be the exact SHA"
if grep -q -- '--exit-zero' "$TMP/ggshield.args" || grep -q -- '--ignore-known-secrets' "$TMP/ggshield.args"; then
  fail "ggshield invocation must not weaken findings"
fi
pass "clean exact-SHA API mock PASSES with exact commit-range"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" GGSHIELD_BIN="$TMP/fake-ggshield" GITGUARDIAN_API_KEY=placeholder-scan-only GGSHIELD_FORCE_RC=1 bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "findings must HOLD"
fi
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "findings missing HOLD"; }
pass "API finding HOLDs"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" GGSHIELD_BIN="$TMP/fake-ggshield" GITGUARDIAN_API_KEY=placeholder-scan-only GGSHIELD_FORCE_RC=3 bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "auth/quota/network error must HOLD"
fi
echo "$out" | grep -q 'failed closed' || { echo "$out"; fail "error path reason"; }
pass "auth/quota/network error HOLDs"

python3 - "$CI" <<'PY'
from pathlib import Path
import sys
txt = Path(sys.argv[1]).read_text()
before = "\n  gitguardian-exact-sha-api:\n"
if before not in txt:
    raise SystemExit("GitGuardian exact-SHA API job missing")
import re
rest = txt.split(before, 1)[1]
m = re.search(r"\n  [A-Za-z0-9_-]+:", rest)
block = rest if not m else rest[: m.start()]
required = (
    "name: GitGuardian exact-SHA API scan",
    "github.event_name == 'push'",
    "github.ref == 'refs/heads/main'",
    "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
    "persist-credentials: false",
    "SCAN_SHA: ${{ github.sha }}",
    'test "$(git rev-parse HEAD)" = "$SCAN_SHA"',
    "ggshield==1.56.1",
    "bash deploy/exact-sha-gitguardian-api-scan.sh",
    "set +x",
)
for fragment in required:
    if fragment not in block:
        raise SystemExit("API scan job missing " + fragment)
if "event_name == 'pull_request'" in block or "pull_request ||" in block:
    raise SystemExit("API scan job must not run on pull_request")
if "--exit-zero" in block or "--ignore-known-secrets" in block or "GITGUARDIAN_EXIT_ZERO" in block:
    raise SystemExit("CI job must not weaken ggshield")
if "environment:" in block:
    raise SystemExit("API scan job must not use a GitHub Environment")
if "DROPLET_" in block or "PROD_" in block:
    raise SystemExit("API scan job must not read UAT/Production secrets")
if "secrets.GITGUARDIAN_API_KEY" not in block:
    raise SystemExit("API scan job must read GITGUARDIAN_API_KEY only in this job")
# The secret must not appear in any other CI job.
other = txt.replace(before + rest[: m.start()] if m else before + rest, "", 1)
if "GITGUARDIAN_API_KEY" in other:
    raise SystemExit("GITGUARDIAN_API_KEY must not appear outside the push-main API scan job")
PY
pass "CI API scan job is push-main only, pinned, and has no UAT secrets"

python3 - "$ROOT_DIR/.github/workflows/ci.yml" <<'PY'
from pathlib import Path
import sys
txt = Path(sys.argv[1]).read_text()
before = "\n  exact-sha-scan:\n"
after = "\n  gitguardian-exact-sha-api:\n"
if before not in txt or after not in txt:
    raise SystemExit("Exact-SHA pattern scan job missing")
block = txt.split(before, 1)[1].split(after, 1)[0]
if "persist-credentials: false" not in block:
    raise SystemExit("Exact-SHA pattern scan must lock persist-credentials: false")
PY
pass "Exact-SHA pattern scan job locks persist-credentials"

echo "exact-sha-gitguardian-api-scan contract OK"
