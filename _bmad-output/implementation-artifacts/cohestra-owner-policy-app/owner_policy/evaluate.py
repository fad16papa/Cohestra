"""Fail-closed evaluator. App-bundled policy only. No git-blob exec."""

from __future__ import annotations

from dataclasses import dataclass

from .attestation import AttestationError, Comment, verify_attestation
from .conclusions import FORBIDDEN_SOFT_EXITS, CheckConclusion
from .policy import BundledPolicy, PolicyError, forbidden_path_reason, is_control_plane_path, load_policy

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
    hmac_secret: str | None
    posting_integration_id: int | None
    expected_integration_id: int | None
    check_name: str
    merge_base_sha: str | None = None
    source_ref: str | None = None
    dest_ref: str | None = None
    requesting_merge_actor: str | None = None
    requesting_merge_actor_type: str | None = None
    requested_environments: tuple[str, ...] = ()
    requested_secret_names: tuple[str, ...] = ()
    spoof_integration_id: int | None = None


@dataclass(frozen=True)
class EvaluationResult:
    conclusion: CheckConclusion
    verdict: str
    reasons: tuple[str, ...]
    check_name: str

    def as_github_check(self) -> dict[str, str]:
        if self.conclusion.value in FORBIDDEN_SOFT_EXITS:
            raise EvaluationError("soft check conclusions are forbidden")
        return {
            "name": self.check_name,
            "conclusion": self.conclusion.value,
            "title": self.verdict,
            "summary": "; ".join(self.reasons) or self.verdict,
        }


def _fail(policy: BundledPolicy, verdict: str, *reasons: str) -> EvaluationResult:
    return EvaluationResult(
        conclusion=CheckConclusion.FAILURE,
        verdict=verdict,
        reasons=reasons,
        check_name=policy.check_name,
    )


def _ok(policy: BundledPolicy, verdict: str, *reasons: str) -> EvaluationResult:
    return EvaluationResult(
        conclusion=CheckConclusion.SUCCESS,
        verdict=verdict,
        reasons=reasons,
        check_name=policy.check_name,
    )


def _sha_ok(value: str | None, label: str) -> None:
    if not value or len(value) != SHA_LEN or any(c not in "0123456789abcdef" for c in value):
        raise EvaluationError(f"{label} is not 40-char lowercase hex")


def _classify(policy: BundledPolicy, paths: tuple[str, ...], base_ref: str) -> str:
    if not paths:
        raise EvaluationError("changed path list missing")
    control: list[str] = []
    product: list[str] = []
    for path in paths:
        forbidden = forbidden_path_reason(path, policy)
        if is_control_plane_path(path, policy):
            if forbidden:
                raise EvaluationError(forbidden)
            control.append(path)
        elif forbidden:
            product.append(path)
    if control and product:
        raise EvaluationError(
            "mixed control-plane and application/secret paths: "
            + ", ".join(sorted(set(control + product)))
        )
    if not control:
        return "feature"
    allowed = policy.sync_approved_paths | policy.expansion_paths
    unexpected = [p for p in control if p not in allowed]
    if unexpected:
        raise EvaluationError("unexpected control-plane paths: " + ", ".join(sorted(unexpected)))
    if base_ref == "main":
        return "policy_expansion"
    if base_ref == "release/uat":
        return "dest_sync"
    raise EvaluationError(f"base ref is not a protected control-plane branch: {base_ref}")


def _require_hmac(policy: BundledPolicy, req: EvaluationRequest) -> None:
    verify_attestation(
        policy,
        secret=req.hmac_secret,
        comments=list(req.comments),
        repo=req.repo,
        pull_number=req.pull_number,
        head_sha=req.head_sha,
        base_ref=req.base_ref,
    )


def _evaluate_inner(policy: BundledPolicy, req: EvaluationRequest) -> EvaluationResult:
    if req.check_name != policy.check_name:
        raise EvaluationError(
            f"check name mismatch: got {req.check_name} expected {policy.check_name}"
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

    kind = _classify(policy, req.changed_paths, req.base_ref)

    if kind == "feature":
        return _ok(policy, "feature", "no control-plane paths; attestation not required")

    _require_hmac(policy, req)

    if kind == "policy_expansion":
        if req.base_ref != "main":
            raise EvaluationError("policy expansion must target main, not a dest-sync branch")
        extra = [p for p in req.changed_paths if p not in (policy.sync_approved_paths | policy.expansion_paths)]
        if extra:
            raise EvaluationError("policy expansion includes paths outside the expansion set")
        return _ok(policy, "policy_expansion", "HMAC attestation accepted; dest-tree exact-match not required")

    # dest_sync
    if req.base_ref != "release/uat":
        raise EvaluationError("dest-tree sync must target release/uat")
    _sha_ok(req.dest_parent_sha, "destination parent SHA")
    _sha_ok(req.merge_base_sha, "merge-base SHA")
    if req.merge_base_sha != req.dest_parent_sha:
        raise EvaluationError("destination is not a descendant of dest_parent")
    _sha_ok(req.source_ref, "source ref SHA")
    if req.dest_ref != req.head_sha:
        raise EvaluationError("dest tree SHA must equal current HEAD")
    approved = policy.sync_approved_paths | policy.expansion_paths
    unexpected = [p for p in req.changed_paths if p not in approved]
    if unexpected:
        raise EvaluationError("dest sync changed paths outside approved set")
    must_match = set(policy.sync_approved_paths)
    must_match.update(p for p in req.changed_paths if p in policy.expansion_paths)
    for path in sorted(must_match):
        src = req.source_blobs.get(path)
        dest = req.dest_blobs.get(path)
        if src is None or dest is None:
            raise EvaluationError(f"missing blob evidence for {path}")
        _sha_ok(src, f"source blob {path}")
        _sha_ok(dest, f"dest blob {path}")
        if src != dest:
            raise EvaluationError(f"blob mismatch on {path}")
    return _ok(
        policy,
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
        }:
            return result
        if result.conclusion is CheckConclusion.SUCCESS and result.verdict == "feature":
            return result
        if result.conclusion is CheckConclusion.FAILURE:
            return result
        return _fail(loaded, "internal", "evaluator produced a non-fail-closed conclusion")
    except (EvaluationError, AttestationError, PolicyError) as exc:
        check_name = loaded.check_name if loaded is not None else "AD25-Owner-Policy"
        return EvaluationResult(
            conclusion=CheckConclusion.FAILURE,
            verdict="hold",
            reasons=(str(exc),),
            check_name=check_name,
        )
    except Exception as exc:  # noqa: BLE001 — fail closed on unexpected errors
        check_name = loaded.check_name if loaded is not None else "AD25-Owner-Policy"
        return EvaluationResult(
            conclusion=CheckConclusion.FAILURE,
            verdict="hold",
            reasons=(f"evaluator error: {type(exc).__name__}",),
            check_name=check_name,
        )
