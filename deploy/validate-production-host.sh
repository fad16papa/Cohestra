#!/usr/bin/env bash
# Repo + optional live contract for Story 46.2 Production host.
# Never prints secrets. Does not SSH.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FW="$ROOT_DIR/deploy/production-firewall.desired.json"
PROVISION="$ROOT_DIR/deploy/provision-production-droplet.sh"
HARDEN="$ROOT_DIR/deploy/harden-production-host.sh"
CIDR_LIB="$ROOT_DIR/deploy/lib/production-ssh-cidr.sh"
UFW_LIB="$ROOT_DIR/deploy/lib/production-ufw-reconcile.sh"
HARDEN_TEST="$ROOT_DIR/deploy/harden-production-host.test.sh"
INVENTORY="$ROOT_DIR/docs/deploy/production-host-inventory.json"
DOCS="$ROOT_DIR/docs/deploy/production-host.md"
LAUNCH="$ROOT_DIR/docs/deploy/production-launch-program.md"
WF="$ROOT_DIR/.github/workflows/deploy.yml"
UAT="$ROOT_DIR/docker-compose.uat.yml"
PROD_WF="$ROOT_DIR/.github/workflows/deploy-production.yml"
COMPOSE="$ROOT_DIR/docker-compose.production.yml"
UAT_IP="129.212.235.2"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "== Cohestra Production host contract (46.2) =="

if [[ -f "$PROVISION" && -f "$HARDEN" && -f "$FW" ]]; then
  pass "provision, harden, and firewall contract files exist"
else
  fail "missing 46.2 host contract files"
fi

if grep -q 's-4vcpu-8gb' "$PROVISION" && grep -q 'ubuntu-24-04-x64' "$PROVISION"; then
  pass "Default plan is 8GiB/4vCPU Ubuntu 24.04"
else
  fail "Provisioner must default to s-4vcpu-8gb / ubuntu-24-04-x64"
fi

if grep -q "$UAT_IP" "$PROVISION" && grep -q 'equals UAT' "$PROVISION"; then
  pass "Provisioner refuses UAT IPv4"
else
  fail "Provisioner must refuse UAT host 129.212.235.2"
fi

if grep -q 'DIGITALOCEAN_ACCESS_TOKEN' "$PROVISION" && grep -q 'Never prints' "$PROVISION"; then
  pass "Token is required from the environment and not printed"
else
  fail "Provisioner must require DIGITALOCEAN_ACCESS_TOKEN without printing it"
fi

if grep -q -- '--public-key-file' "$PROVISION" && ! grep -qE -- '--public-key[^-]' "$PROVISION"; then
  pass "SSH key import uses --public-key-file (no key material on argv)"
else
  fail "Provisioner must import SSH keys via --public-key-file"
fi

if grep -q 'sample_provisioner_ips' "$PROVISION" && ! grep -qE '^IFS=,' "$PROVISION"; then
  pass "Provisioner samples egress NAT /32s and does not persist IFS=,"
else
  fail "Provisioner must sample provisioner IPs without changing global IFS"
fi

if grep -q 'production_ssh_cidr_valid' "$PROVISION" && grep -q 'prefixlen < 24' "$CIDR_LIB"; then
  pass "SSH allowlist CIDRs must be IPv4 /24-/32"
else
  fail "Provisioner must reject broad or non-IPv4 SSH CIDRs"
fi

if grep -q 'owner_ssh_cidrs' "$PROVISION" && grep -q 'RECORDED_SOURCES' "$PROVISION"; then
  pass "Provisioner merges recorded owner/admin SSH CIDRs on reconcile"
else
  fail "Provisioner must preserve owner_ssh_cidrs / inventory SSH sources"
fi

if grep -q 'UAT_DROPLET_ID' "$PROVISION" && grep -q 'equals UAT host' "$PROVISION"; then
  pass "Provisioner refuses UAT droplet id as well as IPv4"
else
  fail "Provisioner must refuse UAT droplet id"
fi

if grep -q 'FIREWALL_ATTACH_OK' "$PROVISION" && ! grep -q 'add-droplets .*|| true' "$PROVISION"; then
  pass "Firewall attach is verified and not ignored"
else
  fail "Firewall attach must be exclusive and fail-closed"
fi

if grep -q 'PasswordAuthentication no' "$HARDEN" && grep -q 'unattended-upgrades' "$HARDEN" && grep -q '/run/sshd' "$HARDEN" && grep -q 'UAT droplet' "$HARDEN"; then
  pass "Harden script disables password SSH, enables unattended-upgrades, and refuses UAT"
