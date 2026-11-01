"""Classify UAT Playwright coverage. OTP is optional; Basic/Pro are required."""

from __future__ import annotations

from typing import Any, Iterable

REQUIRED_SUITES = (
    "45.4 authenticated UAT",
    "19.5 operator core flows",
)
OPTIONAL_SUITES = ("45.5 OTP mailbox",)


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
            statuses.append(str(test.get("status")).lower())
        for result in test.get("results") or []:
            if isinstance(result, dict) and result.get("status"):
                statuses.append(str(result.get("status")).lower())
    return statuses


def _suite_key(stack: tuple[str, ...], spec: dict[str, Any]) -> str | None:
    joined = " / ".join(stack + (str(spec.get("title") or ""),))
    file_name = str(spec.get("file") or "")
    title = str(spec.get("title") or "")
    if any(name in joined for name in OPTIONAL_SUITES) or "OTP mailbox" in title:
        return "optional"
    if "operator-core-flows.spec.ts" in file_name or "19.5 operator core flows" in joined:
        return "19.5 operator core flows"
    if "authenticated.spec.ts" in file_name or "45.4 authenticated UAT" in joined:
        return "45.4 authenticated UAT"
    return None


def classify(raw: dict[str, Any] | None) -> str:
    """Return ok, missing_required, skipped_required, or fail."""
    if not isinstance(raw, dict):
        return "missing_required"
    found: dict[str, list[str]] = {name: [] for name in REQUIRED_SUITES}
    suites = raw.get("suites")
    if not isinstance(suites, list) or not suites:
        return "missing_required"
    for suite in suites:
        if not isinstance(suite, dict):
            continue
        for stack, spec in _iter_specs(suite):
            key = _suite_key(stack, spec)
            if key in found:
                found[key].extend(_statuses(spec) or ["missing"])
    for name, statuses in found.items():
        if not statuses:
            return "missing_required"
        if any(status in {"failed", "timedout", "unexpected"} for status in statuses):
            return "fail"
        if any(status in {"expected", "passed"} for status in statuses):
            continue
        if any(status == "skipped" for status in statuses):
            return "skipped_required"
    return "ok"


def authenticated_skipped(raw: dict[str, Any] | None) -> bool:
    return classify(raw) in {"missing_required", "skipped_required"}
