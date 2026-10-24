#!/usr/bin/env bash
# Owner-controlled Production host .env procedure (Story 46.4).
# Does not SSH. Does not write .env inside the git worktree. Does not print values.
#
# Usage:
#   bash deploy/prepare-production-host-env.sh --print-procedure
#   bash deploy/prepare-production-host-env.sh --check-template
#   bash deploy/prepare-production-host-env.sh --check-names /absolute/host/path/.env
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT_DIR/.env.production.example"

required_names=(
  POSTGRES_PASSWORD
  REDIS_PASSWORD
  JWT_SIGNING_KEY
  SendGrid__ApiKey
  SendGrid__FromEmail
  PUBLIC_BASE_URL
)

usage() {
  echo "Usage:"
  echo "  bash deploy/prepare-production-host-env.sh --print-procedure"
  echo "  bash deploy/prepare-production-host-env.sh --check-template"
  echo "  bash deploy/prepare-production-host-env.sh --check-names /absolute/path/.env"
  echo "Refuses to create or write a Production .env in the repository."
}

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 2
fi

normalize_flag() {
  printf '%s' "${1:-}" | sed 's/#.*//' | tr -d '[:space:]' | tr -d \"\' | tr '[:upper:]' '[:lower:]'
}

is_under_repo() {
  local target="$1"
  python3 - "$ROOT_DIR" "$target" <<'PY'
import os, sys
root = os.path.realpath(sys.argv[1])
target = os.path.realpath(sys.argv[2])
print("yes" if target == root or target.startswith(root + os.sep) else "no")
PY
}

case "$1" in
  --print-procedure)
    cat <<'EOF'
Production host application secrets — owner procedure

1. On the dedicated Production droplet only (never the UAT/CRM host):
     cp .env.production.example .env
   Fill values there. Do not copy UAT .env.
2. Required names: POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SIGNING_KEY,
   SendGrid__ApiKey, SendGrid__FromEmail, PUBLIC_BASE_URL=https://cohestra.app
3. Locked false / unset: OperatorSeed, PlatformAdminSeed, DemoDataSeed,
   LoadTestSeed, DEV_TENANT_SLUG, COHESTRA_SHARED_HOST_UAT, Paddle__AllowLive,
   SendGrid__UseSandbox.
4. Do not put GitHub PROD_DROPLET_* deploy secrets in the application .env.
5. Classified verification (names + 4-char suffixes only):
     bash deploy/compare-classified-secrets.sh uat.classified production.classified
   Record PASS/FAIL without secret values. Live check is an owner gate.
6. Never paste values into git, chat, Docker layers, PRs, or evidence.
7. This script will not write .env for you inside the repository.

PRODUCTION=NO-GO until later Epic 46 stories and PRODUCTION CUTOVER: AUTHORIZED.
EOF
    exit 0
    ;;
  --check-template)
    if [[ ! -f "$TEMPLATE" ]]; then
      echo "REFUSE: missing .env.production.example"
      exit 1
    fi
    missing=0
    for name in "${required_names[@]}"; do
      if grep -q "$name" "$TEMPLATE"; then
        echo "TEMPLATE_NAME=${name}"
      else
        echo "MISSING_SECRET=${name}"
        missing=1
      fi
    done
    if grep -qE '^[[:space:]]*[A-Za-z0-9_.]+=[^#[:space:]]+' "$TEMPLATE"; then
      echo "REFUSE: .env.production.example must not assign values."
      exit 1
    fi
    if [[ "$missing" -ne 0 ]]; then
      echo "OWNER_GATE=missing_template_name"
      exit 1
    fi
    echo "TEMPLATE=names_only"
    echo "OWNER_GATE=host_env_procedure_documented"
    exit 0
    ;;
  --check-names)
    path="${2:-}"
    if [[ -z "$path" || "$path" != /* ]]; then
      echo "REFUSE: --check-names requires an absolute path."
      exit 1
    fi
    if [[ "$(is_under_repo "$path")" == "yes" ]]; then
      echo "REFUSE: will not inspect a path inside the git worktree."
      echo "Create the host .env on the dedicated Production droplet only."
      exit 1
    fi
    if [[ ! -f "$path" ]]; then
      echo "REFUSE: host env file is missing."
      echo "OWNER_GATE=production_host_application_secrets"
      exit 1
    fi
    python3 - "$path" <<'PY'
import re, sys
path = sys.argv[1]
required = [
    "POSTGRES_PASSWORD", "REDIS_PASSWORD", "JWT_SIGNING_KEY",
    "SendGrid__ApiKey", "SendGrid__FromEmail", "PUBLIC_BASE_URL",
]
forbidden_true = {
    "OperatorSeed__Enabled", "PlatformAdminSeed__Enabled", "DemoDataSeed__Enabled",
    "LoadTestSeed__Enabled", "COHESTRA_SHARED_HOST_UAT", "Paddle__AllowLive",
    "SendGrid__UseSandbox",
}
placeholders = (
    "DEV_ONLY_CHANGE_IN_PRODUCTION", "changeme", "change_me", "ci-contract",
    "placeholder", "example.invalid", "crm",
)
values = {}
for raw in open(path, encoding="utf-8"):
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    if line.startswith("export "):
        line = line[7:].strip()
    if "=" not in line:
        continue
    name, value = line.split("=", 1)
    name = name.strip()
    value = value.strip().strip("'").strip('"')
    values[name] = value

failed = False
for name in required:
    value = values.get(name, "")
    if not value.strip():
        print(f"MISSING_SECRET={name}")
        failed = True
        continue
    lower = value.lower()
    if any(p.lower() in lower for p in placeholders):
        print(f"PLACEHOLDER_SECRET={name}")
        failed = True
        continue
    print(f"{name}=present")

if values.get("DEV_TENANT_SLUG", "").strip() or values.get("Tenancy__DevTenantSlug", "").strip():
    print("FORBIDDEN_NAME=DEV_TENANT_SLUG")
    failed = True

for name in forbidden_true:
    flag = values.get(name, "")
    norm = re.sub(r"[\s\"']", "", flag).lower()
    if norm in {"true", "1", "yes"}:
        print(f"FORBIDDEN_FLAG={name}")
        failed = True

base = values.get("PUBLIC_BASE_URL", "").strip()
if base and not base.lower().startswith("https://"):
    print("INVALID_PUBLIC_BASE_URL_SCHEME")
    failed = True
if base and ("uat.cohestra.app" in base.lower() or "localhost" in base.lower()):
    print("INVALID_PUBLIC_BASE_URL_HOST")
    failed = True

if failed:
    print("OWNER_GATE=production_host_application_secrets")
    sys.exit(1)
print("HOST_ENV_NAMES=present")
print("OWNER_GATE=owner_classified_verification_still_required")
print("Values were not printed.")
PY
    ;;
  --write|--create|--emit-env)
    echo "REFUSE: this script does not create a Production .env."
    echo "Copy .env.production.example on the dedicated host only."
    exit 1
    ;;
  *)
    usage
    echo "REFUSE: unknown argument."
    exit 1
    ;;
esac
