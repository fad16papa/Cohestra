#!/usr/bin/env bash
# Fail-closed exact-SHA secret scan of the candidate tree. No network. No tokens.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SCAN_SHA="${SCAN_SHA:-${CANDIDATE_SHA:-HEAD}}"

if [[ "$SCAN_SHA" != "HEAD" ]]; then
  if [[ ! "$SCAN_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
    echo "RESULT=REFUSE"
    echo "REFUSE_REASON=SCAN_SHA must be HEAD or a 40-character hexadecimal SHA"
    exit 1
  fi
  SCAN_SHA="${SCAN_SHA,,}"
fi

if ! git -C "$ROOT_DIR" rev-parse --verify "$SCAN_SHA^{commit}" >/dev/null 2>&1; then
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=SCAN_SHA is not a commit"
  exit 1
fi

# High-confidence leaked-credential markers only. Do not print matching lines
# (they may contain secret material). Count hits and fail closed.
PATTERN='-----BEGIN (OPENSSH |RSA |EC |DSA |ENCRYPTED )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}'

set +e
grep_out="$(git -C "$ROOT_DIR" grep -I -E -c -e "$PATTERN" "$SCAN_SHA" -- . 2>/dev/null)"
grep_rc=$?
set -e
if [[ "$grep_rc" -ge 2 ]]; then
  echo "RESULT=HOLD"
  echo "HOLD_REASON=exact-SHA secret scan failed closed (git grep error)"
  exit 1
fi
hits=0
if [[ "$grep_rc" -eq 0 ]]; then
  hits="$(printf '%s\n' "$grep_out" | awk -F: '{n+=$NF} END {print n+0}')"
fi

if [[ "${hits:-0}" -gt 0 ]]; then
  echo "RESULT=HOLD"
  echo "HOLD_REASON=exact-SHA secret scan found ${hits} matching line(s)"
  exit 1
fi

echo "RESULT=PASS"
echo "SCAN_SHA=$(git -C "$ROOT_DIR" rev-parse "$SCAN_SHA")"
echo "HITS=0"
