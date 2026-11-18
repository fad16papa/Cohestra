#!/usr/bin/env bash
# Canonical config-only placeholders for Production compose interpolation.
# Safe to source. Never writes .env, never prints placeholder values,
# never starts compose, never mutates a database.
#
# These values exist only so `docker compose config` can parse the file
# before Story 46.4 populates real Production secrets. They do not satisfy
# the runtime .env contract.

# Approved names MUST match docker-compose.production.yml ${VAR:?} exactly.
# production_compose_assert_placeholder_contract fails CI on drift.
PRODUCTION_COMPOSE_CONFIG_PLACEHOLDER_NAMES=(
  POSTGRES_PASSWORD
  REDIS_PASSWORD
  JWT_SIGNING_KEY
  PUBLIC_BASE_URL
  SendGrid__ApiKey
  SendGrid__FromEmail
  SelfServeSignup__RegistrationClosed
  SelfServeSignup__Recaptcha__Enabled
)

production_compose_repo_root() {
  if [[ -n "${PRODUCTION_COMPOSE_ROOT:-}" ]]; then
    printf '%s\n' "$PRODUCTION_COMPOSE_ROOT"
    return
  fi
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

production_compose_file() {
  printf '%s\n' "${PRODUCTION_COMPOSE_FILE:-$(production_compose_repo_root)/docker-compose.production.yml}"
}

production_compose_required_var_names() {
  local file="${1:-$(production_compose_file)}"
  python3 - "$file" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
seen = set()
names = []
for match in re.finditer(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\:\?", text):
    name = match.group(1)
    if name not in seen:
        seen.add(name)
        names.append(name)
print("\n".join(names))
PY
}

production_compose_config_placeholder_value() {
  local name="$1"
  case "$name" in
    POSTGRES_PASSWORD|REDIS_PASSWORD|SendGrid__ApiKey)
      printf '%s' 'bootstrap-config-check-not-a-secret'
      ;;
    JWT_SIGNING_KEY)
      printf '%s' 'bootstrap-config-check-not-a-secret-32'
      ;;
    PUBLIC_BASE_URL)
      printf '%s' 'http://127.0.0.1'
      ;;
    SendGrid__FromEmail)
      printf '%s' 'bootstrap-config-check@example.invalid'
      ;;
    SelfServeSignup__RegistrationClosed)
      printf '%s' 'true'
      ;;
    SelfServeSignup__Recaptcha__Enabled)
      printf '%s' 'false'
      ;;
    *)
      return 1
      ;;
  esac
}

production_compose_assert_placeholder_contract() {
  local file="${1:-$(production_compose_file)}"
  local required name drift=0
  if [[ ! -f "$file" ]]; then
    echo "REFUSE: production compose file missing"
    return 1
  fi
  required="$(production_compose_required_var_names "$file")"
  local -A approved=()
  for name in "${PRODUCTION_COMPOSE_CONFIG_PLACEHOLDER_NAMES[@]}"; do
    approved["$name"]=1
    if ! production_compose_config_placeholder_value "$name" >/dev/null; then
      echo "MISSING_CONFIG_PLACEHOLDER=$name"
      drift=1
    fi
  done
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    if [[ -z "${approved[$name]:-}" ]]; then
      echo "MISSING_CONFIG_PLACEHOLDER=$name"
      drift=1
    fi
  done <<<"$required"
  for name in "${PRODUCTION_COMPOSE_CONFIG_PLACEHOLDER_NAMES[@]}"; do
    if ! grep -qxF "$name" <<<"$required"; then
      echo "UNUSED_CONFIG_PLACEHOLDER=$name"
      drift=1
    fi
  done
  if [[ "$drift" -ne 0 ]]; then
    echo "REFUSE: compose config-only placeholder contract drifted"
    return 1
  fi
  return 0
}

production_compose_apply_config_placeholders() {
  local name
  for name in "${PRODUCTION_COMPOSE_CONFIG_PLACEHOLDER_NAMES[@]}"; do
    if [[ -z "${!name:-}" ]]; then
      export "${name}=$(production_compose_config_placeholder_value "$name")"
    fi
  done
}

production_compose_report_missing_required_vars() {
  local file="${1:-$(production_compose_file)}"
  local name missing=0
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    if [[ -z "${!name:-}" ]]; then
      echo "MISSING_CONFIG_VAR=$name"
      missing=1
    fi
  done < <(production_compose_required_var_names "$file")
  return "$missing"
}

production_compose_missing_vars_from_compose_stderr() {
  local errfile="$1"
  [[ -f "$errfile" ]] || return 0
  python3 - "$errfile" <<'PY'
import re, sys
text = open(sys.argv[1], encoding="utf-8", errors="replace").read()
names = []
seen = set()
for pattern in (
    r"required variable ([A-Za-z_][A-Za-z0-9_]*)",
    r"variable ([A-Za-z_][A-Za-z0-9_]*) is (?:required|missing)",
):
    for match in re.finditer(pattern, text):
        name = match.group(1)
        if name not in seen:
            seen.add(name)
            names.append(name)
for name in names:
    print(f"MISSING_CONFIG_VAR={name}")
PY
}
