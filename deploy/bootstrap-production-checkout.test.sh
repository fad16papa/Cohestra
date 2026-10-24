#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/bootstrap-production-checkout.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -x "$SCRIPT" ]] || fail "bootstrap-production-checkout.sh must be executable"

if grep -qE 'tskey-|BEGIN (OPENSSH|RSA|EC) PRIVATE KEY|x-access-token|ghp_|github_pat_|GIT_ASKPASS|IdentityFile' "$SCRIPT"; then
  fail "checkout bootstrap must not embed credentials or keys"
fi
if grep -qE 'compose up|docker compose|psql|pg_restore|pg_dump' "$SCRIPT"; then
  fail "checkout bootstrap must not start compose or mutate a database"
fi
grep -q 'https://github.com/fad16papa/Cohestra.git' "$SCRIPT" || fail "canonical public HTTPS origin missing"
grep -q 'PRODUCTION_BOOTSTRAP_SHA' "$SCRIPT" || fail "explicit SHA input missing"
pass "script hardcodes the public HTTPS origin and contains no credentials"

out="$(mktemp)"
TMP="$(mktemp -d)"
trap 'rm -f "$out"; rm -rf "$TMP"' EXIT

git init -q -b main "$TMP/remote"
git -C "$TMP/remote" config user.email test@example.com
git -C "$TMP/remote" config user.name testd
echo one >"$TMP/remote/f"
git -C "$TMP/remote" add f
git -C "$TMP/remote" commit -q -m one
FIRST="$(git -C "$TMP/remote" rev-parse HEAD)"
echo two >"$TMP/remote/f"
git -C "$TMP/remote" add f
git -C "$TMP/remote" commit -q -m two
SECOND="$(git -C "$TMP/remote" rev-parse HEAD)"
git -C "$TMP/remote" checkout -q -b side
echo side >"$TMP/remote/side"
git -C "$TMP/remote" add side
git -C "$TMP/remote" commit -q -m side
SIDE="$(git -C "$TMP/remote" rev-parse HEAD)"
git -C "$TMP/remote" checkout -q main

common=(
  COHESTRA_BOOTSTRAP_UNDER_TEST=1
  COHESTRA_TEST_HOSTNAME=cohestra-production
  COHESTRA_TEST_DEPLOY_USER=deploy
  COHESTRA_TEST_DEPLOY_HOME="$TMP/home-deploy"
  COHESTRA_TEST_DEPLOY_PATH="$TMP/home-deploy/cohestra-production"
  COHESTRA_TEST_REPO_URL="$TMP/remote"
)

run() {
  env "$@" bash "$SCRIPT" >"$out" 2>&1
}

if run "${common[@]}" PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  :
else
  cat "$out"
  fail "correct fixture clone must pass"
fi
grep -q 'RESULT=PASS' "$out" || fail "PASS marker"
[[ "$(git -C "$TMP/home-deploy/cohestra-production" rev-parse HEAD)" == "$SECOND" ]] || fail "clone must pin requested SHA"
pass "correct public-repository fixture clone pins the requested SHA"

if run "${common[@]}" PRODUCTION_BOOTSTRAP_SHA="$FIRST"; then
  :
else
  cat "$out"
  fail "existing correct checkout must accept an ancestor SHA"
fi
[[ "$(git -C "$TMP/home-deploy/cohestra-production" rev-parse HEAD)" == "$FIRST" ]] || fail "second run must reset to requested SHA"
pass "existing correct checkout is reused and reset"

if run "${common[@]}" PRODUCTION_BOOTSTRAP_SHA="$FIRST"; then
  :
else
  cat "$out"
  fail "idempotent second execution must pass"
fi
pass "second execution is idempotent"

git -C "$TMP/home-deploy/cohestra-production" remote set-url origin https://github.com/evil/not-cohestra.git
if run "${common[@]}" PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "wrong origin must be refused"
fi
grep -q 'wrong_origin' "$out" || fail "wrong origin reason"
pass "wrong origin is refused"
git -C "$TMP/home-deploy/cohestra-production" remote set-url origin "$TMP/remote"

