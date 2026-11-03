"""Release eligibility gate. Live merge and UAT stay closed.

A simulated READY decision is not eligibility. Caller flags cannot turn the
gate on. Control-plane paths stay outside automatic merge. Production stays
NO-GO.
"""

from __future__ import annotations

import posixpath
from dataclasses import dataclass

UAT_DEPLOY_GATE_ACTIVE = False
UAT_MAIN_DEPLOY_SUPPRESSED = True
OWNER_POLICY_ENFORCED = False
PRODUCTION_AUTHORIZED = False

CONTROL_PLANE_PREFIXES = (
    ".github/",
    "deploy/",
    "correction/",
    "_bmad/",
)


class ReleaseHold(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class GateDecision:
    eligible: bool
    automerge_ready: bool
    uat_deployment_ready: bool
    production_ready: bool
    owner_control_ready: bool
    reasons: tuple[str, ...]


def _control_plane(paths: tuple[str, ...]) -> bool:
    prefixes = tuple(prefix.casefold() for prefix in CONTROL_PLANE_PREFIXES)
    for path in paths:
        if not isinstance(path, str):
            return True
        normalized = posixpath.normpath(path.replace("\\", "/").lstrip("/"))
        folded = normalized.casefold()
        if (
            folded.startswith("..")
            or folded.startswith(prefixes)
            or "/.github/" in f"/{folded}"
            or "secret" in folded
        ):
            return True
    return False


def assess(
    *,
    verification_plane: str,
    changed_paths: tuple[str, ...],
    policy_activated: bool = False,
    owner_manifest_authorized: bool = False,
) -> GateDecision:
    """Return a closed gate. Arguments explain the hold. They do not open it."""
    reasons = [
        "simulated readiness is not merge authorization",
        "feature auto-merge policy is not activated",
    ]
    if verification_plane != "SIMULATED_PASS":
        reasons.append("controller readiness is not verified")
    if not owner_manifest_authorized:
        reasons.append("owner manifest is not authorized")
    if policy_activated and not OWNER_POLICY_ENFORCED:
        reasons.append("owner policy enforcement is not verified")
    if not policy_activated:
        reasons.append("caller did not claim an activated policy")
    invalid_paths = not isinstance(changed_paths, tuple) or any(
        not isinstance(path, str) or not path.strip() for path in changed_paths
    )
    scan = () if invalid_paths else changed_paths
    if _control_plane(scan):
        reasons.append("control-plane change requires separate owner authorization")
    if invalid_paths or not scan:
        reasons.append("changed paths are missing")
    return GateDecision(False, False, False, False, False, tuple(reasons))


def merge_feature(decision: GateDecision) -> None:
    del decision
    raise ReleaseHold("automatic merge is not authorized")


def deploy_uat(decision: GateDecision) -> None:
    del decision
    if UAT_DEPLOY_GATE_ACTIVE or not UAT_MAIN_DEPLOY_SUPPRESSED:
        raise ReleaseHold("UAT flags are inconsistent")
    raise ReleaseHold("UAT deployment is not authorized")


def deploy_production(decision: GateDecision) -> None:
    del decision
    if PRODUCTION_AUTHORIZED:
        raise ReleaseHold("production flag is inconsistent")
    raise ReleaseHold("production deployment is not authorized")
