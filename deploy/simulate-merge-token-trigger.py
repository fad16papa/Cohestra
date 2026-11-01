#!/usr/bin/env python3
"""AD-25 / AD-26 negatives. Does not call GitHub.

Documented: GITHUB_TOKEN-triggered push does not create a workflow run
except workflow_dispatch / repository_dispatch.
https://docs.github.com/en/actions/using-workflows/triggering-a-workflow
"""

from __future__ import annotations

import sys

PR_D_EXCLUSIVE = {
    ".github/workflows/deploy.yml",
    "deploy/validate-uat-predeploy-gate.sh",
    "deploy/validate-deploy-uat-workflow.sh",
    "deploy/commission-uat-hold.sh",
    "deploy/fetch-origin-uat.sh",
    "deploy/write-uat-deploy-provenance.sh",
    "deploy/lib/uat-predeploy-gate.py",
}


def push_starts_deploy(token_class: str) -> bool:
    if token_class == "GITHUB_TOKEN":
        return False
    return token_class in {"installation", "user_owner"}


def sync_allowed(paths: set[str]) -> bool:
    return paths == PR_D_EXCLUSIVE


def main() -> None:
    failures: list[str] = []

    def check(name: str, cond: bool) -> None:
        if not cond:
            failures.append(name)

    check("N35 GITHUB_TOKEN merge does not start Deploy UAT", not push_starts_deploy("GITHUB_TOKEN"))
    check("installation token push starts Deploy UAT", push_starts_deploy("installation"))
    check("OWNER UI merge push starts Deploy UAT", push_starts_deploy("user_owner"))
    check("N34 exclusive-tree match allowed", sync_allowed(set(PR_D_EXCLUSIVE)))
    check(
        "N38 unintended Production workflow refused",
        not sync_allowed(PR_D_EXCLUSIVE | {".github/workflows/deploy-production.yml"}),
    )
    check(
        "N34 FF live main tip forbidden",
        not sync_allowed(PR_D_EXCLUSIVE | {"src/Api/Program.cs"}),
    )

    if failures:
        print("SIMULATE_MERGE_TOKEN=FAIL")
        for item in failures:
            print(f"FAIL {item}")
        raise SystemExit(1)
    print("SIMULATE_MERGE_TOKEN=PASS")
    print("N35 GITHUB_TOKEN push does not create Deploy UAT")
    print("N34/N38 exclusive-tree only; live main FF refused")
    print("LIVE_APP_PUSH=UNVERIFIED")


if __name__ == "__main__":
    sys.exit(main())
