#!/usr/bin/env bash
# Append a previously accepted Production SHA to the host ledger.
# The real Production ledger is not written unless explicitly allowed.

set -euo pipefail

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  exit 1
}

SHA="${ACCEPTED_SHA:-${DEPLOY_SHA:-}}"
LEDGER="${COHESTRA_ACCEPTED_SHA_LEDGER:-/var/lib/cohestra-production/accepted-sha}"
REAL_LEDGER="/var/lib/cohestra-production/accepted-sha"

if [[ ! "$SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  refuse "accepted SHA must be a full 40-character hexadecimal Git SHA"
fi
SHA="${SHA,,}"

if [[ "$LEDGER" == "$REAL_LEDGER" && "${COHESTRA_WRITE_PRODUCTION_LEDGER:-}" != "true" ]]; then
  echo "RESULT=SKIP"
  echo "LEDGER_WRITE=not_executed"
  echo "REASON=46.3 must not write the real Production ledger"
  exit 0
fi

if [[ "$LEDGER" == *..* ]]; then
  refuse "ledger path must not contain .."
fi

mkdir -p "$(dirname "$LEDGER")"
touch "$LEDGER"
if grep -qx "$SHA" "$LEDGER"; then
  echo "RESULT=PASS"
  echo "LEDGER_WRITE=already_present"
  echo "ACCEPTED_SHA=${SHA}"
  exit 0
fi
printf '%s\n' "$SHA" >>"$LEDGER"
echo "RESULT=PASS"
echo "LEDGER_WRITE=appended"
echo "ACCEPTED_SHA=${SHA}"
