#!/usr/bin/env python3
"""AD-25 fail-closed allowlist, exact-tree, and trusted-ref authorization.

This module is a validator, not an independent authorization root.
Authorization is the intersection of:
  1. This owner-approved path set (APPROVED_PATHS)
  2. The allowlist blob at a trusted git ref (not PR-head working tree)
  3. Exact source/dest SHA + changed-path subset + blob equality

A mutable PR-head copy of this file cannot create its own authority.
Callers that need a trust boundary must execute the copy extracted from
TRUSTED_REF (see authorize_from_trusted_ref). Missing trusted-ref evidence
is a refuse, not a skip.

No GitHub I/O. No live deploy.
"""

from __future__ import annotations

import importlib.util
import json
import os
import re
import subprocess
import tempfile
import unicodedata
from pathlib import Path


# Owner-approved permitted path set. Changing this constant in a PR-head
# does not authorize a larger set; authorize_* compares it to trusted-ref
# policy. This is explicit documentation of the 21-path AD-25 exclusive tree.
APPROVED_PATHS: tuple[str, ...] = (
    ".github/workflows/ci.yml",
    ".github/workflows/deploy.yml",
    "deploy/ad25-sync-allowlist.txt",
    "deploy/commission-uat-hold.sh",
    "deploy/commission-uat-hold.test.sh",
    "deploy/fetch-origin-main.test.sh",
    "deploy/fetch-origin-uat.sh",
    "deploy/fetch-origin-uat.test.sh",
    "deploy/lib/ad25_sync_allowlist.py",
    "deploy/lib/uat-predeploy-gate.py",
    "deploy/reproduce-ad25-seven-path-gap.sh",
    "deploy/simulate-merge-token-trigger.py",
    "deploy/validate-ad25-sync-fixture.test.sh",
    "deploy/validate-ad25-sync-procedure.sh",
    "deploy/validate-deploy-uat-workflow.sh",
    "deploy/validate-inline-suppression.test.sh",
    "deploy/validate-prd-ad23.test.sh",
    "deploy/validate-uat-predeploy-gate.sh",
    "deploy/validate-uat-predeploy-gate.test.sh",
    "deploy/write-uat-deploy-provenance.sh",
    "deploy/write-uat-deploy-provenance.test.sh",
)

OWNER_POLICY_PATH = "deploy/ad25-owner-policy.json"
ALLOWLIST_PATH = "deploy/ad25-sync-allowlist.txt"
VALIDATOR_PATH = "deploy/lib/ad25_sync_allowlist.py"
POLICY_ID = "AD25-OWNER-POLICY"

CANONICAL_PATH_RE = re.compile(r"^[A-Za-z0-9._/-]+$")
GIT_SYMLINK_MODE = "120000"

# Scripts postmerge-isolation still executes but AD-25 must not overwrite
# (Production isolation stays on the bootstrap tree).
BASELINE_RETAINED = (
    "deploy/validate-deploy-production-workflow.sh",
)


class AllowlistError(Exception):
    """Fail-closed allowlist / authorization error."""


def _die(message: str) -> None:
    raise SystemExit(message)


def is_control_plane_path(path: str) -> bool:
    return (
        path.startswith(".github/")
        or path.startswith("deploy/")
        or path in {"CODEOWNERS", ".github/CODEOWNERS"}
    )


def auto_merge_eligible(paths: set[str]) -> bool:
    """Feature-only changes may later be App-eligible. Control-plane never is."""
    return bool(paths) and not any(is_control_plane_path(p) for p in paths)


def _basename(path: str) -> str:
    return path.rsplit("/", 1)[-1]


def _secret_reason(path: str) -> str | None:
    name = _basename(path)
    if name == ".env" or name.startswith(".env."):
        return f"secret path refused: {path}"
    if name in {"id_rsa", "id_ed25519", "id_ecdsa", "id_dsa", "credentials.json", "secrets.json"}:
        return f"secret path refused: {path}"
    if name.endswith((".pem", ".key", ".p12", ".pfx", ".kdbx")):
        return f"secret path refused: {path}"
    return None


def _production_reason(path: str) -> str | None:
    lower = path.lower()
    if "adcp" in lower:
        return f"retired ADCP path refused: {path}"
    if (
        "production" in lower
        or "/prod-" in lower
        or lower.startswith("prod-")
        or path.startswith("deploy/provision-")
        or path.startswith("deploy/harden-")
        or path.startswith("deploy/bootstrap-production")
    ):
        return f"Production control-plane path refused: {path}"
    return None


