"""Turn a GitHub-shaped snapshot into a sealed evaluation request.

This module does not call GitHub. A future host must fill GitHubSnapshot
from the APIs named in FIELD_SOURCES, then call evaluate_snapshot.
Unit tests that build a snapshot are simulated. They do not prove a live
ruleset pin or a live check-run.

FIELD_SOURCES (host contract):

| Field | Independent source | Reject when |
| --- | --- | --- |
| head_sha | GET /repos/{repo}/pulls/{n} `head.sha` | missing, not 40-hex, or != webhook `pull_request.head.sha` |
| event_head_sha | webhook payload after `X-Hub-Signature-256` | differs from pulls API head |
| base_ref | pulls API `base.ref` | not `main` or `release/uat` |
| files | pulls API `files` pages until `Link` rel=next is absent | `files_complete` is false |
| comments | issues API comment pages, not the webhook body | `comments_complete` is false; edited bodies |
| pulls_api_base_sha | pulls API `base.sha` | not 40-hex when the verdict is dest_sync |
| compare_merge_base_sha | GET /repos/{repo}/compare/{base.sha}...{head.sha} `merge_base_commit.sha` | not equal to `base.sha` |
| source_commit_sha | GET /repos/{repo}/commits/main `sha` at read time | missing on dest_sync |
| source_blobs / head_blobs | GET /repos/{repo}/git/trees/{sha}?recursive=1 | `truncated=true` or a required path has no blob |
| app_integration_id | App config / JWT `iss`, never the PR | equals 15368, 1210556, or 46505 |
| ruleset_checks | GET /repos/{repo}/rulesets/{id} | context `AD25-Owner-Policy` missing or integration_id differs |
| ruleset_strict | same ruleset `strict_required_status_checks_policy` | false |
| ruleset_bypass_empty | same ruleset `bypass_actors` | non-empty |
| active_hmac_secrets | host env only | empty; never from the repo or the webhook |
| published check app id | GET /repos/{repo}/check-runs/{id} `app.id` after post | confirm_published_check mismatch |
"""

from __future__ import annotations

from dataclasses import dataclass

from .attestation import Comment
from .conclusions import CheckConclusion
from .evaluate import EvaluationRequest, EvaluationResult, evaluate
from .policy import BundledPolicy, load_policy
from .seal import SEAL

CHECK_NAME = "AD25-Owner-Policy"
SPOOF_IDS = frozenset({15368, 1210556, 46505})


class EvidenceError(Exception):
    pass


@dataclass(frozen=True)
class GitHubSnapshot:
    repo: str
    pull_number: int
    head_sha: str
    base_ref: str
    files: tuple[str, ...]
    files_complete: bool
    comments: tuple[Comment, ...]
    comments_complete: bool
    app_integration_id: int
    ruleset_checks: tuple[tuple[str, int | None], ...]
    ruleset_strict: bool
    ruleset_bypass_empty: bool
    event_head_sha: str
    active_hmac_secrets: tuple[str, ...] = ()
    now_unix: int = 0
    timed_out: bool = False
    trees_truncated: bool = False
    pulls_api_base_sha: str | None = None
    compare_merge_base_sha: str | None = None
    source_commit_sha: str | None = None
    head_blobs: dict[str, str] | None = None
    source_blobs: dict[str, str] | None = None
    requested_environments: tuple[str, ...] = ()
    requested_secret_names: tuple[str, ...] = ()


def confirm_published_check(*, published_app_id: int | None, installation_app_id: int) -> None:
    """Read-back of the check-run we just posted. Not a substitute for the ruleset pin."""
    if published_app_id is None or published_app_id != installation_app_id:
        raise EvidenceError("published check-run app id does not match the Owner-Policy installation")
    if published_app_id in SPOOF_IDS:
        raise EvidenceError("published check-run comes from a spoofable integration")


