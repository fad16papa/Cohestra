#!/usr/bin/env bash
# Exact-commit GitGuardian API scan. Never prints the API key or match bodies.
# Invoked only from the push-to-main CI job. Not used on pull_request.

set -euo pipefail
set +x

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SCAN_SHA="${SCAN_SHA:-${CANDIDATE_SHA:-HEAD}}"

hold() {
  echo "RESULT=HOLD"
  echo "HOLD_REASON=$1"
  exit 1
}

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  exit 1
}

if [[ "$SCAN_SHA" != "HEAD" ]]; then
  if [[ ! "$SCAN_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
    refuse "SCAN_SHA must be HEAD or a 40-character hexadecimal SHA"
  fi
  SCAN_SHA="${SCAN_SHA,,}"
fi

if ! git -C "$ROOT_DIR" rev-parse --verify "$SCAN_SHA^{commit}" >/dev/null 2>&1; then
  refuse "SCAN_SHA is not a commit"
fi
SCAN_SHA="$(git -C "$ROOT_DIR" rev-parse "$SCAN_SHA")"
SCAN_SHA="${SCAN_SHA,,}"

HEAD_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
HEAD_SHA="${HEAD_SHA,,}"
if [[ "$HEAD_SHA" != "$SCAN_SHA" ]]; then
  hold "HEAD does not equal SCAN_SHA"
fi

if [[ -z "${GITGUARDIAN_API_KEY:-}" ]]; then
  hold "GITGUARDIAN_API_KEY is missing"
fi

if [[ "${GITGUARDIAN_API_KEY}" =~ [[:space:]] ]]; then
  hold "GITGUARDIAN_API_KEY is malformed"
fi

if [[ -n "${GITGUARDIAN_EXIT_ZERO:-}" ]]; then
  refuse "GITGUARDIAN_EXIT_ZERO is forbidden"
fi

GGSHIELD_BIN="${GGSHIELD_BIN:-ggshield}"
if ! command -v "$GGSHIELD_BIN" >/dev/null 2>&1; then
  hold "ggshield is not available"
fi

# Fail closed: never hide findings. Official 1.56.1 has commit-range, not commit.
if [[ " $* " == *" --exit-zero "* || " $* " == *" --ignore-known-secrets "* || " $* " == *" --show-secrets "* ]]; then
  refuse "ggshield weakening flags are forbidden"
fi
if ! git -C "$ROOT_DIR" rev-parse --verify "${SCAN_SHA}^" >/dev/null 2>&1; then
  hold "SCAN_SHA has no parent; cannot form an exact-commit range"
fi

set +e
# Exact one-commit range. Do not use the event-dependent CI scan subcommand.
env -u GITGUARDIAN_EXIT_ZERO "$GGSHIELD_BIN" secret scan commit-range "${SCAN_SHA}^..${SCAN_SHA}"
gg_rc=$?
set -e

if [[ "$gg_rc" -eq 0 ]]; then
  echo "RESULT=PASS"
  echo "SCAN_SHA=${SCAN_SHA}"
  echo "SCANNER=ggshield"
  exit 0
fi

if [[ "$gg_rc" -eq 1 ]]; then
  hold "GitGuardian API scan found secrets on the exact SHA"
fi
hold "GitGuardian API scan failed closed (exit ${gg_rc})"
