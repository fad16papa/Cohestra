"""Immutable story manifest.

Version 1 binds a store with SHA-256 of the canonical engineering fields.
That digest is not owner authorization.

Version 2 adds a story contract: versioned requirements, a baseline check
floor, execution budgets, and an owner signature. The signature is verified
elsewhere against a host public key. This module does not sign.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
REQUIREMENT_ID_RE = re.compile(r"^[A-Z][A-Z0-9-]{1,32}$")
KEY_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
KEY_FINGERPRINT_RE = re.compile(r"^[0-9a-f]{64}$")
MANDATORY_ACCEPTANCE = (
    "tests_green",
    "required_checks_green",
    "independent_reviews_green",
    "scope_within_manifest",
    "new_commit_after_correction",
)
BASELINE_CHECKS = ("gitguardian", "integration", "regression", "security", "tdd")
ALWAYS_FORBIDDEN_PULLS = frozenset({505})
VERSION_1_BUDGET = frozenset({"max_corrections"})
VERSION_2_BUDGET = frozenset(
    {
        "max_corrections",
        "max_elapsed_seconds",
        "max_tokens",
        "max_cost_cents",
        "max_no_progress",
        "max_repeated_failures",
    }
)


class ManifestError(Exception):
    pass


@dataclass(frozen=True)
class Requirement:
    requirement_id: str
    expected_behavior: str
    evidence_kind: str
    evidence_name: str
    mandatory: bool

    def to_dict(self) -> dict[str, object]:
        return {
            "evidence_kind": self.evidence_kind,
            "evidence_name": self.evidence_name,
            "expected_behavior": self.expected_behavior,
            "mandatory": self.mandatory,
            "requirement_id": self.requirement_id,
        }


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
    manifest_version: int = 1
    requirements: tuple[Requirement, ...] = ()
    max_elapsed_seconds: int | None = None
    max_tokens: int | None = None
    max_cost_cents: int | None = None
    max_no_progress: int | None = None
    max_repeated_failures: int | None = None
    owner_key_id: str = ""
    public_key_sha256: str = ""
    owner_signature: bytes = b""

    def to_dict(self) -> dict[str, object]:
        body: dict[str, object] = {
            "acceptance_criteria": list(self.acceptance_criteria),
            "allowed_paths": list(self.allowed_paths),
            "author_id": self.author_id,
            "base_ref": self.base_ref,
            "base_sha": self.base_sha,
            "budget": {"max_corrections": self.max_corrections},
            "manifest_id": self.manifest_id,
            "model": self.model,
            "pull_number": self.pull_number,
            "repo": self.repo,
            "required_checks": list(self.required_checks),
            "task_id": self.task_id,
        }
        if self.manifest_version != 2:
            return body
        budget = body["budget"]
        assert isinstance(budget, dict)
        budget["max_cost_cents"] = self.max_cost_cents
        budget["max_elapsed_seconds"] = self.max_elapsed_seconds
        budget["max_no_progress"] = self.max_no_progress
        budget["max_repeated_failures"] = self.max_repeated_failures
        budget["max_tokens"] = self.max_tokens
        body["authorization"] = {
            "key_id": self.owner_key_id,
            "public_key_sha256": self.public_key_sha256,
            "signature": _encode_signature(self.owner_signature),
        }
        body["manifest_version"] = 2
        body["requirements"] = [item.to_dict() for item in self.requirements]
        return body

    @classmethod
    def from_dict(cls, raw: dict[str, object]) -> Manifest:
        if not isinstance(raw, dict):
            raise ManifestError("manifest contains an unknown field")
        version = raw.get("manifest_version", 1)
        if isinstance(version, bool) or not isinstance(version, int) or version not in (1, 2):
            raise ManifestError("manifest version is not supported")
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
        if "manifest_version" in raw:
            known.add("manifest_version")
        if version == 2:
            known.update({"authorization", "requirements"})
        if set(raw) - known:
            raise ManifestError("manifest contains an unknown field")
        try:
            pull = _require_int(raw["pull_number"], "pull")
            budget_raw = raw["budget"]
            allowed = _require_str_list(raw["allowed_paths"], "paths")
            criteria = _require_str_list(raw["acceptance_criteria"], "criteria")
            checks = _require_str_list(raw["required_checks"], "checks")
            texts = {key: _require_text(raw[key], key) for key in (
                "base_sha",
                "model",
                "author_id",
                "manifest_id",
                "task_id",
                "repo",
                "base_ref",
            )}
            corrections, elapsed, tokens, cost, no_progress, repeated = _budget(budget_raw, version)
            requirements, key_id, fingerprint, signature = _story_contract(raw, version)
        except ValueError as exc:
            if str(exc) == "budget":
                raise ManifestError("execution budget is outside its allowed range") from exc
            if str(exc) == "signature":
                raise ManifestError("owner signature is invalid") from exc
            raise ManifestError("manifest fields invalid") from exc
        except (KeyError, TypeError) as exc:
            raise ManifestError("manifest fields invalid") from exc
        _validate_common(
            pull=pull,
            base_sha=texts["base_sha"],
            allowed=tuple(allowed),
            criteria=tuple(criteria),
            checks=tuple(checks),
            max_corrections=corrections,
            model=texts["model"],
            author=texts["author_id"],
            manifest_id=texts["manifest_id"],
            task_id=texts["task_id"],
            repo=texts["repo"],
            base_ref=texts["base_ref"],
            version=version,
        )
        built = cls(
            manifest_id=texts["manifest_id"],
            task_id=texts["task_id"],
            repo=texts["repo"],
            pull_number=pull,
            base_sha=texts["base_sha"],
            base_ref=texts["base_ref"],
            allowed_paths=tuple(allowed),
            acceptance_criteria=tuple(criteria),
            model=texts["model"],
            required_checks=tuple(checks),
            author_id=texts["author_id"],
            max_corrections=corrections,
            digest="",
            manifest_version=version,
            requirements=tuple(requirements),
            max_elapsed_seconds=elapsed,
            max_tokens=tokens,
            max_cost_cents=cost,
            max_no_progress=no_progress,
            max_repeated_failures=repeated,
            owner_key_id=key_id,
            public_key_sha256=fingerprint,
            owner_signature=signature,
        )
        digest = hashlib.sha256(
            json.dumps(built.to_dict(), sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        return cls(
            manifest_id=built.manifest_id,
            task_id=built.task_id,
            repo=built.repo,
            pull_number=built.pull_number,
            base_sha=built.base_sha,
            base_ref=built.base_ref,
            allowed_paths=built.allowed_paths,
            acceptance_criteria=built.acceptance_criteria,
            model=built.model,
            required_checks=built.required_checks,
            author_id=built.author_id,
            max_corrections=built.max_corrections,
            digest=digest,
            manifest_version=built.manifest_version,
            requirements=built.requirements,
            max_elapsed_seconds=built.max_elapsed_seconds,
            max_tokens=built.max_tokens,
            max_cost_cents=built.max_cost_cents,
            max_no_progress=built.max_no_progress,
            max_repeated_failures=built.max_repeated_failures,
            owner_key_id=built.owner_key_id,
            public_key_sha256=built.public_key_sha256,
            owner_signature=built.owner_signature,
        )


def path_allowed(path: str, allowed: tuple[str, ...]) -> bool:
    """Match an exact allow entry. A directory prefix must end with a slash."""
    for prefix in allowed:
        if path == prefix.rstrip("/"):
            return True
        if prefix.endswith("/") and path.startswith(prefix):
            return True
    return False


def _require_text(value: object, name: str) -> str:
    if not isinstance(value, str):
        raise TypeError(name)
    return value


def _require_int(value: object, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(name)
    return value


def _require_str_list(value: object, name: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise TypeError(name)
    return list(value)


def _budget(raw: object, version: int) -> tuple[int, int | None, int | None, int | None, int | None, int | None]:
    if not isinstance(raw, dict):
        raise TypeError("budget")
    allowed = VERSION_2_BUDGET if version == 2 else VERSION_1_BUDGET
    if set(raw) - allowed:
        raise TypeError("budget")
    if version == 2 and set(raw) != VERSION_2_BUDGET:
        raise TypeError("budget")
    corrections = _require_int(raw["max_corrections"], "budget")
    if version == 1:
        return corrections, None, None, None, None, None
    return (
        corrections,
        _bounded(raw["max_elapsed_seconds"], 1, 86_400),
        _bounded(raw["max_tokens"], 1, 5_000_000),
        _bounded(raw["max_cost_cents"], 1, 100_000),
        _bounded(raw["max_no_progress"], 1, 5),
        _bounded(raw["max_repeated_failures"], 1, 5),
    )


def _bounded(value: object, low: int, high: int) -> int:
    number = _require_int(value, "budget")
    if number < low or number > high:
        raise ValueError("budget")
    return number


def _story_contract(raw: dict[str, object], version: int) -> tuple[list[Requirement], str, str, bytes]:
    if version == 1:
        return [], "", "", b""
    requirements_raw = raw["requirements"]
    authorization = raw["authorization"]
    if not isinstance(requirements_raw, list) or not requirements_raw or len(requirements_raw) > 20:
        raise TypeError("requirements")
    if not isinstance(authorization, dict) or set(authorization) != {"key_id", "public_key_sha256", "signature"}:
        raise TypeError("authorization")
    key_id = _require_text(authorization["key_id"], "key")
    fingerprint = _require_text(authorization["public_key_sha256"], "key")
    signature_text = _require_text(authorization["signature"], "signature")
    if not KEY_ID_RE.fullmatch(key_id) or not KEY_FINGERPRINT_RE.fullmatch(fingerprint):
        raise ValueError("key")
    from .authorization import decode_signature

    signature = decode_signature(signature_text)
    requirements: list[Requirement] = []
    seen: set[str] = set()
    for item in requirements_raw:
        requirements.append(_requirement(item))
        if requirements[-1].requirement_id in seen:
            raise ValueError("requirement")
        seen.add(requirements[-1].requirement_id)
    if not any(item.mandatory for item in requirements):
        raise ValueError("requirement")
    return requirements, key_id, fingerprint, signature


def _requirement(raw: object) -> Requirement:
    if not isinstance(raw, dict):
        raise TypeError("requirement")
    known = {"evidence_kind", "evidence_name", "expected_behavior", "mandatory", "requirement_id"}
    if set(raw) != known:
        raise TypeError("requirement")
    requirement_id = _require_text(raw["requirement_id"], "requirement")
    behavior = _require_text(raw["expected_behavior"], "requirement")
    kind = _require_text(raw["evidence_kind"], "requirement")
    name = _require_text(raw["evidence_name"], "requirement")
    mandatory = raw["mandatory"]
    if not isinstance(mandatory, bool):
        raise TypeError("requirement")
    if not REQUIREMENT_ID_RE.fullmatch(requirement_id):
        raise ValueError("requirement")
    if kind not in {"test", "review"}:
        raise ValueError("requirement")
    if not behavior or not name or len(behavior) > 300 or len(name) > 100:
        raise ValueError("requirement")
    if any(ch in behavior or ch in name for ch in "\n\r"):
        raise ValueError("requirement")
    return Requirement(requirement_id, behavior, kind, name, mandatory)


def _validate_common(
    *,
    pull: int,
    base_sha: str,
    allowed: tuple[str, ...],
    criteria: tuple[str, ...],
    checks: tuple[str, ...],
    max_corrections: int,
    model: str,
    author: str,
    manifest_id: str,
    task_id: str,
    repo: str,
    base_ref: str,
    version: int,
) -> None:
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
    if set(criteria) - set(MANDATORY_ACCEPTANCE):
        raise ManifestError("manifest contains an unknown acceptance criterion")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ManifestError("repo is malformed")
    if not checks or any(not item or any(ch in item for ch in "\n\r") or len(item) > 100 for item in checks):
        raise ManifestError("required checks are missing")
    if version == 2 and not set(BASELINE_CHECKS).issubset(checks):
        raise ManifestError("manifest removes a baseline check")
    if max_corrections < 1 or max_corrections > 5:
        raise ManifestError("correction budget is outside 1..5")
    if model != "grok-4.7-high-fast":
        raise ManifestError("manifest model is not the approved Grok 4.7 reviewer")
    if not manifest_id or not task_id or not author or not base_ref:
        raise ManifestError("manifest fields invalid")
    if any(ch in author or ch in manifest_id or ch in task_id or ch in base_ref for ch in "\n\r"):
        raise ManifestError("manifest fields invalid")


def _encode_signature(raw: bytes) -> str:
    import base64

    return base64.b64encode(raw).decode("ascii")
