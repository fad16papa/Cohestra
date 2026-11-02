"""Durable per-PR correction ledger.

The controller records simulated assignments. It does not call Cursor, merge,
deploy, or read credential environment variables. A READY decision uses
verification_plane SIMULATED_PASS and always leaves both live flags false.
owner_manifest_authorized is always false: the manifest digest is a content
hash, not an owner signature.
"""

from __future__ import annotations

import fcntl
import hashlib
import json
import os
import re
import secrets
import time
from collections.abc import Callable
from pathlib import Path

from .manifest import SHA_RE, Manifest, ManifestError, path_allowed
from .models import Assignment, Decision, Event, GitHubError, Ledger, PullView, Review

HOLD = "HOLD_OWNER_ACTION_REQUIRED"
RETRY = "RETRYABLE_SCOPED"
WAITING = "WAITING_EXTERNAL"
READY = "READY_FOR_OWNER_MERGE_DECISION"
IGNORED = "IGNORED"
BUSY = "BUSY"

SIMULATED_PASS = "SIMULATED_PASS"
NOT_VERIFIED = "NOT_VERIFIED"
LEASE_SECONDS = 30
MAX_EVENT_ID = 200

FORBIDDEN_REVIEWERS = frozenset(
    {
        "cursor[bot]",
        "cursor",
        "github-actions[bot]",
        "copilot",
        "copilot[bot]",
        "copilot-swe-agent[bot]",
    }
)
REVIEW_ROLES = frozenset({"bmad", "catsec"})
PENDING_CONCLUSIONS = frozenset({"pending", "queued", "in_progress"})
FAILED_CONCLUSIONS = frozenset({"failure", "failed", "timed_out"})
REFUSED_CONCLUSIONS = frozenset({"skipped", "cancelled", "canceled", "stale", "missing"})

SECRET_RE = re.compile(
    r"(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,}|"
    r"(?:AKIA|ASIA)[0-9A-Z]{16}|"
    r"xox[baprs]-[A-Za-z0-9-]{10,}|sk_live_[A-Za-z0-9]{8,}"
)
KEY_RE = re.compile(r"BEGIN [A-Z0-9 ]{0,40}PRIVATE KEY", re.IGNORECASE)
INJECTION_RE = re.compile(
    r"ignore\s+previous\s+instructions|ignore\s+all\s+previous|you\s+are\s+now|merge\s+this\s+pr|"
    r"uat_deploy_gate_active\s*=\s*true|owner_control_ready\s*=\s*true",
    re.IGNORECASE,
)

SECRET = "secret material refused"
UNREADABLE = "ledger is unreadable"
DIGEST = "manifest digest does not match the store"
BOUND = "store is bound to another manifest"
LIVE = "live execution plane is not authorized"
NEW_COMMIT = "a new commit is required before re-evaluation"
NO_PROGRESS = "no material progress"
BUDGET = "correction budget exhausted"
ASSIGNED = "simulated correction assigned"
SATISFIED = "acceptance criteria satisfied in simulation"


class ReviewPolicy:
    """Host-supplied reviewer allow-list. Forbidden actors cannot be trusted."""

    def __init__(
        self,
        trusted_roles: dict[str, str],
        extra_forbidden: frozenset[str] | None = None,
    ) -> None:
        self.trusted_roles = dict(trusted_roles)
        self.extra_forbidden = frozenset(extra_forbidden or ())

    def role_for(self, reviewer_id: str) -> str | None:
        if _is_forbidden(reviewer_id, self.extra_forbidden):
            return None
        folded = {key.casefold(): value for key, value in self.trusted_roles.items()}
        role = folded.get(reviewer_id.casefold())
        if role not in REVIEW_ROLES:
            return None
        return role


def load_manifest(path: Path) -> Manifest:
    if not path.is_file():
        raise ManifestError("manifest is required")
    try:
        if path.stat().st_size > 65536:
            raise ManifestError("manifest is required")
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ManifestError("manifest is required") from exc
    if not isinstance(raw, dict):
        raise ManifestError("manifest fields invalid")
    return Manifest.from_dict(raw)


