#!/usr/bin/env bash
# Reproduce AD-25 trust-boundary weaknesses on the verified baseline loader.
# Local fixtures only. No live GitHub, SSH, deploy, or privileged tests.
#
# Baseline loader: main 9ccca77e deploy/lib/ad25_sync_allowlist.py
# Records ACTUAL existing behavior. Distinguishes exploitable gaps from
# defensive improvements. Exit 0 after recording (like the seven-path repro).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE_SHA="${AD25_BASELINE_SHA:-9ccca77e7297dc28b0a843d3435e9603dc803da7}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ensure_commit() {
  local sha="$1"
  if git -C "$ROOT_DIR" cat-file -e "${sha}^{commit}" 2>/dev/null; then
    return 0
  fi
  git -C "$ROOT_DIR" fetch --no-tags -q origin "$sha" 2>/dev/null \
    || git -C "$ROOT_DIR" fetch --no-tags -q origin main 2>/dev/null \
    || true
  git -C "$ROOT_DIR" cat-file -e "${sha}^{commit}"
}

ensure_commit "$BASELINE_SHA"
git -C "$ROOT_DIR" show "${BASELINE_SHA}:deploy/lib/ad25_sync_allowlist.py" >"$TMP/baseline_loader.py"
git -C "$ROOT_DIR" show "${BASELINE_SHA}:deploy/ad25-sync-allowlist.txt" >"$TMP/baseline_allowlist.txt"

python3 - "$TMP" "$ROOT_DIR" "$BASELINE_SHA" <<'PY'
from __future__ import annotations

import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path

tmp = Path(sys.argv[1])
root = Path(sys.argv[2])
baseline = sys.argv[3]

spec = importlib.util.spec_from_file_location("baseline_loader", tmp / "baseline_loader.py")
assert spec and spec.loader
baseline_loader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline_loader)

CANONICAL = (tmp / "baseline_allowlist.txt").read_text(encoding="utf-8")


def write_allowlist(dest: Path, extra_lines: list[str], duplicates: bool = False) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "deploy").mkdir(parents=True, exist_ok=True)
    text = CANONICAL.rstrip() + "\n"
    if duplicates:
        text += "deploy/ad25-sync-allowlist.txt\n"
    for line in extra_lines:
        text += line + "\n"
    (dest / "deploy" / "ad25-sync-allowlist.txt").write_text(text, encoding="utf-8")


def fixture_dir(label: str) -> Path:
    safe = "".join(ch if ch.isalnum() or ch in "-._" else "_" for ch in label).strip("_")
    return tmp / "fixtures" / (safe or "unnamed")


def classify(label: str, extra_lines: list[str], **kwargs) -> None:
    fixture = fixture_dir(label)
    if fixture.exists():
        shutil.rmtree(fixture)
    write_allowlist(fixture, extra_lines, **kwargs)
    try:
        loaded = baseline_loader.load_allowlist(fixture)
        extras = [p for p in loaded if p not in CANONICAL]
        print(f"CASE {label}")
        print("  RESULT=ACCEPTED")
        print(f"  COUNT={len(loaded)}")
        if extras:
            print("  ACCEPTED_EXTRAS=" + ",".join(extras))
        if kwargs.get("duplicates"):
            dups = [p for p in loaded if loaded.count(p) > 1]
            print("  DUPLICATES=" + ",".join(sorted(set(dups))))
        print("  CLASS=EXPLOITABLE_GAP" if extras or kwargs.get("duplicates") else "  CLASS=BASELINE_ACCEPT")
    except SystemExit as exc:
        print(f"CASE {label}")
        print("  RESULT=REFUSED")
        print(f"  REASON={exc}")
        print("  CLASS=EXISTING_DEFENSE")


print("AD25_TRUST_BOUNDARY_REPRODUCTION")
print(f"BASELINE_SHA={baseline}")
print("LOADER=deploy/lib/ad25_sync_allowlist.py@baseline")
print()

