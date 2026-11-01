#!/usr/bin/env bash
# Fixture-backed GitHub API mock for UAT readiness tests. Never talks to GitHub.

set -euo pipefail

METHOD="${1:-}"
PATH_Q="${2:-}"
FIX="${COHESTRA_PROVENANCE_FIXTURE:-${COHESTRA_READINESS_FIXTURE:-}}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -z "$FIX" || ! -d "$FIX" ]]; then
  echo "missing fixture dir" >&2
  exit 1
fi
if [[ -f "$FIX/http_403" ]]; then
  echo "REFUSE: GitHub API HTTP 403" >&2
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
qs="${PATH_Q#*\?}"
if [[ "$qs" == "$PATH_Q" ]]; then
  qs=""
fi

pick() {
  local file="$1"
  if [[ -f "$FIX/$file" ]]; then
    cat "$FIX/$file"
    return 0
  fi
  echo "missing fixture $file" >&2
  exit 1
}

pick_optional() {
  local file="$1"
  local fallback="$2"
  if [[ -f "$FIX/$file" ]]; then
    cat "$FIX/$file"
    return 0
  fi
  printf '%s' "$fallback"
}

if [[ "$path" =~ /pulls/([0-9]+)/files$ ]]; then
  pick "pr_files_${BASH_REMATCH[1]}.json"
  exit 0
fi

if [[ "$path" =~ /issues/([0-9]+)/comments$ ]]; then
  pick_optional "issue_comments_${BASH_REMATCH[1]}.json" '[]'
  exit 0
fi

if [[ "$path" =~ /pulls/([0-9]+)/reviews$ ]]; then
  pick_optional "pr_reviews_${BASH_REMATCH[1]}.json" '[]'
  exit 0
fi

if [[ "$path" =~ /pulls/([0-9]+)/comments$ ]]; then
  pick_optional "pr_review_comments_${BASH_REMATCH[1]}.json" '[]'
  exit 0
fi

if [[ "$path" == *"/actions/workflows/deploy.yml/runs" ]]; then
  pick_optional "deploy_runs.json" '{"total_count":0,"workflow_runs":[]}'
  exit 0
fi

if [[ "$path" == *"/actions/workflows/uat-readiness.yml/runs" ]]; then
  pick_optional "readiness_runs.json" '{"total_count":0,"workflow_runs":[]}'
  exit 0
fi

if [[ "$path" =~ /commits/([0-9a-fA-F]{40})/status$ ]]; then
  pick_optional "status_${BASH_REMATCH[1],,}.json" '{"state":"success","statuses":[]}'
  exit 0
fi

if [[ "$path" == */pulls && "$qs" == *"state=open"* ]]; then
  pick_optional "open_pulls.json" '[]'
  exit 0
fi

if [[ "$path" =~ /actions/runs/([0-9]+)$ ]]; then
  if [[ -f "$FIX/run_${BASH_REMATCH[1]}.json" ]]; then
    cat "$FIX/run_${BASH_REMATCH[1]}.json"
    exit 0
  fi
fi

if [[ -f "$ROOT_DIR/deploy/lib/uat-gh-api-mock.sh" ]]; then
  bash "$ROOT_DIR/deploy/lib/uat-gh-api-mock.sh" "$METHOD" "$PATH_Q"
  exit $?
fi

echo "unhandled readiness mock path $path" >&2
exit 1
