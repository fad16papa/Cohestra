#!/usr/bin/env bash
# Authenticated origin/main fetch for UAT provenance.
# Never prints tokens. Does not SSH. Does not change release controls.

set -euo pipefail

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=GITHUB_TOKEN is required to fetch origin/main"
  exit 1
fi
if [[ "${GITHUB_TOKEN}" == *$'\n'* || "${GITHUB_TOKEN}" == *$'\r'* ]]; then
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=GITHUB_TOKEN is malformed"
  exit 1
fi

# Live failure 41289603719 used an unscoped Bearer extraheader. Git ignored it
# and prompted for a username. GitHub git HTTP expects URL-scoped Basic
# x-access-token, the same shape actions/checkout uses.
AUTH_B64="$(printf 'x-access-token:%s' "${GITHUB_TOKEN}" | base64 | tr -d '\n\r')"
ORIGIN_MAIN_REF="${ORIGIN_MAIN_REF:-origin/main}"

if ! git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic ${AUTH_B64}" \
  fetch --no-tags origin main:refs/remotes/origin/main; then
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=authenticated fetch of origin/main failed"
  exit 1
fi

if ! git rev-parse --verify "${ORIGIN_MAIN_REF}" >/dev/null 2>&1; then
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=origin/main is unavailable after fetch"
  exit 1
fi