def _pinned_integration_id(snapshot: GitHubSnapshot) -> int:
    matches = [app_id for name, app_id in snapshot.ruleset_checks if name == CHECK_NAME]
    if len(matches) != 1:
        raise EvidenceError("AD25-Owner-Policy is not pinned")
    pinned = matches[0]
    if pinned is None:
        raise EvidenceError("AD25-Owner-Policy is not pinned")
    if pinned in SPOOF_IDS or snapshot.app_integration_id in SPOOF_IDS:
        bad = pinned if pinned in SPOOF_IDS else snapshot.app_integration_id
        raise EvidenceError(
            "posting integration_id does not match the pinned Owner-Policy App; "
            f"refusing check identity from spoofable integration_id {bad}"
        )
    if pinned != snapshot.app_integration_id:
        raise EvidenceError(
            "posting integration_id does not match the pinned Owner-Policy App"
        )
    return pinned


def seal_request(snapshot: GitHubSnapshot, policy: BundledPolicy) -> EvaluationRequest:
    if snapshot.timed_out:
        raise EvidenceError("github snapshot timed out")
    if not snapshot.files_complete:
        raise EvidenceError("file list is incomplete")
    if not snapshot.comments_complete:
        raise EvidenceError("comment list is incomplete")
    if snapshot.trees_truncated:
        raise EvidenceError("git tree is truncated")
    if snapshot.event_head_sha != snapshot.head_sha:
        raise EvidenceError("stale event sha")
    if not snapshot.ruleset_strict:
        raise EvidenceError("strict required status checks are not enabled")
    if not snapshot.ruleset_bypass_empty:
        raise EvidenceError("ruleset bypass list is not empty")
    if snapshot.requested_environments:
        raise EvidenceError(
            "evaluator must not access Environments: " + ", ".join(snapshot.requested_environments)
        )
    if snapshot.requested_secret_names:
        raise EvidenceError(
            "evaluator must not access secrets: " + ", ".join(snapshot.requested_secret_names)
        )
    pinned = _pinned_integration_id(snapshot)
    if snapshot.active_hmac_secrets and any(not item for item in snapshot.active_hmac_secrets):
        raise EvidenceError("attestation secret missing")
    return EvaluationRequest(
        repo=snapshot.repo,
        pull_number=snapshot.pull_number,
        head_sha=snapshot.head_sha,
        base_ref=snapshot.base_ref,
        dest_parent_sha=snapshot.pulls_api_base_sha,
        changed_paths=snapshot.files,
        source_blobs=dict(snapshot.source_blobs or {}),
        dest_blobs=dict(snapshot.head_blobs or {}),
        comments=snapshot.comments,
        hmac_secrets=snapshot.active_hmac_secrets,
        now_unix=snapshot.now_unix,
        posting_integration_id=snapshot.app_integration_id,
        expected_integration_id=pinned,
        check_name=policy.check_name,
        merge_base_sha=snapshot.compare_merge_base_sha,
        source_ref=snapshot.source_commit_sha,
        dest_ref=snapshot.head_sha,
        seal=SEAL.mint(),
    )


def evaluate_snapshot(
    snapshot: GitHubSnapshot,
    policy: BundledPolicy | None = None,
) -> EvaluationResult:
    loaded: BundledPolicy | None = None
    try:
        loaded = policy or load_policy()
        request = seal_request(snapshot, loaded)
    except EvidenceError as exc:
        return EvaluationResult(
            conclusion=CheckConclusion.FAILURE,
            verdict="hold",
            reasons=(str(exc),),
            check_name=CHECK_NAME,
        )
    result = evaluate(request, loaded)
    secret_values = snapshot.active_hmac_secrets
    if any(secret and secret in " ".join(result.reasons) for secret in secret_values):
        return EvaluationResult(
            conclusion=CheckConclusion.FAILURE,
            verdict="hold",
            reasons=("attestation result leaked secret material",),
            check_name=CHECK_NAME,
        )
    return result
