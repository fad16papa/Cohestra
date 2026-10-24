#!/usr/bin/env bash
# Owner-run Production Docker Engine / Compose prerequisite bootstrap.
# Cursor / Cloud Agent must not execute this against the live Production host.
#
# Privilege policy:
#   - Do not add deploy to group docker (root-equivalent).
#   - Do not grant passwordless sudo.
#   - Do not loosen /var/run/docker.sock.
#   - Do not expose the Docker API on TCP 2375/2376 or any network interface.
#   - deploy remains non-root and non-sudo.
# Story 46.3 only needs CLI version checks and `production-compose.sh config`.
# Privileged container lifecycle belongs to a later explicit Production story.
#
# This script may install and enable the local Docker Engine. It must not
# compose-up, create Cohestra containers/volumes, publish ports, apply schema
# changes, or mutate a database.

set -euo pipefail

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  echo "COMPOSE_UP=false"
  echo "DATABASE_MUTATED=false"
  echo "DEPLOY_USER_IN_DOCKER_GROUP=false"
  echo "DOCKER_TCP_LISTENER=false"
  echo "CONTAINERS_STARTED=false"
  echo "PASSWORDLESS_SUDO=false"
  exit 1
}

CANONICAL_ORIGIN="https://github.com/fad16papa/Cohestra.git"
CANONICAL_USER="deploy"
CANONICAL_HOME="/home/deploy"
CANONICAL_PATH="/home/deploy/cohestra-production"
CANONICAL_HOST="cohestra-production"
UAT_IP="129.212.235.2"
DOCKER_GPG_URL="https://download.docker.com/linux/ubuntu/gpg"
DOCKER_GPG_FINGERPRINT="9DC858229FC7DD38854AE2D88D81803C0EBFCD88"
DOCKER_APT_URI="https://download.docker.com/linux/ubuntu"
DOCKER_KEYRING="/etc/apt/keyrings/docker.asc"
DOCKER_SOURCES="/etc/apt/sources.list.d/docker.sources"
REQUIRED_PACKAGES=(docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin)
CONFLICTING_PACKAGES=(docker.io docker-doc docker-compose docker-compose-v2 docker-buildx podman-docker)

UNDER_TEST=0
if [[ "${COHESTRA_BOOTSTRAP_UNDER_TEST:-}" == "1" ]]; then
  UNDER_TEST=1
fi