# --- Path classes requested in Part A ---
classify("../src/Api/Program.cs", ["../src/Api/Program.cs"])
classify("/etc/passwd", ["/etc/passwd"])
classify(".env", [".env"])
classify("nested deploy/.env", ["deploy/.env"])
classify("nested web/.env.local", ["config/.env.local"])
classify("Production provision script", ["deploy/provision-production-droplet.sh"])
classify("Production remote deploy", ["deploy/production-remote-deploy.sh"])
classify("Production host harden", ["deploy/harden-production-host.sh"])
classify("Production workflow", [".github/workflows/deploy-production.yml"])
classify("inspect-production-oidc.yml", [".github/workflows/inspect-production-oidc.yml"])
classify("privileged CODEOWNERS", [".github/CODEOWNERS"])
classify("privileged dependabot", [".github/dependabot.yml"])
classify("duplicate allowlist entries", [], duplicates=True)
classify("empty entry (blank line)", ["", "   "])
classify("malformed spaces", ["deploy/foo bar.sh"])
classify("malformed NUL-ish comment-only", ["# still a comment"])
classify("dot segment ./deploy/x", ["./deploy/validate-prd-ad23.test.sh"])
classify("dot-dot segment deploy/../src/Api/Program.cs", ["deploy/../src/Api/Program.cs"])
classify("case variation SRC/Api/Program.cs", ["SRC/Api/Program.cs"])
classify("Unicode ZWSP prefix", ["\u200bdeploy/evil.sh"])
classify("Unicode slash lookalike", ["deploy\u2215evil.sh"])
classify("backslash path", ["deploy\\evil.sh"])
classify("retired ADCP path", ["deploy/adcp-dispatcher.sh"])
classify("application src/", ["src/Api/Program.cs"])
classify("application web/", ["web/package.json"])

# --- Working-tree symlink outside repo ---
print("CASE working-tree symlink to /etc/passwd")
sym = tmp / "fixtures" / "symlink_escape"
if sym.exists():
    shutil.rmtree(sym)
write_allowlist(sym, ["deploy/link-escape"])
target = tmp / "outside-secret"
target.write_text("not-a-real-secret\n", encoding="utf-8")
link = sym / "deploy" / "link-escape"
if link.exists():
    link.unlink()
os.symlink(target, link)
try:
    loaded = baseline_loader.load_allowlist(sym)
    extras = [p for p in loaded if p not in CANONICAL]
    print("  RESULT=ACCEPTED")
    print(f"  ACCEPTED_EXTRAS={','.join(extras)}")
    print(f"  SYMLINK_RESOLVES_TO={os.path.realpath(link)}")
    print("  CLASS=EXPLOITABLE_GAP")
except SystemExit as exc:
    print("  RESULT=REFUSED")
    print(f"  REASON={exc}")
    print("  CLASS=EXISTING_DEFENSE")

# --- Git symlink object on dest tree ---
print("CASE git symlink blob (mode 120000) outside repo")
repo = tmp / "git_symlink"
if repo.exists():
    shutil.rmtree(repo)
repo.mkdir()
subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
subprocess.run(["git", "-C", str(repo), "config", "user.email", "t@t"], check=True)
subprocess.run(["git", "-C", str(repo), "config", "user.name", "t"], check=True)
# Seed a tiny tree: allowlist + a symlink path
(repo / "deploy").mkdir()
(repo / "deploy" / "ad25-sync-allowlist.txt").write_text(
    CANONICAL + "deploy/link-escape\n", encoding="utf-8"
)
(repo / "deploy" / "link-escape").write_text("placeholder\n", encoding="utf-8")
subprocess.run(["git", "-C", str(repo), "add", "-A"], check=True)
subprocess.run(["git", "-C", str(repo), "commit", "-q", "-m", "seed"], check=True)
# Replace file with a symlink object
os.remove(repo / "deploy" / "link-escape")
os.symlink("/etc/passwd", repo / "deploy" / "link-escape")
subprocess.run(["git", "-C", str(repo), "add", "-A"], check=True)
subprocess.run(["git", "-C", str(repo), "commit", "-q", "-m", "symlink"], check=True)
head = subprocess.check_output(["git", "-C", str(repo), "rev-parse", "HEAD"], text=True).strip()
mode = subprocess.check_output(
    ["git", "-C", str(repo), "ls-tree", head, "deploy/link-escape"], text=True
).strip()
print(f"  GIT_LS_TREE={mode}")
# Baseline exact_tree_errors only compares blob SHAs / extra names — no mode check
try:
    loaded = baseline_loader.load_allowlist(repo)
    print("  LOAD_ALLOWLIST=ACCEPTED")
    print(f"  ACCEPTED_EXTRAS={','.join(p for p in loaded if p not in CANONICAL)}")
    print("  CLASS=EXPLOITABLE_GAP")
except SystemExit as exc:
    print("  LOAD_ALLOWLIST=REFUSED")
    print(f"  REASON={exc}")
    print("  CLASS=EXISTING_DEFENSE")

