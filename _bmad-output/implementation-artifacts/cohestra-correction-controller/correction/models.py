"""Evidence shapes. Event text is untrusted. Port objects are host-supplied."""

from __future__ import annotations

from dataclasses import dataclass, field


class GitHubError(Exception):
    def __init__(self, status: int, reason: str) -> None:
        super().__init__(reason)
        self.status = status
        self.reason = reason


@dataclass(frozen=True)
class Check:
    name: str
    conclusion: str | None
    head_sha: str


@dataclass(frozen=True)
class Review:
    reviewer_id: str
    role: str
    head_sha: str
    blocker: int
    major: int
    model: str
    authenticated: bool
    paths: tuple[str, ...] = ()


@dataclass(frozen=True)
class TestResult:
    name: str
    passed: bool
    path: str
    detail: str = ""


@dataclass(frozen=True)
class PullView:
    number: int
    head_sha: str
    base_sha: str
    base_ref: str
    author_id: str
    checks: tuple[Check, ...]
    reviews: tuple[Review, ...]
    tests: tuple[TestResult, ...]
    changed_paths: tuple[str, ...]


@dataclass(frozen=True)
class Event:
    event_id: str
    pull_number: int
    claimed_head: str | None = None
    untrusted_text: str = ""


@dataclass(frozen=True)
class Decision:
    status: str
    reason: str
    head_sha: str | None
    assignments: int
    verification_plane: str
    live_scoped_loop_verified: bool = False
    live_read_only_transport_verified: bool = False


@dataclass
class Assignment:
    assignment_id: str
    head_sha: str
    model: str
    allowed_paths: tuple[str, ...]
    findings: tuple[dict[str, str], ...]
    dispatcher: str = "simulated"
    live_dispatch: bool = False

    def as_dict(self) -> dict[str, object]:
        return {
            "assignment_id": self.assignment_id,
            "head_sha": self.head_sha,
            "model": self.model,
            "allowed_paths": list(self.allowed_paths),
            "findings": [dict(item) for item in self.findings],
            "dispatcher": self.dispatcher,
            "live_dispatch": self.live_dispatch,
        }


@dataclass
class Ledger:
    manifest_id: str
    manifest_digest: str
    pull_number: int
    base_sha: str
    current_head: str | None = None
    corrections: int = 0
    assigned_heads: list[str] = field(default_factory=list)
    fingerprints: list[str] = field(default_factory=list)
    applied_event_ids: list[str] = field(default_factory=list)
    assignments: list[dict[str, object]] = field(default_factory=list)
    trace: list[dict[str, object]] = field(default_factory=list)
    status: str = "IDLE"
    reason: str = "no events"
    hold: bool = False

    def to_json(self) -> dict[str, object]:
        return {
            "manifest_id": self.manifest_id,
            "manifest_digest": self.manifest_digest,
            "pull_number": self.pull_number,
            "base_sha": self.base_sha,
            "current_head": self.current_head,
            "corrections": self.corrections,
            "assigned_heads": list(self.assigned_heads),
            "fingerprints": list(self.fingerprints),
            "applied_event_ids": list(self.applied_event_ids),
            "assignments": list(self.assignments),
            "trace": list(self.trace),
            "status": self.status,
            "reason": self.reason,
            "hold": self.hold,
        }

    @classmethod
    def from_json(cls, raw: dict[str, object]) -> Ledger:
        return cls(
            manifest_id=str(raw["manifest_id"]),
            manifest_digest=str(raw["manifest_digest"]),
            pull_number=int(raw["pull_number"]),
            base_sha=str(raw["base_sha"]),
            current_head=raw.get("current_head") if isinstance(raw.get("current_head"), str) else None,
            corrections=int(raw.get("corrections") or 0),
            assigned_heads=[str(item) for item in raw.get("assigned_heads") or []],
            fingerprints=[str(item) for item in raw.get("fingerprints") or []],
            applied_event_ids=[str(item) for item in raw.get("applied_event_ids") or []],
            assignments=list(raw.get("assignments") or []),
            trace=list(raw.get("trace") or []),
            status=str(raw.get("status") or "IDLE"),
            reason=str(raw.get("reason") or ""),
            hold=bool(raw.get("hold")),
        )
