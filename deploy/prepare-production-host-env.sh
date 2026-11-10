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
  SelfServeSignup__RegistrationClosed
  SelfServeSignup__Recaptcha__Enabled
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
   SendGrid__ApiKey, SendGrid__FromEmail, PUBLIC_BASE_URL=https://cohestra.app,
   SelfServeSignup__RegistrationClosed, SelfServeSignup__Recaptcha__Enabled
3. Public registration: closed=true + recaptcha=false (first dark boot), or
   closed=false + recaptcha=true with a live secret. Open + disabled is refused.
   Do not set SelfServeSignup__Recaptcha__TestBypassToken.
4. Locked false / unset: OperatorSeed, PlatformAdminSeed, DemoDataSeed,
   LoadTestSeed, DEV_TENANT_SLUG, COHESTRA_SHARED_HOST_UAT, Paddle__AllowLive,
   SendGrid__UseSandbox.
5. Do not put GitHub PROD_DROPLET_* deploy secrets in the application .env.
6. Classified verification (names + 4-char suffixes only):
     bash deploy/compare-classified-secrets.sh uat.classified production.classified
   Record PASS/FAIL without secret values. Live check is an owner gate.
7. Never paste values into git, chat, Docker layers, PRs, or evidence.
8. This script will not write .env for you inside the repository.

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
flags = [
    "SelfServeSignup__RegistrationClosed",
    "SelfServeSignup__Recaptcha__Enabled",
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
    if line.lower().startswith("export"):
        line = line.split(None, 1)[1] if len(line.split(None, 1)) == 2 else line
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
    if name == "JWT_SIGNING_KEY" and len(value.strip()) < 32:
        print("INVALID_JWT_SIGNING_KEY_LENGTH")
        failed = True
        continue
    print(f"{name}=present")

def is_true(raw):
    return re.sub(r"[\s\"']", "", raw or "").lower() in {"true", "1", "yes"}

def is_false(raw):
    return re.sub(r"[\s\"']", "", raw or "").lower() in {"false", "0", "no", ""}

for name in flags:
    if name not in values:
        print(f"MISSING_FLAG={name}")
        failed = True
    elif not (is_true(values[name]) or is_false(values[name])):
        print(f"INVALID_FLAG={name}")
        failed = True
    else:
        print(f"{name}=present")

closed = is_true(values.get("SelfServeSignup__RegistrationClosed", ""))
enabled = is_true(values.get("SelfServeSignup__Recaptcha__Enabled", ""))
if flags[0] in values and flags[1] in values and not closed and not enabled:
    print("ILLEGAL_OPEN_SIGNUP_WITHOUT_RECAPTCHA")
    failed = True

bypass = values.get("SelfServeSignup__Recaptcha__TestBypassToken", "").strip()
web_bypass = values.get("NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN", "").strip()
if bypass or web_bypass:
    print("FORBIDDEN_RECAPTCHA_BYPASS")
    failed = True

if enabled:
    secret = values.get("SelfServeSignup__Recaptcha__SecretKey", "").strip()
    if not secret:
        print("MISSING_SECRET=SelfServeSignup__Recaptcha__SecretKey")
        failed = True
    elif any(p.lower() in secret.lower() for p in placeholders) or secret.startswith("6LeIx" + "AcTAAAA"):
        print("PLACEHOLDER_SECRET=SelfServeSignup__Recaptcha__SecretKey")
        failed = True

if values.get("DEV_TENANT_SLUG", "").strip() or values.get("Tenancy__DevTenantSlug", "").strip():
    print("FORBIDDEN_NAME=DEV_TENANT_SLUG")
    failed = True

for name in forbidden_true:
    flag = values.get(name, "")
    norm = re.sub(r"[\s\"']", "", flag).lower()
    if norm in {"true", "1", "yes"}:
        print(f"FORBIDDEN_FLAG={name}")
        failed = True

from urllib.parse import urlparse
base = values.get("PUBLIC_BASE_URL", "").strip()
if base:
    parsed = urlparse(base)
    host = (parsed.hostname or "").lower()
    if parsed.scheme.lower() != "https" or parsed.username or parsed.query or parsed.fragment \
       or (parsed.path not in ("", "/")) or (parsed.port not in (None, 443)) \
       or host not in {"cohestra.app", "www.cohestra.app"}:
        print("INVALID_PUBLIC_BASE_URL_HOST")
        failed = True

from_email = values.get("SendGrid__FromEmail", "").strip()
if from_email and "@" in from_email:
    sender_host = from_email.rsplit("@", 1)[1].lower()
    if sender_host == "uat.cohestra.app" or sender_host.startswith("uat.") \
       or ".uat." in sender_host or sender_host.endswith(".local"):
        print("FORBIDDEN_SENDGRID_SENDER")
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
