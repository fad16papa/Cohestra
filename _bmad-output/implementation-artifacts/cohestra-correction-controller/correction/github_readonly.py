"""Read-only GitHub evidence adapter.

Recorded API envelopes are the only input this module trusts enough to build
a pull snapshot. Webhook JSON, comment bodies, and pull-request text are not
authentication. The adapter does not set reviewer roles, blocker counts, story
results, or owner authorization.

Live HTTP is not implemented. A caller-supplied grant does not enable it.
`live_transport_verified` stays false.
"""

from __future__ import annotations

from dataclasses import dataclass

from .controller import FORBIDDEN_REVIEWERS
from .manifest import SHA_RE
from .models import Check, PullView

RECORDED_DELIVERY = "github-api-recorded"
GITGUARDIAN_APP = "gitguardian"
ACTIONS_APP = "github-actions"
GITGUARDIAN_NAMES = frozenset({"gitguardian", "GitGuardian Security Checks"})


class EvidenceError(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class TransportHold(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class ReviewIdentity:
    """A GitHub user seen on a commit. This is not an independent review."""

    reviewer_id: str
    commit_sha: str
    user_type: str
    authenticated: bool = False
    authentication_source: str = ""


@dataclass(frozen=True)
class ReadOnlySnapshot:
    pull: PullView
    review_identities: tuple[ReviewIdentity, ...]
    stale_event: bool
    live_transport_verified: bool = False
    owner_manifest_from_github: bool = False


@dataclass(frozen=True)
class OwnerTransportGrant:
    """Shape of a future owner grant. This build never honors one for HTTP."""

    scope: str
    owner_signed: bool
    recorded_outside_cursor: bool


class LiveReadOnlyClient:
    """Refuses network access. The live pilot stays on HOLD."""

    live_transport_verified = False

    def fetch(self, grant: OwnerTransportGrant | None, repo: str, number: int) -> ReadOnlySnapshot:
        del repo, number
        if (
            grant is None
            or grant.scope != "github-read-only"
            or not grant.owner_signed
            or not grant.recorded_outside_cursor
        ):
            raise TransportHold("live read-only transport is not authorized")
        raise TransportHold("live read-only pilot is not enabled")


def parse_recorded(envelope: dict[str, object], *, repo: str, pull_number: int) -> ReadOnlySnapshot:
    if not isinstance(envelope, dict):
        raise EvidenceError("evidence source is not a recorded read-only response")
    if envelope.get("delivery") == "webhook":
        raise EvidenceError("webhook delivery is not trusted evidence")
    if envelope.get("delivery") != RECORDED_DELIVERY:
        raise EvidenceError("evidence source is not a recorded read-only response")
    pull_raw = envelope.get("pull")
    if not isinstance(pull_raw, dict):
        raise EvidenceError("pull identity is incomplete")
    number, head, base_sha, base_ref, author, seen_repo = _pull_identity(pull_raw)
    if number != pull_number or seen_repo != repo:
        raise EvidenceError("pull identity does not match the requested repository")
    if not SHA_RE.fullmatch(head) or not SHA_RE.fullmatch(base_sha):
        raise EvidenceError("head sha is invalid")
    paths = _files(_page(envelope.get("files")))
    checks = _checks(_page(envelope.get("check_runs")), head)
    identities = _reviews(_page(envelope.get("reviews")), head)
    event_head = envelope.get("event_head")
    stale = isinstance(event_head, str) and event_head != head
    pull = PullView(
        number,
        head,
        base_sha,
        base_ref,
        author,
        seen_repo,
        checks,
        (),
        (),
        paths,
    )
    return ReadOnlySnapshot(pull, identities, stale, False, False)


def _pull_identity(raw: dict[str, object]) -> tuple[int, str, str, str, str, str]:
    number = raw.get("number")
    head = raw.get("head")
    base = raw.get("base")
    user = raw.get("user")
    if type(number) is not int or number < 1 or not isinstance(head, dict) or not isinstance(base, dict):
        raise EvidenceError("pull identity is incomplete")
    if not isinstance(user, dict) or not isinstance(user.get("login"), str):
        raise EvidenceError("pull identity is incomplete")
    repo = base.get("repo")
    if not isinstance(repo, dict) or not isinstance(repo.get("full_name"), str):
        raise EvidenceError("pull identity is incomplete")
    sha = head.get("sha")
    base_sha = base.get("sha")
    base_ref = base.get("ref")
    if not isinstance(sha, str) or not isinstance(base_sha, str) or not isinstance(base_ref, str):
        raise EvidenceError("pull identity is incomplete")
    return number, sha, base_sha, base_ref, str(user["login"]), str(repo["full_name"])


def _page(raw: object) -> list[object]:
    if not isinstance(raw, dict) or raw.get("incomplete") is True:
        raise EvidenceError("page is incomplete")
    items = raw.get("items")
    total = raw.get("total_count")
    if not isinstance(items, list) or type(total) is not int or total != len(items) or total > 100:
        raise EvidenceError("page is incomplete")
    return items


def _files(items: list[object]) -> tuple[str, ...]:
    paths: list[str] = []
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("filename"), str) or not item["filename"]:
            raise EvidenceError("changed files are incomplete")
        paths.append(str(item["filename"]))
        if item.get("status") == "renamed":
            previous = item.get("previous_filename")
            if not isinstance(previous, str) or not previous:
                raise EvidenceError("rename is incomplete")
            paths.append(previous)
    return tuple(paths)


def _checks(items: list[object], head: str) -> tuple[Check, ...]:
    accepted: list[Check] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        check = _one_check(item, head)
        if check is not None:
            accepted.append(check)
    return tuple(accepted)


def _one_check(raw: dict[str, object], head: str) -> Check | None:
    name = raw.get("name")
    run_head = raw.get("head_sha")
    app = raw.get("app")
    slug = app.get("slug") if isinstance(app, dict) else None
    conclusion = raw.get("conclusion")
    if not isinstance(name, str) or not isinstance(run_head, str) or run_head != head:
        return None
    if not isinstance(slug, str):
        return None
    if name in GITGUARDIAN_NAMES or name.casefold() == "gitguardian":
        if slug != GITGUARDIAN_APP:
            return None
    elif slug != ACTIONS_APP:
        return None
    if conclusion is not None and not isinstance(conclusion, str):
        return None
    return Check(name, conclusion if isinstance(conclusion, str) else None, run_head)


def _reviews(items: list[object], head: str) -> tuple[ReviewIdentity, ...]:
    found: list[ReviewIdentity] = []
    denied = {item.casefold() for item in FORBIDDEN_REVIEWERS}
    for item in items:
        if not isinstance(item, dict):
            continue
        user = item.get("user")
        commit_id = item.get("commit_id")
        if not isinstance(user, dict) or not isinstance(commit_id, str) or commit_id != head:
            continue
        login = user.get("login")
        user_type = user.get("type")
        if not isinstance(login, str) or not login or login.casefold() in denied:
            continue
        if user_type != "User":
            continue
        found.append(ReviewIdentity(login, commit_id, "User", False, ""))
    return tuple(found)
