#!/usr/bin/env bash
# Story 46.9 — each IgnoreTenantFilters / IgnoreQueryFilters call site under
# src/Infrastructure or src/Api must match an allowlist row's path and count.
# ClientErasureService must keep its TenantId rechecks.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALLOWLIST="${ALLOWLIST:-$ROOT/deploy/tenant-filter-bypass-allowlist.txt}"

declare -A expected_count
declare -A expected_kind
declare -A seen

while read -r path count kind; do
  [[ -z "${path:-}" ]] && continue
  if [[ ! "$count" =~ ^[0-9]+$ || -z "${kind:-}" ]]; then
    echo "FAIL: allowlist row must be 'path count kind': $path $count ${kind:-}"
    exit 1
  fi
  if [[ -n "${expected_count[$path]:-}" ]]; then
    echo "FAIL: duplicate allowlist path: $path"
    exit 1
  fi
  expected_count["$path"]="$count"
  expected_kind["$path"]="$kind"
done < <(grep -vE '^[[:space:]]*(#|$)' "$ALLOWLIST" | sed 's/\r$//')

hits="$(
  grep -RIn --include='*.cs' -E 'IgnoreTenantFilters|IgnoreQueryFilters' \
    "$ROOT/src/Infrastructure" "$ROOT/src/Api" \
    | grep -v '/Tests/' \
    || true
)"

declare -A actual_count
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  rel="${line#"$ROOT/"}"
  file="${rel%%:*}"
  actual_count["$file"]=$(( ${actual_count["$file"]:-0} + 1 ))
done <<< "$hits"

fail=0
for file in "${!actual_count[@]}"; do
  seen["$file"]=1
  if [[ -z "${expected_count[$file]:-}" ]]; then
    echo "FAIL: undeclared tenant-filter bypass file: $file (${actual_count[$file]} call sites)"
    fail=$((fail + 1))
    continue
  fi
  if [[ "${actual_count[$file]}" -ne "${expected_count[$file]}" ]]; then
    echo "FAIL: call-site count for $file is ${actual_count[$file]}, allowlist says ${expected_count[$file]}"
    fail=$((fail + 1))
  fi
done

for file in "${!expected_count[@]}"; do
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "FAIL: allowlist path missing: $file"
    fail=$((fail + 1))
    continue
  fi
  if [[ -z "${seen[$file]:-}" ]]; then
    echo "FAIL: allowlist path has no bypass call site: $file"
    fail=$((fail + 1))
    continue
  fi
  if [[ "${expected_kind[$file]}" == "tenant-recheck" ]]; then
    if ! grep -q 'client.TenantId != tenantId' "$ROOT/$file"; then
      echo "FAIL: $file tenant-recheck missing client.TenantId != tenantId"
      fail=$((fail + 1))
    fi
    rechecks="$(grep -c 'TenantId == tenantId' "$ROOT/$file" || true)"
    if [[ "${rechecks:-0}" -lt 3 ]]; then
      echo "FAIL: $file tenant-recheck needs TenantId == tenantId on related deletes (found ${rechecks:-0})"
      fail=$((fail + 1))
    fi
  fi
done

if [[ "$fail" -eq 0 ]]; then
  echo "PASS: tenant-filter bypass call sites match the allowlist"
  echo "Allowlisted files: ${#expected_count[@]}"
  exit 0
fi

echo "Tenant-filter bypass allowlist: $fail failure(s)"
exit 1
