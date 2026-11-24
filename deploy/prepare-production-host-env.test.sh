#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/prepare-production-host-env.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

out="$(mktemp)"
tmp_env="$(mktemp -p /tmp cohestra-46-4-env.XXXXXX)"
work="$(mktemp -d)"
trap 'rm -f "$out" "$tmp_env"; rm -rf "$work"' EXIT

if [[ -e "$ROOT_DIR/.env" || -L "$ROOT_DIR/.env" ]]; then
  fail "repository .env must not exist before this test"
fi

if ! bash "$SCRIPT" --print-procedure >"$out"; then
  fail "procedure must print"
fi
grep -q 'cp .env.production.example .env' "$out" || fail "procedure copy step"
grep -q 'NO-GO' "$out" || fail "procedure NO-GO"
grep -q 'LIVE CHECK=BLOCKED' "$out" || fail "procedure must mark the live check blocked"
grep -q '7e1cf5d48064b28a831ba20b25ac06d27e1a17fc' "$out" || fail "procedure must name the recorded checkout"
grep -q 'does not contain this' "$out" || fail "procedure must say the recorded checkout lacks the validator"
grep -q 'No authorized procedure currently updates that checkout' "$out" || fail "procedure must state no authorized checkout update"
grep -q 'Do not run the host commands below on that' "$out" || fail "procedure must not present the validator as runnable on the recorded checkout"
if grep -qiE 'SG\.[A-Za-z0-9]|BEGIN (OPENSSH |RSA )?PRIVATE KEY|pdl_' "$out"; then
  fail "procedure leaked a secret-like value"
fi
pass "print-procedure is names-only"

if ! bash "$SCRIPT" --check-template >"$out"; then
  fail "template check must pass"
fi
grep -q 'TEMPLATE=names_only' "$out" || fail "template marker"
pass "template names are present"

if bash "$SCRIPT" --check-names "$ROOT_DIR/.env.production.example" >"$out" 2>&1; then
  fail "must refuse paths inside the git worktree"
fi
grep -q 'REFUSE' "$out" || fail "worktree refuse marker"
pass "refuses in-repo paths"

if bash "$SCRIPT" --write >"$out" 2>&1; then
  fail "--write must refuse"
fi
grep -q 'REFUSE' "$out" || fail "write refuse marker"
pass "refuses --write"

cat >"$tmp_env" <<'EOF'
POSTGRES_PASSWORD=synthetic-host-postgres-aaaa
REDIS_PASSWORD=synthetic-host-redis-bbbb
JWT_SIGNING_KEY=synthetic-host-jwt-signing-key-32xx
SendGrid__ApiKey=SG.syntheticHostKeyIndependent
SendGrid__FromEmail=noreply@cohestra.app
PUBLIC_BASE_URL=https://cohestra.app
OperatorSeed__Enabled=false
DEV_TENANT_SLUG=
EOF

if ! bash "$SCRIPT" --check-names "$tmp_env" >"$out"; then
  fail "synthetic host env should pass name check"
fi
grep -q 'HOST_ENV_NAMES=present' "$out" || fail "present marker"
if grep -q 'synthetic-host' "$out" || grep -q 'SG.synthetic' "$out"; then
  fail "must not print host env values"
fi
pass "outside-repo synthetic host env names pass without values"

cat >"$tmp_env" <<'EOF'
POSTGRES_PASSWORD=crm
REDIS_PASSWORD=synthetic-host-redis-bbbb
JWT_SIGNING_KEY=synthetic-host-jwt-signing-key-32xx
SendGrid__ApiKey=SG.syntheticHostKeyIndependent
SendGrid__FromEmail=noreply@cohestra.app
PUBLIC_BASE_URL=https://cohestra.app
EOF

if bash "$SCRIPT" --check-names "$tmp_env" >"$out" 2>&1; then
  fail "placeholder postgres password must fail"
fi
grep -q 'PLACEHOLDER_SECRET=POSTGRES_PASSWORD' "$out" || fail "placeholder name"
if grep -q 'crm' "$out"; then
  fail "must not print placeholder value"
fi
pass "placeholder secrets fail closed without values"

