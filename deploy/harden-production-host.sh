#!/usr/bin/env bash
# Host hardening for the dedicated Cohestra Production droplet (Story 46.2).
# Run ON the droplet as root after SSH key login is proven.
# Does not install the Cohestra application, Docker workloads, or secrets.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "REFUSE: harden-production-host.sh must run as root"
  exit 1
fi

if [[ "${COHESTRA_SHARED_HOST_UAT:-}" == "true" ]]; then
  echo "REFUSE: this host is marked COHESTRA_SHARED_HOST_UAT=true"
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
    /etc/apt/apt.conf.d/50unattended-upgrades || true
fi

systemctl enable --now unattended-upgrades.service >/dev/null 2>&1 || true

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

if sshd -t; then
  systemctl reload ssh || systemctl reload sshd
else
  echo "REFUSE: sshd config test failed"
  exit 1
fi

ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

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
