"""HMAC owner attestation. Comment-only approval is never sufficient."""

from __future__ import annotations

import hmac
import re
from dataclasses import dataclass
from hashlib import sha256

from .policy import BundledPolicy

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
MAC_RE = re.compile(r"^[0-9a-f]{64}$")
COMMENT_RE = re.compile(
    r"^OWNER_APPROVE_CONTROL_PLANE sha=([0-9a-f]{40}) mac=([0-9a-f]{64})$"
)


class AttestationError(Exception):
    pass


@dataclass(frozen=True)
class Comment:
    login: str
    user_type: str
    body: str


def canonical_message(
    *,
    repo: str,
    pull_number: int,
    sha: str,
    base_ref: str,
    version: int,
) -> bytes:
    # Bound to repo + PR + SHA + base so a MAC cannot be replayed onto
    # another PR, SHA, or dest branch.
    payload = (
        f"OWNER_APPROVE_CONTROL_PLANE\nv={version}\n"
        f"repo={repo}\npr={pull_number}\nbase={base_ref}\nsha={sha}\n"
    )
    return payload.encode("utf-8")


def compute_mac(
    secret: str,
    *,
    repo: str,
    pull_number: int,
    sha: str,
    base_ref: str,
    version: int,
) -> str:
    if not secret:
        raise AttestationError("attestation secret missing")
    if not SHA_RE.fullmatch(sha):
        raise AttestationError("attestation SHA is not 40-char lowercase hex")
    if not base_ref:
        raise AttestationError("attestation base_ref missing")
    digest = hmac.new(
        secret.encode("utf-8"),
        canonical_message(
            repo=repo,
            pull_number=pull_number,
            sha=sha,
            base_ref=base_ref,
            version=version,
        ),
        sha256,
    ).hexdigest()
    return digest


def verify_attestation(
    policy: BundledPolicy,
    *,
    secret: str | None,
    comments: list[Comment],
    repo: str,
    pull_number: int,
    head_sha: str,
    base_ref: str,
) -> None:
    if not policy.hmac_required:
        raise AttestationError("hmac_required must remain true")
    if not secret:
        raise AttestationError("attestation secret missing")
    if not SHA_RE.fullmatch(head_sha):
        raise AttestationError("head SHA is not 40-char lowercase hex")

    expected = compute_mac(
        secret,
        repo=repo,
        pull_number=pull_number,
        sha=head_sha,
        base_ref=base_ref,
        version=policy.hmac_canonical_version,
    )

    matched = False
    for comment in comments:
        login = comment.login.strip()
        if login in policy.forbidden_actor_logins:
            continue
        if comment.user_type != "User":
            continue
        if login not in policy.owner_logins:
            continue
        body = comment.body.strip()
        # Comment-only (no mac) is explicitly insufficient.
        if body.startswith("OWNER_APPROVE_CONTROL_PLANE sha=") and " mac=" not in body:
            raise AttestationError("comment attestation without HMAC is insufficient")
        parsed = COMMENT_RE.fullmatch(body)
        if parsed is None:
            continue
        sha, mac = parsed.group(1), parsed.group(2)
        if sha != head_sha:
            raise AttestationError("attestation SHA does not match current HEAD")
        if not MAC_RE.fullmatch(mac):
            raise AttestationError("attestation MAC is malformed")
        if not hmac.compare_digest(mac, expected):
            raise AttestationError("attestation MAC is invalid")
        matched = True
        break

    if not matched:
        raise AttestationError("missing owner HMAC attestation")