cat >"$tmp_env" <<'EOF'
POSTGRES_PASSWORD=synthetic-host-postgres-aaaa
REDIS_PASSWORD=synthetic-host-redis-bbbb
JWT_SIGNING_KEY=synthetic-host-jwt-signing-key-32xx
SendGrid__ApiKey=SG.syntheticHostKeyIndependent
SendGrid__FromEmail=noreply@cohestra.app
PUBLIC_BASE_URL=https://uat.cohestra.app
EOF

if bash "$SCRIPT" --check-names "$tmp_env" >"$out" 2>&1; then
  fail "UAT public URL must fail"
fi
grep -q 'INVALID_PUBLIC_BASE_URL_HOST' "$out" || fail "UAT host marker"
pass "UAT PUBLIC_BASE_URL is rejected"

cat >"$tmp_env" <<'EOF'
POSTGRES_PASSWORD=synthetic-host-postgres-aaaa
REDIS_PASSWORD=synthetic-host-redis-bbbb
JWT_SIGNING_KEY=synthetic-host-jwt-signing-key-32xx
SendGrid__ApiKey=SG.syntheticHostKeyIndependent
SendGrid__FromEmail=noreply@cohestra.app
PUBLIC_BASE_URL=https://example.com
EOF

if bash "$SCRIPT" --check-names "$tmp_env" >"$out" 2>&1; then
  fail "foreign https host must fail"
fi
grep -q 'INVALID_PUBLIC_BASE_URL_HOST' "$out" || fail "foreign host marker"
pass "non-apex PUBLIC_BASE_URL is rejected"

if bash "$SCRIPT" --check-names .env >"$out" 2>&1; then
  fail "relative path must fail"
fi
grep -q 'REFUSE: --check-names requires an absolute path.' "$out" || fail "relative path marker"
pass "relative path is refused"

if bash "$SCRIPT" --check-names "$ROOT_DIR/.env" >"$out" 2>&1; then
  fail "missing canonical .env must fail"
fi
grep -q 'REFUSE: host env file is missing.' "$out" || fail "missing canonical marker"
if grep -q 'will not inspect a path inside the git worktree' "$out"; then
  fail "missing canonical .env must not use the blanket worktree refusal"
fi
[[ ! -e "$ROOT_DIR/.env" && ! -L "$ROOT_DIR/.env" ]] || fail "missing check created a repository .env"
pass "missing checkout-root .env fails closed without creating it"

write_valid_env() {
  cat >"$1" <<'EOF'
POSTGRES_PASSWORD=synthetic-host-postgres-aaaa
REDIS_PASSWORD=synthetic-host-redis-bbbb
JWT_SIGNING_KEY=synthetic-host-jwt-signing-key-32xx
SendGrid__ApiKey=SG.syntheticHostKeyIndependent
SendGrid__FromEmail=noreply@cohestra.app
PUBLIC_BASE_URL=https://cohestra.app
EOF
}

assert_values_hidden() {
  if grep -q 'synthetic-host' "$out" || grep -q 'SG.synthetic' "$out" || grep -q 'MUST_NOT_APPEAR_IN_OUTPUT' "$out"; then
    fail "$1"
  fi
}

assert_not_opened() {
  if grep -q 'MISSING_SECRET=' "$out" || grep -q 'HOST_ENV_NAMES=present' "$out" || grep -q 'PLACEHOLDER_SECRET=' "$out"; then
    fail "$1"
  fi
}

prepare_fixture() {
  local dir="$1"
  local ignore_body="$2"
  rm -rf "$dir"
  mkdir -p "$dir/deploy"
  cp "$SCRIPT" "$dir/deploy/prepare-production-host-env.sh"
  printf '%s\n' "$ignore_body" > "$dir/.gitignore"
  git -C "$dir" init -q -b main
  git -C "$dir" config user.email "46-4-test@example.com"
  git -C "$dir" config user.name "46-4 test"
  git -C "$dir" add .gitignore
  git -C "$dir" commit -qm "gitignore"
}

