"""Check-run payload builder. Does not call GitHub. Never posts soft conclusions."""

from __future__ import annotations

from .conclusions import FORBIDDEN_SOFT_EXITS
from .evaluate import EvaluationResult


class CheckPostError(Exception):
    pass


def github_check_body(result: EvaluationResult, head_sha: str) -> dict[str, object]:
    if result.conclusion.value in FORBIDDEN_SOFT_EXITS:
        raise CheckPostError("refusing to post a soft check conclusion")
    if result.check_name != "AD25-Owner-Policy":
        raise CheckPostError("refusing to post a check under any other name")
    return {
        "name": "AD25-Owner-Policy",
        "head_sha": head_sha,
        "status": "completed",
        "conclusion": result.conclusion.value,
        "output": {
            "title": result.verdict,
            "summary": "; ".join(result.reasons) or result.verdict,
        },
    }
