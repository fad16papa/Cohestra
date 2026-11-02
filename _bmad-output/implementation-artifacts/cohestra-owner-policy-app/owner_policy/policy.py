"""Load the App-bundled policy. Never reads git blobs as code."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class PolicyError(Exception):
    pass


@dataclass(frozen=True)
class BundledPolicy:
    policy_id: str
    policy_version: int
    check_name: str
    owner_logins: frozenset[str]
    forbidden_actor_logins: frozenset[str]
    protected_bases: frozenset[str]
    control_plane_prefixes: tuple[str, ...]
    forbidden_path_prefixes: tuple[str, ...]
    forbidden_name_substrings: tuple[str, ...]
    secret_name_markers: tuple[str, ...]
    sync_approved_paths: frozenset[str]
    expansion_paths: frozenset[str]
    hmac_required: bool
    hmac_canonical_version: int
    hmac_max_age_seconds: int
    hmac_future_skew_seconds: int
    known_spoof_integration_ids: dict[str, int]
    raw: dict[str, Any]


def default_policy_path() -> Path:
    return Path(__file__).resolve().parent.parent / "policy" / "bundled_policy.json"


def load_policy(path: Path | None = None) -> BundledPolicy:
    target = path or default_policy_path()
    if not target.is_file():
        raise PolicyError(f"bundled policy missing: {target}")
    try:
        raw = json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise PolicyError(f"bundled policy is not JSON: {exc}") from exc
    if not isinstance(raw, dict):
        raise PolicyError("bundled policy root must be an object")
    try:
        return BundledPolicy(
            policy_id=str(raw["policy_id"]),
            policy_version=int(raw["policy_version"]),
            check_name=str(raw["check_name"]),
            owner_logins=frozenset(str(x) for x in raw["owner_logins"]),
            forbidden_actor_logins=frozenset(str(x) for x in raw["forbidden_actor_logins"]),
            protected_bases=frozenset(str(x) for x in raw["protected_bases"]),
            control_plane_prefixes=tuple(str(x) for x in raw["control_plane_prefixes"]),
            forbidden_path_prefixes=tuple(str(x) for x in raw["forbidden_path_prefixes"]),
            forbidden_name_substrings=tuple(str(x) for x in raw["forbidden_name_substrings"]),
            secret_name_markers=tuple(str(x) for x in raw["secret_name_markers"]),
            sync_approved_paths=frozenset(str(x) for x in raw["sync_approved_paths"]),
            expansion_paths=frozenset(str(x) for x in raw["expansion_paths"]),
            hmac_required=bool(raw["hmac_required"]),
            hmac_canonical_version=int(raw["hmac_canonical_version"]),
            hmac_max_age_seconds=int(raw["hmac_max_age_seconds"]),
            hmac_future_skew_seconds=int(raw["hmac_future_skew_seconds"]),
            known_spoof_integration_ids={
                str(k): int(v) for k, v in dict(raw["known_spoof_integration_ids"]).items()
            },
            raw=raw,
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise PolicyError(f"bundled policy fields invalid: {exc}") from exc


def is_control_plane_path(path: str, policy: BundledPolicy) -> bool:
    lowered = path.lower()
    return any(lowered.startswith(prefix.lower()) for prefix in policy.control_plane_prefixes)


def forbidden_path_reason(path: str, policy: BundledPolicy) -> str | None:
    """Legacy helper. The evaluator classifies with paths.py, not substrings.

    `src/` and `web/` are ordinary application trees. The substring `secret`
    is not a secret marker, so `src/SecretRotation.cs` stays product code.
    """
    from .paths import PathError, canonicalize_repo_path, secret_path_reason

    try:
        canon = canonicalize_repo_path(path)
    except PathError as exc:
        return str(exc)
    secret = secret_path_reason(canon)
    if secret:
        return secret
    lowered = canon.lower()
    for fragment in policy.forbidden_name_substrings:
        if fragment.lower() in lowered:
            return f"forbidden control-plane path: {canon}"
    return None
