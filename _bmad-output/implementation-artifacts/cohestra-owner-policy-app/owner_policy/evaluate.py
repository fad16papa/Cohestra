"""Fail-closed evaluator. App-bundled policy only. No git-blob exec.

Direct EvaluationRequest objects are refused. The host must call
evidence.evaluate_snapshot, which is the only code allowed to mint a seal.
A seal is an in-process guard. It is not a live GitHub proof.
"""

from __future__ import annotations

from dataclasses import dataclass

from hashlib import sha256

from .attestation import AttestationError, Comment, verify_attestation
from .conclusions import CheckConclusion
from .paths import PathError, canonicalize_repo_path, control_filename_reason, secret_path_reason
from .policy import BundledPolicy, PolicyError, is_control_plane_path, load_policy
from .seal import SEAL

SHA_LEN = 40


class EvaluationError(Exception):
    pass


@dataclass(frozen=True)
class EvaluationRequest:
    repo: str
    pull_number: int
    head_sha: str
    base_ref: str
    dest_parent_sha: str | None
    changed_paths: tuple[str, ...]
    source_blobs: dict[str, str]
    dest_blobs: dict[str, str]
    comments: tuple[Comment, ...]
    hmac_secrets: tuple[str, ...]
    now_unix: int
    posting_integration_id: int | None
    expected_integration_id: int | None
    check_name: str
    merge_base_sha: str | None = None
    source_ref: str | None = None
    dest_ref: str | None = None
    requested_environments: tuple[str, ...] = ()
    requested_secret_names: tuple[str, ...] = ()
    spoof_integration_id: int | None = None
    seal: object = None


@dataclass(frozen=True)
class EvaluationResult:
    conclusion: CheckConclusion
    verdict: str
    reasons: tuple[str, ...]
    check_name: str
    head_sha: str = ""

    def as_github_check(self) -> dict[str, str]:
        raise EvaluationError("post checks through github_check_body")


def _fail(policy: BundledPolicy, head_sha: str, verdict: str, *reasons: str) -> EvaluationResult:
    return EvaluationResult(
        conclusion=CheckConclusion.FAILURE,
        verdict=verdict,
        reasons=reasons,
        check_name=policy.check_name,
        head_sha=head_sha,
    )


def _ok(policy: BundledPolicy, head_sha: str, verdict: str, *reasons: str) -> EvaluationResult:
    return EvaluationResult(
        conclusion=CheckConclusion.SUCCESS,
        verdict=verdict,
        reasons=reasons,
        check_name=policy.check_name,
        head_sha=head_sha,
    )


def _sha_ok(value: str | None, label: str) -> None:
    if not value or len(value) != SHA_LEN or any(c not in "0123456789abcdef" for c in value):
        raise EvaluationError(f"{label} is not 40-char lowercase hex")


def _classify(policy: BundledPolicy, paths: tuple[str, ...]) -> tuple[str, tuple[str, ...]]:
    if not paths:
        raise EvaluationError("changed path list missing")
    canonical: list[str] = []
    seen: set[str] = set()
    for raw in paths:
        try:
            path = canonicalize_repo_path(raw)
        except PathError as exc:
            raise EvaluationError(str(exc)) from exc
        if path in seen:
            raise EvaluationError(f"ambiguous path: {path}")
        seen.add(path)
        canonical.append(path)
        secret = secret_path_reason(path)
        if secret:
            raise EvaluationError(secret)
        control_file = control_filename_reason(path)
        if control_file:
            raise EvaluationError(control_file)
        lowered = path.lower()
        for fragment in policy.forbidden_name_substrings:
            if fragment.lower() in lowered:
                raise EvaluationError(f"forbidden control-plane path: {path}")
    control = [path for path in canonical if is_control_plane_path(path, policy)]
    other = [path for path in canonical if path not in control]
    if control and other:
        raise EvaluationError(
            "mixed control-plane and application paths: "
            + ", ".join(sorted(control + other))
        )
    if not control:
        return "feature", tuple(canonical)
    allowed = policy.sync_approved_paths | policy.expansion_paths
    unexpected = [path for path in control if path not in allowed]
    if unexpected:
        raise EvaluationError("unexpected control-plane paths: " + ", ".join(sorted(unexpected)))
    return "control", tuple(canonical)


