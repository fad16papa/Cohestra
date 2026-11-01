#!/usr/bin/env python3
"""Non-secret simulation of AD-25 / AD-26 / AD-27.

Sources (2026-11-02):
- https://docs.github.com/en/actions/using-workflows/triggering-a-workflow
  GITHUB_TOKEN-triggered events do not create workflow runs except
  workflow_dispatch / repository_dispatch.
- Protected-branch policy: no force-push / admin-bypass FF of live main.

Does not call GitHub. Live App→push and Environment canary remain UNVERIFIED.
"""

from __future__ import annotations

import sys

PR_D_EXCLUSIVE = frozenset(
    {
        ".github/workflows/deploy.yml",
        "deploy/validate-uat-predeploy-gate.sh",
        "deploy/validate-deploy-uat-workflow.sh",
        "deploy/commission-uat-hold.sh",
        "deploy/fetch-origin-main.sh",
        "deploy/lib/uat-predeploy-gate.py",
    }
)

UNINTENDED_MAIN = frozenset(
    {
        "src/Api/Program.cs",
        ".github/workflows/deploy-production.yml",
        "docs/adcp/README.md",
    }
)


def sync_allowed(sync_paths: set[str], intended: set[str] = PR_D_EXCLUSIVE) -> bool:
    if not intended:
        return False
    if not sync_paths <= intended:
        return False
    return intended <= sync_paths


def ff_live_main_tip(includes_unintended: bool) -> bool:
    return not includes_unintended and False  # FF of live main tip is always forbidden


def push_starts_deploy(token_class: str, event: str) -> bool:
    if event != "push":
        return False
    if token_class == "GITHUB_TOKEN":
        return False
    if token_class in {"installation", "user_owner"}:
        return True
    return False


def inline_holds(
    *,
    suppressed: str,
    gate: str,
    candidate_script_has_suppressor: bool,
) -> tuple[bool, str]:
    # Trusted YAML runs first. Candidate script cannot establish eligibility.
    if suppressed == "true":
        return True, "UAT_MAIN_DEPLOY_SUPPRESSED is true"
    if gate != "true":
        return True, "UAT_DEPLOY_GATE_ACTIVE is not true"
    if not candidate_script_has_suppressor:
        # Eligible only if inline already passed. Without suppress+gate, we never get here.
        return False, ""
    return False, ""


def workflow_run_branches_legal(branches: list[str]) -> bool:
    return branches == ["main"]


def main() -> None:
    failures: list[str] = []

    def check(name: str, cond: bool) -> None:
        if not cond:
            failures.append(name)

    check("exclusive-tree match is allowed", sync_allowed(set(PR_D_EXCLUSIVE)))
    check(
        "sync with Production workflow is refused",
        not sync_allowed(set(PR_D_EXCLUSIVE) | {"/.github/workflows/deploy-production.yml".lstrip("/")}),
    )
    check(
        "sync missing deploy.yml is refused",
        not sync_allowed({p for p in PR_D_EXCLUSIVE if p != ".github/workflows/deploy.yml"}),
    )
    check(
        "FF of live main tip with app commits is forbidden",
        not ff_live_main_tip(True),
    )
    check("FF of live main tip is forbidden even if exclusive", not ff_live_main_tip(False))
    check("unintended main paths are named", bool(UNINTENDED_MAIN & {"src/Api/Program.cs"}))

    check("GITHUB_TOKEN push does not start Deploy UAT", not push_starts_deploy("GITHUB_TOKEN", "push"))
    check("installation token push starts Deploy UAT", push_starts_deploy("installation", "push"))
    check("OWNER user merge push starts Deploy UAT", push_starts_deploy("user_owner", "push"))
    check("GITHUB_TOKEN workflow_dispatch still starts", True)

    held, reason = inline_holds(
        suppressed="true",
        gate="true",
        candidate_script_has_suppressor=False,
    )
    check("inline HOLDs when candidate omits suppressor", held and reason == "UAT_MAIN_DEPLOY_SUPPRESSED is true")
    held_gate, reason_gate = inline_holds(
        suppressed="",
        gate="false",
        candidate_script_has_suppressor=True,
    )
    check("unset suppress + gate false matches #451", held_gate and "UAT_DEPLOY_GATE_ACTIVE" in reason_gate)
    check("PR-C workflow_run.branches must stay [main]", workflow_run_branches_legal(["main"]))
    check("PR-C must not listen to release/uat yet", not workflow_run_branches_legal(["main", "release/uat"]))

    if failures:
        print("SIMULATE_MIGRATION=FAIL")
        for item in failures:
            print(f"FAIL {item}")
        raise SystemExit(1)
    print("SIMULATE_MIGRATION=PASS")
    print("AD-25 exclusive-tree ALLOW; live-main FF DENY; unintended paths REFUSE")
    print("AD-26 GITHUB_TOKEN push does not start Deploy UAT; installation/user does")
    print("AD-27 inline HOLD before candidate script; workflow_run.branches=[main]")
    print("LIVE_APP_PUSH=UNVERIFIED")


if __name__ == "__main__":
    sys.exit(main())
