#!/usr/bin/env bash
# Print Paddle env classifications only. Never echo secret values.
# Usage: bash deploy/classify-paddle-env.sh [.env]

set -euo pipefail

ENV_FILE="${1:-}"
if [[ -z "$ENV_FILE" && -f .env ]]; then
  ENV_FILE=".env"
fi
if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

classify_secret() {
  local name="$1"
  local kind="$2"
  local value="${3:-}"
  if [[ -z "${value// }" ]]; then
    echo "${name}: NOT PRESENT"
    return
  fi
  local len=${#value}
  case "$kind" in
    api)
      if [[ "$value" == *sdbx* ]]; then
        echo "${name}: SANDBOX / PRESENT / VALID FORMAT"
      elif [[ "$value" == *live* ]]; then
        echo "${name}: LIVE / PRESENT / REJECT FOR UAT"
      else
        echo "${name}: PRESENT / UNKNOWN FORMAT"
      fi
      ;;
    client)
      if [[ "$value" == test_* ]]; then
        echo "${name}: SANDBOX / PRESENT / VALID FORMAT"
      elif [[ "$value" == live_* ]]; then
        echo "${name}: LIVE / PRESENT / REJECT FOR UAT"
      else
        echo "${name}: PRESENT / UNKNOWN FORMAT"
      fi
      ;;
    webhook)
      echo "${name}: PRESENT"
      ;;
    env)
      echo "${name}: ${value}"
      ;;
    price)
      echo "${name}: PRESENT (prefix=${value:0:4}…)"
      ;;
    config)
      echo "${name}: ${value}"
      ;;
  esac
  unset len
}

echo "== Paddle classification (no secret values) =="
classify_secret "Paddle API key" api "${Paddle__ApiKey:-}"
classify_secret "Client token" client "${Paddle__ClientToken:-}"
classify_secret "Webhook secret" webhook "${Paddle__WebhookSecret:-}"
classify_secret "Environment" env "${Paddle__Environment:-}"
classify_secret "PriceCoreMonthly" price "${Paddle__PriceCoreMonthly:-}"
classify_secret "PriceCoreAnnual" price "${Paddle__PriceCoreAnnual:-}"
classify_secret "PriceProMonthly" price "${Paddle__PriceProMonthly:-}"
classify_secret "PriceProAnnual" price "${Paddle__PriceProAnnual:-}"
classify_secret "TrialPeriodDays" config "${Paddle__TrialPeriodDays:-}"
