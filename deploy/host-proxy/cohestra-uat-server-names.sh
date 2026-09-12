#!/usr/bin/env bash
# Shared Cohestra UAT hostname contract for edge nginx + TLS scripts.
# shellcheck disable=SC2034

COHESTRA_UAT_PLATFORM_HOST="${COHESTRA_UAT_HOSTNAME:-uat.cohestra.app}"
COHESTRA_UAT_WILDCARD_HOST="*.${COHESTRA_UAT_PLATFORM_HOST}"
COHESTRA_UAT_SERVER_NAME="${COHESTRA_UAT_PLATFORM_HOST} ${COHESTRA_UAT_WILDCARD_HOST}"
COHESTRA_UAT_TENANT_EXAMPLE="${COHESTRA_UAT_TENANT_HOST:-creativorare.uat.cohestra.app}"

render_cohestra_uat_nginx() {
  local template="$1"
  local output="$2"
  sed \
    -e "s/server_name uat.example.com \*\.uat.example.com;/server_name ${COHESTRA_UAT_SERVER_NAME};/g" \
    "$template" > "$output"
}
