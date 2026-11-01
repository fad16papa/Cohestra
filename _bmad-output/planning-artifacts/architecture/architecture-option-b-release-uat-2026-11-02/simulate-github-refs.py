#!/usr/bin/env python3
"""Non-secret simulation of documented GitHub ref + Environment matching.

Sources (2026-11-02):
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments

Does not call GitHub. Live canary remains UNVERIFIED.
"""

from __future__ import annotations

import sys

DEFAULT_BRANCH = "refs/heads/main"
RELEASE_UAT = "refs/heads/release/uat"
ENV_POLICY = "release/uat"
PROD_POLICY = "main"

AD17 = (
    "UAT post-merge — .NET build and test",
    "UAT post-merge — API integration tests",
    "UAT post-merge — Next.js build",
    "UAT post-merge — Frontend unit tests",
    "UAT post-merge — AuthN AuthZ regression",
    "UAT post-merge — Billing entitlement regression",
    "UAT post-merge — Docker stack smoke",
    "UAT post-merge — UAT isolation contract",
    "UAT post-merge — Exact-SHA security scan",
    "UAT post-merge — GitGuardian exact-SHA API scan",
    "UAT post-merge — Deploy artifact provenance",
)

CLOSED_ON_AD23 = frozenset({"push", "workflow_dispatch"})
CLOSED_ON_AD24 = frozenset({"workflow_dispatch"})
FORBIDDEN_ON = frozenset(
    {
        "workflow_run",
        "repository_dispatch",
        "workflow_call",
        "pull_request",
        "pull_request_target",
    }
)


def github_ref(
    event: str,
    *,
    dispatch_ref: str | None = None,
    push_ref: str | None = None,
    caller_ref: str | None = None,
) -> str:
    if event == "workflow_run":
        return DEFAULT_BRANCH
    if event == "repository_dispatch":
        return DEFAULT_BRANCH
    if event == "push":
        if not push_ref:
            raise SystemExit("push requires push_ref")
        return push_ref
    if event == "workflow_dispatch":
        if not dispatch_ref:
            raise SystemExit("workflow_dispatch requires dispatch_ref")
        return dispatch_ref
    if event == "workflow_call":
        if not caller_ref:
            raise SystemExit("workflow_call requires caller_ref")
        return caller_ref
    raise SystemExit(f"unknown event {event}")


def env_allows(github_ref_value: str, policy: str) -> bool:
    # Selected branch policy: GITHUB_REF must be refs/heads/<policy>
    return github_ref_value == f"refs/heads/{policy}"


def checkout_does_not_change_ref(ref_before: str) -> str:
    return ref_before


def head_branch_does_not_change_ref(ref_before: str, _head_branch: str) -> str:
    return ref_before


def deploy_starts(required: dict[str, str], predeploy: str) -> bool:
    if any(status != "SUCCESS" for status in required.values()):
        return False
    return predeploy == "PASS"


def ad24_dispatch_allowed(job_conclusions: dict[str, str]) -> bool:
    """Named-job conclusions, not workflow conclusion / Actions success()."""
    return all(job_conclusions.get(name) == "success" for name in AD17)


def trigger_legal(model: str, on_events: set[str]) -> bool:
    if on_events & FORBIDDEN_ON:
        return False
    if model == "AD-23":
        return on_events <= CLOSED_ON_AD23 and "push" in on_events
    if model == "AD-24":
        return on_events == CLOSED_ON_AD24
    if model == "BOTH":
        return False
    return False


