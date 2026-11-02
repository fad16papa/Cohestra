"""Immutable owner-approved story manifest. The file is the only permission."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
MANDATORY_ACCEPTANCE = (
    "tests_green",
    "required_checks_green",
    "independent_reviews_green",
    "scope_within_manifest",
    "new_commit_after_correction",
)
ALWAYS_FORBIDDEN_PULLS = frozenset({505})


class ManifestError(Exception):
    pass


@dataclass(frozen=True)
class Manifest:
    manifest_id: str
    task_id: str
    repo: str
    pull_number: int
    base_sha: str
    base_ref: str
    allowed_paths: tuple[str, ...]
    acceptance_criteria: tuple[str, ...]
    model: str
    required_checks: tuple[str, ...]
    author_id: str
    max_corrections: int
    digest: str

    @classmethod
    def from_dict(cls, raw: dict[str, object]) -> Manifest:
        known = {
            "acceptance_criteria",
            "allowed_paths",
            "author_id",
            "base_ref",
            "base_sha",
            "budget",
            "manifest_id",
            "model",
            "pull_number",
            "repo",
            "required_checks",
            "task_id",
        }
        if not isinstance(raw, dict) or set(raw) - known:
            raise ManifestError("manifest contains an unknown field")
        try:
            pull_raw = raw["pull_number"]
            budget_raw = raw["budget"]
            if not isinstance(budget_raw, dict) or set(budget_raw) - {"max_corrections"}:
                raise TypeError("budget")
            corrections_raw = budget_raw["max_corrections"]
            if isinstance(pull_raw, bool) or not isinstance(pull_raw, int):
                raise TypeError("pull")
            if isinstance(corrections_raw, bool) or not isinstance(corrections_raw, int):
                raise TypeError("budget")
            if not isinstance(raw["allowed_paths"], list) or not all(isinstance(item, str) for item in raw["allowed_paths"]):
                raise TypeError("paths")
            if not isinstance(raw["acceptance_criteria"], list) or not all(
                isinstance(item, str) for item in raw["acceptance_criteria"]
            ):
                raise TypeError("criteria")
            if not isinstance(raw["required_checks"], list) or not all(
                isinstance(item, str) for item in raw["required_checks"]
            ):
                raise TypeError("checks")
            for key in ("base_sha", "model", "author_id", "manifest_id", "task_id", "repo", "base_ref"):
                if not isinstance(raw[key], str):
                    raise TypeError(key)
            pull = pull_raw
            allowed = tuple(raw["allowed_paths"])
            criteria = tuple(raw["acceptance_criteria"])
            checks = tuple(raw["required_checks"])
            max_corrections = corrections_raw
            base_sha = raw["base_sha"]
            model = raw["model"]
            author = raw["author_id"]
            manifest_id = raw["manifest_id"]
            task_id = raw["task_id"]
            repo = raw["repo"]
            base_ref = raw["base_ref"]
        except (KeyError, TypeError, ValueError) as exc:
            raise ManifestError("manifest fields invalid") from exc
        if pull in ALWAYS_FORBIDDEN_PULLS or pull < 1:
            raise ManifestError("pull number is not an approved task")
        if not SHA_RE.fullmatch(base_sha):
            raise ManifestError("base sha is not 40-char lowercase hex")
        if not allowed or any(not item or item.startswith("/") or ".." in item.split("/") for item in allowed):
            raise ManifestError("allowed paths are empty or unsafe")
        if len(criteria) != len(set(criteria)):
            raise ManifestError("manifest repeats an acceptance criterion")
        if not set(MANDATORY_ACCEPTANCE).issubset(criteria):
            raise ManifestError("manifest omits a mandatory acceptance criterion")
        unknown = set(criteria) - set(MANDATORY_ACCEPTANCE)
        if unknown:
            raise ManifestError("manifest contains an unknown acceptance criterion")
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
            raise ManifestError("repo is malformed")
        if not checks or any(not item or any(ch in item for ch in "\n\r") or len(item) > 100 for item in checks):
            raise ManifestError("required checks are missing")
        if max_corrections < 1 or max_corrections > 5:
            raise ManifestError("correction budget is outside 1..5")
        if model != "grok-4.7-high-fast":
            raise ManifestError("manifest model is not the approved Grok 4.7 reviewer")
        if not manifest_id or not task_id or not author or not base_ref:
            raise ManifestError("manifest fields invalid")
        if any(ch in author or ch in manifest_id or ch in task_id or ch in base_ref for ch in "\n\r"):
            raise ManifestError("manifest fields invalid")
        body = {
            "acceptance_criteria": list(criteria),
            "allowed_paths": list(allowed),
            "author_id": author,
            "base_ref": base_ref,
            "base_sha": base_sha,
            "budget": {"max_corrections": max_corrections},
            "manifest_id": manifest_id,
            "model": model,
            "pull_number": pull,
            "repo": repo,
            "required_checks": list(checks),
            "task_id": task_id,
        }
        digest = hashlib.sha256(
            json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        return cls(
            manifest_id=manifest_id,
            task_id=task_id,
            repo=repo,
            pull_number=pull,
            base_sha=base_sha,
            base_ref=base_ref,
            allowed_paths=allowed,
            acceptance_criteria=criteria,
            model=model,
            required_checks=checks,
            author_id=author,
            max_corrections=max_corrections,
            digest=digest,
        )


def path_allowed(path: str, allowed: tuple[str, ...]) -> bool:
    return any(path == prefix or path.startswith(prefix.rstrip("/") + "/") for prefix in allowed)
