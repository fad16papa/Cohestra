"""Cohestra Owner-Policy App — reference evaluator.

This package is a reviewable prototype. Runtime authority must live in a
separate owner-controlled repository and GitHub App. Cohestra CI must never
import this package as an authorization root.
"""

from .evaluate import EvaluationRequest, EvaluationResult, evaluate
from .conclusions import CheckConclusion

__all__ = [
    "CheckConclusion",
    "EvaluationRequest",
    "EvaluationResult",
    "evaluate",
]
