#!/usr/bin/env python3
"""Point UAT .env four Paddle price slots at canonical sandbox V2 IDs.

Does not PATCH subscriptions, archive old prices, or rewrite tenants.
Run on the UAT droplet after owner authorization, then recreate only
cohestra-uat-api via: bash deploy/uat-compose.sh up -d api
"""

from __future__ import annotations

import os
import shutil
import sys
from datetime import datetime, timezone

ENV_PATH = os.environ.get("COHESTRA_ENV_PATH", ".env")

# Current obsolete UAT suffixes (read-only resolve 2026-10-14). Refuse if drift.
OLD_SUFFIX = {
    "Paddle__PriceCoreMonthly": "erv34a",
    "Paddle__PriceCoreAnnual": "kz62r6",
    "Paddle__PriceProMonthly": "mh2b84",
    "Paddle__PriceProAnnual": "46q4gy",
}

NEW_ID = {
    "Paddle__PriceCoreMonthly": "pri_01m4x7btd32z57bxb0kb6es9vc",
    "Paddle__PriceCoreAnnual": "pri_01m4x7bvaeb52f5hf1shdrhkr4",
    "Paddle__PriceProMonthly": "pri_01m4x7bwwg0mpg0skgxwjfxne5",
    "Paddle__PriceProAnnual": "pri_01m4x7bza2hj3kbmgy5mm754cd",
}


def refuse(message: str) -> None:
    print("STOP:", message, file=sys.stderr)
    raise SystemExit(2)


def suffix(value: str) -> str:
    return value[-6:] if value else "MISSING"


def parse_env_line(line: str) -> tuple[str | None, str | None]:
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        return None, None
    key, value = stripped.split("=", 1)
    return key.strip(), value.strip().strip("'").strip('"')


def main() -> None:
    if os.environ.get("Paddle__Environment", "").lower() != "sandbox":
        refuse("Paddle__Environment is not sandbox")
    if "sdbx" not in os.environ.get("Paddle__ApiKey", ""):
        refuse("API key is not sandbox format")
    if not os.path.isfile(ENV_PATH):
        refuse("missing " + ENV_PATH)

    with open(ENV_PATH, encoding="utf-8", errors="replace") as handle:
        lines = handle.readlines()

    current: dict[str, str] = {}
    for line in lines:
        key, value = parse_env_line(line)
        if key in NEW_ID and value:
            current[key] = value

    missing = [key for key in NEW_ID if key not in current]
    if missing:
        refuse("env missing slots: " + ", ".join(missing))

    already = all(current[key] == NEW_ID[key] for key in NEW_ID)
    if already:
        print("ALREADY APPLIED")
        for key in NEW_ID:
            print("SLOT", key, "suffix=" + suffix(current[key]), "state=V2")
        print("NO ENV WRITE")
        return

    for key, expected in OLD_SUFFIX.items():
        got = suffix(current[key])
        if got != expected:
            refuse(f"{key} suffix {got} != expected obsolete {expected}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = ENV_PATH + ".bak.canonical-v2-" + stamp
    shutil.copy2(ENV_PATH, backup)
    print("BACKUP", os.path.basename(backup))

    replaced = 0
    out: list[str] = []
    for line in lines:
        key, _value = parse_env_line(line)
        if key in NEW_ID:
            newline = f"{key}={NEW_ID[key]}\n"
            if not line.endswith("\n"):
                newline = newline.rstrip("\n")
            out.append(newline)
            replaced += 1
            print("REPLACE", key, "from=" + suffix(current[key]), "to=" + suffix(NEW_ID[key]))
        else:
            out.append(line)

    if replaced != 4:
        refuse(f"expected 4 replacements, got {replaced}; backup left at {backup}")

    tmp = ENV_PATH + ".tmp.canonical-v2"
    with open(tmp, "w", encoding="utf-8") as handle:
        handle.writelines(out)
    os.replace(tmp, ENV_PATH)

    with open(ENV_PATH, encoding="utf-8", errors="replace") as handle:
        verify_lines = handle.readlines()
    verify: dict[str, str] = {}
    for line in verify_lines:
        key, value = parse_env_line(line)
        if key in NEW_ID and value:
            verify[key] = value
    for key, expected in NEW_ID.items():
        if verify.get(key) != expected:
            refuse(f"post-write {key} suffix {suffix(verify.get(key) or '')} mismatch")

    print("ENV WRITE PASS")
    print("RECREATE ONLY cohestra-uat-api NEXT")
    print("NO SUBSCRIPTION PATCH")
    print("NO TENANT WRITE")


if __name__ == "__main__":
    main()
