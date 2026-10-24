#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/deploy/bootstrap-production-docker.sh"
COMPOSE_WRAPPER="$ROOT_DIR/deploy/production-compose.sh"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -x "$SCRIPT" ]] || fail "bootstrap-production-docker.sh must be executable"
[[ -f "$COMPOSE_WRAPPER" ]] || fail "production-compose.sh missing"

if grep -qE 'curl[[:space:]].*\|[[:space:]]*(ba)?sh|wget[[:space:]].*\|[[:space:]]*(ba)?sh|get\.docker\.com' "$SCRIPT"; then
  fail "bootstrap must not use curl|sh or the Docker convenience installer"
fi
if grep -qE 'snap[[:space:]]+install[[:space:]]+docker|podman[[:space:]]+compose' "$SCRIPT"; then
  fail "bootstrap must not install Snap Docker or Podman shims"
fi
if grep -qE 'apt-get install .*podman-docker|apt-get install .*docker.io' "$SCRIPT"; then
  fail "bootstrap must not apt-install conflicting Docker packages"
fi
if grep -qE 'usermod|gpasswd|newgrp' "$SCRIPT"; then
  fail "bootstrap must not change group membership"
fi
if grep -qE 'NOPASSWD|sudoers' "$SCRIPT" && grep -qE 'echo .*deploy ALL|tee .*/sudoers' "$SCRIPT"; then
  fail "bootstrap must not grant passwordless sudo"
fi
if grep -qE 'chmod[[:space:]].*docker\.sock|chown[[:space:]].*docker\.sock' "$SCRIPT"; then
  fail "bootstrap must not loosen docker.sock"
fi
if grep -qE 'tcp://|2375|2376' "$SCRIPT" && ! grep -q 'docker_tcp_listener_forbidden' "$SCRIPT"; then
  fail "TCP Docker listener references must only refuse"
fi
if grep -qE 'hosts?[[:space:]]*[:=].*tcp|fd://' "$SCRIPT"; then
  fail "bootstrap must not configure a Docker TCP/fd host"
fi
if grep -qE 'compose[[:space:]]+up|docker[[:space:]]+compose[[:space:]]+up|docker[[:space:]]+run\b|docker[[:space:]]+start\b' "$SCRIPT"; then
  fail "bootstrap must not start compose or containers"
fi
if grep -qE '(^|[[:space:]])(psql|pg_restore|pg_dump|alembic)([[:space:]]|$)' "$SCRIPT"; then
  fail "bootstrap must not mutate a database"
fi
if grep -qE '\bufw\b|\biptables\b|\bnft\b|firewall-cmd|tailscale\b|sshd' "$SCRIPT"; then
  fail "bootstrap must not alter firewall, Tailscale, or SSH"
fi
grep -q 'download.docker.com/linux/ubuntu' "$SCRIPT" || fail "official Docker apt URI missing"
grep -q 'docker-compose-plugin' "$SCRIPT" || fail "compose plugin package missing"
grep -q '9DC858229FC7DD38854AE2D88D81803C0EBFCD88' "$SCRIPT" || fail "official Docker GPG fingerprint missing"
grep -q 'deploy_must_not_be_in_docker_group' "$SCRIPT" || fail "docker-group privilege policy missing"
grep -q 'docker info' "$COMPOSE_WRAPPER" || fail "production-compose.sh must gate daemon probes on docker info"
pass "script forbids convenience install, docker-group, TCP API, compose-up, and DB/firewall mutation"

out="$(mktemp)"
TMP="$(mktemp -d)"
trap 'rm -f "$out"; rm -rf "$TMP"' EXIT

mkdir -p "$TMP/bin" "$TMP/home-deploy/cohestra-production"
cat >"$TMP/os-release" <<'EOF'
ID=ubuntu
VERSION_ID=24.04
VERSION_CODENAME=noble
UBUNTU_CODENAME=noble
EOF
cat >"$TMP/os-debian" <<'EOF'
ID=debian
VERSION_ID=12
EOF
cat >"$TMP/os-jammy" <<'EOF'
ID=ubuntu
VERSION_ID=22.04
VERSION_CODENAME=jammy
EOF

for cmd in apt-get apt curl snap usermod gpasswd newgrp systemctl ufw iptables nft tailscale visudo psql pg_dump pg_restore; do
  cat >"$TMP/bin/$cmd" <<EOF
#!/usr/bin/env bash
echo "UNEXPECTED_HOST_MUTATION=\$0 \$*" >> "${TMP}/mutations.log"
exit 99
EOF
  chmod +x "$TMP/bin/$cmd"
done