fixture="$work/repo"
prepare_fixture "$fixture" ".env"
write_valid_env "$fixture/.env"
fixture_script="$fixture/deploy/prepare-production-host-env.sh"
if ! bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "gitignored checkout-root .env must pass name check"
fi
grep -q 'HOST_ENV_NAMES=present' "$out" || fail "canonical present marker"
grep -q 'OWNER_GATE=owner_classified_verification_still_required' "$out" || fail "canonical check must not claim live verification"
assert_values_hidden "canonical check printed a value"
pass "checkout-root .env passes when untracked and ignored by the repository .gitignore"

if ! bash "$fixture_script" --check-names "$fixture/deploy/../.env" >"$out" 2>&1; then
  fail "normalized checkout-root .env must pass"
fi
grep -q 'HOST_ENV_NAMES=present' "$out" || fail "normalized path marker"
assert_values_hidden "normalized path printed a value"
pass "deploy/../.env is the same checkout-root file"

rm -f "$fixture/.env"
if bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "absent fixture .env must fail"
fi
grep -q 'REFUSE: host env file is missing.' "$out" || fail "fixture missing marker"
if grep -q 'will not inspect a path inside the git worktree' "$out"; then
  fail "absent fixture .env must not use the blanket worktree refusal"
fi
pass "absent checkout-root .env reports missing"

write_valid_env "$fixture/.env"
for other in "$fixture/.env.production" "$fixture/.env.production.example" "$fixture/deploy/.env"; do
  printf 'MUST_NOT_APPEAR_IN_OUTPUT=1\n' > "$other"
  if bash "$fixture_script" --check-names "$other" >"$out" 2>&1; then
    fail "non-canonical worktree path must fail"
  fi
  grep -q 'REFUSE: will not inspect a path inside the git worktree.' "$out" || fail "non-canonical worktree marker"
  assert_values_hidden "non-canonical path was read"
  assert_not_opened "non-canonical path reached the content check"
done
outside_marker="$work/outside-marker"
printf 'MUST_NOT_APPEAR_IN_OUTPUT=1\n' > "$outside_marker"
ln -s "$outside_marker" "$fixture/deploy/outside-link"
if bash "$fixture_script" --check-names "$fixture/deploy/outside-link" >"$out" 2>&1; then
  fail "worktree symlink must fail"
fi
grep -q 'REFUSE: will not inspect a path inside the git worktree.' "$out" || fail "worktree symlink marker"
assert_values_hidden "worktree symlink target was read"
assert_not_opened "worktree symlink reached the content check"
pass "other worktree paths stay refused"

rm -f "$fixture/.env"
ln -s "$fixture/deploy/.env" "$fixture/.env"
if bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "symlink .env must fail"
fi
grep -q 'REFUSE: canonical .env must be a regular non-symlink file.' "$out" || fail "symlink marker"
assert_values_hidden "symlink target was read"
assert_not_opened "symlink reached the content check"
rm -f "$fixture/.env"
pass "symlink checkout-root .env is refused"

write_valid_env "$fixture/.env"
git -C "$fixture" add -f .env
git -C "$fixture" commit -qm "track env"
if bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "tracked .env must fail"
fi
grep -q 'REFUSE: canonical .env is tracked.' "$out" || fail "tracked marker"
assert_values_hidden "tracked .env was read"
assert_not_opened "tracked .env reached the content check"
pass "tracked checkout-root .env is refused"

prepare_fixture "$fixture" ".env"
write_valid_env "$fixture/.env"
git_stub="$work/git-stub"
mkdir -p "$git_stub"
real_git="$(command -v git)"
git_log="$work/git-calls"
rm -f "$git_log"
cat > "$git_stub/git" <<EOF
#!/usr/bin/env bash
printf '%s\\n' "\$*" >> $(printf '%q' "$git_log")
for arg in "\$@"; do
  if [[ "\$arg" == "ls-files" ]]; then
    echo "fatal: simulated index error" >&2
    exit 128
  fi
