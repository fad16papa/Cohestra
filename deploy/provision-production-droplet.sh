#!/usr/bin/env bash
# Create (or reuse) the dedicated Cohestra Production droplet (Story 46.2).
# Requires DIGITALOCEAN_ACCESS_TOKEN in the environment. Never prints it.
# Does not deploy the Cohestra application. Does not create GitHub Environment production.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INVENTORY="$ROOT_DIR/docs/deploy/production-host-inventory.json"
EVIDENCE_DIR="$ROOT_DIR/_bmad-output/implementation-artifacts/evidence/46-2"
UAT_IP="129.212.235.2"
UAT_DROPLET_ID="${UAT_DROPLET_ID:-581334322}"
DROPLET_NAME="${PRODUCTION_DROPLET_NAME:-cohestra-production}"
REGION="${PRODUCTION_DROPLET_REGION:-sgp1}"
SIZE="${PRODUCTION_DROPLET_SIZE:-s-4vcpu-8gb}"
IMAGE="${PRODUCTION_DROPLET_IMAGE:-ubuntu-24-04-x64}"
VPC_NAME="${PRODUCTION_VPC_NAME:-cohestra-production-vpc}"
FIREWALL_NAME="${PRODUCTION_FIREWALL_NAME:-cohestra-production}"
SSH_KEY_NAME="${PRODUCTION_SSH_KEY_NAME:-cohestra-production-46-2}"

log() { echo "$*"; }
die() { echo "REFUSE: $*" >&2; exit 1; }

if [[ -z "${DIGITALOCEAN_ACCESS_TOKEN:-}" ]]; then
  die "DIGITALOCEAN_ACCESS_TOKEN is not set. Do not paste the token into git, chat, or evidence."
fi

if ! command -v doctl >/dev/null 2>&1; then
  die "doctl is not installed"
fi
if ! command -v jq >/dev/null 2>&1; then
  die "jq is not installed"
fi

# doctl reads DIGITALOCEAN_ACCESS_TOKEN. Do not pass -t (avoids argv exposure).
if ! doctl account get --format Email,Status --no-header >/dev/null; then
  die "DigitalOcean authentication failed (token not printed)"
fi

mkdir -p "$EVIDENCE_DIR"
install -d -m 0700 "$HOME/.ssh"

# Cursor Cloud / similar CI egress uses a small NAT pool. A single /32
# locks the provisioner out of its own SSH rule. Sample observed IPv4s only.
# Never expand to 0.0.0.0/0 or AWS regional ranges.
sample_provisioner_ips() {
  python3 - <<'PY'
import urllib.request, sys
urls = (
    "https://ifconfig.me/ip",
    "https://api.ipify.org",
    "https://checkip.amazonaws.com",
    "https://icanhazip.com",
)
seen = []
found = set()
for _ in range(24):
    for url in urls:
        try:
            ip = urllib.request.urlopen(url, timeout=8).read().decode().strip()
        except Exception:
            continue
        parts = ip.split(".")
        if len(parts) != 4 or not all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
            continue
        if ip not in found:
            found.add(ip)
            seen.append(ip)
print("\n".join(seen))
if not seen:
    sys.exit(1)
PY
}