def _control_kind(policy: BundledPolicy, base_ref: str) -> str:
    if base_ref == "main":
        return "policy_expansion"
    if base_ref == "release/uat":
        return "dest_sync"
    raise EvaluationError(f"base ref is not a protected control-plane branch: {base_ref}")


def request_digest(req: EvaluationRequest) -> bytes:
    """Fingerprint every field a caller could swap after sealing. Excludes the seal."""
    comments = tuple(
        (item.login, item.user_type, item.body, item.created_at, item.updated_at, item.deleted)
        for item in req.comments
    )
    if not isinstance(req.source_blobs, dict) or not isinstance(req.dest_blobs, dict):
        raise EvaluationError("unverified evidence")
    material = repr(
        (
            req.repo,
            req.pull_number,
            req.head_sha,
            req.base_ref,
            req.dest_parent_sha,
            req.merge_base_sha,
            req.source_ref,
            req.dest_ref,
            tuple(req.changed_paths),
            comments,
            tuple(req.hmac_secrets),
            req.now_unix,
            req.posting_integration_id,
            req.expected_integration_id,
            req.check_name,
            tuple(req.requested_environments),
            tuple(req.requested_secret_names),
            req.spoof_integration_id,
            tuple(sorted(req.source_blobs.items())),
            tuple(sorted(req.dest_blobs.items())),
        )
    )
    return sha256(material.encode("utf-8")).digest()


def _require_hmac(policy: BundledPolicy, req: EvaluationRequest) -> None:
    verify_attestation(
        policy,
        secrets=req.hmac_secrets,
        comments=list(req.comments),
        repo=req.repo,
        pull_number=req.pull_number,
        head_sha=req.head_sha,
        base_ref=req.base_ref,
        now_unix=req.now_unix,
    )