done
exec $(printf '%q' "$real_git") "\$@"
EOF
chmod +x "$git_stub/git"
if PATH="$git_stub:$PATH" bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "unexpected git ls-files error must fail closed"
fi
grep -q 'REFUSE: canonical .env tracked-file check failed.' "$out" || fail "git error marker"
if grep -q 'fatal:' "$out" || grep -q 'simulated index error' "$out"; then
  fail "git error text was not sanitized"
fi
assert_values_hidden "git error path was read"
assert_not_opened "git error reached the content check"
grep -q 'rev-parse' "$git_log" || fail "other git checks must still run"
if grep -q 'check-ignore' "$git_log"; then
  fail "gitignore check must not run after a git index error"
fi
pass "unexpected git ls-files error is refused before content validation"

prepare_fixture "$fixture" ".env"
write_valid_env "$fixture/.env"
git -C "$fixture" add -f .env
git -C "$fixture" commit -qm "track env"
rm -f "$fixture/.git/index"
if bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "missing index must not treat a committed .env as untracked"
fi
grep -q 'REFUSE: canonical .env is tracked.' "$out" || fail "missing-index tracked marker"
assert_values_hidden "missing-index .env was read"
assert_not_opened "missing-index .env reached the content check"
pass "missing index still refuses a committed .env"

prepare_fixture "$fixture" ".env"
write_valid_env "$fixture/.env"
echo aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa > "$fixture/.git/refs/heads/main"
if bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "dangling HEAD must not be treated as an untracked .env"
fi
grep -q 'REFUSE: canonical .env tracked-file check failed.' "$out" || fail "dangling HEAD marker"
if grep -q 'fatal:' "$out" || grep -q 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' "$out"; then
  fail "dangling HEAD error was not sanitized"
fi
assert_values_hidden "dangling HEAD .env was read"
assert_not_opened "dangling HEAD .env reached the content check"
pass "dangling HEAD is refused before content validation"

prepare_fixture "$fixture" "*.log"
write_valid_env "$fixture/.env"
printf '.env\n' > "$work/global-ignore"
if GIT_CONFIG_COUNT=1 \
  GIT_CONFIG_KEY_0=core.excludesFile \
  GIT_CONFIG_VALUE_0="$work/global-ignore" \
  bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "global ignore alone must not qualify"
fi
grep -q 'REFUSE: canonical .env is not ignored by the repository .gitignore.' "$out" || fail "global-only marker"
assert_values_hidden "global-only .env was read"
assert_not_opened "global-only .env reached the content check"
pass "global ignore alone is refused"

mkdir -p "$fixture/.git/info"
printf '.env\n' > "$fixture/.git/info/exclude"
if bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "info/exclude alone must not qualify"
fi
grep -q 'REFUSE: canonical .env is not ignored by the repository .gitignore.' "$out" || fail "exclude-only marker"
assert_values_hidden "exclude-only .env was read"
assert_not_opened "exclude-only .env reached the content check"
pass ".git/info/exclude alone is refused"

prepare_fixture "$fixture" $'.env\n!.env'
write_valid_env "$fixture/.env"
if bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "negated repository rule must not qualify"
fi
grep -q 'REFUSE: canonical .env is not ignored by the repository .gitignore.' "$out" || fail "negation marker"
assert_values_hidden "negated .env was read"
assert_not_opened "negated .env reached the content check"
pass "repository .gitignore negation is refused"

prepare_fixture "$fixture" ".env"
write_valid_env "$fixture/.env"
printf '.env\n' > "$work/global-ignore"
if ! GIT_CONFIG_COUNT=1 \
  GIT_CONFIG_KEY_0=core.excludesFile \
  GIT_CONFIG_VALUE_0="$work/global-ignore" \
  bash "$fixture_script" --check-names "$fixture/.env" >"$out" 2>&1; then
  fail "repository .gitignore must still qualify when a global rule also matches"
fi
grep -q 'HOST_ENV_NAMES=present' "$out" || fail "repo-and-global marker"
assert_values_hidden "repo-and-global check printed a value"
pass "repository .gitignore qualifies even if a global rule also matches"

[[ ! -e "$ROOT_DIR/.env" && ! -L "$ROOT_DIR/.env" ]] || fail "tests created a repository .env"

echo "prepare-production-host-env contract OK"
