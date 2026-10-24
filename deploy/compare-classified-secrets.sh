#!/usr/bin/env bash
# Compare two classified secret inventories (names + 4-char suffixes only).
# Never accepts or prints full secret values.
#
# Usage:
#   bash deploy/compare-classified-secrets.sh <uat-file> <production-file>
set -euo pipefail

if [[ "${1:-}" == "" || "${2:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  echo "Usage: bash deploy/compare-classified-secrets.sh <uat-classified> <production-classified>"
  echo "Each file: NAME<TAB>suffix  where suffix is exactly 4 [A-Za-z0-9] characters."
  echo "Do not put full secret values in these files."
  exit 2
fi

uat_file="$1"
prod_file="$2"

if [[ ! -f "$uat_file" || ! -f "$prod_file" ]]; then
  echo "REFUSE: classified inventory file is missing."
  exit 1
fi

parse() {
  python3 - "$1" <<'PY'
import re, sys
path = sys.argv[1]
pat = re.compile(r"^[A-Za-z0-9_.]+$")
suf = re.compile(r"^[A-Za-z0-9]{4}$")
seen = {}
for raw in open(path, encoding="utf-8"):
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    if "\t" not in line:
        print("INVALID_LINE", file=sys.stderr)
        sys.exit(1)
    name, suffix = line.split("\t", 1)
    name, suffix = name.strip(), suffix.strip()
    if not pat.match(name) or not suf.match(suffix):
        print("INVALID_ENTRY", file=sys.stderr)
        sys.exit(1)
    if len(suffix) != 4:
        print("VALUE_TOO_LONG", file=sys.stderr)
        sys.exit(1)
    if name in seen:
        print("DUPLICATE_NAME", file=sys.stderr)
        sys.exit(1)
    seen[name] = suffix
if not seen:
    print("EMPTY_INVENTORY", file=sys.stderr)
    sys.exit(1)
for name in sorted(seen):
    print(f"{name}\t{seen[name]}")
PY
}

uat_err="$(mktemp)"
prod_err="$(mktemp)"
trap 'rm -f "$uat_err" "$prod_err"' EXIT

set +e
uat_parsed="$(parse "$uat_file" 2>"$uat_err")"
uat_rc=$?
prod_parsed="$(parse "$prod_file" 2>"$prod_err")"
prod_rc=$?
set -e

if [[ "$uat_rc" -ne 0 || "$prod_rc" -ne 0 ]]; then
  echo "REFUSE: classified inventory must be NAME<TAB>4-char-suffix only."
  echo "OWNER_GATE=classified_inventory_invalid"
  exit 1
fi

python3 - "$uat_parsed" "$prod_parsed" <<'PY'
import sys
def load(blob):
    out = {}
    for line in blob.splitlines():
        if not line.strip():
            continue
        name, suffix = line.split("\t", 1)
        out[name] = suffix
    return out

uat = load(sys.argv[1])
prod = load(sys.argv[2])
shared = sorted(set(uat) & set(prod))
collisions = [name for name in shared if uat[name] == prod[name]]
print(f"CLASSIFIED_NAMES_UAT={len(uat)}")
print(f"CLASSIFIED_NAMES_PRODUCTION={len(prod)}")
print(f"CLASSIFIED_NAMES_OVERLAP={len(shared)}")
if collisions:
    print("OWNER_GATE=shared_classified_suffix")
    for name in collisions:
        print(f"SHARED_SECRET_NAME={name}")
    print("REFUSE: UAT and Production classified suffixes collide.")
    print("Do not reuse UAT secret values on Production.")
    sys.exit(1)
print("CLASSIFIED_ISOLATION=PASS")
print("OWNER_GATE=synthetic_or_owner_classified_check")
print("No overlapping name+suffix pairs. Values were not printed.")
PY