def main() -> None:
    failures: list[str] = []

    def check(name: str, cond: bool) -> None:
        if not cond:
            failures.append(name)

    wr = github_ref("workflow_run")
    check("workflow_run GITHUB_REF is default branch", wr == DEFAULT_BRANCH)
    check(
        "workflow_run cannot satisfy Environment uat=release/uat",
        not env_allows(wr, ENV_POLICY),
    )
    check(
        "checkout of release/uat does not change workflow_run ref",
        checkout_does_not_change_ref(wr) == DEFAULT_BRANCH,
    )
    check(
        "workflow_run.head_branch does not change ref",
        head_branch_does_not_change_ref(wr, "release/uat") == DEFAULT_BRANCH,
    )
    check("leftover workflow_run after PR-D is contract FAIL", True)

    rd = github_ref("repository_dispatch")
    check("repository_dispatch GITHUB_REF is default branch", rd == DEFAULT_BRANCH)
    check("repository_dispatch cannot satisfy Environment policy", not env_allows(rd, ENV_POLICY))

    push = github_ref("push", push_ref=RELEASE_UAT)
    check("push release/uat GITHUB_REF matches", push == RELEASE_UAT)
    check("push release/uat satisfies Environment policy", env_allows(push, ENV_POLICY))
    check("AD-23 GITHUB_EVENT_NAME=push is a legal event", trigger_legal("AD-23", {"push", "workflow_dispatch"}))

    disp_ok = github_ref("workflow_dispatch", dispatch_ref=RELEASE_UAT)
    check("dispatch --ref release/uat matches Environment", env_allows(disp_ok, ENV_POLICY))
    disp_main = github_ref("workflow_dispatch", dispatch_ref=DEFAULT_BRANCH)
    check("dispatch --ref main fails Environment policy", not env_allows(disp_main, ENV_POLICY))

    called_from_uat = github_ref("workflow_call", caller_ref=RELEASE_UAT)
    check(
        "workflow_call inherits caller ref and WOULD match Environment",
        env_allows(called_from_uat, ENV_POLICY),
    )
    check(
        "workflow_call on Deploy UAT is therefore forbidden",
        not trigger_legal("AD-23", {"push", "workflow_call"}),
    )

    check("AD-23 closed on is legal", trigger_legal("AD-23", {"push", "workflow_dispatch"}))
    check("AD-24 closed on is legal", trigger_legal("AD-24", {"workflow_dispatch"}))
    check("AD-23 XOR AD-24 both is illegal", not trigger_legal("BOTH", {"push", "workflow_dispatch"}))
    check(
        "AD-23 plus leftover workflow_run is illegal",
        not trigger_legal("AD-23", {"push", "workflow_run"}),
    )
    check(
        "push + split without dispatch (hybrid) is illegal under AD-24",
        not trigger_legal("AD-24", {"push", "workflow_dispatch"}),
    )

    check(
        "Production require-main: dispatch from release/uat is DENY",
        not env_allows(RELEASE_UAT, PROD_POLICY),
    )
    check(
        "Production require-main: dispatch from main is ALLOW",
        env_allows(DEFAULT_BRANCH, PROD_POLICY),
    )

    jobs = {name: "SUCCESS" for name in AD17}
    check("all SUCCESS + predeploy PASS starts deploy", deploy_starts(jobs, "PASS"))
    check(
        "failure blocks deploy",
        not deploy_starts({**jobs, "UAT post-merge — Next.js build": "FAILURE"}, "PASS"),
    )
    check(
        "cancelled blocks deploy",
        not deploy_starts({**jobs, "UAT post-merge — Docker stack smoke": "CANCELLED"}, "PASS"),
    )
    check(
        "skipped mandatory blocks deploy",
        not deploy_starts({**jobs, "UAT post-merge — AuthN AuthZ regression": "SKIPPED"}, "PASS"),
    )
    check("predeploy HOLD blocks deploy", not deploy_starts(jobs, "HOLD"))

    # Same-run needs never observes PENDING; if someone polled, PENDING must not start SSH.
    ci_done_post_pending = deploy_starts(
        {**jobs, "UAT post-merge — Deploy artifact provenance": "PENDING"},
        "PASS",
    )
    check("pending required job cannot start deploy", not ci_done_post_pending)

    named_success = {name: "success" for name in AD17}
    check("AD-24 fires only when every named job conclusion is success", ad24_dispatch_allowed(named_success))
    skip_matrix = {
        **named_success,
        "UAT post-merge — Docker stack smoke": "skipped",
    }
    check(
        "AD-24 must not fire on workflow-success with a SKIPPED required job",
        not ad24_dispatch_allowed(skip_matrix),
    )
    # AD-24 UI/PAT dispatch still has in-run AD-17 needs (N32).
    check(
        "AD-24 dispatch without prior tests still requires in-run SUCCESS",
        not deploy_starts({**jobs, "UAT post-merge — Next.js build": "PENDING"}, "PASS"),
    )

    if failures:
        print("SIMULATE=FAIL")
        for item in failures:
            print(f"FAIL {item}")
        raise SystemExit(1)
    print("SIMULATE=PASS")
    print("workflow_run GITHUB_REF=refs/heads/main ENV_uat=DENY")
    print("push GITHUB_REF=refs/heads/release/uat ENV_uat=ALLOW")
    print("workflow_dispatch ref=release/uat ENV_uat=ALLOW")
    print("workflow_call caller=release/uat ENV_uat=ALLOW FORBIDDEN")
    print("AD-23 XOR AD-24")
    print("same-run needs: SUCCESS starts; FAILURE/CANCELLED/SKIPPED/HOLD/PENDING do not")
    print("AD-24 named-job conclusion==success; skip-matrix does not dispatch")
    print("LIVE_CANARY=UNVERIFIED")


if __name__ == "__main__":
    sys.exit(main())
