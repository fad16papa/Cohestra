"""Cursor correction dispatch boundary.

The simulated dispatcher records one receipt per assignment id and does not
call Cursor. The live dispatcher always holds. A callback payload cannot
authenticate itself, and a callback for the assigned SHA is not a new commit.

`live_scoped_loop_verified` stays false.
"""

from __future__ import annotations

from dataclasses import dataclass

from .manifest import SHA_RE

MODEL = "grok-4.7-high-fast"


class DispatchHold(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class DispatchReceipt:
    assignment_id: str
    head_sha: str
    model: str
    dispatcher: str = "simulated"
    live_dispatch: bool = False
    duplicate: bool = False


@dataclass(frozen=True)
class CallbackDecision:
    accepted: bool
    reason: str
    new_head: str | None
    authenticated: bool = False


@dataclass(frozen=True)
class OwnerDispatchGrant:
    scope: str
    owner_signed: bool
    recorded_outside_cursor: bool
    model: str = MODEL


class SimulatedCursorDispatcher:
    """In-process receipt log. Survives only inside this object."""

    live_scoped_loop_verified = False

    def __init__(self) -> None:
        self._receipts: dict[str, DispatchReceipt] = {}

    def dispatch(self, assignment: dict[str, object]) -> DispatchReceipt:
        if not isinstance(assignment, dict):
            raise DispatchHold("assignment is invalid")
        if assignment.get("live_dispatch") is True:
            raise DispatchHold("live cursor dispatch is not authorized")
        assignment_id = assignment.get("assignment_id")
        head = assignment.get("head_sha")
        model = assignment.get("model")
        if not isinstance(assignment_id, str) or not assignment_id.strip():
            raise DispatchHold("assignment id is required")
        assignment_id = assignment_id.strip()
        if not isinstance(head, str) or SHA_RE.fullmatch(head) is None:
            raise DispatchHold("head sha is invalid")
        if model != MODEL:
            raise DispatchHold("dispatch model is not the approved Grok 4.7 reviewer")
        existing = self._receipts.get(assignment_id)
        if existing is not None:
            if existing.head_sha != head:
                raise DispatchHold("assignment id conflicts")
            return DispatchReceipt(
                existing.assignment_id,
                existing.head_sha,
                existing.model,
                existing.dispatcher,
                False,
                True,
            )
        receipt = DispatchReceipt(assignment_id, head, MODEL, "simulated", False, False)
        self._receipts[assignment_id] = receipt
        return receipt

    def resume(self, receipts: tuple[DispatchReceipt, ...]) -> None:
        """Reload receipts saved by a previous process. Does not dispatch."""
        for receipt in receipts:
            if not isinstance(receipt, DispatchReceipt):
                raise DispatchHold("saved receipt is invalid")
            if receipt.live_dispatch or receipt.dispatcher != "simulated":
                raise DispatchHold("live cursor dispatch is not authorized")
            if (
                not isinstance(receipt.assignment_id, str)
                or not receipt.assignment_id.strip()
                or not isinstance(receipt.head_sha, str)
                or SHA_RE.fullmatch(receipt.head_sha) is None
                or receipt.model != MODEL
            ):
                raise DispatchHold("saved receipt is invalid")
            assignment_id = receipt.assignment_id.strip()
            normalized = DispatchReceipt(
                assignment_id,
                receipt.head_sha,
                receipt.model,
                receipt.dispatcher,
                False,
                False,
            )
            existing = self._receipts.get(assignment_id)
            if existing is not None and existing.head_sha != receipt.head_sha:
                raise DispatchHold("assignment id conflicts")
            self._receipts.setdefault(assignment_id, normalized)


class LiveCursorDispatcher:
    """The live pilot is closed. A grant object does not open it."""

    live_scoped_loop_verified = False

    def dispatch(self, assignment: dict[str, object], grant: OwnerDispatchGrant | None = None) -> DispatchReceipt:
        del assignment
        if (
            grant is None
            or grant.scope != "cursor-scoped-correction"
            or not grant.owner_signed
            or not grant.recorded_outside_cursor
            or grant.model != MODEL
        ):
            raise DispatchHold("live cursor dispatch is not authorized")
        raise DispatchHold("live cursor pilot is not enabled")


def classify_callback(payload: dict[str, object], assigned_head: str) -> CallbackDecision:
    """Untrusted provider text. Authentication stays false in this build."""
    if not isinstance(payload, dict):
        return CallbackDecision(False, "callback is not authenticated", None, False)
    head = payload.get("head_sha")
    if not isinstance(head, str) or SHA_RE.fullmatch(head) is None:
        return CallbackDecision(False, "head sha is invalid", None, False)
    if head == assigned_head:
        return CallbackDecision(False, "a new commit is required before re-evaluation", None, False)
    if payload.get("source") != "provider-callback":
        return CallbackDecision(False, "callback source is not authenticated", None, False)
    return CallbackDecision(False, "callback is not authenticated", head, False)