common=(
  PATH="$TMP/bin:$PATH"
  COHESTRA_BOOTSTRAP_UNDER_TEST=1
  COHESTRA_TEST_HOSTNAME=cohestra-production
  COHESTRA_TEST_DEPLOY_USER=deploy
  COHESTRA_TEST_DEPLOY_HOME="$TMP/home-deploy"
  COHESTRA_TEST_DEPLOY_PATH="$TMP/home-deploy/cohestra-production"
  COHESTRA_TEST_OS_RELEASE="$TMP/os-release"
  COHESTRA_TEST_STATE_DIR="$TMP/state"
)

run() {
  mkdir -p "$TMP/state"
  env "$@" bash "$SCRIPT" >"$out" 2>&1
}

expect_refuse() {
  local reason="$1"
  local label="$2"
  if run "${common[@]}" "${@:3}"; then
    cat "$out"
    fail "$label must be refused"
  fi
  grep -q "REFUSE_REASON=$reason" "$out" || { cat "$out"; fail "$label reason"; }
  grep -q 'COMPOSE_UP=false' "$out" || fail "$label must record COMPOSE_UP=false"
  grep -q 'DATABASE_MUTATED=false' "$out" || fail "$label must record DATABASE_MUTATED=false"
  [[ ! -f "$TMP/mutations.log" ]] || fail "$label must not invoke host mutation stubs"
  pass "$label"
}

if run "${common[@]}"; then
  :
else
  cat "$out"
  fail "correct Ubuntu Production fixture must pass"
fi
grep -q 'RESULT=PASS' "$out" || fail "PASS marker"
grep -q 'DOCKER_SOURCE=official_apt_download.docker.com' "$out" || fail "official source marker"
grep -q 'COMPOSE_METHOD=docker-compose-plugin' "$out" || fail "compose plugin marker"
grep -q 'DEPLOY_USER_IN_DOCKER_GROUP=false' "$out" || fail "docker group must stay false"
grep -q 'PASSWORDLESS_SUDO=false' "$out" || fail "passwordless sudo must stay false"
grep -q 'DOCKER_TCP_LISTENER=false' "$out" || fail "TCP listener must stay false"
grep -q 'CONTAINERS_STARTED=false' "$out" || fail "containers must stay false"
grep -q 'COMPOSE_UP=false' "$out" || fail "compose up must stay false"
grep -q 'DATABASE_MUTATED=false' "$out" || fail "database must stay false"
for pkg in docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin; do
  [[ -f "$TMP/state/installed/$pkg" ]] || fail "absent-install path must record $pkg"
done
grep -q 'https://download.docker.com/linux/ubuntu' "$TMP/state/sources/docker.sources" || fail "official sources file"
[[ ! -f "$TMP/mutations.log" ]] || fail "absent-install path must not call apt/curl/systemctl stubs"
pass "correct Ubuntu Production host installs official packages via fixtures"

if run "${common[@]}"; then
  :
else
  cat "$out"
  fail "idempotent second execution must pass"
fi
grep -q 'RESULT=PASS' "$out" || fail "idempotent PASS"
[[ ! -f "$TMP/mutations.log" ]] || fail "idempotent path must not mutate the host"
pass "already-installed / idempotent path returns PASS"

expect_refuse hostname_is_not_cohestra-production "wrong hostname" COHESTRA_TEST_HOSTNAME=cohestra-staging
expect_refuse uat_hostname_forbidden "UAT hostname" COHESTRA_TEST_HOSTNAME=cohestra-uat
expect_refuse uat_public_ipv4_present_on_host "UAT IPv4" COHESTRA_TEST_HAS_UAT_IP=1
expect_refuse must_run_as_root "non-root" COHESTRA_TEST_EUID=1000
expect_refuse linux_only "unsupported kernel" COHESTRA_TEST_UNAME=Darwin
expect_refuse ubuntu_only "unsupported OS family" COHESTRA_TEST_OS_RELEASE="$TMP/os-debian"
expect_refuse ubuntu_24_04_only "unsupported Ubuntu" COHESTRA_TEST_OS_RELEASE="$TMP/os-jammy"
expect_refuse deploy_user_missing "missing deploy user" COHESTRA_TEST_DEPLOY_EXISTS=0
expect_refuse production_checkout_missing "missing Production checkout" COHESTRA_TEST_CHECKOUT_EXISTS=0
expect_refuse wrong_checkout_origin "wrong checkout origin" COHESTRA_TEST_CHECKOUT_ORIGIN=https://github.com/evil/not-cohestra.git
expect_refuse unofficial_or_malformed_docker_repository "malformed Docker repository" COHESTRA_TEST_BAD_REPO=1
expect_refuse docker_gpg_fingerprint_mismatch "replaced Docker signing key" COHESTRA_TEST_GPG_FINGERPRINT=0000000000000000000000000000000000000000
expect_refuse deploy_must_not_be_in_docker_group "deploy in docker group" COHESTRA_TEST_DEPLOY_GROUPS="deploy docker"
expect_refuse passwordless_sudo_forbidden "passwordless sudo" COHESTRA_TEST_PASSWORDLESS_SUDO=1
expect_refuse docker_tcp_listener_forbidden "Docker TCP listener" COHESTRA_TEST_TCP_LISTENER=1
expect_refuse unexpected_containers_present "foreign containers" COHESTRA_TEST_FOREIGN_CONTAINERS=1
expect_refuse snap_docker_forbidden "Snap Docker" COHESTRA_TEST_SNAP_DOCKER=1
expect_refuse test_harness_must_not_use_live_path "live Production path" \
  COHESTRA_TEST_DEPLOY_HOME=/home/deploy \
  COHESTRA_TEST_DEPLOY_PATH=/home/deploy/cohestra-production