def canonicalize_repo_path(raw: str) -> str:
    """Canonical repository-relative POSIX path, or AllowlistError."""
    if raw != raw.strip():
        raise AllowlistError(f"malformed allowlist entry (outer whitespace): {raw!r}")
    if not raw:
        raise AllowlistError("empty allowlist entry")
    if "\x00" in raw or any(ord(ch) < 32 for ch in raw):
        raise AllowlistError(f"malformed allowlist entry (control character): {raw!r}")
    if unicodedata.normalize("NFC", raw) != raw:
        raise AllowlistError(f"non-NFC Unicode path refused: {raw!r}")
    if raw.startswith("/") or raw.startswith("\\"):
        raise AllowlistError(f"absolute path refused: {raw}")
    if "\\" in raw:
        raise AllowlistError(f"backslash path refused: {raw}")
    if " " in raw or "\t" in raw:
        raise AllowlistError(f"malformed allowlist entry (whitespace): {raw!r}")
    if not CANONICAL_PATH_RE.fullmatch(raw):
        raise AllowlistError(f"invalid characters in path: {raw!r}")
    parts = raw.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise AllowlistError(f"path traversal or dot-segment refused: {raw}")
    if raw.startswith(".git/") or raw == ".git":
        raise AllowlistError(f"git metadata path refused: {raw}")
    folded = raw.casefold()
    if folded.startswith("src/") or folded.startswith("web/"):
        raise AllowlistError(f"application path refused: {raw}")
    secret = _secret_reason(raw)
    if secret:
        raise AllowlistError(secret)
    production = _production_reason(raw)
    if production:
        raise AllowlistError(production)
    if raw.startswith(".github/") and raw not in APPROVED_PATHS:
        raise AllowlistError(f"unapproved privileged .github path refused: {raw}")
    if raw not in APPROVED_PATHS:
        raise AllowlistError(f"unauthorized path refused: {raw}")
    return raw


def parse_allowlist_text(text: str) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line != raw_line.strip():
            raise AllowlistError(f"malformed allowlist entry: {raw_line!r}")
        path = canonicalize_repo_path(line)
        if path in seen:
            raise AllowlistError(f"duplicate allowlist entry: {path}")
        seen.add(path)
        out.append(path)
    if ALLOWLIST_PATH not in seen:
        raise AllowlistError("allowlist must include itself")
    if ".github/workflows/deploy.yml" not in seen:
        raise AllowlistError("allowlist must include deploy.yml")
    if set(out) != set(APPROVED_PATHS):
        missing = sorted(set(APPROVED_PATHS) - set(out))
        extra = sorted(set(out) - set(APPROVED_PATHS))
        raise AllowlistError(
            "allowlist must equal the owner-approved 21-path set"
            + (f" missing={missing}" if missing else "")
            + (f" extra={extra}" if extra else "")
        )
    return out


def _working_tree_symlink_errors(root: Path, paths: list[str]) -> list[str]:
    errors: list[str] = []
    root_resolved = root.resolve()
    for path in paths:
        candidate = root / path
        if candidate.is_symlink() or (candidate.exists() and candidate.is_symlink()):
            errors.append(f"symlink escape refused: {path}")
            continue
        if candidate.exists():
            try:
                resolved = candidate.resolve()
            except OSError:
                errors.append(f"symlink escape refused: {path}")
                continue
            if root_resolved not in resolved.parents and resolved != root_resolved:
                errors.append(f"path resolves outside repository: {path}")
    return errors


def load_allowlist_strict(root: Path) -> list[str]:
    path = root / ALLOWLIST_PATH
    if not path.is_file():
        raise AllowlistError(f"allowlist missing: {ALLOWLIST_PATH}")
    if path.is_symlink():
        raise AllowlistError(f"symlink escape refused: {ALLOWLIST_PATH}")
    paths = parse_allowlist_text(path.read_text(encoding="utf-8"))
    errors = _working_tree_symlink_errors(root, paths)
    policy = root / OWNER_POLICY_PATH
    if policy.is_file():
        if policy.is_symlink():
            errors.append(f"symlink escape refused: {OWNER_POLICY_PATH}")
        else:
            try:
                trusted_from_file = _parse_trusted_paths_from_text(
                    policy.read_text(encoding="utf-8"), from_policy=True
                )
            except AllowlistError as exc:
                errors.append(str(exc))
            else:
                if trusted_from_file != frozenset(paths):
                    errors.append("owner policy does not match allowlist")
    if errors:
        raise AllowlistError("; ".join(errors))
    return paths


