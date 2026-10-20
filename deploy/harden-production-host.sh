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

UAT_IP="129.212.235.2"
UAT_DROPLET_ID="581334322"
META_ID="$(curl -fsS --max-time 3 http://169.254.169.254/metadata/v1/id || true)"
META_IP="$(curl -fsS --max-time 3 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address || true)"
LOCAL_IPS="$(ip -4 -o addr show 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | tr '\n' ' ')"
if [[ "$META_ID" == "$UAT_DROPLET_ID" || "$META_IP" == "$UAT_IP" || " $LOCAL_IPS " == *" $UAT_IP "* ]]; then
  echo "REFUSE: this host is the UAT droplet"
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

ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
if [[ -n "${PRODUCTION_SSH_SOURCES:-}" ]]; then
  for cidr in ${PRODUCTION_SSH_SOURCES}; do
    ufw allow from "$cidr" to any port 22 proto tcp
  done
else
  ufw allow 22/tcp
fi
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
