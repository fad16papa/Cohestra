#!/usr/bin/env bash
# Authenticated origin/main fetch for UAT provenance.
# Never prints tokens. Does not SSH. Does not change release controls.
# On any refuse path, writes both predeploy evidence files and does not
# evaluate enabled-path eligibility.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  bash "$ROOT_DIR/deploy/write-uat-predeploy-evidence.sh" REFUSE "$1"
  exit 1
}

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  refuse "GitHub Actions credentials are required to fetch origin/main"
fi
if [[ "${GITHUB_TOKEN}" == *$'\n'* || "${GITHUB_TOKEN}" == *$'\r'* ]]; then
  refuse "GitHub Actions credentials are malformed"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  refuse "git origin remote is required to fetch origin/main"
fi
ORIGIN_URL="$(git remote get-url origin)"
if [[ "$ORIGIN_URL" == *@* ]]; then
  refuse "origin URL must not embed credentials"
fi

# URL-scoped extraheader matches the remote, so a local HTTP fixture and
# https://github.com both receive Basic x-access-token. Unscoped Bearer
# extraheader is the live 41289603719 failure mode.
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
ORIGIN_MAIN_REF="${ORIGIN_MAIN_REF:-origin/main}"
export GIT_TERMINAL_PROMPT=0

if ! git -c "http.${HEADER_SCOPE}.extraheader=AUTHORIZATION: basic ${AUTH_B64}" \
  fetch --no-tags origin main:refs/remotes/origin/main; then
  refuse "authenticated fetch of origin/main failed"
fi

if ! git rev-parse --verify "${ORIGIN_MAIN_REF}" >/dev/null 2>&1; then
  refuse "origin/main is unavailable after fetch"
fi
