"""Check conclusions. Fail-closed: only SUCCESS or FAILURE exist."""

from __future__ import annotations

from enum import Enum


class CheckConclusion(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"


FORBIDDEN_SOFT_EXITS = frozenset(
    {"neutral", "skipped", "cancelled", "timed_out", "action_required", "stale"}
)