mkdir -p "$TMP/state-conflict/installed"
: >"$TMP/state-conflict/installed/docker.io"
if run "${common[@]}" COHESTRA_TEST_STATE_DIR="$TMP/state-conflict"; then
  fail "conflicting docker.io must be refused"
fi
grep -q 'conflicting_package_docker.io' "$out" || fail "conflicting package reason"
pass "conflicting unsupported Docker package is refused"

mkdir -p "$TMP/state-tcp"
printf '{ "hosts": ["tcp://0.0.0.0:2375"] }\n' >"$TMP/state-tcp/docker-daemon.json"
if run "${common[@]}" COHESTRA_TEST_STATE_DIR="$TMP/state-tcp"; then
  fail "daemon.json TCP hosts must be refused"
fi
grep -q 'docker_tcp_listener_forbidden' "$out" || fail "daemon.json TCP reason"
pass "daemon.json TCP listener is refused"

set +e
bash "$SCRIPT" >"$out" 2>&1
live_rc=$?
set -e
[[ "$live_rc" -ne 0 ]] || fail "non-root live execution must refuse"
grep -q 'must_run_as_root' "$out" || fail "non-root live reason"
pass "live execution refuses unless root"

# Socket-less Story 46.3 dry-run: docker info fails, compose config still works.
mkdir -p "$TMP/mock-docker"
cat >"$TMP/mock-docker/docker" <<'EOF'
#!/usr/bin/env bash
log="${COHESTRA_TEST_DOCKER_LOG:?}"
printf '%s\n' "$*" >>"$log"
if [[ "${1:-}" == "info" ]]; then
  echo "ERROR: Cannot connect to the Docker daemon" >&2
  exit 1
fi
if [[ "${1:-}" == "--version" ]]; then
  echo "Docker version 27.0.0, build test"
  exit 0
fi
if [[ "${1:-}" == "compose" && "${2:-}" == "version" ]]; then
  echo "Docker Compose version v2.29.0"
  exit 0
fi
if [[ " $* " == *" up "* ]]; then
  echo "REFUSE: compose up must not run" >&2
  exit 1
fi
if [[ "${1:-}" == "compose" ]] && [[ " $* " == *" config "* ]]; then
  echo "name: cohestra-production"
  exit 0
fi
echo "REFUSE: unexpected docker invocation: $*" >&2
exit 1
EOF
chmod +x "$TMP/mock-docker/docker"
: >"$TMP/docker-invocations.log"
set +e
PATH="$TMP/mock-docker:$PATH" \
  POSTGRES_PASSWORD=bootstrap-config-check-not-a-secret \
  REDIS_PASSWORD=bootstrap-config-check-not-a-secret \
  JWT_SIGNING_KEY=bootstrap-config-check-not-a-secret-32 \
  PUBLIC_BASE_URL=http://127.0.0.1 \
  COHESTRA_TEST_DOCKER_LOG="$TMP/docker-invocations.log" \
  bash "$COMPOSE_WRAPPER" config >"$out" 2>&1
compose_rc=$?
set -e
[[ "$compose_rc" -eq 0 ]] || { cat "$out"; fail "production-compose.sh config must succeed without a Docker socket"; }
grep -q 'compose config OK' "$out" || fail "compose config success marker"
if grep -Eq '(^| )up( |$)' "$TMP/docker-invocations.log"; then
  fail "production-compose.sh config must not invoke compose up"
fi
if grep -q 'network inspect' "$TMP/docker-invocations.log"; then
  fail "daemon probes must be skipped when docker info fails"
fi
pass "production-compose.sh config succeeds without Docker socket privilege"

echo "bootstrap-production-docker contract OK"
