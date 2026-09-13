#!/usr/bin/env bash
# Read-only: verify public TXT for Cohestra UAT DNS-01 (run on droplet).
set -euo pipefail

TXT_NAME="${1:-_acme-challenge.uat.cohestra.app}"
EXPECTED="${2:-}"

echo "TXT name: ${TXT_NAME}"
for resolver in 8.8.8.8 1.1.1.1; do
  echo "--- @${resolver} ---"
  out=$(dig +short TXT "$TXT_NAME" @"$resolver" 2>/dev/null || true)
  echo "${out:-<no answer>}"
  if [[ -n "$EXPECTED" && "$out" == *"$EXPECTED"* ]]; then
    echo "MATCH expected token"
  fi
done