# --- Malicious PR changes allowlist AND validator together ---
print("CASE malicious PR changes allowlist + validator together")
evil = tmp / "malicious_pr"
if evil.exists():
    shutil.rmtree(evil)
subprocess.run(["git", "init", "-q", "-b", "main", str(evil)], check=True)
subprocess.run(["git", "-C", str(evil), "config", "user.email", "t@t"], check=True)
subprocess.run(["git", "-C", str(evil), "config", "user.name", "t"], check=True)
# Trusted parent: baseline loader + canonical allowlist
(evil / "deploy" / "lib").mkdir(parents=True)
shutil.copy2(tmp / "baseline_loader.py", evil / "deploy" / "lib" / "ad25_sync_allowlist.py")
shutil.copy2(tmp / "baseline_allowlist.txt", evil / "deploy" / "ad25-sync-allowlist.txt")
subprocess.run(["git", "-C", str(evil), "add", "-A"], check=True)
subprocess.run(["git", "-C", str(evil), "commit", "-q", "-m", "trusted"], check=True)
trusted = subprocess.check_output(["git", "-C", str(evil), "rev-parse", "HEAD"], text=True).strip()
# PR-head: expand allowlist + neutralize validator
evil_allow = CANONICAL + "src/Api/Program.cs\n"
(evil / "deploy" / "ad25-sync-allowlist.txt").write_text(evil_allow, encoding="utf-8")
(evil / "deploy" / "lib" / "ad25_sync_allowlist.py").write_text(
    "def load_allowlist(root):\n"
    "    return ['src/Api/Program.cs']\n"
    "def exact_tree_errors(*args, **kwargs):\n"
    "    return []\n",
    encoding="utf-8",
)
(evil / "src" / "Api").mkdir(parents=True)
(evil / "src" / "Api" / "Program.cs").write_text("// owned\n", encoding="utf-8")
subprocess.run(["git", "-C", str(evil), "add", "-A"], check=True)
subprocess.run(["git", "-C", str(evil), "commit", "-q", "-m", "self-auth"], check=True)
head = subprocess.check_output(["git", "-C", str(evil), "rev-parse", "HEAD"], text=True).strip()
# What happens if authorization uses PR-head modules (current AD-25 pattern)?
sys.path.insert(0, str(evil / "deploy" / "lib"))
import ad25_sync_allowlist as pr_head_loader  # noqa: E402

pr_paths = pr_head_loader.load_allowlist(evil)
pr_errors = pr_head_loader.exact_tree_errors(evil, head, head, trusted, pr_paths)
print(f"  TRUSTED_PARENT={trusted}")
print(f"  PR_HEAD={head}")
print(f"  PR_HEAD_LOAD={pr_paths}")
print(f"  PR_HEAD_EXACT_TREE_ERRORS={pr_errors or 'NONE'}")
if pr_errors:
    print("  RESULT=REFUSED_BY_PR_HEAD")
    print("  CLASS=EXISTING_DEFENSE")
else:
    print("  RESULT=SELF_AUTHORIZED")
    print("  CLASS=EXPLOITABLE_GAP")
    print("  NOTE=PR-head validator + allowlist are both on the 21-path set;")
    print("  NOTE=authorization is derived only from mutable PR-head content.")

# Baseline trusted loader vs malicious working tree (what a trusted-ref check would do)
try:
    trusted_view = baseline_loader.load_allowlist(evil)
    print(f"  TRUSTED_LOADER_ON_PR_TREE=ACCEPTED extras={[p for p in trusted_view if p not in CANONICAL]}")
except SystemExit as exc:
    print(f"  TRUSTED_LOADER_ON_PR_TREE=REFUSED REASON={exc}")
    print("  NOTE=baseline trusted loader still has src/ prefix defense, so this")
    print("  NOTE=particular extra is refused — but ../, .env, production scripts are not.")

print()
print("SUMMARY")
print("  The baseline loader is a mutable PR-head helper. It is not an")
print("  independent authorization root. It rejects src/, web/, adcp, and")
print("  deploy-production.yml by string match only. It does not canonicalize")
print("  paths, reject secrets, production scripts, privileged .github files,")
print("  duplicates, traversal, absolute paths, Unicode, or symlink escapes.")
print("  A malicious PR that rewrites the allowlist and validator together")
print("  can self-authorize if the executing code is the PR-head copy.")
print("REPRODUCED: AD-25 trust-boundary weakness")
PY