def load_allowlist(root: Path) -> list[str]:
    """Load + fail-closed validate. SystemExit on error (existing callers)."""
    try:
        return load_allowlist_strict(root)
    except AllowlistError as exc:
        _die(str(exc))
        raise  # pragma: no cover


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


def show_text(repo: Path, rev: str, path: str) -> str | None:
    proc = subprocess.run(
        ["git", "-C", str(repo), "show", f"{rev}:{path}"],
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return None
    return proc.stdout


def git_path_mode(repo: Path, rev: str, path: str) -> str | None:
    proc = subprocess.run(
        ["git", "-C", str(repo), "ls-tree", rev, "--", path],
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    return proc.stdout.split(None, 1)[0]


def changed_paths(repo: Path, parent: str, child: str) -> set[str]:
    proc = subprocess.run(
        ["git", "-C", str(repo), "diff", "--name-only", parent, child],
        check=True,
        capture_output=True,
        text=True,
    )
    return {line for line in proc.stdout.splitlines() if line}


def _rev_equal(repo: Path, left: str, right: str) -> bool:
    def peel(rev: str) -> str | None:
        proc = subprocess.run(
            ["git", "-C", str(repo), "rev-parse", f"{rev}^{{commit}}"],
            check=False,
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            return None
        return proc.stdout.strip()

    a, b = peel(left), peel(right)
    return bool(a and b and a == b)


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
        src_mode = git_path_mode(repo, source, path)
        dst_mode = git_path_mode(repo, dest, path)
        if src_mode == GIT_SYMLINK_MODE or dst_mode == GIT_SYMLINK_MODE:
            errors.append(f"symlink escape refused: {path}")
    extra = changed_paths(repo, dest_parent, dest) - allowed
    for path in sorted(extra):
        errors.append(f"unapproved extra file in sync: {path}")
    return errors


def _parse_trusted_paths_from_text(text: str, *, from_policy: bool) -> frozenset[str]:
    if from_policy:
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise AllowlistError(f"trusted owner policy is malformed: {exc}") from exc
        if not isinstance(data, dict):
            raise AllowlistError("trusted owner policy must be an object")
        if data.get("policy_id") != POLICY_ID:
            raise AllowlistError("trusted owner policy id mismatch")
        raw_paths = data.get("approved_paths")
        if not isinstance(raw_paths, list) or not all(isinstance(p, str) for p in raw_paths):
            raise AllowlistError("trusted owner policy approved_paths missing")
        paths = []
        for item in raw_paths:
            paths.append(canonicalize_repo_path(item))
        if set(paths) != set(APPROVED_PATHS):
            raise AllowlistError("trusted owner policy does not match owner-approved 21-path set")
        return frozenset(paths)
    return frozenset(parse_allowlist_text(text))


def trusted_policy_paths(repo: Path, trusted_ref: str | None) -> frozenset[str]:
    if not trusted_ref or not str(trusted_ref).strip():
        raise AllowlistError("missing trusted policy evidence")
    policy = show_text(repo, trusted_ref, OWNER_POLICY_PATH)
    if policy is not None:
        return _parse_trusted_paths_from_text(policy, from_policy=True)
    allow = show_text(repo, trusted_ref, ALLOWLIST_PATH)
    if allow is None:
        raise AllowlistError("missing trusted policy evidence")
    return _parse_trusted_paths_from_text(allow, from_policy=False)


def module_from_trusted_ref(repo: Path, trusted_ref: str, directory: Path) -> object:
    text = show_text(repo, trusted_ref, VALIDATOR_PATH)
    if text is None:
        raise AllowlistError("missing trusted policy evidence: validator blob")
    dest = directory / "trusted_ad25_sync_allowlist.py"
    dest.write_text(text, encoding="utf-8")
    spec = importlib.util.spec_from_file_location("trusted_ad25_sync_allowlist", dest)
    if spec is None or spec.loader is None:
        raise AllowlistError("unable to load trusted validator")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def authorize_sync(
    repo: Path,
    *,
    source: str,
    dest: str,
    dest_parent: str,
    trusted_ref: str | None,
    expected_source: str | None = None,
    expected_dest_parent: str | None = None,
    approval_source_sha: str | None = None,
    working_tree: Path | None = None,
) -> list[str]:
    """Authorize an AD-25 sync. Fail closed. Raises AllowlistError."""
    if not trusted_ref:
        raise AllowlistError("missing trusted policy evidence")
    trusted = trusted_policy_paths(repo, trusted_ref)
    if working_tree is not None:
        head_paths = frozenset(load_allowlist_strict(working_tree))
    else:
        allow_text = show_text(repo, source, ALLOWLIST_PATH)
        if allow_text is None:
            raise AllowlistError("missing trusted policy evidence: source allowlist")
        head_paths = frozenset(parse_allowlist_text(allow_text))
    if head_paths != trusted or head_paths != frozenset(APPROVED_PATHS):
        raise AllowlistError("changed manifest without owner authorization")
    if expected_source and not _rev_equal(repo, source, expected_source):
        raise AllowlistError(f"stale source SHA: got {source} expected {expected_source}")
    if expected_dest_parent and not _rev_equal(repo, dest_parent, expected_dest_parent):
        raise AllowlistError(
            f"unexpected destination parent: got {dest_parent} expected {expected_dest_parent}"
        )
    if approval_source_sha and not _rev_equal(repo, approval_source_sha, source):
        raise AllowlistError("stale approval: approval SHA does not match source")
    ancestor = subprocess.run(
        ["git", "-C", str(repo), "merge-base", "--is-ancestor", dest_parent, dest],
        check=False,
        capture_output=True,
        text=True,
    )
    if ancestor.returncode != 0:
        raise AllowlistError("unexpected commits: dest is not a descendant of dest_parent")
    allowlist = sorted(head_paths)
    errors = exact_tree_errors(repo, source, dest, dest_parent, allowlist)
    if errors:
        raise AllowlistError("; ".join(errors))
    return allowlist


def authorize_from_trusted_ref(
    repo: Path,
    *,
    trusted_ref: str | None,
    source: str,
    dest: str,
    dest_parent: str,
    expected_source: str | None = None,
    expected_dest_parent: str | None = None,
    approval_source_sha: str | None = None,
    working_tree: Path | None = None,
) -> list[str]:
    """Execute the validator blob from trusted_ref, never this process's PR-head copy.

    This is the in-repo enforcement point: PR-head rewrites of this file are
    not the code that decides. A GitHub App / default-branch required workflow
    must invoke this same extraction. A PR-head wrapper that skips this function
    is not an authorization signal.
    """
    if not trusted_ref:
        raise AllowlistError("missing trusted policy evidence")
    with tempfile.TemporaryDirectory() as tmp:
        trusted_mod = module_from_trusted_ref(repo, trusted_ref, Path(tmp))
        authorize = getattr(trusted_mod, "authorize_sync", None)
        if authorize is None:
            raise AllowlistError("trusted validator lacks authorize_sync")
        try:
            return authorize(
                repo,
                source=source,
                dest=dest,
                dest_parent=dest_parent,
                trusted_ref=trusted_ref,
                expected_source=expected_source,
                expected_dest_parent=expected_dest_parent,
                approval_source_sha=approval_source_sha,
                working_tree=working_tree,
            )
        except Exception as exc:
            raise AllowlistError(str(exc)) from exc


def owner_policy_document() -> dict[str, object]:
    return {
        "policy_id": POLICY_ID,
        "label": "AD25-HARDENING",
        "authority": "owner-approved-permitted-path-set",
        "independent_authorization": False,
        "note": (
            "This file is the in-repo copy of the owner-approved 21-path set. "
            "It is not independent authorization. Trusted-ref extraction plus "
            "an owner-controlled GitHub App or native ruleset is required to "
            "stop a PR-head from supplying its own validator."
        ),
        "approved_paths": list(APPROVED_PATHS),
    }


def run_hardening_contract(repo_root: Path | None = None) -> int:
    """Deterministic positive/negative suite. No live credentials."""
    # Imported lazily so production import of this module stays side-effect free.
    from ad25_hardening_contract import run_contract  # type: ignore

    return run_contract(repo_root or Path(__file__).resolve().parents[2])


if __name__ == "__main__":
    import sys

    if "--self-test" in sys.argv:
        # Contract lives beside this file when present; otherwise inline refuse
        # so a stripped tree cannot claim PASS.
        helper = Path(__file__).with_name("ad25_hardening_contract.py")
        if not helper.is_file():
            print("FAIL: missing deploy/lib/ad25_hardening_contract.py")
            raise SystemExit(1)
        raise SystemExit(run_hardening_contract())
    if "--write-owner-policy" in sys.argv:
        print(json.dumps(owner_policy_document(), indent=2, sort_keys=False))
        raise SystemExit(0)
    print("usage: ad25_sync_allowlist.py --self-test | --write-owner-policy")
    raise SystemExit(2)
