"""HMAC owner attestation. Comment-only approval is never sufficient.

A valid MAC binds the owner account to repo + PR + base + exact HEAD + time.
It is not proof that a human was present. Cursor can mint a user-attributed
comment when it holds that account's token. The secret must stay outside
Cohestra, Cursor, pull-request comments, and CI logs.
"""

from __future__ import annotations

import hmac
import re
from dataclasses import dataclass
from hashlib import sha256

from .policy import BundledPolicy

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
MAC_RE = re.compile(r"^[0-9a-f]{64}$")
COMMENT_RE = re.compile(
    r"^OWNER_APPROVE_CONTROL_PLANE sha=([0-9a-f]{40}) ts=([0-9]+) mac=([0-9a-f]{64})$"
)
CANONICAL_VERSION = 2


class AttestationError(Exception):
    pass


@dataclass(frozen=True)
class Comment:
    login: str
    user_type: str
    body: str
    created_at: int = 0
    updated_at: int = 0
    deleted: bool = False


def canonical_message(
    *,
    repo: str,
    pull_number: int,
    sha: str,
    base_ref: str,
    ts: int,
    version: int,
) -> bytes:
    payload = (
        "OWNER_APPROVE_CONTROL_PLANE\n"
        f"v={version}\n"
        f"repo={repo}\n"
        f"pr={pull_number}\n"
        f"base={base_ref}\n"
        f"sha={sha}\n"
        f"ts={ts}\n"
    )
    return payload.encode("utf-8")


def compute_mac(
    secret: str,
    *,
    repo: str,
    pull_number: int,
    sha: str,
    base_ref: str,
    ts: int,
    version: int,
) -> str:
    if not isinstance(secret, str) or not secret.strip():
        raise AttestationError("attestation secret missing")
    if any(char in repo or char in base_ref for char in "\r\n") or not repo or not base_ref:
        raise AttestationError("attestation binding is malformed")
    if not SHA_RE.fullmatch(sha):
        raise AttestationError("attestation SHA is not 40-char lowercase hex")
    if not base_ref:
        raise AttestationError("attestation base_ref missing")
    if version != CANONICAL_VERSION:
        raise AttestationError("unsupported hmac canonical version")
    if not isinstance(ts, int) or isinstance(ts, bool) or ts < 0:
        raise AttestationError("attestation timestamp is malformed")
    digest = hmac.new(
        secret.encode("utf-8"),
        canonical_message(
            repo=repo,
            pull_number=pull_number,
            sha=sha,
            base_ref=base_ref,
            ts=ts,
            version=version,
        ),
        sha256,
    ).hexdigest()
    return digest


def _active_secrets(secrets: tuple[str, ...] | list[str]) -> tuple[str, ...]:
    active = tuple(item for item in secrets if isinstance(item, str) and item.strip())
    if not active:
        raise AttestationError("attestation secret missing")
    return active


def _owner_attestation(comment: Comment, policy: BundledPolicy) -> bool:
    login = comment.login.strip()
    if login in policy.forbidden_actor_logins or comment.user_type != "User":
        return False
    if login not in policy.owner_logins:
        return False
    return comment.body.strip().startswith("OWNER_APPROVE_CONTROL_PLANE")


def verify_attestation(
    policy: BundledPolicy,
    *,
    secrets: tuple[str, ...] | list[str],
    comments: list[Comment],
    repo: str,
    pull_number: int,
    head_sha: str,
    base_ref: str,
    now_unix: int,
) -> None:
    if not policy.hmac_required:
        raise AttestationError("hmac_required must remain true")
    if policy.hmac_canonical_version != CANONICAL_VERSION:
        raise AttestationError("unsupported hmac canonical version")
    active = _active_secrets(secrets)
    if type(pull_number) is not int or pull_number < 1:
        raise AttestationError("pull number is malformed")
    if any(char in repo or char in base_ref for char in "\r\n") or not repo or not base_ref:
        raise AttestationError("attestation binding is malformed")
    if not SHA_RE.fullmatch(head_sha):
        raise AttestationError("head SHA is not 40-char lowercase hex")
    if not isinstance(now_unix, int) or isinstance(now_unix, bool) or now_unix <= 0:
        raise AttestationError("attestation clock is malformed")

    matched = False
    saw_owner_attestation = False
    for comment in comments:
        if not _owner_attestation(comment, policy):
            continue
        saw_owner_attestation = True
        if comment.deleted:
            raise AttestationError("deleted attestation")
        if comment.created_at <= 0 or comment.updated_at <= 0:
            raise AttestationError("attestation comment timestamps missing")
        if comment.updated_at != comment.created_at:
            raise AttestationError("edited attestation")
        body = comment.body.strip()
        if " mac=" not in body:
            raise AttestationError("comment attestation without HMAC is insufficient")
        parsed = COMMENT_RE.fullmatch(body)
        if parsed is None:
            raise AttestationError("attestation comment is malformed")
        sha, ts_text, mac = parsed.group(1), parsed.group(2), parsed.group(3)
        if sha != head_sha:
            raise AttestationError("attestation SHA does not match current HEAD")
        if not MAC_RE.fullmatch(mac):
            raise AttestationError("attestation MAC is malformed")
        ts = int(ts_text)
        if (
            comment.created_at > ts + policy.hmac_future_skew_seconds
            or ts > comment.created_at + policy.hmac_future_skew_seconds
        ):
            raise AttestationError("attestation timestamp does not match the comment")
        if policy.hmac_max_age_seconds <= 0 or policy.hmac_future_skew_seconds < 0:
            raise AttestationError("unsupported hmac window")
        if ts > now_unix + policy.hmac_future_skew_seconds:
            raise AttestationError("attestation timestamp is in the future")
        if now_unix - ts > policy.hmac_max_age_seconds:
            raise AttestationError("attestation timestamp is expired")
        mac_ok = False
        for secret in active:
            expected = compute_mac(
                secret,
                repo=repo,
                pull_number=pull_number,
                sha=head_sha,
                base_ref=base_ref,
                ts=ts,
                version=policy.hmac_canonical_version,
            )
            if hmac.compare_digest(mac, expected):
                mac_ok = True
        if not mac_ok:
            raise AttestationError("attestation MAC is invalid")
        matched = True

    if saw_owner_attestation and not matched:
        raise AttestationError("attestation MAC is invalid")
    if not matched:
        raise AttestationError("missing owner HMAC attestation")