def _evaluate_inner(policy: BundledPolicy, req: EvaluationRequest) -> EvaluationResult:
    try:
        digest = request_digest(req)
    except Exception as exc:  # noqa: BLE001 — a broken request is not evidence
        raise EvaluationError("unverified evidence") from exc
    if not SEAL.ok(req.seal, digest):
        raise EvaluationError("unverified evidence")
    if type(req.pull_number) is not int or req.pull_number < 1:
        raise EvaluationError("pull number is malformed")
    if (
        type(req.repo) is not str
        or req.repo.count("/") != 1
        or any(char in req.repo for char in "\r\n ")
    ):
        raise EvaluationError("repo is malformed")
    if req.check_name != policy.check_name:
        raise EvaluationError(
            f"check name mismatch: got {req.check_name!s} expected {policy.check_name}"
        )

    spoof_ids = set(policy.known_spoof_integration_ids.values())
    if req.spoof_integration_id in spoof_ids:
        raise EvaluationError(
            f"refusing check identity from spoofable integration_id {req.spoof_integration_id}"
        )
    if req.expected_integration_id is None:
        raise EvaluationError("expected Owner-Policy integration_id is not pinned")
    if req.posting_integration_id != req.expected_integration_id:
        raise EvaluationError(
            "posting integration_id does not match the pinned Owner-Policy App"
        )
    if req.posting_integration_id in spoof_ids:
        raise EvaluationError("Owner-Policy App integration_id collides with a spoofable App")

    _sha_ok(req.head_sha, "head SHA")
    if req.base_ref not in policy.protected_bases:
        raise EvaluationError(f"base ref is not a protected control-plane branch: {req.base_ref}")

    if req.requested_environments:
        raise EvaluationError(
            "evaluator must not access Environments: " + ", ".join(req.requested_environments)
        )
    if req.requested_secret_names:
        raise EvaluationError(
            "evaluator must not access secrets: " + ", ".join(req.requested_secret_names)
        )

    kind, canonical = _classify(policy, req.changed_paths)
    if kind == "feature":
        return _ok(policy, req.head_sha, "feature", "no control-plane paths; attestation not required")

    _require_hmac(policy, req)
    verdict = _control_kind(policy, req.base_ref)
    allowed = policy.sync_approved_paths | policy.expansion_paths
    extra = [path for path in canonical if path not in allowed]
    if extra:
        raise EvaluationError("policy expansion includes paths outside the expansion set")

    if verdict == "policy_expansion":
        return _ok(
            policy,
            req.head_sha,
            "policy_expansion",
            "HMAC attestation accepted; dest-tree exact-match not required",
        )

    _sha_ok(req.dest_parent_sha, "destination parent SHA")
    _sha_ok(req.merge_base_sha, "merge-base SHA")
    if req.merge_base_sha != req.dest_parent_sha:
        raise EvaluationError(
            "destination is not a descendant of dest_parent: "
            "compare merge-base does not match pulls base sha"
        )
    _sha_ok(req.source_ref, "source ref SHA")
    if req.dest_ref != req.head_sha:
        raise EvaluationError("dest tree SHA must equal current HEAD")
    must_match = set(policy.sync_approved_paths)
    must_match.update(path for path in canonical if path in policy.expansion_paths)
    for path in sorted(must_match):
        src = req.source_blobs.get(path) if isinstance(req.source_blobs, dict) else None
        dest = req.dest_blobs.get(path) if isinstance(req.dest_blobs, dict) else None
        if not isinstance(req.source_blobs, dict) or not isinstance(req.dest_blobs, dict):
            raise EvaluationError(f"missing blob evidence for {path}")
        if src is None or dest is None:
            raise EvaluationError(f"missing blob evidence for {path}")
        _sha_ok(src, f"source blob {path}")
        _sha_ok(dest, f"dest blob {path}")
        if src != dest:
            raise EvaluationError(f"blob mismatch on {path}")
    return _ok(
        policy,
        req.head_sha,
        "dest_sync",
        "HMAC attestation accepted; exact-tree and dest_parent verified",
    )


def evaluate(
    req: EvaluationRequest,
    policy: BundledPolicy | None = None,
) -> EvaluationResult:
    """Never return NEUTRAL/SKIPPED. Exceptions become FAILURE."""
    loaded: BundledPolicy | None = None
    try:
        loaded = policy or load_policy()
        result = _evaluate_inner(loaded, req)
        if result.conclusion is CheckConclusion.SUCCESS and result.verdict in {
            "policy_expansion",
            "dest_sync",
            "feature",
        }:
            return result
        if result.conclusion is CheckConclusion.FAILURE:
            return result
        return _fail(loaded, req.head_sha, "internal", "evaluator produced a non-fail-closed conclusion")
    except (EvaluationError, AttestationError, PolicyError, PathError) as exc:
        check_name = loaded.check_name if loaded is not None else "AD25-Owner-Policy"
        head = req.head_sha if isinstance(getattr(req, "head_sha", None), str) else ""
        return EvaluationResult(
            conclusion=CheckConclusion.FAILURE,
            verdict="hold",
            reasons=(str(exc),),
            check_name=check_name,
            head_sha=head,
        )
    except Exception as exc:  # noqa: BLE001 — fail closed on unexpected errors
        check_name = loaded.check_name if loaded is not None else "AD25-Owner-Policy"
        head = req.head_sha if isinstance(getattr(req, "head_sha", None), str) else ""
        return EvaluationResult(
            conclusion=CheckConclusion.FAILURE,
            verdict="hold",
            reasons=(f"evaluator error: {type(exc).__name__}",),
            check_name=check_name,
            head_sha=head,
        )
