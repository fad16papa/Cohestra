#!/usr/bin/env bash
# Story 46.9 — fail if a new IgnoreTenantFilters / IgnoreQueryFilters call site
# appears under src/Infrastructure or src/Api without an allowlist entry.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALLOWLIST="$ROOT/deploy/tenant-filter-bypass-allowlist.txt"

mapfile -t allowed < <(grep -vE '^[[:space:]]*(#|$)' "$ALLOWLIST" | sed 's/\r$//' | sort -u)

hits="$(
  grep -RIn --include='*.cs' -E 'IgnoreTenantFilters|IgnoreQueryFilters' \
    "$ROOT/src/Infrastructure" "$ROOT/src/Api" \
    | grep -v '/Tests/' \
    || true
)"

undeclared=0
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  rel="${line#"$ROOT/"}"
  file="${rel%%:*}"
  found=0
  for allowed_file in "${allowed[@]}"; do
    if [[ "$file" == "$allowed_file" ]]; then
      found=1
      break
    fi
  done
  if [[ "$found" -eq 0 ]]; then
    echo "FAIL: undeclared tenant-filter bypass: $rel"
    undeclared=$((undeclared + 1))
  fi
done <<< "$hits"

missing=0
for allowed_file in "${allowed[@]}"; do
  if [[ ! -f "$ROOT/$allowed_file" ]]; then
    echo "FAIL: allowlist path missing: $allowed_file"
    missing=$((missing + 1))
    continue
  fi
  if ! grep -qE 'IgnoreTenantFilters|IgnoreQueryFilters' "$ROOT/$allowed_file"; then
    echo "FAIL: allowlist path no longer bypasses filters: $allowed_file"
    missing=$((missing + 1))
  fi
done

if [[ "$undeclared" -eq 0 && "$missing" -eq 0 ]]; then
  echo "PASS: tenant-filter bypass allowlist matches src/Infrastructure + src/Api"
  echo "Allowlisted files: ${#allowed[@]}"
  exit 0
fi

echo "Tenant-filter bypass allowlist: $undeclared undeclared, $missing stale"
exit 1
