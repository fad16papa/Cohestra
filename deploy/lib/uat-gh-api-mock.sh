#!/usr/bin/env bash
# Fixture-backed GitHub API mock for UAT pre-deploy gate tests.
# Delegates CI/check-run fixtures to the Production mock. Never talks to GitHub.

set -euo pipefail

METHOD="${1:-}"
PATH_Q="${2:-}"
FIX="${COHESTRA_PROVENANCE_FIXTURE:-}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -z "$FIX" || ! -d "$FIX" ]]; then
  echo "missing fixture dir" >&2
  exit 1
fi
if [[ -f "$FIX/error" ]]; then
  echo "forced API error" >&2
  exit 1
fi
if [[ -z "$PATH_Q" ]]; then
  exit 1
fi

path="${PATH_Q%%\?*}"

if [[ "$path" == *"/actions/workflows/deploy.yml/runs" ]]; then
  if [[ -f "$FIX/deploy_runs.json" ]]; then
    cat "$FIX/deploy_runs.json"
    exit 0
  fi
  printf '%s' '{"total_count":0,"workflow_runs":[]}'
  exit 0
fi

bash "$ROOT_DIR/deploy/lib/production-gh-api-mock.sh" "$METHOD" "$PATH_Q"
