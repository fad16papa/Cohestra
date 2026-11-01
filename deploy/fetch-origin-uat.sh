#!/usr/bin/env bash
# Authenticated origin/release/uat fetch for post-cutover UAT tip-pin.
# Never prints tokens. Does not SSH. Does not change release controls.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  bash "$ROOT_DIR/deploy/write-uat-predeploy-evidence.sh" REFUSE "$1"
  exit 1
}

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  refuse "GitHub Actions credentials are required to fetch origin/release/uat"
fi
if [[ "${GITHUB_TOKEN}" == *$'\n'* || "${GITHUB_TOKEN}" == *$'\r'* ]]; then
  refuse "GitHub Actions credentials are malformed"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  refuse "git origin remote is required to fetch origin/release/uat"
fi
ORIGIN_URL="$(git remote get-url origin)"
if [[ "$ORIGIN_URL" == *@* ]]; then
  refuse "origin URL must not embed credentials"
fi

HEADER_SCOPE="$(python3 - "$ORIGIN_URL" <<'PY'
from urllib.parse import urlsplit
import sys
url = urlsplit(sys.argv[1])
if url.scheme not in {"http", "https"} or not url.hostname:
    raise SystemExit(2)
netloc = url.hostname
if url.port:
    netloc = f"{url.hostname}:{url.port}"
print(f"{url.scheme}://{netloc}/", end="")
PY
)" || refuse "origin URL is not an http(s) remote"

AUTH_B64="$(printf 'x-access-token:%s' "${GITHUB_TOKEN}" | base64 | tr -d '\n\r')"
ORIGIN_UAT_REF="${ORIGIN_UAT_REF:-origin/release/uat}"
export GIT_TERMINAL_PROMPT=0

if ! git -c "http.${HEADER_SCOPE}.extraheader=AUTHORIZATION: basic ${AUTH_B64}" \
  fetch --no-tags origin release/uat:refs/remotes/origin/release/uat; then
  refuse "authenticated fetch of origin/release/uat failed"
fi

if ! git rev-parse --verify "${ORIGIN_UAT_REF}" >/dev/null 2>&1; then
  refuse "origin/release/uat is unavailable after fetch"
fi
