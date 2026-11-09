"""Classify live UAT Playwright coverage for basic_beta.

OTP may skip. Basic scenarios are required on every recorded project.
Two CAPTCHA probes are required on desktop and may skip on the other viewport.
Pro live end-to-end is NOT_TESTED. A skip or a pass of a Pro title is not a
Pro success and is not full Basic/Core/Pro market readiness.
"""

from __future__ import annotations

from typing import Any, Iterable

ACCEPTANCE_SCOPE = "basic_beta"
PRO_LIVE_STATUS = "NOT_TESTED"
MARKET_READINESS = "not_claimed"

# Individually required. A bucket-level "any spec passed" is not enough.
REQUIRED_SCENARIOS = (
    "dedicated automation login when credentials exist",
    "Basic dashboard metrics load",
    "Basic activities room loads",
    "Basic website is Core-locked and public stub home loads",
    "Basic campaigns room is Pro-locked",
    "does not solve a live Google challenge",
    "empty CAPTCHA token is rejected",
    "invalid CAPTCHA token is rejected",
)

# One bounded probe per deploy. Another viewport may skip. A total skip may not.
DESKTOP_ONLY_REQUIRED = (
    "empty CAPTCHA token is rejected",
    "invalid CAPTCHA token is rejected",
)

OPTIONAL_SUITES = ("45.5 OTP mailbox",)
PASSED = {"expected", "passed", "flaky"}
FAILED = {"failed", "timedout", "timedout", "timedOut", "unexpected"}


def _iter_specs(node: dict[str, Any], stack: tuple[str, ...] = ()) -> Iterable[tuple[tuple[str, ...], dict[str, Any]]]:
    title = str(node.get("title") or "").strip()
    next_stack = stack + ((title,) if title else ())
    for spec in node.get("specs") or []:
        if isinstance(spec, dict):
            yield next_stack, spec
    for child in node.get("suites") or []:
        if isinstance(child, dict):
            yield from _iter_specs(child, next_stack)


def _is_optional(stack: tuple[str, ...], spec: dict[str, Any]) -> bool:
    joined = " / ".join(stack + (str(spec.get("title") or ""),))
    title = str(spec.get("title") or "")
    return any(name in joined for name in OPTIONAL_SUITES) or "OTP mailbox" in title


def _test_final_status(test: dict[str, Any]) -> str:
    """Use Playwright's final test.status, else the last retry result only."""
    overall = str(test.get("status") or "").strip().lower()
    results = [
        str(result.get("status") or "").strip().lower()
        for result in (test.get("results") or [])
        if isinstance(result, dict) and result.get("status")
    ]
    last = results[-1] if results else ""
    return overall or last


def _final_statuses(spec: dict[str, Any]) -> list[str]:
    return [
        status
        for status in (
            _test_final_status(test)
            for test in (spec.get("tests") or [])
            if isinstance(test, dict)
        )
        if status
    ]


def _spec_outcome(spec: dict[str, Any]) -> str:
    finals = _final_statuses(spec)
    if not finals:
        return "missing"
    if any(status in FAILED for status in finals):
        return "fail"
    if all(status in PASSED for status in finals):
        return "ok"
    if any(status == "skipped" for status in finals):
        return "skipped"
    return "missing"


def _spec_outcome_desktop_only(spec: dict[str, Any]) -> str:
    """A passing desktop probe covers the check. Every project skipped does not."""
    finals = _final_statuses(spec)
    if not finals:
        return "missing"
    if any(status in FAILED for status in finals):
        return "fail"
    if any(status in PASSED for status in finals):
        return "ok"
    if any(status == "skipped" for status in finals):
        return "skipped"
    return "missing"


def pro_live_status(_raw: dict[str, Any] | None = None) -> str:
    """Live Pro coverage is outside basic_beta. Never promote a skip or a pass."""
    return PRO_LIVE_STATUS


def _norm_title(title: str) -> str:
    return " ".join(title.strip().split())


def _worse(previous: str | None, outcome: str) -> str:
    """A passing copy must not hide a skipped, failed, or missing copy."""
    rank = {"fail": 3, "skipped": 2, "missing": 1, "ok": 0}
    if previous is None:
        return outcome
    previous_rank = rank.get(previous, 1)
    outcome_rank = rank.get(outcome, 1)
    return outcome if outcome_rank > previous_rank else previous


def classify(raw: dict[str, Any] | None) -> str:
    """Return ok, missing_required, skipped_required, or fail."""
    if not isinstance(raw, dict):
        return "missing_required"
    suites = raw.get("suites")
    if not isinstance(suites, list) or not suites:
        return "missing_required"
    found: dict[str, str] = {}
    for suite in suites:
        if not isinstance(suite, dict):
            continue
        for stack, spec in _iter_specs(suite):
            title = _norm_title(str(spec.get("title") or ""))
            if not title or _is_optional(stack, spec):
                continue
            if title in DESKTOP_ONLY_REQUIRED:
                outcome = _spec_outcome_desktop_only(spec)
            else:
                outcome = _spec_outcome(spec)
            if title not in REQUIRED_SCENARIOS:
                continue
            found[title] = _worse(found.get(title), outcome)
    for required in REQUIRED_SCENARIOS:
        outcome = found.get(required)
        if outcome is None:
            return "missing_required"
        if outcome == "fail":
            return "fail"
        if outcome == "skipped":
            return "skipped_required"
        if outcome != "ok":
            return "missing_required"
    return "ok"


def authenticated_skipped(raw: dict[str, Any] | None) -> bool:
    return classify(raw) in {"missing_required", "skipped_required"}
