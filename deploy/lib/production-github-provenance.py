#!/usr/bin/env python3
"""Layer A (exact-SHA CI) and Layer B (merged PR + GitGuardian) helpers.

Fail closed on incomplete, empty, truncated, or error payloads.
Never prints tokens or secret values.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime
from typing import Any


def parse_github_time(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        refuse(f"{label} missing timestamp")
    raw = value.strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        refuse(f"{label} unparseable timestamp")


def refuse(reason: str) -> None:
    print(f"RESULT=REFUSE", file=sys.stdout)
    print(f"REFUSE_REASON={reason}", file=sys.stdout)
    raise SystemExit(1)


def load_json(raw: str, label: str) -> Any:
    if raw is None or raw.strip() == "":
        refuse(f"empty GitHub payload ({label})")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        refuse(f"incomplete GitHub payload ({label})")


def gh_api(path: str) -> Any:
    root = os.environ.get("COHESTRA_ROOT") or os.getcwd()
    helper = os.path.join(root, "deploy/lib/cohestra-gh-api.sh")
    script = f"""
set -euo pipefail
# shellcheck disable=SC1091
source "{helper}"
cohestra_gh_api GET "{path}"
"""
    proc = subprocess.run(
        ["bash", "-c", script],
        capture_output=True,
        text=True,
        env=os.environ.copy(),
    )
    if proc.returncode != 0:
        refuse(f"GitHub API error ({path})")
    return load_json(proc.stdout, path)


def require_dict(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        refuse(f"incomplete GitHub payload ({label})")
    return value


def require_list(value: Any, label: str) -> list[Any]:
    if not isinstance(value, list):
        refuse(f"incomplete GitHub payload ({label})")
    return value


def paginate_list(path: str, key: str | None, label: str) -> list[Any]:
    """Fetch every page. REFUSE if total_count exceeds collected items."""
    collected: list[Any] = []
    page = 1
    per_page = 100
    total_count: int | None = None
    while True:
        sep = "&" if "?" in path else "?"
        payload = gh_api(f"{path}{sep}per_page={per_page}&page={page}")
        if isinstance(payload, list):
            batch = payload
        else:
            obj = require_dict(payload, label)
            if "total_count" in obj:
                try:
                    total_count = int(obj["total_count"])
                except (TypeError, ValueError):
                    refuse(f"incomplete GitHub payload ({label} total_count)")
            if key is None:
                refuse(f"incomplete GitHub payload ({label})")
            if key not in obj:
                refuse(f"incomplete GitHub payload ({label} missing {key})")
            batch = require_list(obj[key], label)
        collected.extend(batch)
        if len(batch) < per_page:
            break
        page += 1
        if page > 50:
            refuse(f"paginated GitHub list truncated ({label})")
    if total_count is not None and len(collected) < total_count:
        refuse(f"paginated GitHub list truncated ({label})")
    return collected


def _norm_sha(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip().lower()


def newest_ci_run(runs: list[Any]) -> dict[str, Any]:
    scored: list[tuple[str, int, dict[str, Any]]] = []
    for run in runs:
        obj = require_dict(run, "ci run")
        created = parse_github_time(obj.get("created_at"), "CI run created_at")
        try:
            run_id = int(obj.get("id"))
        except (TypeError, ValueError):
            refuse("CI run missing numeric id")
        scored.append((created.isoformat(), run_id, obj))
    scored.sort(key=lambda item: (item[0], item[1]))
    newest = scored[-1][2]
    ties = [item for item in scored if item[0] == scored[-1][0]]
    conclusions = {str(item[2].get("conclusion")) for item in ties}
    if len(conclusions) > 1:
        refuse("ambiguous newest CI run conclusions")
    return newest


def layer_a(repo: str, deploy_sha: str) -> dict[str, Any]:
    runs = paginate_list(
        f"/repos/{repo}/actions/workflows/ci.yml/runs?head_sha={deploy_sha}",
        "workflow_runs",
        "ci runs",
    )
    allowed = []
    for run in runs:
        obj = require_dict(run, "ci run")
        event = obj.get("event")
        if event in ("pull_request", "pull_request_target", "merge_group"):
            continue
        if event not in ("push", "workflow_dispatch"):
            continue
        head_branch = obj.get("head_branch")
        if head_branch != "main":
            refuse("CI head_branch is not main")
        head_sha = _norm_sha(obj.get("head_sha"))
        if head_sha != deploy_sha:
            refuse("CI run head_sha mismatch")
        allowed.append(obj)
    if not allowed:
        refuse("required CI run missing on deploy_sha")
    newest = newest_ci_run(allowed)
    if newest.get("status") != "completed" or newest.get("conclusion") != "success":
        refuse("newest CI run is not completed success")
    run_id = newest.get("id")
    jobs = paginate_list(
        f"/repos/{repo}/actions/runs/{run_id}/jobs",
        "jobs",
        "ci jobs",
    )
    required = {
        ".NET build and test",
        "API integration tests",
        "Next.js build",
        "UAT isolation contract",
        "Docker stack smoke",
    }
    by_name: dict[str, dict[str, Any]] = {}
    for job in jobs:
        obj = require_dict(job, "ci job")
        name = obj.get("name")
        if name in required:
            if obj.get("conclusion") != "success":
                refuse(f"required CI job not success ({name})")
            by_name[str(name)] = obj
    missing = sorted(required - set(by_name))
    if missing:
        refuse("required CI job missing")
    return {"ci_run_id": newest.get("id")}


def associated_prs(repo: str, sha: str) -> list[dict[str, Any]]:
    rows = paginate_list(f"/repos/{repo}/commits/{sha}/pulls", None, "commit pulls")
    kept: list[dict[str, Any]] = []
    for row in rows:
        obj = require_dict(row, "associated PR")
        base = obj.get("base") if isinstance(obj.get("base"), dict) else {}
        if base.get("ref") != "main":
            continue
        merge_sha = _norm_sha(obj.get("merge_commit_sha"))
        if not merge_sha:
            continue
        if merge_sha != sha:
            continue
        kept.append(obj)
    return kept


def hydrate_unique_pr(repo: str, sha: str) -> dict[str, Any]:
    kept = associated_prs(repo, sha)
    if not kept:
        refuse("associated merged PR missing")
    if len(kept) != 1:
        refuse("ambiguous associated PRs")
    number = kept[0].get("number")
    if not isinstance(number, int):
        refuse("associated PR number unavailable")
    pr = require_dict(gh_api(f"/repos/{repo}/pulls/{number}"), "hydrated PR")
    if pr.get("merged") is not True:
        refuse("associated PR is not merged")
    base = pr.get("base") if isinstance(pr.get("base"), dict) else {}
    if base.get("ref") != "main":
        refuse("associated PR base is not main")
    if _norm_sha(pr.get("merge_commit_sha")) != sha:
        refuse("merge_commit_sha does not equal deploy_sha")
    return pr


def layer_b_gitguardian(repo: str, reviewed_pr_head: str) -> None:
    runs = paginate_list(
        f"/repos/{repo}/commits/{reviewed_pr_head}/check-runs?filter=all",
        "check_runs",
        "check-runs",
    )
    matched: list[dict[str, Any]] = []
    for run in runs:
        obj = require_dict(run, "check-run")
        if obj.get("name") != "GitGuardian Security Checks":
            continue
        app = obj.get("app")
        if not isinstance(app, dict):
            refuse("GitGuardian app identity missing")
        slug = str(app.get("slug") or "").lower()
        if slug != "gitguardian":
            refuse("GitGuardian app.slug mismatch")
        if _norm_sha(obj.get("head_sha")) != reviewed_pr_head:
            continue
        matched.append(obj)
    if not matched:
        refuse("GitGuardian Security Checks missing")
    for obj in matched:
        status = obj.get("status")
        if status in ("queued", "in_progress", "pending"):
            refuse("GitGuardian is pending")
    terminal = [
        obj
        for obj in matched
        if obj.get("status") == "completed"
    ]
    if not terminal:
        refuse("GitGuardian is not completed")
    def _term_key(obj: dict[str, Any]) -> tuple[datetime, int]:
        completed = parse_github_time(obj.get("completed_at"), "GitGuardian completed_at")
        try:
            run_id = int(obj.get("id") or 0)
        except (TypeError, ValueError):
            run_id = 0
        return (completed, run_id)

    newest = sorted(terminal, key=_term_key)[-1]
    conclusion = newest.get("conclusion")
    if conclusion != "success":
        refuse(f"GitGuardian conclusion is {conclusion or 'empty'}")


def layer_b(repo: str, deploy_sha: str, reviewed_pr_head: str) -> dict[str, Any]:
    pr = hydrate_unique_pr(repo, deploy_sha)
    number = pr.get("number")
    commits = paginate_list(
        f"/repos/{repo}/pulls/{number}/commits",
        None,
        "PR commits",
    )
    if not commits:
        refuse("PR commits unavailable")
    layer_b_gitguardian(repo, reviewed_pr_head)
    return {"associated_pr_number": number, "reviewed_pr_head": reviewed_pr_head}


def main() -> None:
    if len(sys.argv) < 4:
        refuse("provenance helper arguments missing")
    mode = sys.argv[1]
    repo = sys.argv[2]
    deploy_sha = sys.argv[3].lower()
    if mode == "layer-a":
        info = layer_a(repo, deploy_sha)
        print("LAYER_A=PASS")
        print(f"CI_RUN_ID={info['ci_run_id']}")
        return
    if mode == "layer-b":
        if len(sys.argv) < 5:
            refuse("reviewed_pr_head missing")
        reviewed = sys.argv[4].lower()
        info = layer_b(repo, deploy_sha, reviewed)
        print("LAYER_B=PASS")
        print(f"ASSOCIATED_PR_NUMBER={info['associated_pr_number']}")
        print(f"REVIEWED_PR_HEAD={info['reviewed_pr_head']}")
        return
    refuse("unknown provenance mode")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        refuse("provenance helper failed closed")