else
  fail "Harden script must lock sshd/unattended-upgrades and refuse the UAT host"
fi

if grep -q 'validate_production_ssh_sources' "$HARDEN" && grep -q 'reconcile_production_ufw' "$HARDEN" \
  && grep -q 'PRODUCTION_SSH_SOURCES is required' "$CIDR_LIB" && grep -q 'allow from' "$UFW_LIB" \
  && ! grep -qE 'ufw allow 22/tcp$' "$HARDEN" "$UFW_LIB" \
  && ! grep -Eq '(^|[[:space:]])ufw[[:space:]]+(--force[[:space:]]+)?reset([[:space:]]|$)' "$HARDEN" "$UFW_LIB"; then
  pass "Harden validates SSH sources before additive UFW reconcile (no reset, no world-open 22)"
else
  fail "Harden script must validate SSH CIDRs before UFW and must not reset or world-open 22"
fi

if grep -q '116.86.142.14/32' "$CIDR_LIB" && grep -q 'merge_owner_production_ssh_cidr' "$UFW_LIB" \
  && grep -q 'Never drop' "$HARDEN"; then
  pass "Owner SSH CIDR is merged and never dropped during UFW reconcile"
else
  fail "Harden reconcile must preserve owner CIDR 116.86.142.14/32"
fi

if [[ -f "$HARDEN_TEST" ]] && bash "$HARDEN_TEST"; then
  pass "Harden UFW fail-closed behavioral tests"
else
  fail "Harden UFW fail-closed behavioral tests"
fi

if grep -q 'production-ssh-cidr.sh' "$PROVISION" && grep -q 'production-ufw-reconcile.sh' "$PROVISION"; then
  pass "Provisioner copies fail-closed UFW libraries with the harden script"
else
  fail "Provisioner must copy production-ssh-cidr.sh and production-ufw-reconcile.sh to the droplet"
fi

if grep -q 'workloads_deployed=false' "$HARDEN" && ! grep -q 'docker compose' "$HARDEN"; then
  pass "Harden script does not deploy application workloads"
else
  fail "46.2 must not start Production compose"
fi

set +e
python3 - "$FW" <<'PY'
import json, sys
fw = json.load(open(sys.argv[1]))
ports = {str(r["ports"]): r for r in fw["inbound"]}
assert set(ports) == {"22", "80", "443"}, ports
assert "0.0.0.0/0" not in ports["22"]["sources"]
assert "APPROVED_ADMIN_CIDRS_ONLY" in ports["22"]["sources"]
assert "0.0.0.0/0" in ports["80"]["sources"]
assert "0.0.0.0/0" in ports["443"]["sources"]
for p in fw["forbidden_public_ports"]:
    assert str(p) not in ports
print("FIREWALL_JSON_OK")
PY
fw_rc=$?
set -e
if [[ "$fw_rc" -eq 0 ]]; then
  pass "Desired firewall is 22 source-restricted + 80/443 public; no 5432/6379/3000/8080"
else
  fail "firewall desired JSON is invalid"
fi

if [[ -f "$WF" ]] && grep -qE 'name:[[:space:]]*Deploy UAT' "$WF" \
  && grep -qE 'group:[[:space:]]*deploy-uat' "$WF" \
  && grep -qE 'environment:[[:space:]]*uat' "$WF"; then
  pass "UAT deploy workflow remains uat-only"
else
  fail "deploy.yml UAT contract drifted"
fi

if [[ -f "$UAT" ]] && grep -qE '^name:[[:space:]]*cohestra-uat[[:space:]]*$' "$UAT"; then
  pass "UAT compose project remains cohestra-uat"
else
  fail "docker-compose.uat.yml drifted"
fi

if [[ -f "$PROD_WF" ]]; then
  fail "deploy-production.yml must not exist in Story 46.2 (belongs to 46.3)"
else
  pass "No Production CD workflow"
fi

if grep -R --include='*.yml' -E '^[[:space:]]*environment:[[:space:]]*production[[:space:]]*$' \
  "$ROOT_DIR/.github/workflows" >/dev/null 2>&1; then
  fail "No GitHub Environment production may be referenced in 46.2 workflows"
else
  pass "No workflow references Environment production"
fi

if [[ -f "$COMPOSE" ]] && grep -qE '^name:[[:space:]]*cohestra-production[[:space:]]*$' "$COMPOSE"; then
  pass "46.1 Production compose contract still present"
