# shellcheck shell=bash
# Read-only GitHub API helper for Production provenance.
# Never prints tokens. Mockable via COHESTRA_GH_API_MOCK.

cohestra_gh_api() {
  local method="${1:-GET}"
  local path="${2:-}"
  local body

  if [[ -z "$path" ]]; then
    echo "REFUSE: GitHub API path missing" >&2
    return 1
  fi

  if [[ -n "${COHESTRA_GH_API_MOCK:-}" ]]; then
    if ! body="$(bash "${COHESTRA_GH_API_MOCK}" "$method" "$path")"; then
      echo "REFUSE: GitHub API mock error" >&2
      return 1
    fi
    printf '%s' "$body"
    return 0
  fi

  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "REFUSE: GitHub API token missing" >&2
    return 1
  fi

  local token="${GITHUB_TOKEN}"
  local url="https://api.github.com${path}"
  local tmp hdr code
  tmp="$(mktemp)"
  hdr="$(mktemp)"
  if ! code="$(
    curl -sS --connect-timeout 10 --max-time 30 -o "$tmp" -D "$hdr" -w '%{http_code}' \
      -H "Authorization: Bearer ${token}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "$url"
  )"; then
    rm -f "$tmp" "$hdr"
    echo "REFUSE: GitHub API request failed" >&2
    return 1
  fi
  body="$(cat "$tmp")"
  rm -f "$tmp" "$hdr"
  if [[ "$code" != "200" ]]; then
    echo "REFUSE: GitHub API HTTP ${code}" >&2
    return 1
  fi
  if [[ -z "$body" ]]; then
    echo "REFUSE: GitHub API empty payload" >&2
    return 1
  fi
  printf '%s' "$body"
}