def assert_manifest_authentic(manifest: Manifest) -> None:
    """Recompute the content digest. This does not verify an owner signature."""
    rebuilt = Manifest.from_dict(
        {
            "acceptance_criteria": list(manifest.acceptance_criteria),
            "allowed_paths": list(manifest.allowed_paths),
            "author_id": manifest.author_id,
            "base_ref": manifest.base_ref,
            "base_sha": manifest.base_sha,
            "budget": {"max_corrections": manifest.max_corrections},
            "manifest_id": manifest.manifest_id,
            "model": manifest.model,
            "pull_number": manifest.pull_number,
            "repo": manifest.repo,
            "required_checks": list(manifest.required_checks),
            "task_id": manifest.task_id,
        }
    )
    if rebuilt.digest != manifest.digest:
        raise ManifestError("manifest digest is not authentic")


def open_controller(
    store: Path,
    manifest: Manifest | None,
    github: object,
    policy: ReviewPolicy,
    clock: Callable[[], float] | None = None,
) -> Controller:
    if manifest is None:
        raise ManifestError("manifest is required")
    return Controller(store, manifest, github, policy, clock=clock)


def _contains_secret(value: str) -> bool:
    return SECRET_RE.search(value) is not None or KEY_RE.search(value) is not None


def _event_storage_id(event_id: str) -> str:
    if _contains_secret(event_id) or INJECTION_RE.search(event_id):
        return "redacted:" + hashlib.sha256(event_id.encode("utf-8")).hexdigest()
    return event_id


def _path_safe(path: str) -> bool:
    if not path or len(path) > 300 or path.startswith("/") or "\\" in path or "\x00" in path or ":" in path:
        return False
    return all(part not in ("", ".", "..") for part in path.split("/"))


def _is_forbidden(reviewer_id: str, extra: frozenset[str]) -> bool:
    folded = reviewer_id.casefold()
    denied = {item.casefold() for item in FORBIDDEN_REVIEWERS | extra}
    return folded in denied


def _public(value: str) -> str:
    if len(value) > 300 or _contains_secret(value) or INJECTION_RE.search(value):
        return "redacted"
    return value