else
  fail "docker-compose.production.yml missing"
fi

if [[ -f "$DOCS" ]] && grep -qi 'unattended' "$DOCS" && grep -qi 'firewall' "$DOCS"; then
  pass "production-host.md documents firewall and unattended updates"
else
  fail "docs/deploy/production-host.md must document hardening"
fi

if [[ -f "$LAUNCH" ]] && grep -q 'cohestra-production' "$LAUNCH" && grep -qi 'NOT YET COMPLETE' "$LAUNCH"; then
  pass "launch program records 46.2 host without claiming release complete"
else
  fail "production-launch-program.md must record 46.2 and remaining gates"
fi

if [[ -f "$INVENTORY" ]] && grep -qE 'BEGIN (OPENSSH |RSA )?PRIVATE KEY|DIGITALOCEAN_ACCESS_TOKEN|-----BEGIN' "$INVENTORY"; then
  fail "inventory must not contain keys or tokens"
else
  pass "inventory (if present) has no private key/token material"
fi

if [[ -f "$INVENTORY" ]]; then
  pass "production-host-inventory.json exists"
  set +e
  python3 - "$INVENTORY" "$UAT_IP" <<'PY'
import json, sys
inv = json.load(open(sys.argv[1]))
uat = sys.argv[2]
failed = []
if inv.get("name") != "cohestra-production":
    failed.append("name")
if inv.get("public_ipv4") == uat:
    failed.append("ip_is_uat")
if int(inv.get("droplet_id") or 0) == 581334322:
    failed.append("id_is_uat")
if int(inv.get("memory_mb") or 0) < 8192:
    failed.append("memory")
if int(inv.get("vcpus") or 0) < 4:
    failed.append("vcpus")
if int(inv.get("disk_gb") or 0) < 160:
    failed.append("disk")
if inv.get("ssh_password_authentication") != "no":
    failed.append("password_ssh")
if inv.get("workloads_deployed") is not False:
    failed.append("workloads")
if inv.get("managed_postgres") is not False:
    failed.append("option_b")
sources = inv.get("ssh_sources") or []
if "0.0.0.0/0" in sources or "::/0" in sources:
    failed.append("ssh_open")
owner_cidrs = inv.get("owner_ssh_cidrs") or []
if not owner_cidrs:
    failed.append("owner_cidr_missing")
for cidr in owner_cidrs:
    if cidr in ("0.0.0.0/0", "::/0"):
        failed.append("owner_cidr_open")
    if cidr not in sources:
        failed.append("owner_cidr_dropped")
if failed:
    print("INVENTORY_FAIL " + " ".join(failed))
    sys.exit(1)
print("INVENTORY_OK")
PY
  inv_rc=$?
  set -e
  if [[ "$inv_rc" -eq 0 ]]; then
    pass "Inventory proves isolation, 8GiB plan, no password SSH, no workloads"
  else
    fail "Inventory does not meet 46.2 isolation/plan/SSH contract"
  fi

  IP="$(jq -r '.public_ipv4' "$INVENTORY")"
  if [[ "${SKIP_LIVE_PORT_PROBES:-}" == "1" ]]; then
    if [[ "${CI:-}" == "true" ]]; then
      fail "Live port probes cannot be skipped in CI"
    else
      pass "Live port probes skipped (SKIP_LIVE_PORT_PROBES=1)"
    fi
  else
    set +e
    python3 - "$IP" <<'PY'
import socket, sys
ip = sys.argv[1]
closed = [5432, 6379, 3000, 8080]
bad = []
for port in closed:
    s = socket.socket()
    s.settimeout(8)
    try:
        s.connect((ip, port))
        bad.append(port)
    except OSError:
        pass
    finally:
        s.close()
if bad:
    print("OPEN_PORTS " + ",".join(str(p) for p in bad))
    sys.exit(1)
print("CLOSED_OK")
PY
    probe_rc=$?
    set -e
    if [[ "$probe_rc" -eq 0 ]]; then
      pass "Live probe: 5432/6379/3000/8080 not publicly reachable on $IP"
    else
      fail "Live probe found a public data/app port on $IP"
    fi
  fi
else
  if [[ "${CI:-}" == "true" ]]; then
    fail "docs/deploy/production-host-inventory.json required in CI after 46.2 provision"
  else
    pass "inventory not yet written — local static contract only"
  fi
fi

echo ""
echo "Passed: $PASS  Failed: $FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
echo "Production host contract PASS"
