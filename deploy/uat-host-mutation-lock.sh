#!/usr/bin/env bash
# Shared UAT host mutation lock. Read-only. No dispatch, SSH, or Production.
# actions mode: refuse if Deploy UAT or another rollback is queued/in progress.
# host mode: exclusive flock on the droplet so two mutators cannot overlap.

set -euo pipefail

refuse() {
  echo "RESULT=REFUSE"
  echo "HOST_LOCK=held"
  echo "REFUSE_REASON=$1"
  exit 1
}

MODE="${1:-actions}"
THIS_RUN="${GITHUB_RUN_ID:-}"
LOCK_FILE="${UAT_HOST_LOCK_FILE:-/tmp/cohestra-uat-host-mutation.lock}"

check_runs() {
  python3 - "$THIS_RUN" <<'PY'
import json, os, sys

this_run = (sys.argv[1] or "").strip()
raw = os.environ.get("UAT_HOST_LOCK_RUNS_JSON", "")
if not raw:
    raise SystemExit("missing_fixture")
try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    raise SystemExit("invalid_fixture")
runs = payload.get("workflow_runs", payload) if isinstance(payload, dict) else payload
if not isinstance(runs, list):
    raise SystemExit("invalid_fixture")
blocking = []
for run in runs:
    if not isinstance(run, dict):
        continue
    run_id = str(run.get("id") or "")
    if this_run and run_id == this_run:
        continue
    path = str(run.get("path") or "")
    status = str(run.get("status") or "").strip().lower()
    if path in {".github/workflows/deploy.yml", ".github/workflows/deploy-uat-rollback.yml"} and status in {
        "queued",
        "pending",
        "waiting",
        "in_progress",
        "requested",
    }:
        blocking.append(f"{path}:{status}:{run_id}")
if blocking:
    print(";".join(blocking))
    raise SystemExit(2)
print("clear")
PY
}

fetch_runs() {
  local api_base="${UAT_HOST_LOCK_API_BASE:-https://api.github.com}"
  local repo="${GITHUB_REPOSITORY:-}"
  local token="${GITHUB_TOKEN:-}"
  [[ -n "$repo" ]] || refuse "GITHUB_REPOSITORY is required for the UAT host mutation lock"
  [[ -n "$token" ]] || refuse "GITHUB_TOKEN is required for the UAT host mutation lock"
  local url="${api_base%/}/repos/${repo}/actions/runs?per_page=50"
  local body
  body="$(
    curl -fsS \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer ${token}" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "$url"
  )" || refuse "could not list GitHub Actions runs for the UAT host mutation lock"
  if ! overlap="$(UAT_HOST_LOCK_RUNS_JSON="$body" check_runs)"; then
    rc=$?
    if [[ "$rc" -eq 2 ]]; then
      refuse "Deploy UAT or another UAT rollback is already mutating the host"
    fi
    refuse "UAT host mutation lock response is invalid"
  fi
  printf '%s\n' "$overlap"
}

acquire_host_lock() {
  mkdir -p "$(dirname "$LOCK_FILE")"
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    refuse "UAT host mutation lock file is held"
  fi
  echo "HOST_LOCK=acquired"
  echo "HOST_LOCK_FILE=${LOCK_FILE}"
  if [[ -n "${UAT_HOST_LOCK_HOLD_SECONDS:-}" ]]; then
    sleep "${UAT_HOST_LOCK_HOLD_SECONDS}"
  fi
}

case "$MODE" in
  actions)
    if [[ -z "${GITHUB_REPOSITORY:-}" ]]; then
      refuse "GITHUB_REPOSITORY is required for the UAT host mutation lock"
    fi
    if [[ -n "${UAT_HOST_LOCK_RUNS_JSON:-}" ]]; then
      overlap="$(check_runs)" || {
        rc=$?
        if [[ "$rc" -eq 2 ]]; then
          refuse "Deploy UAT or another UAT rollback is already mutating the host"
        fi
        refuse "UAT host mutation lock fixture is invalid"
      }
    else
      overlap="$(fetch_runs)" || exit 1
    fi
    echo "HOST_LOCK=clear"
    echo "HOST_LOCK_SCOPE=deploy-uat"
    echo "OVERLAP=${overlap}"
    ;;
  host)
    acquire_host_lock
    ;;
  *)
    refuse "unknown UAT host mutation lock mode"
    ;;
esac
