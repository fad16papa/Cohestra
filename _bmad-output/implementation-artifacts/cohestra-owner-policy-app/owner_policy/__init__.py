"""Cohestra Owner-Policy App — reference evaluator.

This package is a reviewable prototype. Runtime authority must live in a
separate owner-controlled repository and GitHub App. Cohestra CI must never
import this package as an authorization root.
"""

from .conclusions import CheckConclusion
from .evaluate import EvaluationRequest, EvaluationResult, evaluate
from .evidence import GitHubSnapshot, evaluate_snapshot

__all__ = [
    "CheckConclusion",
    "EvaluationRequest",
    "EvaluationResult",
    "GitHubSnapshot",
    "evaluate",
    "evaluate_snapshot",
]
