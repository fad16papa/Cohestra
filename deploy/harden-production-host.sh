#!/usr/bin/env bash
# Host hardening for the dedicated Cohestra Production droplet (Story 46.2).
# Run ON the droplet as root after SSH key login is proven.
# Does not install the Cohestra application, Docker workloads, or secrets.
#
# Firewall contract:
#   1. Validate PRODUCTION_SSH_SOURCES (IPv4 /24–/32) before any UFW mutation.
#   2. Never reset or disable UFW. Reconcile is additive and idempotent.
#   3. Never drop the owner CIDR 116.86.142.14/32 or other authorized SSH sources.
#   4. Keep 80/443 public. Refuse world-open SSH.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

_load_harden_lib() {
  local name="$1"
  local candidate
  for candidate in "${SCRIPT_DIR}/lib/${name}" "${SCRIPT_DIR}/${name}"; do
    if [[ -f "$candidate" ]]; then
      # shellcheck disable=SC1090
      source "$candidate"
      return 0
    fi
  done
  echo "REFUSE: missing ${name} (required for fail-closed SSH/UFW validation)"
  exit 1
}

_load_harden_lib production-ssh-cidr.sh
_load_harden_lib production-ufw-reconcile.sh

UAT_IP="129.212.235.2"
UAT_DROPLET_ID="581334322"

refuse_if_uat_or_shared_host() {
  if [[ "${COHESTRA_SHARED_HOST_UAT:-}" == "true" ]]; then
    echo "REFUSE: this host is marked COHESTRA_SHARED_HOST_UAT=true"
    return 1
  fi
  local meta_id=""
  local meta_ip=""
  local local_ips=""
  if [[ "${COHESTRA_HARDEN_SKIP_METADATA:-}" != "1" ]]; then
    meta_id="$(curl -fsS --max-time 3 http://169.254.169.254/metadata/v1/id 2>/dev/null || true)"
    meta_ip="$(curl -fsS --max-time 3 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null || true)"
    if command -v ip >/dev/null 2>&1; then
      local_ips="$(ip -4 -o addr show 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | tr '\n' ' ' || true)"
    fi
  fi
  if [[ "$meta_id" == "$UAT_DROPLET_ID" || "$meta_ip" == "$UAT_IP" || " $local_ips " == *" $UAT_IP "* ]]; then
    echo "REFUSE: this host is the UAT droplet"
    return 1
  fi
  return 0
}

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  return 0
fi

refuse_if_uat_or_shared_host

# Fail closed on the SSH allowlist before apt, sshd, or any UFW change.
validate_production_ssh_sources "${PRODUCTION_SSH_SOURCES-}" >/dev/null

if [[ "${EUID}" -ne 0 ]]; then
  echo "REFUSE: harden-production-host.sh must run as root"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  unattended-upgrades apt-listchanges ufw openssh-server ca-certificates curl

cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# Security updates only. No automatic reboot in 46.2 (host is not serving Production yet).
if [[ -f /etc/apt/apt.conf.d/50unattended-upgrades ]]; then
  sed -i 's|^//\s*"\${distro_id}:\${distro_codename}-security";|"${distro_id}:${distro_codename}-security";|' \
    /etc/apt/apt.conf.d/50unattended-upgrades
fi
systemctl enable --now unattended-upgrades.service
systemctl is-enabled unattended-upgrades | grep -qx enabled
systemctl is-active unattended-upgrades | grep -qx active

SSHD_DIR=/etc/ssh/sshd_config.d
mkdir -p "$SSHD_DIR"
cat >"${SSHD_DIR}/99-cohestra-production.conf" <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
X11Forwarding no
PermitEmptyPasswords no
EOF

# sshd -t requires /run/sshd even when systemd will create it on start.
install -d -m 0755 /run/sshd
if sshd -t; then
  systemctl reload ssh || systemctl reload sshd || systemctl restart ssh || systemctl restart sshd
else
  echo "REFUSE: sshd config test failed"
  exit 1
fi

# Additive UFW reconcile. Never reset. Live binary is permitted only on the target host.
COHESTRA_ALLOW_LIVE_UFW=1
export COHESTRA_ALLOW_LIVE_UFW
reconcile_production_ufw

install -d -m 0755 /etc/cohestra
cat >/etc/cohestra-production-host <<EOF
role=production
story=46.2
shared_host_uat=false
hardened_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
workloads_deployed=false
EOF
chmod 0644 /etc/cohestra-production-host

echo "HARDEN_OK"
sshd -T | awk 'tolower($1) ~ /^(passwordauthentication|kbdinteractiveauthentication|permitrootlogin|pubkeyauthentication)$/ {print}'
ufw status verbose | awk 'BEGIN{p=1} /--/{p=0} p'
echo "UNATTENDED=$(systemctl is-enabled unattended-upgrades 2>/dev/null || echo unknown)"
