#!/usr/bin/env python3
"""Create Cohestra launch-canonical Paddle SANDBOX V2 prices. Read .env from cwd.

Does not edit .env, archive old prices, PATCH subscriptions, or touch tenants.
Run on the UAT droplet after: set -a && source .env && set +a
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://sandbox-api.paddle.com"
CORE_SUFFIX = "46dxfh"
PRO_SUFFIX = "f8fvb0"

CANONICAL = (
    {
        "slot": "CORE MONTHLY V2",
        "product": "Cohestra Core",
        "product_suffix": CORE_SUFFIX,
        "name": "Core Monthly",
        "description": "Core Monthly — Launch Canonical — 30-day trial",
        "amount": "1499",
        "dollars": 14.99,
        "interval": "month",
    },
    {
        "slot": "CORE ANNUAL V2",
        "product": "Cohestra Core",
        "product_suffix": CORE_SUFFIX,
        "name": "Core Yearly",
        "description": "Core Annual — Launch Canonical — 30-day trial",
        "amount": "15292",
        "dollars": 152.92,
        "interval": "year",
    },
    {
        "slot": "PRO MONTHLY V2",
        "product": "Cohestra Pro",
        "product_suffix": PRO_SUFFIX,
        "name": "Pro Monthly",
        "description": "Pro Monthly — Launch Canonical — 30-day trial",
        "amount": "2999",
        "dollars": 29.99,
        "interval": "month",
    },
    {
        "slot": "PRO ANNUAL V2",
        "product": "Cohestra Pro",
        "product_suffix": PRO_SUFFIX,
        "name": "Pro Yearly",
        "description": "Pro Annual — Launch Canonical — 30-day trial",
        "amount": "30593",
        "dollars": 305.93,
        "interval": "year",
    },
)


def refuse(message: str) -> None:
    print("STOP:", message, file=sys.stderr)
    raise SystemExit(2)


def api_key() -> str:
    if os.environ.get("Paddle__Environment", "").lower() != "sandbox":
        refuse("Paddle__Environment is not sandbox")
    key = os.environ.get("Paddle__ApiKey", "").split()[0]
    if "sdbx" not in key:
        refuse("API key is not sandbox format")
    if "live" in key.lower() and "sdbx" not in key:
        refuse("API key classified live")
    return key


def request(method: str, path: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        BASE + path,
        data=data,
        method=method,
        headers={
            "Authorization": "Bearer " + api_key(),
            "Paddle-Version": "1",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:800]
        print("HTTP", error.code, method, path.split("?")[0], file=sys.stderr)
        print(detail, file=sys.stderr)
        raise


def list_all(path: str) -> list[dict]:
    rows: list[dict] = []
    after = None
    while True:
        query = path + (("&after=" + after) if after else "")
        payload = request("GET", query)
        rows.extend(payload.get("data") or [])
        pagination = (payload.get("meta") or {}).get("pagination") or {}
        if not pagination.get("has_more"):
            break
        after = pagination.get("next") or (rows[-1].get("id") if rows else None)
        if not after:
            break
    return rows


def money(price: dict) -> float | None:
    amount = (price.get("unit_price") or {}).get("amount")
    return (int(amount) / 100) if str(amount).isdigit() else None


def cycle(price: dict) -> tuple[str | None, int | None]:
    billing = price.get("billing_cycle") or {}
    return billing.get("interval"), billing.get("frequency")


def trial_ok(price: dict) -> bool:
    trial = price.get("trial_period") or {}
    unit = trial.get("unit_price")
    paid = bool(unit and unit.get("amount") not in (None, "", "0"))
    return (
        trial.get("interval") == "day"
        and trial.get("frequency") == 30
        and trial.get("requires_payment_method") is True
        and not paid
    )


def is_canonical(price: dict, spec: dict) -> bool:
    interval, frequency = cycle(price)
    return (
        price.get("status") == "active"
        and money(price) == spec["dollars"]
        and (price.get("unit_price") or {}).get("currency_code") == "USD"
        and interval == spec["interval"]
        and frequency == 1
        and trial_ok(price)
    )


def verify_product(product_id: str, expected_name: str, expected_suffix: str) -> dict:
    product = request("GET", "/products/" + product_id)["data"]
    name = product.get("name")
    suffix = (product.get("id") or "")[-6:]
    print("PRODUCT", expected_name, "suffix=" + suffix, "status=" + str(product.get("status")), "name=" + str(name))
    if suffix != expected_suffix:
        refuse(f"product suffix {suffix} != {expected_suffix}")
    if name != expected_name:
        refuse(f"product name {name!r} != {expected_name!r}")
    if product.get("status") != "active":
        refuse(f"product {expected_name} is not active")
    return product


def find_product_id(suffix: str) -> str:
    for product in list_all("/products?per_page=50"):
        if (product.get("id") or "").endswith(suffix):
            return product["id"]
    refuse("could not resolve product suffix " + suffix)


def read_back(price_id: str, spec: dict) -> dict:
    price = request("GET", "/prices/" + price_id)["data"]
    ok = is_canonical(price, spec)
    print(
        "READBACK",
        spec["slot"],
        "suffix=" + price_id[-6:],
        "status=" + str(price.get("status")),
        "amount=" + str(money(price)),
        "interval=" + str(cycle(price)[0]),
        "trial=" + ("30 DAYS" if trial_ok(price) else "FAIL"),
        "result=" + ("PASS" if ok else "FAIL"),
    )
    if not ok:
        refuse("GET read-back did not match canonical spec for " + spec["slot"])
    return price


def main() -> None:
    print("PADDLE ENVIRONMENT SANDBOX")
    core_id = find_product_id(CORE_SUFFIX)
    pro_id = find_product_id(PRO_SUFFIX)
    verify_product(core_id, "Cohestra Core", CORE_SUFFIX)
    verify_product(pro_id, "Cohestra Pro", PRO_SUFFIX)

    created = 0
    reused = 0
    results: list[tuple[str, str, str]] = []

    for spec in CANONICAL:
        product_id = core_id if spec["product_suffix"] == CORE_SUFFIX else pro_id
        existing = list_all("/prices?per_page=50&product_id=" + urllib.parse.quote(product_id))
        matches = [price for price in existing if is_canonical(price, spec)]
        if matches:
            price_id = matches[0]["id"]
            print("REUSE", spec["slot"], "suffix=" + price_id[-6:])
            read_back(price_id, spec)
            reused += 1
            results.append((spec["slot"], "REUSED", price_id[-6:]))
            continue

        payload = {
            "description": spec["description"],
            "name": spec["name"],
            "product_id": product_id,
            "unit_price": {"amount": spec["amount"], "currency_code": "USD"},
            "billing_cycle": {"interval": spec["interval"], "frequency": 1},
            "trial_period": {
                "interval": "day",
                "frequency": 30,
                "requires_payment_method": True,
            },
        }
        created_price = request("POST", "/prices", payload)["data"]
        price_id = created_price["id"]
        print("CREATED", spec["slot"], "suffix=" + price_id[-6:])
        read_back(price_id, spec)
        created += 1
        results.append((spec["slot"], "CREATED", price_id[-6:]))

    print("OLD PRICES UNCHANGED")
    print("CREATED_COUNT", created)
    print("REUSED_COUNT", reused)
    for slot, action, suffix in results:
        print("MATRIX", slot, action, "suffix=" + suffix)
    print("CANONICAL FOUR-PRICE MATRIX PASS")


if __name__ == "__main__":
    main()
