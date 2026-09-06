#!/usr/bin/env bash
# Print Paddle env classifications only. Never echo secret values. Never source the file.
# Usage: bash deploy/classify-paddle-env.sh [.env]

set -euo pipefail

ENV_FILE="${1:-}"
if [[ -z "$ENV_FILE" && -f .env ]]; then
  ENV_FILE=".env"
fi
if [[ -n "$ENV_FILE" && ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

python3 - "${ENV_FILE:-}" <<'PY'
import pathlib, sys

path = sys.argv[1]
env: dict[str, str] = {}
if path:
    text = pathlib.Path(path).read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip("'").strip('"')

def present(key: str) -> str:
    return env.get(key, "").strip()

print("== Paddle classification (no secret values) ==")

api = present("Paddle__ApiKey")
if not api:
    print("Paddle API key: NOT PRESENT")
elif "sdbx" in api:
    print("Paddle API key: SANDBOX / PRESENT / VALID FORMAT")
elif "live" in api:
    print("Paddle API key: LIVE / PRESENT / REJECT FOR UAT")
else:
    print("Paddle API key: PRESENT / UNKNOWN FORMAT")

client = present("Paddle__ClientToken")
if not client:
    print("Client token: NOT PRESENT")
elif client.startswith("test_"):
    print("Client token: SANDBOX / PRESENT / VALID FORMAT")
elif client.startswith("live_"):
    print("Client token: LIVE / PRESENT / REJECT FOR UAT")
else:
    print("Client token: PRESENT / UNKNOWN FORMAT")

print("Webhook secret: PRESENT" if present("Paddle__WebhookSecret") else "Webhook secret: NOT PRESENT")

environment = present("Paddle__Environment")
print(f"Environment: {environment or 'NOT PRESENT'}")

for key, label in (
    ("Paddle__PriceCoreMonthly", "PriceCoreMonthly"),
    ("Paddle__PriceCoreAnnual", "PriceCoreAnnual"),
    ("Paddle__PriceProMonthly", "PriceProMonthly"),
    ("Paddle__PriceProAnnual", "PriceProAnnual"),
):
    value = present(key)
    if not value:
        print(f"{label}: NOT PRESENT")
    else:
        print(f"{label}: PRESENT (prefix={value[:4]}…)")

trial = present("Paddle__TrialPeriodDays")
print(f"TrialPeriodDays: {trial or 'NOT PRESENT'}")
PY
