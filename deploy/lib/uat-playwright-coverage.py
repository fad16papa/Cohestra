"""Classify UAT Playwright coverage. OTP is optional; Basic and Pro are required."""

from __future__ import annotations

from typing import Any, Iterable

# Individually required. A bucket-level "any spec passed" is not enough.
REQUIRED_SCENARIOS = (
    "dedicated automation login when credentials exist",
    "Basic dashboard metrics load",
    "Basic activities room loads",
    "Basic website is Core-locked and public stub home loads",
    "Basic campaigns room is Pro-locked",
    "Pro dashboard metrics load",
    "Pro analytics room loads",
    "Pro website studio and public branding load",
    "Pro campaigns room loads without sending a blast",
)

# Desktop-only mutating walk may skip on non-desktop projects.
AUTHORIZED_SKIP_SCENARIOS = (
    "Pro create, publish, share, register, dedup, CSV, and campaign test-send",
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


def _spec_outcome(spec: dict[str, Any]) -> str:
    finals = [
        _test_final_status(test)
        for test in (spec.get("tests") or [])
        if isinstance(test, dict)
    ]
    finals = [status for status in finals if status]
    if not finals:
        return "missing"
    if any(status in FAILED for status in finals):
        return "fail"
    if all(status in PASSED for status in finals):
        return "ok"
    if any(status == "skipped" for status in finals):
        return "skipped"
    return "missing"


def _norm_title(title: str) -> str:
    return " ".join(title.strip().split())


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
            if title in AUTHORIZED_SKIP_SCENARIOS:
                continue
            outcome = _spec_outcome(spec)
            previous = found.get(title)
            if previous == "fail" or outcome == "fail":
                found[title] = "fail"
            elif previous == "ok" or outcome == "ok":
                found[title] = "ok"
            elif previous == "skipped" or outcome == "skipped":
                found[title] = "skipped"
            else:
                found[title] = outcome
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