mkdir -p "$TMP/dirty/cohestra-production"
echo leftover >"$TMP/dirty/cohestra-production/notes.txt"
if run "${common[@]}" COHESTRA_TEST_DEPLOY_HOME="$TMP/dirty" COHESTRA_TEST_DEPLOY_PATH="$TMP/dirty/cohestra-production" PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "unexpected non-empty directory must be refused"
fi
grep -q 'unexpected_nonempty_directory' "$out" || fail "non-empty directory reason"
[[ -f "$TMP/dirty/cohestra-production/notes.txt" ]] || fail "must not delete unexpected contents"
pass "unexpected non-empty directory is refused without deletion"

for bad in "" HEAD latest main github.sha; do
  if run "${common[@]}" PRODUCTION_BOOTSTRAP_SHA="$bad"; then
    fail "must refuse SHA '${bad:-empty}'"
  fi
  grep -q 'bootstrap_sha_must_be_explicit_40_hex' "$out" || fail "explicit SHA reason for '${bad:-empty}'"
done
pass "empty/HEAD/latest/branch-only SHAs are refused"

if run "${common[@]}" PRODUCTION_BOOTSTRAP_SHA="${SECOND:0:7}"; then
  fail "short SHA must be refused"
fi
pass "short SHA is refused"

if run "${common[@]}" PRODUCTION_BOOTSTRAP_SHA="not-a-sha"; then
  fail "malformed SHA must be refused"
fi
pass "malformed SHA is refused"

if run "${common[@]}" PRODUCTION_BOOTSTRAP_SHA="$SIDE"; then
  fail "SHA not on origin/main must be refused"
fi
grep -q 'bootstrap_sha_not_on_origin_main' "$out" || fail "non-main SHA reason"
pass "SHA not on origin/main is refused"

if run "${common[@]}" COHESTRA_TEST_HOSTNAME=cohestra-uat PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "UAT hostname must be refused"
fi
grep -q 'uat_hostname_forbidden' "$out" || fail "UAT hostname reason"
pass "UAT hostname is refused"

if run "${common[@]}" COHESTRA_TEST_DEPLOY_PATH="$TMP/home-deploy/wrong-path" PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "wrong path must be refused"
fi
grep -q 'deploy_path_must_be_cohestra-production' "$out" || fail "wrong path reason"
pass "wrong path is refused"

if run "${common[@]}" COHESTRA_TEST_DEPLOY_USER=root PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "wrong user must be refused"
fi
grep -q 'deploy_user_must_be_deploy' "$out" || fail "wrong user reason"
pass "wrong user is refused"

if run "${common[@]}" COHESTRA_TEST_DEPLOY_PATH="$TMP/home-deploy/../cohestra-production" PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "path traversal must be refused"
fi
pass "path traversal is refused"

if run "${common[@]}" COHESTRA_TEST_GIT_OWNER=root PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "root-owned checkout must be refused"
fi
grep -q 'root_owned_git_forbidden' "$out" || fail "root-owned git reason"
pass "root-owned checkout is not mutated"

ln -s "$TMP/remote" "$TMP/link-home/cohestra-production" 2>/dev/null || {
  mkdir -p "$TMP/link-home"
  ln -s "$TMP/remote" "$TMP/link-home/cohestra-production"
}
if run "${common[@]}" COHESTRA_TEST_DEPLOY_HOME="$TMP/link-home" COHESTRA_TEST_DEPLOY_PATH="$TMP/link-home/cohestra-production" PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "symlink target must be refused"
fi
grep -q 'symlink_target_forbidden' "$out" || fail "symlink reason"
pass "symlinked target directory is refused"

if run "${common[@]}" COHESTRA_TEST_DEPLOY_HOME=/home/deploy COHESTRA_TEST_DEPLOY_PATH=/home/deploy/cohestra-production PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "test harness must not target the live path"
fi
grep -q 'test_harness_must_not_use_live_path' "$out" || fail "live path reason"
pass "test harness cannot use the live Production path"

if run "${common[@]}" COHESTRA_TEST_REPO_URL=https://github.com/evil/not-cohestra.git PRODUCTION_BOOTSTRAP_SHA="$SECOND"; then
  fail "arbitrary remote URL in the test harness must be refused"
fi
pass "arbitrary remote URL is refused"

set +e
bash "$SCRIPT" >"$out" 2>&1
live_rc=$?
set -e
[[ "$live_rc" -ne 0 ]] || fail "non-root live execution must refuse"
grep -q 'must_run_as_root' "$out" || fail "non-root reason"
pass "live execution refuses unless root"

echo "bootstrap-production-checkout contract OK"
