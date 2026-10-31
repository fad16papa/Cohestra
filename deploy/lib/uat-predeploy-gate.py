#!/usr/bin/env python3
"""UAT pre-deploy eligibility: exact-SHA CI + GitGuardian SUCCESS.

Reuses Production Layer A pagination helpers. Fail closed. Never prints tokens.
"""

from __future__ import annotations

import importlib.util
import os
import sys
from typing import Any


def _load_production() -> Any:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "production-github-provenance.py")
    spec = importlib.util.spec_from_file_location("production_github_provenance", path)
    if spec is None or spec.loader is None:
        print("RESULT=REFUSE", file=sys.stdout)
        print("REFUSE_REASON=production provenance helper missing", file=sys.stdout)
        raise SystemExit(1)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


prod = _load_production()


def hold(reason: str) -> None:
    print("RESULT=HOLD", file=sys.stdout)
    print(f"HOLD_REASON={reason}", file=sys.stdout)
    raise SystemExit(1)


def gitguardian_required(repo: str, reviewed_sha: str) -> None:
    runs = prod.paginate_list(
        f"/repos/{repo}/commits/{reviewed_sha}/check-runs?filter=all",
        "check_runs",
        "check-runs",
    )
    matched: list[dict[str, Any]] = []
    for run in runs:
        obj = prod.require_dict(run, "check-run")
        if obj.get("name") != "GitGuardian Security Checks":
            continue
        app = obj.get("app")
        if not isinstance(app, dict):
            hold("GitGuardian app identity missing")
        slug = str(app.get("slug") or "").lower()
        if slug != "gitguardian":
            hold("GitGuardian app.slug mismatch")
        if prod._norm_sha(obj.get("head_sha")) != reviewed_sha:
            continue
        matched.append(obj)
    if not matched:
        hold("GitGuardian Security Checks missing")
    for obj in matched:
        status = obj.get("status")
        if status in ("queued", "in_progress", "pending"):
            hold("GitGuardian is pending")
    terminal = [obj for obj in matched if obj.get("status") == "completed"]
    if not terminal:
        hold("GitGuardian is not completed")
    conclusions = {str(obj.get("conclusion") or "") for obj in terminal}
    if len(conclusions) > 1:
        hold("ambiguous GitGuardian duplicate conclusions")

    def _term_key(obj: dict[str, Any]) -> tuple[Any, int]:
        completed = prod.parse_github_time(obj.get("completed_at"), "GitGuardian completed_at")
        try:
            run_id = int(obj.get("id") or 0)
        except (TypeError, ValueError):
            run_id = 0
        return (completed, run_id)

    newest = sorted(terminal, key=_term_key)[-1]
    conclusion = newest.get("conclusion")
    if conclusion != "success":
        hold(f"GitGuardian conclusion is {conclusion or 'empty'}")


def refuse_duplicate_deploy(repo: str, candidate_sha: str, current_run_id: str) -> None:
    runs = prod.paginate_list(
        f"/repos/{repo}/actions/workflows/deploy.yml/runs?head_sha={candidate_sha}",
        "workflow_runs",
        "deploy runs",
    )
    current = str(current_run_id or "").strip()
    for run in runs:
        obj = prod.require_dict(run, "deploy run")
        run_id = str(obj.get("id") or "").strip()
        if current and run_id == current:
            continue
        if prod._norm_sha(obj.get("head_sha")) != candidate_sha:
            continue
        status = obj.get("status")
        if status in ("queued", "in_progress", "pending", "waiting", "requested"):
            hold("duplicate in-progress UAT deploy")
        if status == "completed" and obj.get("conclusion") == "success":
            hold("duplicate successful UAT deploy")


def main() -> None:
    if len(sys.argv) < 4:
        hold("UAT predeploy helper arguments missing")
    repo = sys.argv[1]
    candidate_sha = sys.argv[2].strip().lower()
    reviewed_sha = sys.argv[3].strip().lower()
    if len(candidate_sha) != 40 or len(reviewed_sha) != 40:
        hold("UAT predeploy SHA is malformed")
    try:
        prod.layer_a(repo, candidate_sha)
    except SystemExit:
        raise
    except Exception:
        hold("Layer A CI verification failed closed")
    gitguardian_required(repo, reviewed_sha)
    refuse_duplicate_deploy(repo, candidate_sha, os.environ.get("GITHUB_RUN_ID", ""))
    print("LAYER_A=PASS")
    print("GITGUARDIAN=PASS")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        hold("UAT predeploy helper failed closed")
