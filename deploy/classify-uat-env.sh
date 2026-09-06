#!/usr/bin/env bash
# Classify local → UAT env keys. Never print secret values. Never source the file.
# Usage (owner workstation, with local .env):
#   bash deploy/classify-uat-env.sh
#   bash deploy/classify-uat-env.sh /path/to/.env

set -euo pipefail

ENV_FILE="${1:-}"
if [[ -z "$ENV_FILE" && -f .env ]]; then
  ENV_FILE=".env"
fi
if [[ -n "$ENV_FILE" && ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

python3 - "${ENV_FILE:-}" "$(dirname "$0")/classify-paddle-env.sh" <<'PY'
import pathlib, sys

env_file = sys.argv[1]
paddle_script = sys.argv[2]

def parse_env(path: str) -> dict[str, str]:
    if not path:
        return {}
    text = pathlib.Path(path).read_text(encoding="utf-8")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    out: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        out[key] = value
    return out

env = parse_env(env_file)

def presence(key: str) -> str:
    value = env.get(key, "")
    if key == "Cors / PublicWeb__BaseUrl":
        value = env.get("PublicWeb__BaseUrl") or env.get("PUBLIC_BASE_URL", "")
    return "MISSING" if not value.strip() else "PRESENT"

rows = [
    ("PUBLIC_BASE_URL", "CHANGE FOR UAT"),
    ("NEXT_PUBLIC_API_URL", "COMPOSE FROM PUBLIC_BASE_URL"),
    ("NEXT_PUBLIC_PADDLE_RETURN_ORIGIN", "CHANGE FOR UAT"),
    ("EmailBranding__WebsiteUrl", "CHANGE FOR UAT"),
    ("Cors / PublicWeb__BaseUrl", "CHANGE FOR UAT"),
    ("LETSENCRYPT_EMAIL", "DEFER 19.2"),
    ("DROPLET_IP", "DEFER 19.2"),
    ("HTTPS_DOMAIN", "DEFER 19.2"),
    ("NGINX_CONFIG_PATH", "DEFER 19.2"),
    ("WEB_HOST_PORT", "FREEZE UAT"),
    ("API_HOST_PORT", "FREEZE UAT"),
    ("NGINX_HOST_PORT", "FREEZE UAT"),
    ("Paddle__WebhookSecret", "CHANGE FOR UAT"),
    ("Paddle__ApiKey", "PRESERVE"),
    ("Paddle__ClientToken", "PRESERVE"),
    ("Paddle__Environment", "PRESERVE"),
    ("Paddle__PriceCoreMonthly", "PRESERVE"),
    ("Paddle__PriceCoreAnnual", "PRESERVE"),
    ("Paddle__PriceProMonthly", "PRESERVE"),
    ("Paddle__PriceProAnnual", "PRESERVE"),
    ("Paddle__TrialPeriodDays", "PRESERVE"),
    ("SendGrid__ApiKey", "PRESERVE"),
    ("SendGrid__FromEmail", "PRESERVE"),
    ("SendGrid__FromName", "PRESERVE"),
    ("SendGrid__RegistrationFromEmail", "PRESERVE"),
    ("SendGrid__RegistrationFromName", "PRESERVE"),
    ("EmailBranding__FooterLegalName", "PRESERVE"),
    ("JWT_ISSUER", "FREEZE UAT"),
    ("JWT_AUDIENCE", "FREEZE UAT"),
    ("POSTGRES_DB", "PRESERVE"),
    ("POSTGRES_USER", "PRESERVE"),
    ("POSTGRES_PASSWORD", "PRESERVE"),
    ("JWT_SIGNING_KEY", "GENERATE IF MISSING"),
    ("SelfServeSignup__Recaptcha__Enabled", "FREEZE UAT"),
    ("SelfServeSignup__Recaptcha__SecretKey", "DEFER"),
    ("NEXT_PUBLIC_RECAPTCHA_ENABLED", "FREEZE UAT"),
    ("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "DEFER"),
    ("Intelligence__ApiKey", "DEFER"),
    ("Intelligence__SynthesisEnabled", "FREEZE UAT"),
    ("DEV_TENANT_SLUG", "REMOVE LOCAL-ONLY"),
    ("OperatorSeed__Enabled", "REMOVE LOCAL-ONLY"),
    ("OperatorSeed__Password", "REMOVE LOCAL-ONLY"),
    ("DemoDataSeed__Enabled", "REMOVE LOCAL-ONLY"),
    ("LoadTestSeed__Enabled", "REMOVE LOCAL-ONLY"),
    ("PlatformAdminSeed__Enabled", "REMOVE LOCAL-ONLY"),
    ("POSTGRES_HOST_PORT", "REMOVE LOCAL-ONLY"),
    ("REDIS_HOST_PORT", "REMOVE LOCAL-ONLY"),
    ("NGINX_HTTP_PORT", "REMOVE LOCAL-ONLY"),
    ("SelfServeSignup__Recaptcha__TestBypassToken", "REMOVE LOCAL-ONLY"),
    ("NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN", "REMOVE LOCAL-ONLY"),
]

print("== Local → UAT env classification (no secret values) ==")
print(f"{'KEY':<40} {'ACTION':<28} {'PRESENCE'}")
for key, action in rows:
    print(f"{key:<40} {action:<28} {presence(key)}")

print("")
print("Compose on the droplet sets postgres/redis hosts to service names.")
print("Do not copy local Host=localhost connection strings onto UAT.")
print("Shared-host UAT host binds stay 127.0.0.1:3100 / 5100 / 8180 after port audit.")
print("Do not publish Postgres or Redis. Do not bind Cohestra nginx to :80/:443.")
print("NEXT_PUBLIC_API_URL is built from PUBLIC_BASE_URL in docker-compose.uat.yml.")
print("LETSENCRYPT_EMAIL / DROPLET_IP / HTTPS_DOMAIN belong to Story 19.2.")

if env.get("Paddle__ApiKey", "").strip():
    import subprocess
    subprocess.run(["bash", paddle_script, env_file], check=True)
PY
