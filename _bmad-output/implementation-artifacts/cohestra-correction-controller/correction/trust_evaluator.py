"""Read-only trusted evaluator for an owner-signed story manifest.

A PASS means the fetched evidence matched the host rules. It is not merge,
dispatch, or deploy authority. Every live flag stays false. The side-effect
gate returns HOLD for every request in this build.

The live transport, when constructed by the workflow, issues GET requests to
https://api.github.com and nothing else. Tests pass a fake transport. This
module never calls the simulated controller's assignment path.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol
from urllib import error, request

from .manifest import SHA_RE
from .trust_evidence import (
    API_FAILURE,
    CHECK_PAGE_SIZE,
    CLOSING_MISMATCH,
    EVENT_INVALID,
    MANIFEST_INVALID,
    MANIFEST_MISSING,
    MAX_CHECK_PAGES,
    MAX_RESPONSE_BYTES,
    NO_AUTHORITY,
    NOT_ENABLED,
    PASS_REASON,
    PULL_UNREADABLE,
    REPLAY_MISMATCH,
    REVIEW_UNTRUSTED,
    STORE_UNREADABLE,
    UNAVAILABLE,
    CheckRun,
    EventClaim,
    TransportRefused,
    binding_holds,
    check_runs_url,
    compare_url,
    decode_manifest_response,
    fingerprint,
    load_object,
    manifest_url,
    parse_check_page,
    parse_compare,
    parse_config,
    parse_event,
    parse_manifest_bytes,
    parse_pull,
    pull_url,
    refuse_unless_get,
    required_checks_hold,
    reviewer_hold,
    scope_holds,
    signature_holds,
    structural_hold,
)

LIVE_FLAGS = (
    "automerge_ready",
    "live_identity_verified",
    "live_read_only_transport_verified",
    "live_scoped_loop_verified",
    "owner_control_ready",
    "production_ready",
    "uat_deploy_ready",
)


@dataclass(frozen=True)
class TrustDecision:
    status: str
    reason: str
    head_sha: str | None
    replayed: bool = False
    execution_authorized: bool = False

    def __post_init__(self) -> None:
        object.__setattr__(self, "execution_authorized", False)
        object.__setattr__(self, "replayed", self.replayed is True)
        if self.status not in {"PASS", "HOLD"} or not isinstance(self.reason, str) or not self.reason:
            object.__setattr__(self, "status", "HOLD")
            object.__setattr__(self, "reason", STORE_UNREADABLE)
        if self.head_sha is not None and SHA_RE.fullmatch(self.head_sha) is None:
            object.__setattr__(self, "status", "HOLD")
            object.__setattr__(self, "reason", STORE_UNREADABLE)
            object.__setattr__(self, "head_sha", None)

    def to_dict(self) -> dict[str, object]:
        body: dict[str, object] = {
            "execution_authorized": False,
            "head_sha": self.head_sha,
            "reason": self.reason,
            "replayed": self.replayed,
            "status": self.status,
        }
        for name in LIVE_FLAGS:
            body[name] = False
        return body


class ReadTransport(Protocol):
    def get(self, url: str) -> tuple[int, bytes]:
        """Return the HTTP status and body for one GET."""


class GitHubReadTransport:
    """GET-only client. Redirects and any other host are refused."""

    def __init__(self, token: str, opener: request.OpenerDirector | None = None) -> None:
        if not isinstance(token, str) or not token or any(ch in token for ch in "\r\n"):
            raise TransportRefused("token")
        self._token = token
        self._opener = opener

    def get(self, url: str) -> tuple[int, bytes]:
        refuse_unless_get(url)
        req = request.Request(
            url,
            data=None,
            method="GET",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self._token}",
                "User-Agent": "cohestra-trust-evaluator",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        opener = self._opener or request.build_opener(_RefuseRedirect)
        try:
            with opener.open(req, timeout=30) as response:
                status = getattr(response, "status", 200)
                body = response.read(MAX_RESPONSE_BYTES + 1)
        except error.HTTPError as exc:
            return exc.code, b""
        except (error.URLError, TimeoutError, OSError, TransportRefused) as exc:
            raise TransportRefused(API_FAILURE) from exc
        if len(body) > MAX_RESPONSE_BYTES:
            raise TransportRefused(API_FAILURE)
        return status, body


class _RefuseRedirect(request.HTTPRedirectHandler):
    def redirect_request(
        self,
        req: request.Request,
        fp: object,
        code: int,
        msg: str,
        headers: object,
        newurl: str,
    ) -> request.Request | None:
        raise TransportRefused("redirect")


def hold(reason: str, head: str | None = None, *, replayed: bool = False) -> TrustDecision:
    return TrustDecision("HOLD", reason, head, replayed)


def side_effect_gate(decision: TrustDecision, *, current_head: str | None) -> TrustDecision:
    """Refuse every side effect. Replay, a matching head, and PASS are included."""
    del current_head
    return hold(NO_AUTHORITY, decision.head_sha, replayed=decision.replayed)


def consult_simulated_controller(decision: TrustDecision, controller: object | None = None) -> dict[str, object]:
    """Offer the decision to the simulated controller and grant nothing.

    The controller object is not asked to handle an event, dispatch, merge,
    or deploy. `authentication_source` is empty on purpose.
    """
    gate = side_effect_gate(decision, current_head=decision.head_sha)
    corrections: int | None = None
    if controller is not None:
        ledger = getattr(controller, "ledger", None)
        observed = getattr(ledger, "corrections", None)
        corrections = observed if type(observed) is int else None
    return {
        "authentication_source": "",
        "controller": "simulated",
        "corrections": corrections,
        "execution_authorized": False,
        "head_sha": gate.head_sha,
        "live_dispatch": False,
        "owner_manifest_authorized": False,
        "reason": gate.reason,
        "status": gate.status,
    }


def evaluate(env: dict[str, str], transport: ReadTransport | None, store_dir: Path) -> TrustDecision:
    claim, event_reason = parse_event(env)
    if claim is None:
        return hold(event_reason or EVENT_INVALID)
    store = _Store(store_dir)
    with store.lock() as locked:
        if locked is None:
            return hold(STORE_UNREADABLE)
        stored = locked.read(claim)
        if isinstance(stored, TrustDecision):
            return stored
        if stored == "mismatch":
            return hold(REPLAY_MISMATCH, claim.claimed_head)
        if stored == "unreadable":
            return hold(STORE_UNREADABLE)
        decision = _evaluate_fresh(env, claim, transport)
        if not locked.save(claim, decision):
            return hold(STORE_UNREADABLE, decision.head_sha)
        return decision


def main(argv: list[str] | None = None) -> int:
    del argv
    env = {key: value for key, value in os.environ.items() if isinstance(value, str)}
    raw_dir = env.get("COHESTRA_TRUST_REPLAY_DIR") or os.path.join(
        env.get("RUNNER_TEMP") or tempfile.gettempdir(),
        "cohestra-trust-replay",
    )
    token = env.get("GITHUB_TOKEN", "")
    transport: ReadTransport | None = None
    try:
        if token:
            transport = GitHubReadTransport(token)
        decision = evaluate(env, transport, Path(raw_dir))
    except Exception:
        decision = hold(UNAVAILABLE)
    sys.stdout.write(json.dumps(decision.to_dict(), sort_keys=True, separators=(",", ":")) + "\n")
    summary = env.get("GITHUB_STEP_SUMMARY")
    if summary and "\x00" not in summary:
        try:
            Path(summary).write_text(
                f"Trust evaluator: {decision.status}\nreason: {decision.reason}\nhead: {decision.head_sha or ''}\n",
                encoding="utf-8",
            )
        except OSError:
            pass
    return 0 if decision.status == "PASS" else 1


def _evaluate_fresh(env: dict[str, str], claim: EventClaim, transport: ReadTransport | None) -> TrustDecision:
    config, config_reason = parse_config(env)
    if config is None:
        return hold(config_reason or NOT_ENABLED)
    if transport is None:
        return hold(UNAVAILABLE)
    opened, open_reason = _get_json(transport, pull_url(claim.repository, claim.pull_number))
    if opened is None:
        return hold(open_reason or PULL_UNREADABLE)
    facts, pull_reason = parse_pull(opened, repository=claim.repository, number=claim.pull_number)
    if facts is None:
        return hold(pull_reason or PULL_UNREADABLE)
    blocked = structural_hold(facts, claim)
    if blocked is not None:
        return hold(blocked, facts.head_sha)
    manifest_payload, manifest_reason = _get_json(transport, manifest_url(claim.repository, facts.head_sha))
    if manifest_payload is None:
        if manifest_reason == "missing":
            return hold(MANIFEST_MISSING, facts.head_sha)
        return hold(manifest_reason or MANIFEST_INVALID, facts.head_sha)
    manifest_bytes, decode_reason = decode_manifest_response(manifest_payload)
    if manifest_bytes is None:
        return hold(decode_reason or MANIFEST_INVALID, facts.head_sha)
    manifest, parsed_reason = parse_manifest_bytes(manifest_bytes)
    if manifest is None:
        return hold(parsed_reason or MANIFEST_INVALID, facts.head_sha)
    rejected = signature_holds(manifest, config)
    if rejected is not None:
        return hold(rejected, facts.head_sha)
    unbound = binding_holds(manifest, facts, config)
    if unbound is not None:
        return hold(unbound, facts.head_sha)
    compared, compare_reason = _get_json(transport, compare_url(claim.repository, facts.base_sha, facts.head_sha))
    if compared is None:
        return hold(compare_reason or API_FAILURE, facts.head_sha)
    files, files_reason = parse_compare(compared, facts)
    if files_reason is not None:
        return hold(files_reason, facts.head_sha)
    outside = scope_holds(files, manifest)
    if outside is not None:
        return hold(outside, facts.head_sha)
    runs, runs_reason = _check_runs(transport, claim.repository, facts.head_sha)
    if runs_reason is not None:
        return hold(runs_reason, facts.head_sha)
    review_reason = reviewer_hold(runs, config, facts.head_sha, facts.author)
    if review_reason is not None:
        return hold(review_reason, facts.head_sha)
    checks_reason = required_checks_hold(runs, manifest, config, facts.head_sha)
    if checks_reason is not None:
        return hold(checks_reason, facts.head_sha)
    closed, close_reason = _get_json(transport, pull_url(claim.repository, claim.pull_number))
    if closed is None:
        return hold(UNAVAILABLE if close_reason == UNAVAILABLE else CLOSING_MISMATCH, facts.head_sha)
    closing, closing_reason = parse_pull(closed, repository=claim.repository, number=claim.pull_number)
    if closing is None or closing != facts or structural_hold(closing, claim) is not None:
        del closing_reason
        return hold(CLOSING_MISMATCH, facts.head_sha)
    return TrustDecision("PASS", PASS_REASON, facts.head_sha, False, False)


def _check_runs(
    transport: ReadTransport,
    repository: str,
    head_sha: str,
) -> tuple[tuple[CheckRun, ...], str | None]:
    collected: list[CheckRun] = []
    expected: int | None = None
    for page in range(1, MAX_CHECK_PAGES + 1):
        payload, reason = _get_json(transport, check_runs_url(repository, head_sha, page))
        if payload is None:
            return (), reason or API_FAILURE
        total, rows, page_reason = parse_check_page(payload)
        if page_reason is not None or total is None:
            return (), page_reason or REVIEW_UNTRUSTED
        if expected is None:
            expected = total
        elif expected != total:
            return (), REVIEW_UNTRUSTED
        collected.extend(rows)
        if len(collected) == expected:
            return tuple(collected), None
        if len(rows) < CHECK_PAGE_SIZE or len(collected) > expected:
            return (), REVIEW_UNTRUSTED
    return (), REVIEW_UNTRUSTED


def _get_json(transport: ReadTransport, url: str) -> tuple[dict[str, object] | None, str | None]:
    try:
        refuse_unless_get(url)
        status, body = transport.get(url)
    except TransportRefused:
        return None, API_FAILURE
    if status == 404 and "/contents/" in url:
        return None, "missing"
    if status in {401, 403, 429}:
        return None, UNAVAILABLE
    if status != 200:
        return None, API_FAILURE
    payload, reason = load_object(body, limit=MAX_RESPONSE_BYTES, reject_floats=False)
    if payload is None:
        return None, API_FAILURE if reason != "nonfinite" else API_FAILURE
    return payload, None


class _Store:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self._fd: int | None = None

    def lock(self) -> "_Store":
        return self

    def __enter__(self) -> "_Store | None":
        try:
            if self.directory.is_symlink():
                return None
            self.directory.mkdir(parents=True, exist_ok=True)
            if not self.directory.is_dir() or self.directory.is_symlink():
                return None
            lock_path = self.directory / "replay.lock"
            if lock_path.is_symlink():
                return None
            self._fd = os.open(lock_path, os.O_RDWR | os.O_CREAT, 0o600)
            import fcntl

            fcntl.flock(self._fd, fcntl.LOCK_EX)
        except OSError:
            self._close()
            return None
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        self._close()

    def read(self, claim: EventClaim) -> TrustDecision | str | None:
        path = self.directory / "replay.json"
        if path.is_symlink():
            return "unreadable"
        if not path.exists():
            return None
        try:
            raw = path.read_bytes()
            payload = json.loads(raw.decode("utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            return "unreadable"
        if not isinstance(payload, dict) or set(payload) != {"events", "version"} or payload.get("version") != 1:
            return "unreadable"
        events = payload.get("events")
        if not isinstance(events, dict):
            return "unreadable"
        row = events.get(claim.event_id)
        if row is None:
            return None
        if not isinstance(row, dict) or set(row) != {"fingerprint", "head_sha", "reason", "status"}:
            return "unreadable"
        if row.get("fingerprint") != fingerprint(claim):
            return "mismatch"
        head = row.get("head_sha")
        status = row.get("status")
        reason = row.get("reason")
        if status not in {"PASS", "HOLD"} or not isinstance(reason, str) or not reason:
            return "unreadable"
        if head is not None and (not isinstance(head, str) or SHA_RE.fullmatch(head) is None):
            return "unreadable"
        return TrustDecision(status, reason, head if isinstance(head, str) else None, True, False)

    def save(self, claim: EventClaim, decision: TrustDecision) -> bool:
        path = self.directory / "replay.json"
        if path.is_symlink():
            return False
        current: dict[str, object] = {"version": 1, "events": {}}
        if path.exists():
            loaded = self._existing(path)
            if loaded is None:
                return False
            current = loaded
        events = current.get("events")
        if not isinstance(events, dict):
            return False
        if claim.event_id in events:
            return False
        events[claim.event_id] = {
            "fingerprint": fingerprint(claim),
            "head_sha": decision.head_sha,
            "reason": decision.reason,
            "status": decision.status,
        }
        blob = json.dumps(current, sort_keys=True, separators=(",", ":")).encode("utf-8")
        temporary = self.directory / "replay.json.tmp"
        try:
            if temporary.is_symlink():
                return False
            with open(temporary, "wb") as handle:
                handle.write(blob)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, path)
        except OSError:
            return False
        return True

    def _existing(self, path: Path) -> dict[str, object] | None:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            return None
        if not isinstance(payload, dict) or payload.get("version") != 1 or not isinstance(payload.get("events"), dict):
            return None
        return payload

    def _close(self) -> None:
        if self._fd is None:
            return
        import fcntl

        try:
            fcntl.flock(self._fd, fcntl.LOCK_UN)
        except OSError:
            pass
        os.close(self._fd)
        self._fd = None


if __name__ == "__main__":
    sys.exit(main())
