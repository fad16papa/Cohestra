#!/usr/bin/env bash
# Contract for deploy/exact-sha-secret-scan.sh. No live GitHub. No real secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCAN="$ROOT_DIR/deploy/exact-sha-secret-scan.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -f "$SCAN" ]] || fail "exact-sha-secret-scan.sh missing"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git init -q -b main "$TMP"
git -C "$TMP" config user.email test@example.com
git -C "$TMP" config user.name testd
echo clean >"$TMP/ok.txt"
git -C "$TMP" add ok.txt
git -C "$TMP" commit -q -m clean
CLEAN="$(git -C "$TMP" rev-parse HEAD)"

out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" bash "$SCAN")" || { echo "$out"; fail "clean tree must pass"; }
echo "$out" | grep -q 'RESULT=PASS' || fail "clean tree missing RESULT=PASS"
pass "clean exact-SHA tree PASSES"

# Split the marker so this test file is not itself a finding.
PREFIX='-----BEGIN OPENSSH '
SUFFIX='PRIVATE KEY-----'
printf '%s%s\nplaceholder\n-----END OPENSSH PRIVATE KEY-----\n' "$PREFIX" "$SUFFIX" >"$TMP/leaked.pem"
git -C "$TMP" add leaked.pem
git -C "$TMP" commit -q -m leaked
DIRTY="$(git -C "$TMP" rev-parse HEAD)"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$DIRTY" bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "planted private-key marker must HOLD"
fi
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "dirty tree missing RESULT=HOLD"; }
echo "$out" | grep -q 'BEGIN OPENSSH' && fail "scan output must not print the secret marker"
pass "planted private-key marker HOLDs without printing the secret"

# The scanner must run against a specific SHA, not a dirty worktree.
printf 'AKIA%s\n' '0123456789ABCDEF' >"$TMP/worktree-only.txt"
out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" bash "$SCAN")" || { echo "$out"; fail "worktree-only dirt must not fail a clean SHA"; }
echo "$out" | grep -q 'RESULT=PASS' || fail "clean SHA must ignore uncommitted worktree dirt"
pass "scan is bound to the exact SHA tree"

if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa bash "$SCAN" 2>&1)"; then
  echo "$out"
  fail "unknown SCAN_SHA must not PASS"
fi
echo "$out" | grep -qE 'RESULT=(HOLD|REFUSE)' || { echo "$out"; fail "unknown SHA missing HOLD/REFUSE"; }
pass "broken/unknown SCAN_SHA fails closed"


# Failure injection: git grep exits >=2, scanner must HOLD.
mkdir -p "$TMP/mock-git-bin"
cat >"$TMP/mock-git-bin/git" <<'FAKE_GIT'
#!/usr/bin/env bash
for arg in "$@"; do
  if [[ "$arg" == "grep" ]]; then exit 128; fi
done
exec "$REAL_GIT" "$@"
FAKE_GIT
chmod +x "$TMP/mock-git-bin/git"
if out="$(cd "$TMP" && REAL_GIT="$(command -v git)" PATH="$TMP/mock-git-bin:$PATH" COHESTRA_ROOT="$TMP" SCAN_SHA="$CLEAN" bash "$SCAN" 2>&1)"; then
  echo "$out"; fail "git grep error must not PASS"
fi
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "git grep error did not HOLD"; }
echo "$out" | grep -q 'git grep error' || { echo "$out"; fail "git grep HOLD reason missing"; }
pass "git grep error HOLDs"

# Binary content must not be skipped as nontext.
printf '\000AKIA%s\000' '0123456789ABCDEF' >"$TMP/binary-fixture.bin"
git -C "$TMP" add binary-fixture.bin
git -C "$TMP" commit -q -m "synthetic binary fixture"
BINARY_SHA="$(git -C "$TMP" rev-parse HEAD)"
if out="$(cd "$TMP" && COHESTRA_ROOT="$TMP" SCAN_SHA="$BINARY_SHA" bash "$SCAN" 2>&1)"; then
  echo "$out"; fail "binary credential marker must HOLD"
fi
echo "$out" | grep -q 'RESULT=HOLD' || { echo "$out"; fail "binary marker did not HOLD"; }
pass "binary credential marker HOLDs"

# CI scanner must explicitly bind github.sha and pin checkout.
python3 - "$ROOT_DIR/.github/workflows/ci.yml" <<'PY'
from pathlib import Path
import sys
txt=Path(sys.argv[1]).read_text()
before="\n  exact-sha-scan:\n"
after="\n  uat-isolation:\n"
if before not in txt or after not in txt.partition(before)[2]:
    raise SystemExit("exact-SHA scan job missing")
block=txt.split(before,1)[1].split(after,1)[0]
required=(
    "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
    "ref: " + chr(36) + "{{ github.sha }}",
    "SCAN_SHA: " + chr(36) + "{{ github.sha }}",
    'test "$(git rev-parse HEAD)" = "$SCAN_SHA"',
    "bash deploy/exact-sha-secret-scan.sh",
)
for fragment in required:
    if fragment not in block:
        raise SystemExit("exact-SHA scan job missing "+fragment)
PY
pass "CI checkout is pinned and scan matches github.sha"

echo "exact-sha-secret-scan contract OK"
