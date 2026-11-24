#!/usr/bin/env bash
# Owner-controlled Production host .env procedure (Story 46.4).
# Does not SSH. Does not write .env inside the git worktree. Does not print values.
# --check-names may inspect only the checkout-root .env beside
# docker-compose.production.yml, and only when that file is a regular
# non-symlink, untracked, and ignored by this repository's .gitignore.
# Every other worktree path is refused.
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

is_under_repo() {
  local target="$1"
  python3 - "$ROOT_DIR" "$target" <<'PY'
import os, sys
root = os.path.realpath(sys.argv[1])
path = os.path.normpath(sys.argv[2])
followed = os.path.realpath(sys.argv[2])

def inside(candidate):
    return candidate == root or candidate.startswith(root + os.sep)

# Match the path's own location and its followed target. A worktree symlink
# that points outside is still a worktree path and must be refused.
print("yes" if inside(path) or inside(followed) else "no")
PY
}

is_canonical_root_env() {
  python3 - "$ROOT_DIR" "$1" <<'PY'
import os, sys
root = os.path.realpath(sys.argv[1])
path = sys.argv[2]
if not path.startswith("/") or path.endswith("/"):
    print("no")
    raise SystemExit(0)
parent = os.path.realpath(os.path.dirname(path))
base = os.path.basename(path)
print("yes" if base == ".env" and parent == root else "no")
PY
}

canonical_env_gate() {
  local path="$1"
  local ignore_out ignore_rc py_rc tracked_out tracked_rc head_rc head_commit_rc
  if [[ -L "$path" ]]; then
    echo "REFUSE: canonical .env must be a regular non-symlink file."
    return 1
  fi
  if [[ ! -e "$path" ]]; then
    echo "REFUSE: host env file is missing."
    echo "OWNER_GATE=production_host_application_secrets"
    return 1
  fi
  if [[ ! -f "$path" ]]; then
    echo "REFUSE: canonical .env must be a regular non-symlink file."
    return 1
  fi
  if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "REFUSE: canonical .env requires the repository checkout."
    return 1
  fi
  # A dangling HEAD makes both ls-files and HEAD:.env look like "not tracked".
  set +e
  git -C "$ROOT_DIR" rev-parse --verify --quiet 'HEAD^{commit}' >/dev/null 2>&1
  head_commit_rc=$?
  set -e
  if [[ "$head_commit_rc" -ne 0 ]]; then
    echo "REFUSE: canonical .env tracked-file check failed."
    return 1
  fi
  # ls-files --error-unmatch: 0 means tracked, 1 means no tracked path matched.
  # Any other status is a Git failure and must not be treated as untracked.
  tracked_out="$(mktemp)"
  set +e
  git -C "$ROOT_DIR" ls-files --error-unmatch -- .env >"$tracked_out" 2>/dev/null
  tracked_rc=$?
  set -e
  if [[ "$tracked_rc" -eq 0 ]]; then
    rm -f "$tracked_out"
    echo "REFUSE: canonical .env is tracked."
    return 1
  fi
  if [[ "$tracked_rc" -ne 1 || -s "$tracked_out" ]]; then
    rm -f "$tracked_out"
    echo "REFUSE: canonical .env tracked-file check failed."
    return 1
  fi
  rm -f "$tracked_out"
  # A missing index makes ls-files report no match. Refuse when HEAD still has .env.
  # rev-parse --verify: 0 is present, 1 is absent, anything else is a Git failure.
  set +e
  git -C "$ROOT_DIR" rev-parse --verify --quiet HEAD:.env >/dev/null 2>&1
  head_rc=$?
  set -e
  if [[ "$head_rc" -eq 0 ]]; then
    echo "REFUSE: canonical .env is tracked."
    return 1
  fi
  if [[ "$head_rc" -ne 1 ]]; then
    echo "REFUSE: canonical .env tracked-file check failed."
    return 1
  fi
  ignore_out="$(mktemp)"
  set +e
  printf '%s\0' '.env' | git -C "$ROOT_DIR" -c core.excludesFile=/dev/null check-ignore -v -z --stdin --no-index >"$ignore_out" 2>/dev/null
  ignore_rc=$?
  set -e
  if [[ "$ignore_rc" -ne 0 ]]; then
    rm -f "$ignore_out"
    echo "REFUSE: canonical .env is not ignored by the repository .gitignore."
    return 1
  fi
  py_rc=0
  python3 - "$ROOT_DIR" "$ignore_out" <<'PY' || py_rc=$?
import os, sys
root = os.path.realpath(sys.argv[1])
fields = open(sys.argv[2], "rb").read().split(b"\0")
if len(fields) < 4:
    raise SystemExit(1)
source, _line, pattern, pathname = fields[0], fields[1], fields[2], fields[3]
if pathname != b".env" or pattern.startswith(b"!"):
    raise SystemExit(1)
source_text = source.decode("utf-8", "surrogateescape")
if os.path.isabs(source_text):
    source_path = os.path.realpath(source_text)
else:
    source_path = os.path.realpath(os.path.join(root, source_text))
expected = os.path.realpath(os.path.join(root, ".gitignore"))
if source_path != expected:
    raise SystemExit(1)
PY
  rm -f "$ignore_out"
  if [[ "$py_rc" -ne 0 ]]; then
    echo "REFUSE: canonical .env is not ignored by the repository .gitignore."
    return 1
  fi
  return 0
}

case "$1" in
  --print-procedure)
    cat <<'EOF'
Production host application secrets — owner procedure

LIVE CHECK=BLOCKED. Recorded Production checkout
7e1cf5d48064b28a831ba20b25ac06d27e1a17fc does not contain this
validator. No authorized procedure currently updates that checkout or
supplies this validator. Do not run the host commands below on that
checkout. They apply only after an approved procedure has placed a
revision that contains this validator on the host. Printing this
procedure does not update the droplet.

1. On the dedicated Production droplet only, and only on that later
   revision (never the UAT/CRM host):
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
   --check-names may inspect only the checkout-root .env beside
   docker-compose.production.yml when that file is a regular non-symlink,
   untracked, and ignored by this repository's .gitignore. Every other
   path inside the worktree is refused. A global ignore rule alone does
   not qualify.

PRODUCTION=NO-GO. This procedure does not authorize public cutover; the owner phrase PRODUCTION CUTOVER: AUTHORIZED is absent here and is not claimed as granted.
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
    if [[ "$(is_canonical_root_env "$path")" == "yes" ]]; then
      canonical_env_gate "$path"
    elif [[ "$(is_under_repo "$path")" == "yes" ]]; then
      echo "REFUSE: will not inspect a path inside the git worktree."
      echo "Create the host .env on the dedicated Production droplet only."
      exit 1
    elif [[ ! -f "$path" ]]; then
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
