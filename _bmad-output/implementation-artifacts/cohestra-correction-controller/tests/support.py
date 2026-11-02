"""Shared fixtures for the correction controller tests."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from correction.controller import ReviewPolicy
from correction.manifest import Manifest
from correction.models import Check, PullView, RequirementEvidence, Review, TestResult, UsageEvidence

BASE = "b" * 40
H1 = "1" * 40
H2 = "2" * 40
H3 = "3" * 40
MODEL = "grok-4.7-high-fast"
AUTHOR = "owner-author"


def manifest_raw(**overrides: object) -> dict[str, object]:
    raw: dict[str, object] = {
        "acceptance_criteria": [
            "independent_reviews_green",
            "new_commit_after_correction",
            "required_checks_green",
            "scope_within_manifest",
            "tests_green",
        ],
        "allowed_paths": ["correction/"],
        "author_id": AUTHOR,
        "base_ref": "main",
        "base_sha": BASE,
        "budget": {"max_corrections": 3},
        "manifest_id": "man-536",
        "model": MODEL,
        "pull_number": 536,
        "repo": "fad16papa/Cohestra",
        "required_checks": ["ci", "gitguardian"],
        "task_id": "issue-536",
    }
    raw.update(overrides)
    return raw


def approved_manifest(**overrides: object) -> Manifest:
    return Manifest.from_dict(manifest_raw(**overrides))


def approved_policy(**extra: str) -> ReviewPolicy:
    roles = {"bmad-one": "bmad", "catsec-one": "catsec"}
    roles.update(extra)
    return ReviewPolicy(roles)


class Port:
    def __init__(self, view: PullView | Exception | None = None) -> None:
        self.view = view
        self.calls = 0
        self.is_live = False

    def pull(self, number: int) -> PullView:
        self.calls += 1
        if isinstance(self.view, Exception):
            raise self.view
        assert isinstance(self.view, PullView)
        return self.view


def checks(head: str, ci: str | None = "success", guard: str | None = "success", guard_head: str | None = None) -> tuple[Check, ...]:
    return (
        Check("ci", ci, head),
        Check("gitguardian", guard, guard_head or head),
    )


def passing_test() -> TestResult:
    return TestResult("unit", True, "correction/controller.py")


def failing_test(name: str = "unit") -> TestResult:
    return TestResult(name, False, "correction/controller.py", "expected green")


def review(
    reviewer: str,
    role: str,
    head: str,
    *,
    blocker: int = 0,
    major: int = 0,
    model: str = MODEL,
    authenticated: bool = True,
    paths: tuple[str, ...] = ("correction/controller.py",),
    authentication_source: str = "host-verified",
) -> Review:
    return Review(
        reviewer,
        role,
        head,
        blocker,
        major,
        model,
        authenticated,
        paths,
        authentication_source,
    )


def pull(
    head: str,
    *,
    tests: tuple[TestResult, ...] = (),
    check_rows: tuple[Check, ...] | None = None,
    reviews: tuple[Review, ...] = (),
    paths: tuple[str, ...] = ("correction/controller.py",),
    author: str = AUTHOR,
    repo: str = "fad16papa/Cohestra",
    number: int = 536,
    base_sha: str = BASE,
    base_ref: str = "main",
    requirement_evidence: tuple[RequirementEvidence, ...] = (),
    usage: UsageEvidence | None = None,
) -> PullView:
    stamped: list[TestResult] = []
    for test in tests:
        if test.head_sha == "":
            stamped.append(TestResult(test.name, test.passed, test.path, test.detail, head))
        else:
            stamped.append(test)
    return PullView(
        number,
        head,
        base_sha,
        base_ref,
        author,
        repo,
        check_rows if check_rows is not None else checks(head),
        reviews,
        tuple(stamped),
        paths,
        requirement_evidence,
        usage,
    )


def ready_pull(head: str) -> PullView:
    return pull(
        head,
        tests=(passing_test(),),
        reviews=(
            review("bmad-one", "bmad", head),
            review("catsec-one", "catsec", head),
        ),
    )
