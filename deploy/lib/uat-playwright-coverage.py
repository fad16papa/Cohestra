"""Classify UAT Playwright coverage. OTP is optional; Basic and Pro are required."""

from __future__ import annotations

from typing import Any, Iterable

REQUIRED_BUCKETS = (
    "basic_login",
    "core_basic",
    "core_pro",
)
OPTIONAL_SUITES = ("45.5 OTP mailbox",)
PASSED = {"expected", "passed"}
FAILED = {"failed", "timedout", "timedOut", "unexpected"}


def _iter_specs(node: dict[str, Any], stack: tuple[str, ...] = ()) -> Iterable[tuple[tuple[str, ...], dict[str, Any]]]:
    title = str(node.get("title") or "").strip()
    next_stack = stack + ((title,) if title else ())
    for spec in node.get("specs") or []:
        if isinstance(spec, dict):
            yield next_stack, spec
    for child in node.get("suites") or []:
        if isinstance(child, dict):
            yield from _iter_specs(child, next_stack)


def _statuses(spec: dict[str, Any]) -> list[str]:
    statuses: list[str] = []
    for test in spec.get("tests") or []:
        if not isinstance(test, dict):
            continue
        if test.get("status"):
            statuses.append(str(test.get("status")))
        for result in test.get("results") or []:
            if isinstance(result, dict) and result.get("status"):
                statuses.append(str(result.get("status")))
    return [status.lower() for status in statuses]


def _bucket(stack: tuple[str, ...], spec: dict[str, Any]) -> str | None:
    joined = " / ".join(stack + (str(spec.get("title") or ""),))
    file_name = str(spec.get("file") or "")
    title = str(spec.get("title") or "")
    if any(name in joined for name in OPTIONAL_SUITES) or "OTP mailbox" in title:
        return "optional"
    if "operator-core-flows.spec.ts" in file_name or "19.5 operator core flows" in joined:
        if title.startswith("Pro ") or " Pro " in f" {title}":
            return "core_pro"
        if title.startswith("Basic ") or " Basic " in f" {title}":
            return "core_basic"
        return None
    if "authenticated.spec.ts" in file_name or "45.4 authenticated UAT" in joined:
        return "basic_login"
    return None


def _spec_outcome(statuses: list[str]) -> str:
    if any(status in PASSED for status in statuses):
        return "ok"
    if any(status in FAILED for status in statuses):
        return "fail"
    if any(status == "skipped" for status in statuses):
        return "skipped"
    return "missing"


def classify(raw: dict[str, Any] | None) -> str:
    """Return ok, missing_required, skipped_required, or fail."""
    if not isinstance(raw, dict):
        return "missing_required"
    suites = raw.get("suites")
    if not isinstance(suites, list) or not suites:
        return "missing_required"
    found: dict[str, list[str]] = {name: [] for name in REQUIRED_BUCKETS}
    for suite in suites:
        if not isinstance(suite, dict):
            continue
        for stack, spec in _iter_specs(suite):
            key = _bucket(stack, spec)
            if key in found:
                found[key].append(_spec_outcome(_statuses(spec)))
    for name in REQUIRED_BUCKETS:
        outcomes = found[name]
        if not outcomes:
            return "missing_required"
        if any(item == "ok" for item in outcomes):
            continue
        if any(item == "fail" for item in outcomes):
            return "fail"
        if any(item == "skipped" for item in outcomes):
            return "skipped_required"
        return "missing_required"
    return "ok"


def authenticated_skipped(raw: dict[str, Any] | None) -> bool:
    return classify(raw) in {"missing_required", "skipped_required"}
