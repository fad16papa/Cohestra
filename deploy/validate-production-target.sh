#!/usr/bin/env bash
# Production host/path/compose-project allowlist. Never prints secret values.

set -euo pipefail

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  exit 1
}

PROD_IP="159.223.55.242"
UAT_IP="129.212.235.2"
DEFAULT_PATH="/home/deploy/cohestra-production"
HOST="${PROD_DROPLET_HOST:-}"
PATH_IN="${PROD_DROPLET_DEPLOY_PATH:-$DEFAULT_PATH}"
PROJECT="${PROD_COMPOSE_PROJECT:-}"
BASE_URL="${PROD_PUBLIC_BASE_URL:-}"

if [[ -z "$HOST" ]]; then
  refuse "PROD_DROPLET_HOST missing"
fi
if [[ "$HOST" == *:* ]] || [[ "$HOST" == *\[* ]]; then
  refuse "IPv6 or hostname substitution is forbidden"
fi
if [[ "$HOST" != "$PROD_IP" ]]; then
  refuse "host is not the Production inventory IPv4"
fi
if [[ "$HOST" == "$UAT_IP" ]]; then
  refuse "UAT IPv4 is forbidden"
fi

shopt -s nocasematch
if [[ "$HOST" == *uat.cohestra.app* || "$BASE_URL" == *uat.cohestra.app* ]]; then
  refuse "UAT hostname is forbidden"
fi
if [[ "$BASE_URL" == "https://cohestra.app" || "$BASE_URL" == "https://cohestra.app/" ]]; then
  refuse "public cutover URL is forbidden in 46.3"
fi
shopt -u nocasematch

if [[ "$PATH_IN" != /* ]]; then
  refuse "deploy path must be absolute"
fi
if [[ "$PATH_IN" == *..* ]]; then
  refuse "deploy path must not contain .."
fi
if [[ "$PATH_IN" == "/home/deploy/cohestra" || "$PATH_IN" == /home/deploy/cohestra/* ]]; then
  refuse "UAT checkout path is forbidden"
fi
if [[ "$PATH_IN" != "$DEFAULT_PATH" ]]; then
  refuse "deploy path must be ${DEFAULT_PATH}"
fi

if [[ "$PROJECT" != "cohestra-production" ]]; then
  refuse "PROD_COMPOSE_PROJECT must equal cohestra-production"
fi

echo "RESULT=PASS"
echo "HOST_ALLOWLIST=pass"
echo "PATH_ALLOWLIST=pass"
echo "COMPOSE_PROJECT=pass"
echo "UAT_TARGET=false"