def _fingerprint(findings: tuple[dict[str, str], ...], origins: tuple[str, ...] = ()) -> str:
    material = {
        "findings": list(findings),
        "origins": [hashlib.sha256(item.encode("utf-8")).hexdigest() for item in origins],
    }
    blob = json.dumps(material, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def _redacted_origin(value: str) -> tuple[str, str]:
    public = _public(value)
    if public == "redacted":
        return public, value
    return public, ""


def _conclusion_bucket(conclusion: str | None) -> str:
    if conclusion is None or conclusion in PENDING_CONCLUSIONS:
        return "pending"
    if conclusion in FAILED_CONCLUSIONS:
        return "failed"
    if conclusion == "success":
        return "success"
    if conclusion in REFUSED_CONCLUSIONS:
        return "refused"
    return "refused"


def _check_bucket(name: str, pull: PullView) -> str:
    rows = [item for item in pull.checks if item.name == name]
    if not rows:
        return "missing"
    on_head = [item for item in rows if item.head_sha == pull.head_sha]
    if not on_head:
        return "stale"
    buckets = [_conclusion_bucket(item.conclusion) for item in on_head]
    if "failed" in buckets:
        return "failed"
    if "refused" in buckets:
        return "refused"
    if "pending" in buckets:
        return "pending"
    if buckets and all(item == "success" for item in buckets):
        return "success"
    return "refused"


def _pull_has_secret(pull: PullView) -> bool:
    parts: list[object] = [pull.head_sha, pull.base_sha, pull.base_ref, pull.author_id, pull.repo, *pull.changed_paths]
    for check in pull.checks:
        parts.extend([check.name, check.conclusion or "", check.head_sha])
    for review in pull.reviews:
        parts.extend(
            [
                review.reviewer_id,
                review.role,
                review.head_sha,
                review.model,
                review.authentication_source,
                *review.paths,
            ]
        )
    for test in pull.tests:
        parts.extend([test.name, test.path, test.detail, test.head_sha])
    if any(not isinstance(part, str) for part in parts):
        return True
    return any(_contains_secret(part) for part in parts)


def _review_disposition(manifest: Manifest, policy: ReviewPolicy, pull: PullView, review: Review) -> str:
    if not isinstance(review.reviewer_id, str) or not isinstance(review.model, str):
        return "not_permitted"
    if _is_forbidden(review.reviewer_id, policy.extra_forbidden):
        return "forbidden"
    if type(review.authenticated) is not bool or not review.authenticated:
        return "unauthenticated"
    if review.authentication_source != "host-verified":
        return "unauthenticated"
    authors = {manifest.author_id.casefold(), pull.author_id.casefold() if isinstance(pull.author_id, str) else ""}
    if review.reviewer_id.casefold() in authors:
        return "author"
    if policy.role_for(review.reviewer_id) is None:
        return "not_permitted"
    if review.model != manifest.model:
        return "model"
    if review.head_sha != pull.head_sha:
        return "stale"
    if (
        type(review.blocker) is not int
        or type(review.major) is not int
        or review.blocker < 0
        or review.major < 0
        or review.blocker > 1_000_000
        or review.major > 1_000_000
    ):
        return "counts"
    for path in review.paths:
        if not isinstance(path, str) or not _path_safe(path):
            return "unsafe"
        if not path_allowed(path, manifest.allowed_paths):
            return "scope"
    if review.blocker > 0 or review.major > 0:
        return "finding"
    if not review.paths:
        return "unscoped"
    return "pass"


def _evidence_too_large(pull: PullView) -> bool:
    try:
        if len(pull.changed_paths) > 200 or len(pull.reviews) > 40 or len(pull.tests) > 200 or len(pull.checks) > 40:
            return True
        if any(len(item.paths) > 50 for item in pull.reviews):
            return True
    except TypeError:
        return True
    values: list[object] = [pull.head_sha, pull.base_sha, pull.base_ref, pull.author_id, pull.repo, *pull.changed_paths]
    for test in pull.tests:
        values.extend([test.name, test.path, test.detail, test.head_sha])
    for review in pull.reviews:
        values.append(review.authentication_source)
    return any(isinstance(value, str) and len(value) > 4000 for value in values)


def _decide(
    manifest: Manifest,
    policy: ReviewPolicy,
    ledger: Ledger,
    pull: PullView,
) -> tuple[str, str, bool, tuple[dict[str, str], ...], tuple[str, ...]]:
    def finish(
        status: str,
        reason: str,
        sticky: bool,
        findings: tuple[dict[str, str], ...] = (),
        origins: tuple[str, ...] = (),
    ) -> tuple[str, str, bool, tuple[dict[str, str], ...], tuple[str, ...]]:
        return status, reason, sticky, findings, origins

    if (
        not isinstance(pull.repo, str)
        or not isinstance(pull.author_id, str)
        or not isinstance(pull.base_sha, str)
        or not isinstance(pull.base_ref, str)
        or not isinstance(pull.head_sha, str)
    ):
        return finish(HOLD, "head sha is invalid", True)
    if pull.repo != manifest.repo:
        return finish(HOLD, "repository does not match the manifest", True)
    if pull.author_id.casefold() != manifest.author_id.casefold():
        return finish(HOLD, "pull author does not match the manifest", True)
    if (
        type(pull.number) is not int
        or pull.number != manifest.pull_number
        or pull.base_sha != manifest.base_sha
        or pull.base_ref != manifest.base_ref
    ):
        return finish(HOLD, "base does not match the manifest", True)
    if not SHA_RE.fullmatch(pull.head_sha):
        return finish(HOLD, "head sha is invalid", True)
    if _pull_has_secret(pull):
        return finish(HOLD, SECRET, True)
    if not pull.changed_paths:
        return finish(HOLD, "changed paths are missing", False)
    for path in pull.changed_paths:
        if not isinstance(path, str) or not _path_safe(path):
            return finish(HOLD, "path is unsafe", True)
        if not path_allowed(path, manifest.allowed_paths):
            return finish(HOLD, "changed path is outside the manifest", True)
    for test in pull.tests:
        if (
            type(test.passed) is not bool
            or not isinstance(test.name, str)
            or not isinstance(test.path, str)
            or not isinstance(test.detail, str)
            or not isinstance(test.head_sha, str)
        ):
            return finish(HOLD, "test evidence is missing", True)
        if not _path_safe(test.path) or not path_allowed(test.path, manifest.allowed_paths):
            return finish(HOLD, "test path is outside the manifest", True)
        if test.head_sha != pull.head_sha:
            return finish(HOLD, "stale test evidence", False)

    dispositions = [_review_disposition(manifest, policy, pull, review) for review in pull.reviews]
    if "counts" in dispositions:
        return finish(HOLD, "review counts are not trustworthy", True)
    if "unsafe" in dispositions or "scope" in dispositions:
        return finish(HOLD, "review path is outside the manifest", True)
    if pull.head_sha in ledger.assigned_heads:
        return finish(HOLD, NEW_COMMIT, False)

    published: list[tuple[dict[str, str], str]] = []
    for test in pull.tests:
        if test.passed:
            continue
        name, name_origin = _redacted_origin(test.name)
        path, path_origin = _redacted_origin(test.path)
        published.append(({"kind": "test", "name": name, "path": path}, name_origin + "\n" + path_origin))
    check_states = {name: _check_bucket(name, pull) for name in manifest.required_checks}
    for name, state in check_states.items():
        if state == "failed":
            published.append(({"kind": "check", "conclusion": "failed", "name": name}, ""))
    for review, disposition in zip(pull.reviews, dispositions, strict=True):
        if disposition != "finding":
            continue
        role = policy.role_for(review.reviewer_id) or ""
        reviewer_public, reviewer_origin = _redacted_origin(review.reviewer_id)
        paths = review.paths or ("",)
        for path in paths:
            path_public, path_origin = _redacted_origin(path)
            published.append(
                (
                    {
                        "blocker": str(review.blocker),
                        "kind": "review",
                        "major": str(review.major),
                        "path": path_public,
                        "reviewer_id": reviewer_public,
                        "role": role,
                    },
                    reviewer_origin + "\n" + path_origin,
                )
            )
    published.sort(
        key=lambda pair: (
            json.dumps(pair[0], sort_keys=True),
            hashlib.sha256(pair[1].encode("utf-8")).hexdigest(),
        )
    )
    ordered = tuple(item for item, _origin in published)
    origins = tuple(origin for _item, origin in published)
    if ordered:
        if _fingerprint(ordered, origins) in ledger.fingerprints:
            return finish(HOLD, NO_PROGRESS, False)
        if ledger.corrections >= manifest.max_corrections:
            return finish(HOLD, BUDGET, False)
        return finish(RETRY, ASSIGNED, False, ordered, origins)

    if any(state == "stale" for state in check_states.values()):
        return finish(HOLD, "stale check evidence", False)
    if any(state in {"missing", "refused"} for state in check_states.values()):
        return finish(HOLD, "mandatory check evidence refused", False)
    if any(state == "pending" for state in check_states.values()):
        return finish(WAITING, "required checks are still running", False)
    if not pull.tests or any(not test.passed for test in pull.tests):
        return finish(HOLD, "test evidence is missing", False)

    passes: list[tuple[str, str]] = []
    for review in pull.reviews:
        if _review_disposition(manifest, policy, pull, review) != "pass":
            continue
        role = policy.role_for(review.reviewer_id)
        if role is not None:
            passes.append((review.reviewer_id, role))
    roles = {role for _, role in passes}
    identities = {reviewer_id for reviewer_id, _ in passes}
    if "bmad" in roles and "catsec" in roles and len(identities) >= 2:
        return finish(READY, SATISFIED, False)
    if not pull.reviews:
        return finish(WAITING, "independent reviews are missing", False)
    if "unauthenticated" in dispositions:
        return finish(HOLD, "reviewer is not authenticated", False)
    if "forbidden" in dispositions:
        return finish(HOLD, "reviewer is not permitted", False)
    if "author" in dispositions:
        return finish(HOLD, "author cannot satisfy independent review", False)
    if "model" in dispositions:
        return finish(HOLD, "reviewer model does not match the manifest", False)
    if "stale" in dispositions:
        return finish(HOLD, "stale review evidence", False)
    if "unscoped" in dispositions:
        return finish(HOLD, "review did not name an in-scope path", False)
    if "not_permitted" in dispositions:
        return finish(HOLD, "reviewer is not permitted", False)
    return finish(WAITING, "independent reviews are missing", False)


class Controller:
    def __init__(
        self,
        store: Path,
        manifest: Manifest,
        github: object,
        policy: ReviewPolicy,
        clock: Callable[[], float] | None = None,
    ) -> None:
        assert_manifest_authentic(manifest)
        self.store = Path(store)
        self.store.mkdir(parents=True, exist_ok=True)
        os.chmod(self.store, 0o700)
        self.manifest = manifest
        self.github = github
        self.policy = policy
        self.clock = clock or time.time
        self.ledger_path = self.store / "ledger.json"
        self.lock_path = self.store / "controller.lock"
        self.ledger: Ledger | None = None
        self._unreadable = False
        self._lock_token: str | None = None
        self._lock_fd: int | None = None
        self._load()

    def handle(self, event: Event) -> Decision:
        token = self._acquire()
        if token is None:
            count = len(self.ledger.assignments) if self.ledger is not None else 0
            return Decision(BUSY, "controller lock is held", None, count, NOT_VERIFIED, False, False)
        self._lock_token = token
        try:
            self._reload()
            return self._handle_locked(event)
        finally:
            self._release(token)
            self._lock_token = None

    def _handle_locked(self, event: Event) -> Decision:
        if self._unreadable or self.ledger is None:
            return Decision(HOLD, UNREADABLE, None, 0, NOT_VERIFIED, False, False)
        if not isinstance(event.event_id, str) or not event.event_id.strip():
            return Decision(HOLD, "event id is required", self.ledger.current_head, len(self.ledger.assignments), NOT_VERIFIED, False, False)
        if len(event.event_id) > MAX_EVENT_ID:
            return Decision(HOLD, "event id is too long", self.ledger.current_head, len(self.ledger.assignments), NOT_VERIFIED, False, False)
        stored_id = _event_storage_id(event.event_id.strip())
        replay = self._replay(stored_id)
        if replay is not None:
            return replay
        text = event.untrusted_text if isinstance(event.untrusted_text, str) else ""
        if type(event.pull_number) is not int or event.pull_number != self.manifest.pull_number:
            return self._commit(stored_id, HOLD, "pull number is not the approved task", None, accept_head=False)
        if len(text) > 10_000:
            return self._commit(stored_id, HOLD, "event is too large", None, accept_head=False)
        if _contains_secret(event.event_id) or _contains_secret(text):
            return self._commit(stored_id, HOLD, SECRET, None, sticky=True, accept_head=True)
        if self.ledger.hold:
            if len(self.ledger.applied_event_ids) >= 400:
                return _decision(HOLD, self.ledger.reason, self.ledger.current_head, len(self.ledger.assignments))
            return self._commit(stored_id, HOLD, self.ledger.reason, self.ledger.current_head, sticky=True, accept_head=True)
        if getattr(self.github, "is_live", False):
            return self._commit(stored_id, HOLD, LIVE, self.ledger.current_head, sticky=True, accept_head=True)
        if not self._refresh_lock():
            return Decision(BUSY, "controller lock was lost", None, len(self.ledger.assignments), NOT_VERIFIED, False, False)
        try:
            pull = self.github.pull(event.pull_number)  # type: ignore[attr-defined]
        except GitHubError as exc:
            return self._commit(stored_id, HOLD, _github_reason(exc), None, accept_head=True)
        except Exception:
            return self._commit(stored_id, HOLD, "github api failure", None, accept_head=True)
        if not isinstance(pull, PullView):
            return self._commit(stored_id, HOLD, "github api failure", None, accept_head=True)
        if event.claimed_head is not None and event.claimed_head != pull.head_sha:
            return self._commit(stored_id, IGNORED, "stale event", None, accept_head=False)
        record_head = pull.head_sha if isinstance(pull.head_sha, str) and SHA_RE.fullmatch(pull.head_sha) else None
        if record_head is None or _contains_secret(pull.head_sha):
            reason = SECRET if isinstance(pull.head_sha, str) and _contains_secret(pull.head_sha) else "head sha is invalid"
            return self._commit(stored_id, HOLD, reason, None, sticky=True, accept_head=True)
        if _evidence_too_large(pull):
            return self._commit(stored_id, HOLD, "evidence is too large", None, accept_head=False)
        status, reason, sticky, findings, origins = _decide(self.manifest, self.policy, self.ledger, pull)
        return self._commit(
            stored_id,
            status,
            reason,
            record_head,
            sticky=sticky,
            findings=findings,
            origins=origins,
            accept_head=True,
        )

    def _commit(
        self,
        stored_id: str,
        status: str,
        reason: str,
        head: str | None,
        *,
        sticky: bool = False,
        findings: tuple[dict[str, str], ...] = (),
        origins: tuple[str, ...] = (),
        accept_head: bool = True,
    ) -> Decision:
        assert self.ledger is not None
        if not self._refresh_lock():
            return Decision(BUSY, "controller lock was lost", None, len(self.ledger.assignments), NOT_VERIFIED, False, False)
        if head is not None and (not isinstance(head, str) or not SHA_RE.fullmatch(head) or _contains_secret(head)):
            head = None
        if stored_id not in self.ledger.applied_event_ids and len(self.ledger.applied_event_ids) >= 400:
            self.ledger.hold = True
            self.ledger.status = HOLD
            self.ledger.reason = "ledger event budget exhausted"
            self._save()
            return _decision(HOLD, self.ledger.reason, self.ledger.current_head, len(self.ledger.assignments))
        assignment_id = None
        if sticky:
            self.ledger.hold = True
        if status == RETRY:
            self.ledger.corrections += 1
            assignment = Assignment(
                assignment_id=f"sim-{self.ledger.corrections}-{(head or '')[:12]}",
                head_sha=head or "",
                model=self.manifest.model,
                allowed_paths=self.manifest.allowed_paths,
                findings=findings,
                dispatcher="simulated",
                live_dispatch=False,
            )
            assignment_id = assignment.assignment_id
            self.ledger.assignments.append(assignment.as_dict())
            if head:
                self.ledger.assigned_heads.append(head)
            self.ledger.fingerprints.append(_fingerprint(findings, origins))
        if accept_head:
            self.ledger.status = status
            self.ledger.reason = reason
            if head:
                self.ledger.current_head = head
        if stored_id not in self.ledger.applied_event_ids:
            self.ledger.applied_event_ids.append(stored_id)
        reported_head = head if accept_head else None
        decision = _decision(status, reason, reported_head, len(self.ledger.assignments))
        self.ledger.trace.append(
            {
                "assignment_id": assignment_id,
                "assignments": decision.assignments,
                "event_id": stored_id,
                "head_sha": decision.head_sha,
                "reason": reason,
                "status": status,
                "verification_plane": decision.verification_plane,
            }
        )
        self._save()
        return decision

    def _replay(self, stored_id: str) -> Decision | None:
        assert self.ledger is not None
        if stored_id not in self.ledger.applied_event_ids:
            return None
        for item in self.ledger.trace:
            if item.get("event_id") == stored_id:
                return _decision(
                    str(item.get("status")),
                    str(item.get("reason")),
                    item.get("head_sha") if isinstance(item.get("head_sha"), str) else None,
                    int(item.get("assignments") or 0),
                )
        return _decision(HOLD, UNREADABLE, self.ledger.current_head, len(self.ledger.assignments))

    def _load(self) -> None:
        token = self._acquire()
        if token is None:
            if self.ledger_path.exists():
                self._reload()
            else:
                self._unreadable = True
            return
        self._lock_token = token
        try:
            self._load_locked()
        finally:
            self._release(token)
            self._lock_token = None

    def _load_locked(self) -> None:
        if not self.ledger_path.exists():
            self.ledger = Ledger(
                manifest_id=self.manifest.manifest_id,
                manifest_digest=self.manifest.digest,
                pull_number=self.manifest.pull_number,
                base_sha=self.manifest.base_sha,
            )
            self._save()
            return
        if not self._reload():
            return
        if self.ledger is None:
            return
        if self.ledger.manifest_id != self.manifest.manifest_id:
            self.ledger.hold = True
            self.ledger.reason = BOUND
            self.ledger.status = HOLD
            self._save()
        elif self.ledger.manifest_digest != self.manifest.digest:
            self.ledger.hold = True
            self.ledger.reason = DIGEST
            self.ledger.status = HOLD
            self._save()

    def _reload(self) -> bool:
        if not self.ledger_path.exists():
            self.ledger = None
            self._unreadable = True
            return False
        try:
            raw = json.loads(self.ledger_path.read_text(encoding="utf-8"))
            if not isinstance(raw, dict):
                raise TypeError("ledger")
            self.ledger = Ledger.from_json(raw)
        except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError):
            self.ledger = None
            self._unreadable = True
            return False
        self._unreadable = False
        return True

    def _save(self) -> None:
        if self.ledger is None:
            return
        payload = json.dumps(self.ledger.to_json(), indent=2, sort_keys=True) + "\n"
        suffix = self._lock_token or secrets.token_hex(4)
        temporary = self.ledger_path.with_name(f"ledger.{suffix}.tmp")
        fd = os.open(temporary, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, self.ledger_path)
        directory = os.open(self.store, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)

    def _acquire(self) -> str | None:
        now = float(self.clock())
        token = secrets.token_hex(16)
        for _ in range(3):
            try:
                fd = os.open(self.lock_path, os.O_CREAT | os.O_RDWR, 0o600)
            except OSError:
                return None
            try:
                os.chmod(self.lock_path, 0o600)
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                os.close(fd)
                return None
            except OSError:
                os.close(fd)
                return None
            try:
                try:
                    current = os.stat(self.lock_path)
                except FileNotFoundError:
                    current = None
                if current is None or os.fstat(fd).st_ino != current.st_ino:
                    fcntl.flock(fd, fcntl.LOCK_UN)
                    os.close(fd)
                    continue
                os.lseek(fd, 0, os.SEEK_SET)
                existing = os.read(fd, 8192)
                if existing:
                    try:
                        raw = json.loads(existing.decode("utf-8"))
                        expires = float(raw["expires_at"])
                        other = raw.get("token")
                    except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError):
                        expires = 0.0
                        other = None
                    if other != token and expires > now:
                        fcntl.flock(fd, fcntl.LOCK_UN)
                        os.close(fd)
                        return None
                body = json.dumps({"expires_at": now + LEASE_SECONDS, "token": token}).encode("utf-8")
                os.lseek(fd, 0, os.SEEK_SET)
                os.ftruncate(fd, 0)
                os.write(fd, body)
                os.fsync(fd)
                self._lock_fd = fd
                return token
            except OSError:
                try:
                    fcntl.flock(fd, fcntl.LOCK_UN)
                except OSError:
                    pass
                os.close(fd)
                return None
        return None

    def _refresh_lock(self) -> bool:
        fd = self._lock_fd
        token = self._lock_token
        if fd is None or not token:
            return False
        try:
            os.lseek(fd, 0, os.SEEK_SET)
            raw = json.loads(os.read(fd, 8192).decode("utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            return False
        if not isinstance(raw, dict) or raw.get("token") != token:
            return False
        try:
            if os.fstat(fd).st_ino != os.stat(self.lock_path).st_ino:
                return False
        except OSError:
            return False
        raw["expires_at"] = float(self.clock()) + LEASE_SECONDS
        body = json.dumps(raw).encode("utf-8")
        try:
            os.lseek(fd, 0, os.SEEK_SET)
            os.ftruncate(fd, 0)
            os.write(fd, body)
            os.fsync(fd)
        except OSError:
            return False
        return True

    def _release(self, token: str) -> None:
        fd = self._lock_fd
        self._lock_fd = None
        if fd is None:
            return
        try:
            os.lseek(fd, 0, os.SEEK_SET)
            raw = json.loads(os.read(fd, 8192).decode("utf-8"))
            if isinstance(raw, dict) and raw.get("token") == token:
                try:
                    if os.fstat(fd).st_ino == os.stat(self.lock_path).st_ino:
                        os.unlink(self.lock_path)
                except FileNotFoundError:
                    pass
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            pass
        finally:
            try:
                fcntl.flock(fd, fcntl.LOCK_UN)
            except OSError:
                pass
            os.close(fd)


def _github_reason(exc: GitHubError) -> str:
    if exc.status in (401, 403):
        return "github credentials or permissions are unavailable"
    if exc.status == 429:
        return "github rate limit"
    if exc.status in (408, 504) or exc.reason == "timeout":
        return "github timeout"
    return "github api failure"


def _decision(status: str, reason: str, head: str | None, assignments: int) -> Decision:
    plane = SIMULATED_PASS if status == READY else NOT_VERIFIED
    return Decision(
        status,
        reason,
        head,
        assignments,
        plane,
        live_scoped_loop_verified=False,
        live_read_only_transport_verified=False,
        owner_manifest_authorized=False,
    )
