#!/usr/bin/env python3
"""AD-25 allowlist load + exact-tree + legacy-validator checks. No GitHub I/O."""

from __future__ import annotations

import subprocess
from pathlib import Path


def load_allowlist(root: Path) -> list[str]:
    path = root / "deploy" / "ad25-sync-allowlist.txt"
    if not path.is_file():
        raise SystemExit("allowlist missing: deploy/ad25-sync-allowlist.txt")
    out: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        out.append(line)
    if "deploy/ad25-sync-allowlist.txt" not in out:
        raise SystemExit("allowlist must include itself")
    if ".github/workflows/deploy.yml" not in out:
        raise SystemExit("allowlist must include deploy.yml")
    if ".github/workflows/deploy-production.yml" in out:
        raise SystemExit("Production workflow must not be in the allowlist")
    if any(p.startswith("src/") or p.startswith("web/") or "adcp" in p.lower() for p in out):
        raise SystemExit("application/ADCP paths are forbidden on the allowlist")
    return out


# Scripts postmerge-isolation still executes but AD-25 must not overwrite
# (Production isolation stays on the bootstrap tree).
BASELINE_RETAINED = (
    "deploy/validate-deploy-production-workflow.sh",
)


def baseline_missing(root: Path) -> list[str]:
    return [p for p in BASELINE_RETAINED if not (root / p).exists()]


def stale_validator_reasons(root: Path) -> list[str]:
    reasons: list[str] = []
    inline = (root / "deploy/validate-inline-suppression.test.sh").read_text(encoding="utf-8")
    if 'if "workflow_run:" not in' in inline or "must remain workflow_run" in inline:
        reasons.append("stale inline-suppression test requires workflow_run")
    if 'UAT_MAIN_DEPLOY_SUPPRESSED:-}" != "true"' not in inline:
        reasons.append("stale inline-suppression test missing PR-D polarity")
    commission = (root / "deploy/commission-uat-hold.test.sh").read_text(encoding="utf-8")
    if "must remain workflow_run" in commission or 'if "workflow_run:" not in text' in commission:
        reasons.append("stale commission test requires workflow_run")
    gate_test = (root / "deploy/validate-uat-predeploy-gate.test.sh").read_text(encoding="utf-8")
    if "origin/main is eligible" in gate_test:
        reasons.append("stale predeploy-gate test still treats origin/main as eligible")
    fetch_test = (root / "deploy/fetch-origin-main.test.sh").read_text(encoding="utf-8")
    if "enabled path must call fetch-origin-main.sh" in fetch_test:
        reasons.append("stale fetch-origin-main test still requires fetch-origin-main.sh in deploy.yml")
    deploy = (root / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
    on = deploy.split("jobs:", 1)[0]
    if "workflow_run:" in on:
        reasons.append("deploy.yml still has leftover workflow_run")
    if "release/uat" not in on or "\n  push:" not in on:
        reasons.append("deploy.yml is not AD-23 push to release/uat")
    if 'UAT_MAIN_DEPLOY_SUPPRESSED:-}" != "true"' not in deploy:
        reasons.append("deploy.yml missing PR-D suppressor polarity")
    return reasons


def blob_at(repo: Path, rev: str, path: str) -> str | None:
    proc = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", f"{rev}:{path}"],
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return None
    return proc.stdout.strip()


def changed_paths(repo: Path, parent: str, child: str) -> set[str]:
    proc = subprocess.run(
        ["git", "-C", str(repo), "diff", "--name-only", parent, child],
        check=True,
        capture_output=True,
        text=True,
    )
    return {line for line in proc.stdout.splitlines() if line}


def exact_tree_errors(repo: Path, source: str, dest: str, dest_parent: str, allowlist: list[str]) -> list[str]:
    errors: list[str] = []
    allowed = set(allowlist)
    for path in allowlist:
        src = blob_at(repo, source, path)
        dst = blob_at(repo, dest, path)
        if src is None:
            errors.append(f"missing on source tree: {path}")
            continue
        if dst is None:
            errors.append(f"missing on dest tree: {path}")
            continue
        if src != dst:
            errors.append(f"wrong SHA for {path}: dest={dst} source={src}")
    extra = changed_paths(repo, dest_parent, dest) - allowed
    for path in sorted(extra):
        errors.append(f"unapproved extra file in sync: {path}")
    return errors
