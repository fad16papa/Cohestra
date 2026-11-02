"""Durable per-PR correction ledger.

The controller records simulated assignments. It does not call Cursor, merge,
deploy, or read credential environment variables. A READY decision uses
verification_plane SIMULATED_PASS and always leaves both live flags false.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import time
from collections.abc import Callable
from pathlib import Path

from .manifest import Manifest, ManifestError, path_allowed
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

FORBIDDEN_REVIEWERS = frozenset({"cursor[bot]", "cursor", "github-actions[bot]", "copilot"})
REVIEW_ROLES = frozenset({"bmad", "catsec"})
PENDING_CONCLUSIONS = frozenset({"", "pending", "queued", "in_progress", "neutral"})
FAILED_CONCLUSIONS = frozenset({"failure", "failed", "timed_out"})
REFUSED_CONCLUSIONS = frozenset({"skipped", "cancelled", "canceled", "stale", "missing"})

SECRET_RE = re.compile(
    r"ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|gho_[A-Za-z0-9]+|"
    r"AKIA[0-9A-Z]{16}|BEGIN OPENSSH PRIVATE KEY|BEGIN RSA PRIVATE KEY|"
    r"xox[baprs]-[A-Za-z0-9-]+|sk_live_[A-Za-z0-9]+"
)
INJECTION_RE = re.compile(
    r"ignore previous instructions|ignore all previous|you are now|merge this pr|"
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
        if reviewer_id in FORBIDDEN_REVIEWERS or reviewer_id in self.extra_forbidden:
            return None
        role = self.trusted_roles.get(reviewer_id)
        if role not in REVIEW_ROLES:
            return None
        return role


def load_manifest(path: Path) -> Manifest:
    if not path.is_file():
        raise ManifestError("manifest is required")
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ManifestError("manifest is required") from exc
    if not isinstance(raw, dict):
        raise ManifestError("manifest fields invalid")
    return Manifest.from_dict(raw)


def assert_manifest_authentic(manifest: Manifest) -> None:
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
    return SECRET_RE.search(value) is not None


def _event_storage_id(event_id: str) -> str:
    if _contains_secret(event_id):
        return "redacted:" + hashlib.sha256(event_id.encode("utf-8")).hexdigest()
    return event_id


def _path_safe(path: str) -> bool:
    if not path or len(path) > 300 or path.startswith("/") or "\\" in path or "\x00" in path or ":" in path:
        return False
    return all(part not in ("", ".", "..") for part in path.split("/"))


def _public(value: str) -> str:
    if _contains_secret(value) or INJECTION_RE.search(value):
        return "redacted"
    return value


def _fingerprint(findings: tuple[dict[str, str], ...]) -> str:
    reduced = [{key: value for key, value in item.items() if key not in {"blocker", "major"}} for item in findings]
    blob = json.dumps(reduced, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


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
    parts = [pull.head_sha, pull.base_sha, pull.base_ref, pull.author_id, *pull.changed_paths]
    for check in pull.checks:
        parts.extend([check.name, check.conclusion or "", check.head_sha])
    for review in pull.reviews:
        parts.extend([review.reviewer_id, review.role, review.head_sha, review.model, *review.paths])
    for test in pull.tests:
        parts.extend([test.name, test.path, test.detail])
    return any(_contains_secret(part) for part in parts)


def _review_disposition(manifest: Manifest, policy: ReviewPolicy, pull: PullView, review: Review) -> str:
    if review.reviewer_id in FORBIDDEN_REVIEWERS or review.reviewer_id in policy.extra_forbidden:
        return "forbidden"
    if not review.authenticated:
        return "unauthenticated"
    if review.reviewer_id in (manifest.author_id, pull.author_id):
        return "author"
    if policy.role_for(review.reviewer_id) is None:
        return "not_permitted"
    if review.model != manifest.model:
        return "model"
    if review.head_sha != pull.head_sha:
        return "stale"
    if review.blocker < 0 or review.major < 0:
        return "counts"
    for path in review.paths:
        if not _path_safe(path):
            return "unsafe"
        if not path_allowed(path, manifest.allowed_paths):
            return "scope"
    if review.blocker > 0 or review.major > 0:
        return "finding"
    return "pass"


def _sort_findings(items: list[dict[str, str]]) -> tuple[dict[str, str], ...]:
    return tuple(sorted(items, key=lambda item: json.dumps(item, sort_keys=True)))


def _decide(
    manifest: Manifest,
    policy: ReviewPolicy,
    ledger: Ledger,
    pull: PullView,
) -> tuple[str, str, bool, tuple[dict[str, str], ...]]:
    if _pull_has_secret(pull):
        return HOLD, SECRET, True, ()
    if pull.author_id != manifest.author_id:
        return HOLD, "pull author does not match the manifest", True, ()
    if pull.number != manifest.pull_number or pull.base_sha != manifest.base_sha or pull.base_ref != manifest.base_ref:
        return HOLD, "base does not match the manifest", True, ()
    for path in pull.changed_paths:
        if not _path_safe(path):
            return HOLD, "path is unsafe", True, ()
        if not path_allowed(path, manifest.allowed_paths):
            return HOLD, "changed path is outside the manifest", True, ()
    for test in pull.tests:
        if test.passed:
            continue
        if not _path_safe(test.path) or not path_allowed(test.path, manifest.allowed_paths):
            return HOLD, "test path is outside the manifest", True, ()

    dispositions = [_review_disposition(manifest, policy, pull, review) for review in pull.reviews]
    if "counts" in dispositions:
        return HOLD, "review counts are not trustworthy", True, ()
    if "unsafe" in dispositions or "scope" in dispositions:
        return HOLD, "review path is outside the manifest", True, ()
    if pull.head_sha in ledger.assigned_heads:
        return HOLD, NEW_COMMIT, False, ()

    findings: list[dict[str, str]] = []
    for test in pull.tests:
        if test.passed:
            continue
        findings.append({"kind": "test", "name": _public(test.name), "path": _public(test.path)})
    check_states = {name: _check_bucket(name, pull) for name in manifest.required_checks}
    for name, state in check_states.items():
        if state == "failed":
            findings.append({"kind": "check", "conclusion": "failed", "name": name})
    for review, disposition in zip(pull.reviews, dispositions, strict=True):
        if disposition != "finding":
            continue
        role = policy.role_for(review.reviewer_id) or ""
        paths = review.paths or ("",)
        for path in paths:
            findings.append(
                {
                    "blocker": str(review.blocker),
                    "kind": "review",
                    "major": str(review.major),
                    "path": _public(path),
                    "reviewer_id": _public(review.reviewer_id),
                    "role": role,
                }
            )
    ordered = _sort_findings(findings)
    if ordered:
        if _fingerprint(ordered) in ledger.fingerprints:
            return HOLD, NO_PROGRESS, False, ()
        if ledger.corrections >= manifest.max_corrections:
            return HOLD, BUDGET, False, ()
        return RETRY, ASSIGNED, False, ordered

    if any(state == "stale" for state in check_states.values()):
        return HOLD, "stale check evidence", False, ()
    if any(state in {"missing", "refused"} for state in check_states.values()):
        return HOLD, "mandatory check evidence refused", False, ()
    if any(state == "pending" for state in check_states.values()):
        return WAITING, "required checks are still running", False, ()
    if not pull.tests or any(not test.passed for test in pull.tests):
        return HOLD, "test evidence is missing", False, ()

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
        return READY, SATISFIED, False, ()
    if not pull.reviews:
        return WAITING, "independent reviews are missing", False, ()
    if "unauthenticated" in dispositions:
        return HOLD, "reviewer is not authenticated", False, ()
    if "forbidden" in dispositions:
        return HOLD, "reviewer is not permitted", False, ()
    if "author" in dispositions:
        return HOLD, "author cannot satisfy independent review", False, ()
    if "model" in dispositions:
        return HOLD, "reviewer model does not match the manifest", False, ()
    if "stale" in dispositions:
        return HOLD, "stale review evidence", False, ()
    if "not_permitted" in dispositions:
        return HOLD, "reviewer is not permitted", False, ()
    return WAITING, "independent reviews are missing", False, ()


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
        self._load()

    def handle(self, event: Event) -> Decision:
        token = self._acquire()
        if token is None:
            count = len(self.ledger.assignments) if self.ledger is not None else 0
            return Decision(BUSY, "controller lock is held", None, count, NOT_VERIFIED, False, False)
        try:
            self._reload()
            return self._handle_locked(event)
        finally:
            self._release(token)

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
        if len(text) > 10_000:
            return self._commit(stored_id, HOLD, "event is too large", None, accept_head=False)
        if _contains_secret(event.event_id) or _contains_secret(text):
            return self._commit(stored_id, HOLD, SECRET, self.ledger.current_head, sticky=True, accept_head=True)
        if self.ledger.hold:
            return self._commit(stored_id, HOLD, self.ledger.reason, self.ledger.current_head, sticky=True, accept_head=True)
        if event.pull_number != self.manifest.pull_number:
            return self._commit(stored_id, HOLD, "pull number is not the approved task", None, accept_head=False)
        if getattr(self.github, "is_live", False):
            return self._commit(stored_id, HOLD, LIVE, self.ledger.current_head, sticky=True, accept_head=True)
        try:
            pull = self.github.pull(event.pull_number)  # type: ignore[attr-defined]
        except GitHubError as exc:
            return self._commit(stored_id, HOLD, _github_reason(exc), None, accept_head=True)
        if not isinstance(pull, PullView):
            return self._commit(stored_id, HOLD, "github api failure", None, accept_head=True)
        if (
            len(pull.changed_paths) > 200
            or len(pull.reviews) > 40
            or len(pull.tests) > 200
            or len(pull.checks) > 40
            or any(len(item.paths) > 50 for item in pull.reviews)
        ):
            return self._commit(stored_id, HOLD, "evidence is too large", pull.head_sha, accept_head=True)
        if event.claimed_head is not None and event.claimed_head != pull.head_sha:
            return self._commit(stored_id, IGNORED, "stale event", None, accept_head=False)
        status, reason, sticky, findings = _decide(self.manifest, self.policy, self.ledger, pull)
        return self._commit(
            stored_id,
            status,
            reason,
            pull.head_sha,
            sticky=sticky,
            findings=findings,
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
        accept_head: bool = True,
    ) -> Decision:
        assert self.ledger is not None
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
            self.ledger.fingerprints.append(_fingerprint(findings))
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
        temporary = self.ledger_path.with_suffix(".json.tmp")
        fd = os.open(temporary, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, self.ledger_path)

    def _acquire(self) -> str | None:
        now = float(self.clock())
        token = secrets.token_hex(16)
        body = json.dumps({"expires_at": now + LEASE_SECONDS, "token": token}).encode("utf-8")
        for _ in range(2):
            try:
                fd = os.open(self.lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            except FileExistsError:
                if not self._lock_expired(now):
                    return None
                try:
                    self.lock_path.unlink()
                except FileNotFoundError:
                    pass
                continue
            try:
                os.write(fd, body)
            finally:
                os.close(fd)
            return token
        return None

    def _lock_expired(self, now: float) -> bool:
        try:
            raw = json.loads(self.lock_path.read_text(encoding="utf-8"))
            expires = float(raw["expires_at"])
        except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError):
            return True
        return expires <= now

    def _release(self, token: str) -> None:
        try:
            raw = json.loads(self.lock_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        if raw.get("token") == token:
            try:
                self.lock_path.unlink()
            except FileNotFoundError:
                pass


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
    return Decision(status, reason, head, assignments, plane, False, False)
