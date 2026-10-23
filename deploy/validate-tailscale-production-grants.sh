#!/usr/bin/env bash
# Static contract for the owner-applied Production Tailscale Grants template.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/docs/deploy/tailscale-production-grants.template.json"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Missing $TEMPLATE" >&2
  exit 1
fi

echo "== Production Tailscale Grants template contract =="

if python3 - "$TEMPLATE" <<'PY'
import json
import sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text())
errors = []

if "acls" in data:
    errors.append("legacy acls are forbidden")
grants = data.get("grants")
if not isinstance(grants, list) or len(grants) != 1:
    errors.append("exactly one grant is required")
else:
    grant = grants[0]
    if grant.get("src") != ["tag:gha-production"]:
        errors.append("src must be tag:gha-production only")
    if grant.get("dst") != ["tag:cohestra-production"]:
        errors.append("dst must be tag:cohestra-production only")
    if grant.get("ip") != ["tcp:22"]:
        errors.append("ip must be tcp:22 only")
    if grant.get("ip") == ["*"] or "*" in grant.get("ip", []):
        errors.append("wildcard ip is forbidden")
    if "via" in grant:
        errors.append("via/exit-node routing is forbidden")
    if "app" in grant:
        errors.append("app capabilities are out of scope")

owners = data.get("tagOwners", {})
for tag in ("tag:gha-production", "tag:cohestra-production"):
    principals = owners.get(tag)
    if principals != ["OWNER_TAILSCALE_PRINCIPAL_PLACEHOLDER"]:
        errors.append(f"{tag} must use the owner placeholder")

text = Path(sys.argv[1]).read_text()
forbidden = (
    "autogroup:member",
    "0.0.0.0/0",
    "tcp:80",
    "tcp:443",
    "tcp:5432",
    "tcp:6379",
    "tag:uat",
    "exit",
    "subnet",
    "@",
)
for item in forbidden:
    if item in text:
        errors.append(f"forbidden token {item}")

if errors:
    print("\n".join(errors))
    sys.exit(1)
PY
then
  pass "Grants syntax is modern and least-privilege"
  pass "grant is tag:gha-production -> tag:cohestra-production tcp:22"
  pass "no wildcard, UAT, exit-node, subnet, or invented owner email"
else
  fail "Grants template drifted from the approved least-privilege grant"
fi

echo "Passed: ${PASS} | Failed: ${FAIL}"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
