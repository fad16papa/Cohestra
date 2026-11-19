#!/usr/bin/env python3
"""Deterministic AD25-HARDENING contract. No live GitHub, SSH, or deploy."""

from __future__ import annotations

import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from ad25_sync_allowlist import (
    ALLOWLIST_PATH,
    APPROVED_PATHS,
    AllowlistError,
    VALIDATOR_PATH,
    authorize_from_trusted_ref,
    authorize_sync,
    auto_merge_eligible,
    canonicalize_repo_path,
    exact_tree_errors,
    load_allowlist,
    load_allowlist_strict,
    parse_allowlist_text,
    stale_validator_reasons,
    trusted_policy_paths,
)


def _run(cmd: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=True, capture_output=True, text=True, cwd=cwd)


def _git_init(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    _run(["git", "init", "-q", "-b", "main", str(path)])
    _run(["git", "-C", str(path), "config", "user.email", "t@t"])
    _run(["git", "-C", str(path), "config", "user.name", "t"])


def _commit(path: Path, message: str) -> str:
    _run(["git", "-C", str(path), "add", "-A"])
    _run(["git", "-C", str(path), "commit", "-q", "--allow-empty", "-m", message])
    return _run(["git", "-C", str(path), "rev-parse", "HEAD"]).stdout.strip()


def _allowlist_text(extra_lines: list[str] | None = None, drop: set[str] | None = None) -> str:
    lines = [
        "# AD-25 owner sync allowlist. Paths relative to repo root.",
        "# Exclusive control-plane + the PR-D workflow/test files that",
        "# postmerge-isolation and release/uat CI actually execute.",
    ]
    keep = [p for p in APPROVED_PATHS if p not in (drop or set())]
    lines.extend(keep)
    if extra_lines:
        lines.extend(extra_lines)
    return "\n".join(lines) + "\n"


def _seed_approved_tree(dest: Path, source_root: Path) -> None:
    for rel in APPROVED_PATHS:
        src = source_root / rel
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        if src.is_file():
            shutil.copy2(src, target)
        else:
            target.write_text(f"placeholder {rel}\n", encoding="utf-8")
    (dest / ALLOWLIST_PATH).write_text(_allowlist_text(), encoding="utf-8")


class _Suite:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.passed = 0

    def check(self, name: str, cond: bool, detail: str = "") -> None:
        if cond:
            self.passed += 1
            print(f"PASS: {name}")
            return
        self.failures.append(name if not detail else f"{name}: {detail}")
        print(f"FAIL: {name}" + (f" ({detail})" if detail else ""))

    def expect_error(self, name: str, fn, fragment: str) -> None:
        try:
            fn()
        except (AllowlistError, SystemExit) as exc:
            text = str(exc)
            self.check(name, fragment.lower() in text.lower(), text)
            return
        self.check(name, False, "expected refuse, accepted")


def run_contract(repo_root: Path) -> int:
    suite = _Suite()
    source_root = Path(repo_root)

    # --- Official 21-path load ---
    loaded = load_allowlist(source_root)
    suite.check("approved 21-path synchronization set", loaded == list(APPROVED_PATHS), str(len(loaded)))
    suite.check("allowlist-count-21", len(loaded) == 21, str(len(loaded)))

    # --- Canonical path refuses ---
    cases = [
        ("path traversal ../src/Api/Program.cs", "../src/Api/Program.cs", "traversal"),
        ("absolute /etc/passwd", "/etc/passwd", "absolute"),
        ("secret .env", ".env", "secret"),
        ("secret deploy/.env", "deploy/.env", "secret"),
        ("secret nested .env.local", "config/.env.local", "secret"),
        ("Production provision script", "deploy/provision-production-droplet.sh", "production"),
        ("Production remote deploy", "deploy/production-remote-deploy.sh", "production"),
        ("Production host harden", "deploy/harden-production-host.sh", "production"),
        ("Production workflow", ".github/workflows/deploy-production.yml", "production"),
        ("unapproved control-plane inspect-production-oidc", ".github/workflows/inspect-production-oidc.yml", "production"),
        ("unapproved privileged CODEOWNERS", ".github/CODEOWNERS", "privileged"),
        ("unapproved dependabot", ".github/dependabot.yml", "privileged"),
        ("dot segment", "./deploy/validate-prd-ad23.test.sh", "dot-segment"),
        ("dot-dot segment", "deploy/../src/Api/Program.cs", "traversal"),
        ("case variation SRC/Api/Program.cs", "SRC/Api/Program.cs", "application"),
        ("Unicode ZWSP", "\u200bdeploy/evil.sh", "invalid"),
        ("Unicode slash lookalike", "deploy\u2215evil.sh", "invalid"),
        ("backslash path", "deploy\\evil.sh", "backslash"),
        ("retired ADCP", "deploy/adcp-dispatcher.sh", "adcp"),
        ("application src/", "src/Api/Program.cs", "application"),
        ("application web/", "web/package.json", "application"),
        ("malformed spaces", "deploy/foo bar.sh", "whitespace"),
    ]
    for name, raw, fragment in cases:
        suite.expect_error(name, lambda r=raw: canonicalize_repo_path(r), fragment)

    suite.expect_error(
        "duplicate allowlist entries",
        lambda: parse_allowlist_text(_allowlist_text(["deploy/ad25-sync-allowlist.txt"])),
        "duplicate",
    )
    padded = _allowlist_text().replace(
        ".github/workflows/ci.yml",
        "  .github/workflows/ci.yml  ",
    )
    suite.expect_error(
        "padded approved line refused",
        lambda: parse_allowlist_text(padded),
        "whitespace",
    )
    suite.expect_error(
        "secret path case variation .PEM",
        lambda: canonicalize_repo_path("deploy/foo.PEM"),
        "secret",
    )
    suite.expect_error(
        "empty entry after non-comment content",
        lambda: canonicalize_repo_path(""),
        "empty",
    )

    with tempfile.TemporaryDirectory() as tmp_s:
        bad = Path(tmp_s)
        (bad / "deploy").mkdir()
        (bad / ALLOWLIST_PATH).write_text(_allowlist_text(["../src/Api/Program.cs"]), encoding="utf-8")
        suite.expect_error(
            "load_allowlist traversal extra",
            lambda: load_allowlist_strict(bad),
            "traversal",
        )

    # --- Working-tree symlink on an approved path ---
    with tempfile.TemporaryDirectory() as tmp_s:
        tree = Path(tmp_s) / "wt"
        _seed_approved_tree(tree, source_root)
        target = Path(tmp_s) / "outside"
        target.write_text("outside\n", encoding="utf-8")
        victim = tree / "deploy/commission-uat-hold.sh"
        victim.unlink()
        os.symlink(target, victim)
        suite.expect_error(
            "symlink escapes",
            lambda: load_allowlist_strict(tree),
            "symlink",
        )

    # --- Git fixture: correct source/dest trees ---
    with tempfile.TemporaryDirectory() as tmp_s:
        repo = Path(tmp_s) / "sync"
        _git_init(repo)
        _seed_approved_tree(repo, source_root)
        # Required isolation script retained on dest parent
        retained = repo / "deploy/validate-deploy-production-workflow.sh"
        if not retained.exists():
            retained.write_text("# retained\n", encoding="utf-8")
        parent = _commit(repo, "dest parent")
        # Source tree: same approved blobs
        source = parent
        dest = parent
        allow = load_allowlist_strict(repo)
        errors = exact_tree_errors(repo, source, dest, parent, allow)
        suite.check("correct source and destination trees", errors == [], "; ".join(errors))
        authorized = authorize_sync(
            repo,
            source=source,
            dest=dest,
            dest_parent=parent,
            trusted_ref=parent,
            expected_source=source,
            expected_dest_parent=parent,
            approval_source_sha=source,
            working_tree=repo,
        )
        suite.check("authorize_sync exact 21-path", authorized == sorted(APPROVED_PATHS))

        # Stale source SHA
        suite.expect_error(
            "stale source SHA",
            lambda: authorize_sync(
                repo,
                source=source,
                dest=dest,
                dest_parent=parent,
                trusted_ref=parent,
                expected_source="deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            ),
            "stale source",
        )

        # Missing trusted policy
        suite.expect_error(
            "missing trusted policy evidence",
            lambda: authorize_sync(
                repo,
                source=source,
                dest=dest,
                dest_parent=parent,
                trusted_ref=None,
            ),
            "missing trusted policy",
        )
        suite.expect_error(
            "missing trusted policy empty ref",
            lambda: trusted_policy_paths(repo, ""),
            "missing trusted policy",
        )

        # Altered dest SHA: commit a different blob for an approved path
        (repo / ".github/workflows/deploy.yml").write_text("# altered dest\n", encoding="utf-8")
        altered = _commit(repo, "altered dest")
        suite.expect_error(
            "altered destination SHA",
            lambda: authorize_sync(
                repo,
                source=source,
                dest=altered,
                dest_parent=parent,
                trusted_ref=parent,
                expected_source=source,
                expected_dest_parent=parent,
            ),
            "wrong sha",
        )

        # Restore dest.yml from source then add unapproved extra
        _run(["git", "-C", str(repo), "checkout", "-q", source, "--", ".github/workflows/deploy.yml"])
        extra = repo / "src/Api/Program.cs"
        extra.parent.mkdir(parents=True, exist_ok=True)
        extra.write_text("stolen\n", encoding="utf-8")
        extra_sha = _commit(repo, "unapproved extra")
        suite.expect_error(
            "unapproved extra file",
            lambda: authorize_sync(
                repo,
                source=source,
                dest=extra_sha,
                dest_parent=altered,
                trusted_ref=parent,
            ),
            "unapproved extra",
        )

        # Changed manifest: trusted-ref path set is a 20-path subset.
        twenty_text = _allowlist_text(drop={"deploy/fetch-origin-main.test.sh"})
        (repo / ALLOWLIST_PATH).write_text(twenty_text, encoding="utf-8")
        twenty = _commit(repo, "trusted twenty-path subset")
        suite.expect_error(
            "changed manifest without owner authorization",
            lambda: authorize_sync(
                repo,
                source=parent,
                dest=parent,
                dest_parent=parent,
                trusted_ref=twenty,
            ),
            "changed manifest",
        )
        _run(["git", "-C", str(repo), "checkout", "-q", "-f", parent])
        (repo / ALLOWLIST_PATH).write_text(
            _allowlist_text(["deploy/provision-production-droplet.sh"], drop={"deploy/fetch-origin-main.test.sh"}),
            encoding="utf-8",
        )
        suite.expect_error(
            "Production path still refused on load",
            lambda: load_allowlist_strict(repo),
            "production",
        )

        # Git symlink object replacing an approved path
        _run(["git", "-C", str(repo), "checkout", "-q", "-f", parent])
        link = repo / "deploy/fetch-origin-uat.sh"
        link.unlink()
        os.symlink("/etc/passwd", link)
        _run(["git", "-C", str(repo), "add", "-A"])
        link_sha = _commit(repo, "symlink dest")
        errors = exact_tree_errors(repo, parent, link_sha, parent, list(APPROVED_PATHS))
        suite.check(
            "git symlink mode refused",
            any("symlink escape refused: deploy/fetch-origin-uat.sh" in e for e in errors),
            "; ".join(errors),
        )

        # Unexpected dest parent
        suite.expect_error(
            "unexpected destination parent",
            lambda: authorize_sync(
                repo,
                source=parent,
                dest=parent,
                dest_parent=parent,
                trusted_ref=parent,
                expected_dest_parent=link_sha,
            ),
            "unexpected destination parent",
        )

        # Dest is not a descendant of dest_parent (orphan commit).
        _run(["git", "-C", str(repo), "checkout", "--orphan", "unrelated"])
        (repo / "unrelated.txt").write_text("orphan\n", encoding="utf-8")
        orphan = _commit(repo, "orphan dest")
        suite.expect_error(
            "dest is not a descendant of dest_parent",
            lambda: authorize_sync(
                repo,
                source=parent,
                dest=orphan,
                dest_parent=parent,
                trusted_ref=parent,
            ),
            "unexpected commits",
        )
        _run(["git", "-C", str(repo), "checkout", "-q", "-f", parent])

        # Stale approval
        suite.expect_error(
            "stale approval",
            lambda: authorize_sync(
                repo,
                source=parent,
                dest=parent,
                dest_parent=parent,
                trusted_ref=parent,
                approval_source_sha=link_sha,
            ),
            "stale approval",
        )

    # --- PR-head self-authorization cannot create its own signal ---
    with tempfile.TemporaryDirectory() as tmp_s:
        repo = Path(tmp_s) / "selfauth"
        _git_init(repo)
        _seed_approved_tree(repo, source_root)
        trusted = _commit(repo, "trusted owner policy")
        # Malicious PR-head: rewrite validator to always authorize, expand allowlist
        (repo / ALLOWLIST_PATH).write_text(
            _allowlist_text() + "src/Api/Program.cs\n", encoding="utf-8"
        )
        (repo / VALIDATOR_PATH).write_text(
            "def load_allowlist(root):\n"
            "    return ['src/Api/Program.cs']\n"
            "def exact_tree_errors(*args, **kwargs):\n"
            "    return []\n"
            "def authorize_sync(*args, **kwargs):\n"
            "    return ['src/Api/Program.cs']\n",
            encoding="utf-8",
        )
        (repo / "src/Api").mkdir(parents=True)
        (repo / "src/Api/Program.cs").write_text("// owned\n", encoding="utf-8")
        evil = _commit(repo, "self-auth")
        # PR-head module would accept. Trusted-ref execution must refuse.
        spec = importlib.util.spec_from_file_location("evil_ad25", repo / VALIDATOR_PATH)
        assert spec and spec.loader
        evil_mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(evil_mod)
        pr_head_ok = evil_mod.authorize_sync(
            repo, source=evil, dest=evil, dest_parent=trusted, trusted_ref=evil
        )
        suite.check(
            "PR-head self-authorization would accept (residual risk if executed)",
            pr_head_ok == ["src/Api/Program.cs"],
            str(pr_head_ok),
        )
        try:
            authorize_from_trusted_ref(
                repo,
                trusted_ref=trusted,
                source=evil,
                dest=evil,
                dest_parent=trusted,
            )
            suite.check("PR-head self-authorization attempts", False, "trusted-ref accepted")
        except AllowlistError as exc:
            text = str(exc).lower()
            suite.check(
                "PR-head self-authorization attempts",
                any(
                    token in text
                    for token in (
                        "changed manifest",
                        "unauthorized",
                        "application",
                        "allowlist",
                        "missing trusted policy",
                    )
                ),
                str(exc),
            )

        # Control-plane is never auto-merge eligible
        suite.check(
            "control-plane never auto-merge eligible",
            not auto_merge_eligible(set(APPROVED_PATHS)),
        )
        suite.check(
            "feature paths may be classified eligible",
            auto_merge_eligible({"docs/readme.md", "src/Api/Program.cs"}),
        )
        suite.check(
            "traversal control-plane is not auto-merge eligible",
            not auto_merge_eligible({"../.github/workflows/ci.yml"}),
        )
        suite.check(
            "case-folded deploy/ is not auto-merge eligible",
            not auto_merge_eligible({"Deploy/lib/ad25_sync_allowlist.py"}),
        )
        suite.check(
            "absolute path is not auto-merge eligible",
            not auto_merge_eligible({"/etc/passwd"}),
        )
        suite.check(
            ".GITHUB/ is not auto-merge eligible",
            not auto_merge_eligible({".GITHUB/workflows/ci.yml"}),
        )

    # --- AD-23 isolation still present on the real tree ---
    stale = stale_validator_reasons(source_root)
    suite.check("existing AD-23 deployment isolation (no stale validators)", stale == [], "; ".join(stale))
    deploy = (source_root / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
    on = deploy.split("jobs:", 1)[0]
    suite.check("AD-23 push to release/uat retained", "release/uat" in on and "\n  push:" in on)
    suite.check("AD-23 no leftover workflow_run on:", "workflow_run:" not in on)
    suite.check("Production workflow not on allowlist", ".github/workflows/deploy-production.yml" not in APPROVED_PATHS)

    if suite.failures:
        print("AD25_HARDENING_CONTRACT=FAIL")
        for item in suite.failures:
            print(f"FAIL {item}")
        return 1
    print("AD25_HARDENING_CONTRACT=PASS")
    print(f"PASSED={suite.passed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_contract(Path(__file__).resolve().parents[2]))
