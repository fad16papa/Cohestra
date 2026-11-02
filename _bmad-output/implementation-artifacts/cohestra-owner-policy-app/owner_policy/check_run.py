"""Check-run payload builder. Does not call GitHub. Never posts soft conclusions."""

from __future__ import annotations

from .conclusions import FORBIDDEN_SOFT_EXITS, CheckConclusion
from .evaluate import EvaluationResult
from .evidence import EvidenceError, confirm_published_check


class CheckPostError(Exception):
    pass


def github_check_body(
    result: EvaluationResult,
    head_sha: str,
    *,
    published_app_id: int | None = None,
    installation_app_id: int | None = None,
) -> dict[str, object]:
    if result.conclusion.value in FORBIDDEN_SOFT_EXITS:
        raise CheckPostError("refusing to post a soft check conclusion")
    if result.check_name != "AD25-Owner-Policy":
        raise CheckPostError("refusing to post a check under any other name")
    if result.conclusion is CheckConclusion.SUCCESS:
        if published_app_id is None or installation_app_id is None:
            raise CheckPostError("success check requires published app id read-back")
        try:
            confirm_published_check(
                published_app_id=published_app_id,
                installation_app_id=installation_app_id,
            )
        except EvidenceError as exc:
            raise CheckPostError(str(exc)) from exc
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