mapfile -t PROVISIONER_IPS < <(sample_provisioner_ips)
if [[ ${#PROVISIONER_IPS[@]} -lt 1 ]]; then
  die "could not determine provisioner public IPv4 for SSH allowlist"
fi
PROVISIONER_IP="${PROVISIONER_IPS[0]}"
ALLOWLIST=()
# Preserve previously recorded owner/admin CIDRs. A reconcile must not drop
# authorized human access when provisioner egress NAT rotates.
if [[ -f "$INVENTORY" ]]; then
  mapfile -t RECORDED_SOURCES < <(jq -r '(.owner_ssh_cidrs // []) + (.ssh_sources // []) | .[]' "$INVENTORY")
  for cidr in "${RECORDED_SOURCES[@]}"; do
    [[ -n "$cidr" ]] && ALLOWLIST+=("$cidr")
  done
fi
for ip in "${PROVISIONER_IPS[@]}"; do
  ALLOWLIST+=("${ip}/32")
done
if [[ -n "${PRODUCTION_SSH_ALLOWLIST:-}" ]]; then
  IFS=',' read -r -a extra <<<"${PRODUCTION_SSH_ALLOWLIST}"
  for cidr in "${extra[@]}"; do
    cidr="${cidr// /}"
    [[ -n "$cidr" ]] && ALLOWLIST+=("$cidr")
  done
fi
# Deduplicate while preserving order.
deduped=()
seen_cidr=""
for cidr in "${ALLOWLIST[@]}"; do
  if [[ " ${seen_cidr} " != *" ${cidr} "* ]]; then
    deduped+=("$cidr")
    seen_cidr+=" ${cidr}"
  fi
done
ALLOWLIST=("${deduped[@]}")
assert_ssh_cidr() {
  local cidr="$1"
  if [[ "$cidr" == "0.0.0.0/0" || "$cidr" == "::/0" ]]; then
    die "SSH allowlist must not include 0.0.0.0/0 or ::/0"
  fi
  python3 - "$cidr" <<'PY' || die "SSH allowlist entry is not a /24-/32 IPv4 CIDR"
import ipaddress, sys
raw = sys.argv[1]
try:
    net = ipaddress.ip_network(raw, strict=False)
except ValueError:
    raise SystemExit(1)
if net.version != 4 or net.prefixlen < 24 or net.prefixlen > 32:
    raise SystemExit(1)
if any(ch in raw for ch in (";", " ", ",", "address:")):
    raise SystemExit(1)
PY
}
for cidr in "${ALLOWLIST[@]}"; do
  assert_ssh_cidr "$cidr"
done

log "== Cohestra Production droplet provision (46.2) =="
log "Name: $DROPLET_NAME"
log "Region/size/image: $REGION $SIZE $IMAGE"
log "UAT IPv4 (forbidden): $UAT_IP"
log "SSH sources: ${ALLOWLIST[*]}"

# Attach every SSH key already in the account plus a session bootstrap key.
BOOTSTRAP_KEY="$HOME/.ssh/${SSH_KEY_NAME}"
if [[ ! -f "$BOOTSTRAP_KEY" ]]; then
  ssh-keygen -t ed25519 -f "$BOOTSTRAP_KEY" -N "" -C "$SSH_KEY_NAME" >/dev/null
  chmod 600 "$BOOTSTRAP_KEY"
fi
EXISTING_KEY_ID="$(doctl compute ssh-key list --output json | jq -r --arg n "$SSH_KEY_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
if [[ -z "$EXISTING_KEY_ID" ]]; then
  # doctl 1.x requires --public-key-file (never print or pass the key material on argv).
  doctl compute ssh-key import "$SSH_KEY_NAME" --public-key-file "${BOOTSTRAP_KEY}.pub" >/dev/null
  EXISTING_KEY_ID="$(doctl compute ssh-key list --output json | jq -r --arg n "$SSH_KEY_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
fi
mapfile -t ACCOUNT_KEY_IDS < <(doctl compute ssh-key list --output json | jq -r '.[].id')
if [[ ${#ACCOUNT_KEY_IDS[@]} -eq 0 ]]; then
  die "no DigitalOcean SSH keys available"
fi
KEY_CSV="$(IFS=','; printf '%s' "${ACCOUNT_KEY_IDS[*]}")"

VPC_ID="$(doctl vpcs list --output json | jq -r --arg n "$VPC_NAME" --arg r "$REGION" '.[] | select(.name==$n and .region==$r) | .id' | head -n1)"
if [[ -z "$VPC_ID" ]]; then
  doctl vpcs create --name "$VPC_NAME" --region "$REGION" --description "Cohestra Production VPC (Story 46.2)" >/dev/null
  VPC_ID="$(doctl vpcs list --output json | jq -r --arg n "$VPC_NAME" --arg r "$REGION" '.[] | select(.name==$n and .region==$r) | .id' | head -n1)"
fi
[[ -n "$VPC_ID" ]] || die "failed to create or locate VPC $VPC_NAME"

DROPLET_JSON="$(doctl compute droplet list --output json | jq -c --arg n "$DROPLET_NAME" '[.[] | select(.name==$n)]')"
COUNT="$(jq 'length' <<<"$DROPLET_JSON")"
if [[ "$COUNT" -gt 1 ]]; then
  die "multiple droplets named $DROPLET_NAME"
fi

if [[ "$COUNT" -eq 0 ]]; then
  log "Creating droplet $DROPLET_NAME"
  doctl compute droplet create "$DROPLET_NAME" \
    --region "$REGION" \
    --size "$SIZE" \
    --image "$IMAGE" \
    --vpc-uuid "$VPC_ID" \
    --ssh-keys "$KEY_CSV" \
    --tag-names cohestra-production,epic-46,story-46-2 \
    --enable-monitoring \
    --wait >/dev/null
else
  log "Reusing existing droplet $DROPLET_NAME"
fi

DROPLET="$(doctl compute droplet list --output json | jq -c --arg n "$DROPLET_NAME" '.[] | select(.name==$n)')"
DROPLET_ID="$(jq -r '.id' <<<"$DROPLET")"
DROPLET_IP="$(jq -r '[.networks.v4[] | select(.type=="public") | .ip_address][0]' <<<"$DROPLET")"
DROPLET_REGION="$(jq -r '.region.slug' <<<"$DROPLET")"
DROPLET_SIZE="$(jq -r '.size.slug // .size_slug' <<<"$DROPLET")"
DROPLET_IMAGE="$(jq -r '.image.slug // .image.name' <<<"$DROPLET")"
MEMORY="$(jq -r '.memory' <<<"$DROPLET")"
VCPUS="$(jq -r '.vcpus' <<<"$DROPLET")"
DISK="$(jq -r '.disk' <<<"$DROPLET")"
STATUS="$(jq -r '.status' <<<"$DROPLET")"

[[ "$DROPLET_IP" != "null" && -n "$DROPLET_IP" ]] || die "droplet has no public IPv4"
if [[ "$DROPLET_IP" == "$UAT_IP" || "$DROPLET_ID" == "$UAT_DROPLET_ID" ]]; then
  die "Production droplet IPv4 or id equals UAT host $UAT_IP / $UAT_DROPLET_ID — isolation failed"
fi
if [[ "$MEMORY" -lt 8192 || "$VCPUS" -lt 4 || "$DISK" -lt 160 ]]; then
  die "droplet plan is below 8GiB/4vCPU/160GiB (memory=$MEMORY vcpus=$VCPUS disk=$DISK)"
fi
if [[ "$DROPLET_SIZE" != "$SIZE" ]]; then
  log "WARN: size slug is $DROPLET_SIZE (requested $SIZE); memory/vcpus/disk still meet the 8GiB plan"
fi

# Cloud firewall: 22 from allowlist only; 80/443 public; no DB/app ports.
INBOUND=""
for cidr in "${ALLOWLIST[@]}"; do
  INBOUND+="protocol:tcp,ports:22,address:${cidr} "
done
INBOUND+="protocol:tcp,ports:80,address:0.0.0.0/0,address:::/0 "
INBOUND+="protocol:tcp,ports:443,address:0.0.0.0/0,address:::/0"
OUTBOUND="protocol:tcp,ports:all,address:0.0.0.0/0,address:::/0 protocol:udp,ports:all,address:0.0.0.0/0,address:::/0 protocol:icmp,address:0.0.0.0/0,address:::/0"

FW_ID="$(doctl compute firewall list --output json | jq -r --arg n "$FIREWALL_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
if [[ -z "$FW_ID" ]]; then
  doctl compute firewall create \
    --name "$FIREWALL_NAME" \
    --inbound-rules "$INBOUND" \
    --outbound-rules "$OUTBOUND" \
    --droplet-ids "$DROPLET_ID" \
    --tag-names cohestra-production >/dev/null
  FW_ID="$(doctl compute firewall list --output json | jq -r --arg n "$FIREWALL_NAME" '.[] | select(.name==$n) | .id' | head -n1)"
else
  doctl compute firewall update "$FW_ID" \
    --name "$FIREWALL_NAME" \
    --inbound-rules "$INBOUND" \
    --outbound-rules "$OUTBOUND" \
    --droplet-ids "$DROPLET_ID" \
    --tag-names cohestra-production >/dev/null
  doctl compute firewall add-droplets "$FW_ID" --droplet-ids "$DROPLET_ID" >/dev/null
fi
[[ -n "$FW_ID" ]] || die "failed to apply firewall $FIREWALL_NAME"

FW_JSON="$(doctl compute firewall get "$FW_ID" --output json | jq '.[0]')"
FW_CHECK="$(mktemp)"
printf '%s' "$FW_JSON" >"$FW_CHECK"
python3 - "$UAT_DROPLET_ID" "$DROPLET_ID" "$FW_CHECK" <<'PY' || { rm -f "$FW_CHECK"; die "firewall isolation/port contract failed"; }
import json, sys
uat_id, prod_id = sys.argv[1], int(sys.argv[2])
fw = json.load(open(sys.argv[3], encoding="utf-8"))
ids = [int(x) for x in (fw.get("droplet_ids") or [])]
if prod_id not in ids:
    raise SystemExit("firewall not attached to Production droplet")
if int(uat_id) in ids:
    raise SystemExit("firewall is attached to the UAT droplet")
forbidden = {"5432", "6379", "3000", "8080", "4317", "4318", "all"}
for rule in fw.get("inbound_rules") or []:
    ports = str(rule.get("ports") or "")
    if ports in forbidden or "-" in ports or ports == "0":
        raise SystemExit(f"forbidden inbound ports {ports}")
    if ports == "22":
        addrs = ((rule.get("sources") or {}).get("addresses") or [])
        if any(a in ("0.0.0.0/0", "::/0", "::") for a in addrs):
            raise SystemExit("SSH is publicly open")
        if not addrs:
            raise SystemExit("SSH rule has no CIDR sources")
print("FIREWALL_ATTACH_OK")
PY
rm -f "$FW_CHECK"

log "Waiting for SSH on ${DROPLET_IP}:22"
ssh_port_ok=0
for ((i=1; i<=36; i++)); do
  if python3 - "$DROPLET_IP" <<'PY'
import socket, sys
s = socket.create_connection((sys.argv[1], 22), 5)
s.close()
PY
  then
    ssh_port_ok=1
    break
  fi
  sleep 5
done
[[ "$ssh_port_ok" -eq 1 ]] || die "SSH port never became reachable from provisioner"

# Wait for cloud-init / sshd
sleep 8
SSH_OPTS=(-i "$BOOTSTRAP_KEY" -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$HOME/.ssh/cohestra-production-known_hosts" -o IdentitiesOnly=yes -o BatchMode=yes)
USER="root"

key_ok=0
for ((attempt=1; attempt<=20; attempt++)); do
  if ssh "${SSH_OPTS[@]}" "${USER}@${DROPLET_IP}" "true" >/dev/null 2>&1; then
    key_ok=1
    break
  fi
  sleep 6
done
[[ "$key_ok" -eq 1 ]] || die "SSH key authentication failed before password disable"

# Prove key works, then apply hardening (which disables password auth).
scp "${SSH_OPTS[@]}" "$ROOT_DIR/deploy/harden-production-host.sh" "${USER}@${DROPLET_IP}:/tmp/harden-production-host.sh" >/dev/null
HARDEN_OUT="$(ssh "${SSH_OPTS[@]}" "${USER}@${DROPLET_IP}" "PRODUCTION_SSH_SOURCES='${ALLOWLIST[*]}' bash /tmp/harden-production-host.sh && rm -f /tmp/harden-production-host.sh")"
echo "$HARDEN_OUT" | grep -q HARDEN_OK || die "host harden script did not report HARDEN_OK"
echo "$HARDEN_OUT" | grep -qiE 'passwordauthentication no' || die "sshd did not report PasswordAuthentication no"
echo "$HARDEN_OUT" | grep -qx 'UNATTENDED=enabled' || die "unattended-upgrades is not enabled"

# Key still works after password disable.
ssh "${SSH_OPTS[@]}" "${USER}@${DROPLET_IP}" "test -f /etc/cohestra-production-host && grep -q shared_host_uat=false /etc/cohestra-production-host" \
  || die "production host marker missing"

# Password login must fail (BatchMode + no identities → should not succeed).
set +e
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o NumberOfPasswordPrompts=0 \
  -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$HOME/.ssh/cohestra-production-known_hosts" \
  -o ConnectTimeout=8 "${USER}@${DROPLET_IP}" "true" >/dev/null 2>&1
pw_rc=$?
set -e
[[ "$pw_rc" -ne 0 ]] || die "password SSH unexpectedly succeeded"

# Public port probes from this host (not via SSH).
python3 - "$DROPLET_IP" <<'PY'
import socket, sys
ip = sys.argv[1]
must_open = {22}
must_closed = {5432, 6379, 3000, 8080, 4317, 4318}
failures = []
for port in sorted(must_open | must_closed):
    s = socket.socket()
    s.settimeout(5)
    try:
        s.connect((ip, port))
        open_ = True
    except OSError:
        open_ = False
    finally:
        s.close()
    if port in must_open and not open_:
        failures.append(f"expected-open {port}")
    if port in must_closed and open_:
        failures.append(f"expected-closed {port} IS OPEN")
if failures:
    print("PORT_FAIL " + ", ".join(failures))
    sys.exit(1)
print("PORT_PROBES_OK")
PY

# 80/443 may be closed until nginx exists; that is acceptable in 46.2 (no workload).
# They must still be *allowed* by firewall (already checked).

HOST_PROOF="$(ssh "${SSH_OPTS[@]}" "${USER}@${DROPLET_IP}" "sshd -T | awk 'tolower(\$1) ~ /passwordauthentication|pubkeyauthentication|permitrootlogin/ {print}'; echo MARKER=\$(cat /etc/cohestra-production-host | tr '\n' ' ')")"

PREV_INV="{}"
if [[ -f "$INVENTORY" ]]; then
  PREV_INV="$(cat "$INVENTORY")"
fi
jq -n \
  --arg name "$DROPLET_NAME" \
  --argjson id "$DROPLET_ID" \
  --arg region "$DROPLET_REGION" \
  --arg size "$DROPLET_SIZE" \
  --argjson memory "$MEMORY" \
  --argjson vcpus "$VCPUS" \
  --argjson disk "$DISK" \
  --arg image "$DROPLET_IMAGE" \
  --arg ip "$DROPLET_IP" \
  --arg status "$STATUS" \
  --arg vpc "$VPC_NAME" \
  --arg vpc_id "$VPC_ID" \
  --arg firewall "$FIREWALL_NAME" \
  --arg firewall_id "$FW_ID" \
  --arg uat_ip "$UAT_IP" \
  --arg provisioner "$PROVISIONER_IP" \
  --argjson ssh_sources "$(printf '%s\n' "${ALLOWLIST[@]}" | jq -R . | jq -s .)" \
  --arg hardened_utc "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson prev "$PREV_INV" \
  '{
    story: "46.2",
    name: $name,
    droplet_id: $id,
    region: $region,
    size: $size,
    memory_mb: $memory,
    vcpus: $vcpus,
    disk_gb: $disk,
    image: $image,
    public_ipv4: $ip,
    status: $status,
    vpc_name: $vpc,
    vpc_id: $vpc_id,
    firewall_name: $firewall,
    firewall_id: $firewall_id,
    uat_public_ipv4: $uat_ip,
    host_isolation: "distinct_from_uat",
    ssh_sources: $ssh_sources,
    provisioner_ipv4: $provisioner,
    ssh_password_authentication: "no",
    ssh_key_authentication: "proven",
    workloads_deployed: false,
    option_a_postgres: true,
    managed_postgres: false,
    production_auto_deploy: false,
    hardened_utc: $hardened_utc
  } as $core
  | $prev + $core
  | .owner_ssh_cidrs = (($prev.owner_ssh_cidrs // []) )
  | .ssh_sources = (((.owner_ssh_cidrs // []) + .ssh_sources) | unique)
  ' >"$INVENTORY"

# Sanitized evidence — no keys, tokens, or passwords.
{
  echo "story: 46.2"
  echo "droplet: $DROPLET_NAME id=$DROPLET_ID ip=$DROPLET_IP"
  echo "region: $DROPLET_REGION size: $DROPLET_SIZE image: $DROPLET_IMAGE"
  echo "isolation: production_ip=$DROPLET_IP uat_ip=$UAT_IP distinct=yes"
  echo "ssh_password_authentication: no"
  echo "ssh_key_authentication: proven"
  echo "ssh_sources: ${ALLOWLIST[*]}"
  echo "public_closed: 5432 6379 3000 8080"
  echo "workloads_deployed: false"
  echo "$HOST_PROOF"
} >"$EVIDENCE_DIR/host-hardening.txt"

log "INVENTORY_WRITTEN $INVENTORY"
log "EVIDENCE_WRITTEN $EVIDENCE_DIR/host-hardening.txt"
log "PROVISION_OK droplet_id=$DROPLET_ID ip=$DROPLET_IP"
log "Private SSH key remains at $BOOTSTRAP_KEY and must never be committed."
