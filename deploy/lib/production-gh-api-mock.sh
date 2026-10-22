#!/usr/bin/env bash
# Fixture-backed GitHub API mock for Production provenance tests.
# Reads JSON from $COHESTRA_PROVENANCE_FIXTURE. Never talks to GitHub.

set -euo pipefail

METHOD="${1:-}"
PATH_Q="${2:-}"
FIX="${COHESTRA_PROVENANCE_FIXTURE:-}"

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

pick() {
  local file="$1"
  if [[ -f "$FIX/$file" ]]; then
    cat "$FIX/$file"
    return 0
  fi
  echo "missing fixture $file" >&2
  exit 1
}

if [[ "$path" == *"/actions/workflows/ci.yml/runs" ]]; then
  pick runs.json
  exit 0
fi

if [[ "$path" =~ /actions/runs/([^/]+)/jobs ]]; then
  pick "jobs_${BASH_REMATCH[1]}.json"
  exit 0
fi

if [[ "$path" =~ /commits/([0-9a-fA-F]{40})/pulls ]]; then
  pick "pulls_${BASH_REMATCH[1],,}.json"
  exit 0
fi

if [[ "$path" =~ /commits/([0-9a-fA-F]{40})/check-runs ]]; then
  pick "checks_${BASH_REMATCH[1],,}.json"
  exit 0
fi

if [[ "$path" =~ /pulls/([0-9]+)/commits ]]; then
  pick "pr_commits_${BASH_REMATCH[1]}.json"
  exit 0
fi

if [[ "$path" =~ /pulls/([0-9]+)$ ]]; then
  pick "pr_${BASH_REMATCH[1]}.json"
  exit 0
fi

echo "unhandled mock path $path" >&2
exit 1