if [[ "$UNDER_TEST" -eq 1 ]]; then
  : "${COHESTRA_TEST_HOSTNAME:?test harness requires COHESTRA_TEST_HOSTNAME}"
  : "${COHESTRA_TEST_DEPLOY_USER:?test harness requires COHESTRA_TEST_DEPLOY_USER}"
  : "${COHESTRA_TEST_DEPLOY_HOME:?test harness requires COHESTRA_TEST_DEPLOY_HOME}"
  : "${COHESTRA_TEST_DEPLOY_PATH:?test harness requires COHESTRA_TEST_DEPLOY_PATH}"
  : "${COHESTRA_TEST_OS_RELEASE:?test harness requires COHESTRA_TEST_OS_RELEASE}"
  : "${COHESTRA_TEST_STATE_DIR:?test harness requires COHESTRA_TEST_STATE_DIR}"
  HOSTNAME_NOW="$COHESTRA_TEST_HOSTNAME"
  DEPLOY_USER="$COHESTRA_TEST_DEPLOY_USER"
  DEPLOY_HOME="$COHESTRA_TEST_DEPLOY_HOME"
  DEPLOY_PATH="$COHESTRA_TEST_DEPLOY_PATH"
  OS_RELEASE_FILE="$COHESTRA_TEST_OS_RELEASE"
  KEYRING_PATH="${COHESTRA_TEST_STATE_DIR}/keyrings/docker.asc"
  SOURCES_PATH="${COHESTRA_TEST_STATE_DIR}/sources/docker.sources"
  DAEMON_JSON="${COHESTRA_TEST_STATE_DIR}/docker-daemon.json"
  APT_SOURCES_DIR="${COHESTRA_TEST_STATE_DIR}/apt-sources"
  if [[ "$DEPLOY_PATH" == /home/deploy/* || "$DEPLOY_HOME" == /home/deploy || "$DEPLOY_HOME" == /home/deploy/* ]]; then
    refuse "test_harness_must_not_use_live_path"
  fi
  if [[ "${COHESTRA_TEST_UNAME:-Linux}" != "Linux" ]]; then
    refuse "linux_only"
  fi
  if [[ "${COHESTRA_TEST_EUID:-0}" != "0" ]]; then
    refuse "must_run_as_root"
  fi
else
  if [[ "$(id -u)" -ne 0 ]]; then
    refuse "must_run_as_root"
  fi
  if [[ "$(uname -s)" != "Linux" ]]; then
    refuse "linux_only"
  fi
  HOSTNAME_NOW="$(hostname -s 2>/dev/null || hostname)"
  DEPLOY_USER="$CANONICAL_USER"
  DEPLOY_HOME="$CANONICAL_HOME"
  DEPLOY_PATH="$CANONICAL_PATH"
  OS_RELEASE_FILE="/etc/os-release"
  KEYRING_PATH="$DOCKER_KEYRING"
  SOURCES_PATH="$DOCKER_SOURCES"
  DAEMON_JSON="/etc/docker/daemon.json"
  APT_SOURCES_DIR="/etc/apt/sources.list.d"
fi

if [[ "$HOSTNAME_NOW" == *uat* || "$HOSTNAME_NOW" == *UAT* ]]; then
  refuse "uat_hostname_forbidden"
fi
if [[ "$HOSTNAME_NOW" != "$CANONICAL_HOST" ]]; then
  refuse "hostname_is_not_cohestra-production"
fi

if [[ "$UNDER_TEST" -eq 0 ]] && ip -4 addr show 2>/dev/null | grep -q "$UAT_IP"; then
  refuse "uat_public_ipv4_present_on_host"
fi
if [[ "${COHESTRA_TEST_HAS_UAT_IP:-}" == "1" ]]; then
  refuse "uat_public_ipv4_present_on_host"
fi

if [[ ! -r "$OS_RELEASE_FILE" ]]; then
  refuse "os_release_missing"
fi
# shellcheck disable=SC1090
. "$OS_RELEASE_FILE"
if [[ "${ID:-}" != "ubuntu" ]]; then
  refuse "ubuntu_only"
fi
if [[ "${VERSION_ID:-}" != "24.04" ]]; then
  refuse "ubuntu_24_04_only"
fi

if [[ "$DEPLOY_USER" != "$CANONICAL_USER" ]]; then
  refuse "deploy_user_must_be_deploy"
fi
if [[ "$UNDER_TEST" -eq 0 ]]; then
  if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
    refuse "deploy_user_missing"
  fi
  if [[ ! -d "$DEPLOY_HOME" || ! -d "$DEPLOY_PATH" ]]; then
    refuse "production_checkout_missing"
  fi
  if [[ ! -d "$DEPLOY_PATH/.git" ]]; then
    refuse "production_checkout_missing"
  fi
  origin="$(runuser -u "$DEPLOY_USER" -- git -C "$DEPLOY_PATH" config --get remote.origin.url || true)"
  if [[ "$origin" != "$CANONICAL_ORIGIN" ]]; then
    refuse "wrong_checkout_origin"
  fi
else
  if [[ "${COHESTRA_TEST_DEPLOY_EXISTS:-1}" != "1" ]]; then
    refuse "deploy_user_missing"
  fi
  if [[ "${COHESTRA_TEST_CHECKOUT_EXISTS:-1}" != "1" ]]; then
    refuse "production_checkout_missing"
  fi
  if [[ "${COHESTRA_TEST_CHECKOUT_ORIGIN:-$CANONICAL_ORIGIN}" != "$CANONICAL_ORIGIN" ]]; then
    refuse "wrong_checkout_origin"
  fi
fi

if [[ "$UNDER_TEST" -eq 0 ]] && command -v snap >/dev/null 2>&1 && snap list docker >/dev/null 2>&1; then
  refuse "snap_docker_forbidden"
fi
if [[ "${COHESTRA_TEST_SNAP_DOCKER:-}" == "1" ]]; then
  refuse "snap_docker_forbidden"
fi

pkg_installed() {
  local pkg="$1"
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    [[ -f "${COHESTRA_TEST_STATE_DIR}/installed/${pkg}" ]]
    return
  fi
  dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q 'install ok installed'
}

for pkg in "${CONFLICTING_PACKAGES[@]}"; do
  if pkg_installed "$pkg"; then
    refuse "conflicting_package_${pkg}"
  fi
done

if [[ -f "$DAEMON_JSON" ]] && grep -Eqi 'tcp://|2375|2376|"hosts"' "$DAEMON_JSON"; then
  refuse "docker_tcp_listener_forbidden"
fi

groups_of_deploy() {
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    printf '%s\n' "${COHESTRA_TEST_DEPLOY_GROUPS:-deploy}"
    return
  fi
  id -nG "$DEPLOY_USER"
}

if groups_of_deploy | grep -qw docker; then
  refuse "deploy_must_not_be_in_docker_group"
fi

if [[ "$UNDER_TEST" -eq 0 ]] && grep -RqsE '^[[:space:]]*deploy[[:space:]].*NOPASSWD' /etc/sudoers /etc/sudoers.d 2>/dev/null; then
  refuse "passwordless_sudo_forbidden"
fi
if [[ "${COHESTRA_TEST_PASSWORDLESS_SUDO:-}" == "1" ]]; then
  refuse "passwordless_sudo_forbidden"
fi

official_packages_installed() {
  local pkg
  for pkg in "${REQUIRED_PACKAGES[@]}"; do
    pkg_installed "$pkg" || return 1
  done
  return 0
}

verify_key_fingerprint() {
  local keyfile="$1"
  local fp
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    fp="${COHESTRA_TEST_GPG_FINGERPRINT:-$DOCKER_GPG_FINGERPRINT}"
  else
    fp="$(gpg --show-keys --with-colons "$keyfile" 2>/dev/null | awk -F: '/^fpr:/ {print $10; exit}')"
  fi
  fp="${fp// /}"
  fp="${fp^^}"
  if [[ "$fp" != "$DOCKER_GPG_FINGERPRINT" ]]; then
    rm -f "$keyfile"
    refuse "docker_gpg_fingerprint_mismatch"
  fi
}

sources_are_official() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  grep -q "$DOCKER_APT_URI" "$file" || return 1
  grep -Eqi 'signed-by:' "$file" || return 1
  if grep -Eqi 'get\.docker\.com|http://' "$file"; then
    return 1
  fi
  return 0
}

validate_official_repository() {
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    if [[ "${COHESTRA_TEST_BAD_REPO:-}" == "1" ]]; then
      refuse "unofficial_or_malformed_docker_repository"
    fi
    if [[ "${COHESTRA_TEST_GPG_FINGERPRINT:-$DOCKER_GPG_FINGERPRINT}" != "$DOCKER_GPG_FINGERPRINT" ]]; then
      refuse "docker_gpg_fingerprint_mismatch"
    fi
    return
  fi

  local f
  if [[ -f /etc/apt/sources.list ]] && grep -Eqi 'docker' /etc/apt/sources.list; then
    if ! sources_are_official /etc/apt/sources.list; then
      refuse "unofficial_or_malformed_docker_repository"
    fi
  fi
  shopt -s nullglob
  for f in "$APT_SOURCES_DIR"/*docker* "$APT_SOURCES_DIR"/*Docker*; do
    if ! sources_are_official "$f"; then
      refuse "unofficial_or_malformed_docker_repository"
    fi
  done
  shopt -u nullglob

  if [[ -f "$KEYRING_PATH" ]]; then
    verify_key_fingerprint "$KEYRING_PATH"
  fi
}

write_official_sources() {
  local arch suite
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    arch="${COHESTRA_TEST_ARCH:-amd64}"
  else
    arch="$(dpkg --print-architecture)"
  fi
  suite="${UBUNTU_CODENAME:-${VERSION_CODENAME:-noble}}"
  mkdir -p "$(dirname "$SOURCES_PATH")"
  cat >"$SOURCES_PATH" <<EOF
Types: deb
URIs: ${DOCKER_APT_URI}
Suites: ${suite}
Components: stable
Architectures: ${arch}
Signed-By: ${KEYRING_PATH}
EOF
  if ! sources_are_official "$SOURCES_PATH"; then
    rm -f "$SOURCES_PATH"
    refuse "unofficial_or_malformed_docker_repository"
  fi
}

mark_packages_installed_for_test() {
  mkdir -p "${COHESTRA_TEST_STATE_DIR}/installed"
  local pkg
  for pkg in "${REQUIRED_PACKAGES[@]}"; do
    : >"${COHESTRA_TEST_STATE_DIR}/installed/${pkg}"
  done
}

install_official_docker() {
  validate_official_repository

  if [[ "$UNDER_TEST" -eq 1 ]]; then
    mkdir -p "$(dirname "$KEYRING_PATH")" "$(dirname "$SOURCES_PATH")"
    if [[ ! -f "$KEYRING_PATH" ]]; then
      printf 'TEST-DOCKER-GPG\n' >"$KEYRING_PATH"
    fi
    verify_key_fingerprint "$KEYRING_PATH"
    if [[ ! -f "$SOURCES_PATH" ]]; then
      write_official_sources
    elif ! sources_are_official "$SOURCES_PATH"; then
      refuse "unofficial_or_malformed_docker_repository"
    fi
    mark_packages_installed_for_test
    return
  fi

  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d "$(dirname "$KEYRING_PATH")"
  if [[ ! -f "$KEYRING_PATH" ]]; then
    curl -fsSL --proto '=https' --tlsv1.2 "$DOCKER_GPG_URL" -o "$KEYRING_PATH"
    chmod a+r "$KEYRING_PATH"
  fi
  verify_key_fingerprint "$KEYRING_PATH"

  if [[ ! -f "$SOURCES_PATH" ]]; then
    write_official_sources
  elif ! sources_are_official "$SOURCES_PATH"; then
    refuse "unofficial_or_malformed_docker_repository"
  fi

  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${REQUIRED_PACKAGES[@]}"
}

enable_local_engine() {
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    printf 'enabled\n' >"${COHESTRA_TEST_STATE_DIR}/docker.enabled"
    printf 'active\n' >"${COHESTRA_TEST_STATE_DIR}/docker.active"
    printf 'enabled\n' >"${COHESTRA_TEST_STATE_DIR}/containerd.enabled"
    printf 'active\n' >"${COHESTRA_TEST_STATE_DIR}/containerd.active"
    return
  fi
  systemctl enable docker containerd
  systemctl start docker containerd
}

service_state() {
  local unit="$1" query="$2"
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    cat "${COHESTRA_TEST_STATE_DIR}/${unit}.${query}"
    return
  fi
  systemctl "is-${query}" "$unit"
}

cli_version() {
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    echo "Docker version test"
    return
  fi
  docker --version
}

compose_version() {
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    echo "Docker Compose version test"
    return
  fi
  docker compose version
}

as_deploy() {
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    case "${1:-}" in
      docker)
        if [[ "${2:-}" == "--version" ]]; then
          echo "Docker version test"
          return 0
        fi
        if [[ "${2:-}" == "compose" && "${3:-}" == "version" ]]; then
          echo "Docker Compose version test"
          return 0
        fi
        echo "REFUSE: unexpected docker invocation under test: $*" >&2
        return 1
        ;;
      bash|env)
        echo "compose config OK (test harness)"
        return 0
        ;;
      *)
        echo "REFUSE: unexpected command under test: $*" >&2
        return 1
        ;;
    esac
  fi
  runuser -u "$DEPLOY_USER" -- "$@"
}

assert_no_tcp_listener() {
  if [[ -f "$DAEMON_JSON" ]] && grep -Eqi 'tcp://|2375|2376|"hosts"' "$DAEMON_JSON"; then
    refuse "docker_tcp_listener_forbidden"
  fi
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    if [[ "${COHESTRA_TEST_TCP_LISTENER:-}" == "1" ]]; then
      refuse "docker_tcp_listener_forbidden"
    fi
    return
  fi
  if command -v ss >/dev/null 2>&1; then
    if ss -lnt 'sport = :2375 or sport = :2376' | grep -q LISTEN; then
      refuse "docker_tcp_listener_forbidden"
    fi
  fi
}

assert_no_workloads() {
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    if [[ "${COHESTRA_TEST_FOREIGN_CONTAINERS:-}" == "1" ]]; then
      refuse "unexpected_containers_present"
    fi
    return
  fi
  if docker info >/dev/null 2>&1; then
    if [[ -n "$(docker ps -aq)" ]]; then
      refuse "unexpected_containers_present"
    fi
    if docker network ls --format '{{.Name}}' | grep -Eq 'cohestra_uat_|cohestra_production_|lead-generation-crm'; then
      refuse "unexpected_compose_networks_present"
    fi
  fi
}

assert_socket_restricted() {
  if [[ "$UNDER_TEST" -eq 1 ]]; then
    return
  fi
  if [[ -S /var/run/docker.sock ]]; then
    local mode owner group
    mode="$(stat -c '%a' /var/run/docker.sock)"
    owner="$(stat -c '%U' /var/run/docker.sock)"
    group="$(stat -c '%G' /var/run/docker.sock)"
    if [[ "$mode" != "660" && "$mode" != "600" ]]; then
      refuse "docker_socket_permissions_unexpected"
    fi
    if [[ "$owner" != "root" ]]; then
      refuse "docker_socket_owner_unexpected"
    fi
    if [[ "$group" != "docker" && "$group" != "root" ]]; then
      refuse "docker_socket_group_unexpected"
    fi
  fi
}

validate_official_repository

if ! official_packages_installed; then
  install_official_docker
else
  validate_official_repository
fi
if ! official_packages_installed; then
  refuse "docker_packages_missing"
fi

enable_local_engine
[[ "$(service_state docker enabled)" == enabled ]] || refuse "docker_not_enabled"
[[ "$(service_state docker active)" == active ]] || refuse "docker_not_active"
[[ "$(service_state containerd enabled)" == enabled ]] || refuse "containerd_not_enabled"
[[ "$(service_state containerd active)" == active ]] || refuse "containerd_not_active"

assert_no_tcp_listener
assert_socket_restricted
assert_no_workloads

if groups_of_deploy | grep -qw docker; then
  refuse "deploy_must_not_be_in_docker_group"
fi

ENGINE_VER="$(cli_version)"
COMPOSE_VER="$(compose_version)"
as_deploy docker --version >/dev/null
as_deploy docker compose version >/dev/null

compose_helper=""
if [[ "$UNDER_TEST" -eq 1 ]]; then
  compose_helper="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/deploy/lib/production-compose-config-placeholders.sh"
else
  compose_helper="$DEPLOY_PATH/deploy/lib/production-compose-config-placeholders.sh"
fi
if [[ ! -f "$compose_helper" ]]; then
  refuse "compose_placeholder_helper_missing"
fi
# shellcheck disable=SC1090
. "$compose_helper"
if [[ "$UNDER_TEST" -eq 1 ]]; then
  if ! production_compose_assert_placeholder_contract \
    "${COHESTRA_TEST_COMPOSE_FILE:-$(production_compose_file)}"; then
    refuse "compose_placeholder_contract_drift"
  fi
else
  if ! production_compose_assert_placeholder_contract "$DEPLOY_PATH/docker-compose.production.yml"; then
    refuse "compose_placeholder_contract_drift"
  fi
fi
# Process-only. Never write .env. production-compose.sh config applies the
# same canonical placeholders for any still-missing ${VAR:?} names.
if [[ ! -f "$DEPLOY_PATH/.env" ]]; then
  production_compose_apply_config_placeholders
fi

if [[ "$UNDER_TEST" -eq 1 ]]; then
  as_deploy bash "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/deploy/production-compose.sh" config >/dev/null
  COMPOSE_CONFIG="pass"
else
  set +e
  as_deploy bash "$DEPLOY_PATH/deploy/production-compose.sh" config >/dev/null
  compose_rc=$?
  set -e
  if [[ "$compose_rc" -ne 0 ]]; then
    refuse "production_compose_config_failed"
  fi
  COMPOSE_CONFIG="pass"
fi

echo "RESULT=PASS"
echo "DOCKER_RUNTIME=installed"
echo "DOCKER_SOURCE=official_apt_download.docker.com"
echo "COMPOSE_METHOD=docker-compose-plugin"
echo "ENGINE_VERSION_RECORDED=true"
echo "COMPOSE_VERSION_RECORDED=true"
echo "COMPOSE_CONFIG=${COMPOSE_CONFIG}"
echo "DEPLOY_USER_IN_DOCKER_GROUP=false"
echo "PASSWORDLESS_SUDO=false"
echo "DOCKER_TCP_LISTENER=false"
echo "CONTAINERS_STARTED=false"
echo "COMPOSE_UP=false"
echo "DATABASE_MUTATED=false"
echo "FIREWALL_CHANGED=false"
echo
echo "Docker prerequisite only. Do not compose-up, migrate, or start Cohestra services."
echo "deploy is intentionally not in group docker. Socket access is root-equivalent."
echo "Cursor must not become the Production SSH client."
# Versions are sanitized names only; do not dump daemon JSON.
echo "ENGINE_CLI=${ENGINE_VER}"
echo "COMPOSE_CLI=${COMPOSE_VER}"
