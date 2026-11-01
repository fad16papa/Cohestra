#!/usr/bin/env python3
"""Read-only Cohestra UAT readiness evaluator.

Protected-main trust-root. Fail-closed. Never prints tokens or secret values.
Does not merge, dispatch, SSH, restore, or mutate UAT/Production controls.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any


SCHEMA_VERSION = "1"
REVIEW_MARKER = "<!-- cohestra-independent-review v1 -->"
NOTICE_MARKER_PREFIX = "<!-- cohestra-readiness-notice:"
OWNER_LOGIN = "fad16papa"

STATES = (
    "NOT_UAT_CANDIDATE",
    "REVIEW_IN_PROGRESS",
    "HOLD",
    "READY_FOR_OWNER_MERGE_DECISION",
    "MERGED_MAIN_CHECKS_PENDING",
    "MERGED_MAIN_CHECKS_PASS",
    "UAT_DISABLED_GATE_HOLD_VERIFIED",
    "UAT_ACTIVATION_HOLD",
    "READY_FOR_OWNER_UAT_COMMISSIONING_DECISION",
    "UAT_ACCEPTED",
)

PR_REQUIRED_JOBS = (
    ".NET build and test",
    "API integration tests",
    "Next.js build",
    "UAT isolation contract",
    "Docker stack smoke",
    "Exact-SHA security scan",
)
MAIN_REQUIRED_JOBS = PR_REQUIRED_JOBS + ("GitGuardian exact-SHA API scan",)
GG_CHECK_NAME = "GitGuardian Security Checks"
GG_API_JOB = "GitGuardian exact-SHA API scan"
REVIEW_ROLES = ("BMAD", "CAT-SEC")

UAT_PATH_PREFIXES = (
    "deploy/",
    ".github/workflows/deploy.yml",
    ".github/workflows/deploy-uat-rollback.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/uat-readiness.yml",
    "web/e2e-uat/",
    "docs/deploy/",
)
UAT_PATH_STARTS = (
    "deploy/",
    ".github/workflows/deploy",
    "web/e2e-uat/",
    "docs/deploy/",
)
UAT_PATH_EXACT = (
    ".github/workflows/ci.yml",
    ".github/workflows/uat-readiness.yml",
)

SECRET_RE = re.compile(
    r"(BEGIN (OPENSSH |RSA )?PRIVATE KEY|-----BEGIN|Bearer\s+[A-Za-z0-9._\-=]+|"
    r"(password|secret|token|api[_-]?key)\s*[:=]\s*\S+|"
    r"ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|ghs_[A-Za-z0-9]+|gho_[A-Za-z0-9]+|ghu_[A-Za-z0-9]+)",
    re.MULTILINE | re.IGNORECASE,
)
SUPPORTED_ASSOCIATIONS = {"OWNER", "MEMBER", "COLLABORATOR"}
CLEAN_MERGE_STATES = {"clean", "has_hooks"}
FORBIDDEN_REVIEW_APP_SLUGS = {
    "github-actions",
    "github",
    "cursor",
    "dependabot",
    "gitguardian",
    "renovate",
}
DEFAULT_REVIEW_APPS = {
    "BMAD": {"slug": "cohestra-bmad", "check_name": "Cohestra BMAD"},
    "CAT-SEC": {"slug": "cohestra-cat-sec", "check_name": "Cohestra CAT-SEC"},
}
PREDEPLOY_JOB = "Pre-UAT eligibility gate"
DEPLOY_JOB = "Deploy accepted SHA to UAT"


def _load_production() -> Any:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "production-github-provenance.py")
    spec = importlib.util.spec_from_file_location("production_github_provenance", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("production provenance helper missing")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


prod = _load_production()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def norm_sha(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip().lower()


def is_full_sha(value: Any) -> bool:
    sha = norm_sha(value)
    return bool(re.fullmatch(r"[0-9a-f]{40}", sha))


def sanitize_text(value: Any) -> str:
    text = "" if value is None else str(value)
    return SECRET_RE.sub("[REDACTED]", text)


def contains_secret(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, dict):
        return any(contains_secret(v) for v in value.values())
    if isinstance(value, list):
        return any(contains_secret(v) for v in value)
    return bool(SECRET_RE.search(str(value)))


def sha256_json(payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def is_uat_path(filename: str) -> bool:
    name = filename or ""
    if name in UAT_PATH_EXACT:
        return True
    return any(name.startswith(prefix) for prefix in UAT_PATH_STARTS)


def labels_of(pr: dict[str, Any]) -> set[str]:
    labels: set[str] = set()
    for row in pr.get("labels") or []:
        if isinstance(row, dict):
            labels.add(str(row.get("name") or "").strip().lower())
        else:
            labels.add(str(row).strip().lower())
    return labels


def is_uat_candidate(pr: dict[str, Any], files: list[dict[str, Any]]) -> bool:
    if "uat" in labels_of(pr):
        return True
    for row in files:
        name = ""
        if isinstance(row, dict):
            name = str(row.get("filename") or row.get("path") or "")
        if is_uat_path(name):
            return True
    return False


def empty_attestation_matrix() -> dict[str, str]:
    keys = (
        "environment_secrets",
        "host_access",
        "verified_git_fetch",
        "dotenv",
        "dns_tls_health",
        "real_recaptcha",
        "paddle_sandbox",
        "authenticated_basic_pro",
        "backups",
        "restore_rehearsal",
        "schema_compatibility",
        "safe_rollback",
        "monitoring",
        "live_enabled_deployment",
        "required_playwright_coverage",
        "public_ready",
        "host_accepted_sha",
    )
    return {key: "UNVERIFIED" for key in keys}


def base_report(**overrides: Any) -> dict[str, Any]:
    report: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "evidence_class": overrides.get("evidence_class") or "CI_CONTRACT",
        "source_type": overrides.get("source_type") or "CI_CONTRACT",
        "generated_at": utc_now(),
        "scope": "uat-readiness",
        "mode": overrides.get("mode") or "pr",
        "repository": os.environ.get("GITHUB_REPOSITORY") or "fad16papa/Cohestra",
        "pr_number": None,
        "head_sha": "",
        "base_sha": "",
        "merge_commit_sha": "",
        "state": "HOLD",
        "hold_reason": "",
        "ready": False,
        "predeploy_ok": False,
        "owner_authorization_claimed": False,
        "uat_deploy_gate_active": os.environ.get("UAT_DEPLOY_GATE_ACTIVE") == "true",
        "candidate": False,
        "mergeable": None,
        "merge_state_status": "",
        "draft": None,
        "base_integrity": "unknown",
        "required_checks": [],
        "gitguardian": {"native": "MISSING", "exact_sha_api": "NOT_REQUIRED_ON_PR"},
        "reviews": {
            "bmad": {"present": False, "authentic": False, "verdict": "MISSING"},
            "cat_sec": {"present": False, "authentic": False, "verdict": "MISSING"},
        },
        "review_evidence": "REVIEW_EVIDENCE_MISSING",
        "attestation_matrix": empty_attestation_matrix(),
        "risks": [],
        "check_urls": [],
        "owner_choices": [],
        "evidence_revision": "",
        "dedup_fingerprint": "",
        "should_notify": False,
        "notify_reason": "",
        "notice_body": "",
        "provenance": {
            "evaluator": "deploy/lib/uat-readiness.py",
            "trust_root": "protected-main",
            "privileged_actions": False,
            "adcp": False,
        },
        "hardcoded_prs": False,
        "api_error": "",
        "stale": False,
        "material_blocker": False,
        "parent_count": None,
        "parents": [],
    }
    report.update(overrides)
    return report


def finish(report: dict[str, Any], previous_fingerprints: set[str] | None = None) -> dict[str, Any]:
    report["owner_authorization_claimed"] = False
    report["hardcoded_prs"] = False
    report["ready"] = report.get("state") in {
        "READY_FOR_OWNER_MERGE_DECISION",
        "READY_FOR_OWNER_UAT_COMMISSIONING_DECISION",
    }
    report["hold_reason"] = sanitize_text(report.get("hold_reason") or "")
    report["api_error"] = sanitize_text(report.get("api_error") or "")
    for key in ("notice_body",):
        report[key] = sanitize_text(report.get(key) or "")
    revision_payload = {
        "pr": report.get("pr_number"),
        "head": report.get("head_sha"),
        "base": report.get("base_sha"),
        "checks": report.get("required_checks"),
        "reviews": report.get("reviews"),
        "gitguardian": report.get("gitguardian"),
        "state": report.get("state"),
    }
    report["evidence_revision"] = sha256_json(revision_payload)
    report["dedup_fingerprint"] = sha256_json(
        {
            "pr": report.get("pr_number"),
            "head": report.get("head_sha"),
            "base": report.get("base_sha"),
            "revision": report["evidence_revision"],
            "state": report.get("state"),
        }
    )
    material = bool(report.get("material_blocker"))
    decision = report.get("state") in {
        "READY_FOR_OWNER_MERGE_DECISION",
        "READY_FOR_OWNER_UAT_COMMISSIONING_DECISION",
    }
    fingerprints = previous_fingerprints or set()
    already = report["dedup_fingerprint"] in fingerprints
    report["should_notify"] = (decision or material) and not already
    if already:
        report["notify_reason"] = "idempotent"
    elif decision:
        report["notify_reason"] = "new_decision"
    elif material:
        report["notify_reason"] = "material_blocker"
    else:
        report["notify_reason"] = "no_threshold"
    if report["should_notify"]:
        report["notice_body"] = render_notice(report)
    if contains_secret(report):
        raise RuntimeError("readiness report attempted to persist a secret-like value")
    return report


def render_notice(report: dict[str, Any]) -> str:
    state = report.get("state")
    sha = report.get("head_sha") or report.get("merge_commit_sha") or ""
    reason = report.get("hold_reason") or "threshold reached"
    body = (
        f"{NOTICE_MARKER_PREFIX}{report.get('dedup_fingerprint')} -->\n"
        f"@{OWNER_LOGIN} Cohestra UAT readiness `{state}` for "
        f"PR #{report.get('pr_number') or 'main'} SHA `{sha}`.\n\n"
        f"{reason}\n\n"
        "This is evidence only. It is not merge, UAT gate, SSH, or Production authorization.\n"
        "UAT_DEPLOY_GATE_ACTIVE remains owner-controlled. Production remains NO-GO.\n"
    )
    return sanitize_text(body)


def render_markdown(report: dict[str, Any]) -> str:
    checks = report.get("required_checks") or []
    check_lines = []
    for row in checks:
        if not isinstance(row, dict):
            continue
        url = row.get("url") or ""
        check_lines.append(
            f"- `{row.get('name')}` {row.get('result')} SHA `{row.get('sha') or ''}` {url}".rstrip()
        )
    reviews = report.get("reviews") or {}
    bmad = reviews.get("bmad") or {}
    cat = reviews.get("cat_sec") or {}
    matrix = report.get("attestation_matrix") or {}
    matrix_lines = [f"- `{key}`: {value}" for key, value in matrix.items()]
    choices = report.get("owner_choices") or []
    risk_lines = [f"- {sanitize_text(item)}" for item in (report.get("risks") or [])]
    lines = [
        f"# UAT readiness {report.get('state')}",
        "",
        f"- Evidence class: `{report.get('evidence_class')}`",
        f"- Mode: `{report.get('mode')}`",
        f"- PR: `{report.get('pr_number')}`",
        f"- Head SHA: `{report.get('head_sha')}`",
        f"- Base SHA: `{report.get('base_sha')}`",
        f"- Merge SHA: `{report.get('merge_commit_sha')}`",
        f"- Mergeable: `{report.get('mergeable')}` / `{report.get('merge_state_status')}`",
        f"- Base integrity: `{report.get('base_integrity')}`",
        f"- Review evidence: `{report.get('review_evidence')}`",
        f"- Predeploy OK: `{report.get('predeploy_ok')}`",
        f"- Owner authorization claimed: `false`",
        f"- Gate active claimed by evaluator: `{report.get('uat_deploy_gate_active')}` (read-only echo)",
        "",
        "## Required checks",
        *(check_lines or ["- none"]),
        "",
        "## Independent reviews",
        f"- BMAD: present={bmad.get('present')} authentic={bmad.get('authentic')} "
        f"verdict={bmad.get('verdict')} blocker={bmad.get('blocker')} major={bmad.get('major')} "
        f"identity={bmad.get('identity')}",
        f"- CAT-SEC: present={cat.get('present')} authentic={cat.get('authentic')} "
        f"verdict={cat.get('verdict')} blocker={cat.get('blocker')} major={cat.get('major')} "
        f"identity={cat.get('identity')}",
        "",
        "## Unverified UAT attestation matrix",
        *matrix_lines,
        "",
        "## Risks",
        *(risk_lines or ["- none"]),
        "",
        "## Owner choices (not authorization)",
        *([f"- {item}" for item in choices] or ["- HOLD"]),
        "",
        "This report is not merge permission, UAT commissioning, SSH, or Production authorization.",
        "Production remains NO-GO until explicit `PRODUCTION CUTOVER: AUTHORIZED`.",
    ]
    return sanitize_text("\n".join(lines) + "\n")


def previous_notice_fingerprints(comments: list[Any]) -> set[str]:
    found: set[str] = set()
    for row in comments:
        if not isinstance(row, dict):
            continue
        body = str(row.get("body") or "")
        for match in re.finditer(re.escape(NOTICE_MARKER_PREFIX) + r"([0-9a-f]{64}) -->", body):
            found.add(match.group(1))
    return found


def fetch_json(path: str) -> Any:
    return prod.gh_api(path)


def paginate(path: str, key: str | None, label: str) -> list[Any]:
    return prod.paginate_list(path, key, label)


def hold(report: dict[str, Any], reason: str, *, material: bool = False, stale: bool = False) -> dict[str, Any]:
    report["state"] = "HOLD"
    report["hold_reason"] = reason
    report["ready"] = False
    report["predeploy_ok"] = False
    report["material_blocker"] = bool(material) or report.get("material_blocker") is True
    report["stale"] = bool(stale) or report.get("stale") is True
    if reason not in (report.get("risks") or []):
        report.setdefault("risks", []).append(reason)
    return report


def parse_review_blob(body: str) -> dict[str, Any] | None:
    if REVIEW_MARKER not in (body or ""):
        return None
    after = body.split(REVIEW_MARKER, 1)[1].strip()
    match = re.search(r"\{.*\}", after, re.DOTALL)
    if not match:
        return None
    try:
        payload = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict):
        return None
    return payload


def reviewer_identity(row: dict[str, Any]) -> tuple[str, str]:
    user = row.get("user") if isinstance(row.get("user"), dict) else {}
    login = str(user.get("login") or "").strip()
    kind = str(user.get("type") or "").strip()
    return login, kind


def authentic_review(
    payload: dict[str, Any],
    row: dict[str, Any],
    expected_sha: str,
    pr_author: str,
) -> tuple[bool, str]:
    role = str(payload.get("role") or "").strip().upper()
    if role not in REVIEW_ROLES:
        return False, "unsupported review role"
    if payload.get("independent") is not True:
        return False, "review is not marked independent"
    if norm_sha(payload.get("head_sha")) != expected_sha:
        return False, "review SHA is not the exact HEAD"
    login, kind = reviewer_identity(row)
    if not login:
        return False, "review identity missing"
    if login.lower() == (pr_author or "").lower():
        return False, "reviewer is the PR author"
    if kind.lower() == "bot" or login.endswith("[bot]"):
        return False, "unsupported reviewer identity"
    association = str(row.get("author_association") or "").strip().upper()
    if association not in SUPPORTED_ASSOCIATIONS:
        return False, "unsupported reviewer identity"
    try:
        blocker = int(payload.get("blocker"))
        major = int(payload.get("major"))
    except (TypeError, ValueError):
        return False, "review counts are not integers"
    verdict = str(payload.get("verdict") or "").strip().upper()
    if verdict == "PASS" and (blocker > 0 or major > 0):
        return False, "PASS verdict with BLOCKER/MAJOR"
    if verdict not in {"PASS", "FAIL"}:
        return False, "unsupported review verdict"
    return True, role


def collect_reviews(
    comments: list[Any],
    expected_sha: str,
    pr_author: str,
    pr_body: str,
) -> tuple[dict[str, dict[str, Any]], list[str]]:
    if parse_review_blob(pr_body or ""):
        return (
            {
                "bmad": {"present": False, "authentic": False, "verdict": "SPOOFED_PR_BODY"},
                "cat_sec": {"present": False, "authentic": False, "verdict": "SPOOFED_PR_BODY"},
            },
            ["PR body review assertion is not evidence"],
        )
    found: dict[str, dict[str, Any]] = {}
    risks: list[str] = []
    for row in comments:
        if not isinstance(row, dict):
            continue
        payload = parse_review_blob(str(row.get("body") or ""))
        if payload is None:
            continue
        ok, detail = authentic_review(payload, row, expected_sha, pr_author)
        role = str(payload.get("role") or "").strip().upper()
        key = "bmad" if role == "BMAD" else "cat_sec" if role == "CAT-SEC" else ""
        if not ok:
            risks.append(detail)
            continue
        if not key:
            continue
        record = {
            "present": True,
            "authentic": True,
            "role": role,
            "verdict": str(payload.get("verdict") or "").upper(),
            "blocker": int(payload.get("blocker")),
            "major": int(payload.get("major")),
            "minor": int(payload.get("minor") or 0),
            "nit": int(payload.get("nit") or 0),
            "identity": reviewer_identity(row)[0],
            "source": "collaborator_comment",
            "comment_id": row.get("id"),
            "head_sha": expected_sha,
        }
        if key in found and found[key].get("verdict") != record["verdict"]:
            risks.append(f"ambiguous {role} reviews")
            found[key] = {
                "present": True,
                "authentic": False,
                "verdict": "AMBIGUOUS",
            }
            continue
        found[key] = record
    bmad_id = str((found.get("bmad") or {}).get("identity") or "")
    cat_id = str((found.get("cat_sec") or {}).get("identity") or "")
    if bmad_id and cat_id and bmad_id.lower() == cat_id.lower():
        risks.append("BMAD and CAT-SEC must be distinct independent identities")
        found["bmad"] = {"present": True, "authentic": False, "verdict": "NOT_INDEPENDENT"}
        found["cat_sec"] = {"present": True, "authentic": False, "verdict": "NOT_INDEPENDENT"}
    reviews = {
        "bmad": found.get("bmad")
        or {"present": False, "authentic": False, "verdict": "MISSING"},
        "cat_sec": found.get("cat_sec")
        or {"present": False, "authentic": False, "verdict": "MISSING"},
    }
    return reviews, risks


def empty_review_pair() -> dict[str, dict[str, Any]]:
    return {
        "bmad": {"present": False, "authentic": False, "verdict": "MISSING"},
        "cat_sec": {"present": False, "authentic": False, "verdict": "MISSING"},
    }


def review_app_config() -> dict[str, dict[str, str]]:
    return {
        "BMAD": {
            "slug": (os.environ.get("UAT_READINESS_BMAD_APP_SLUG") or DEFAULT_REVIEW_APPS["BMAD"]["slug"])
            .strip()
            .lower(),
            "id": str(os.environ.get("UAT_READINESS_BMAD_APP_ID") or "").strip(),
            "check_name": os.environ.get("UAT_READINESS_BMAD_CHECK_NAME")
            or DEFAULT_REVIEW_APPS["BMAD"]["check_name"],
        },
        "CAT-SEC": {
            "slug": (
                os.environ.get("UAT_READINESS_CATSEC_APP_SLUG") or DEFAULT_REVIEW_APPS["CAT-SEC"]["slug"]
            )
            .strip()
            .lower(),
            "id": str(os.environ.get("UAT_READINESS_CATSEC_APP_ID") or "").strip(),
            "check_name": os.environ.get("UAT_READINESS_CATSEC_CHECK_NAME")
            or DEFAULT_REVIEW_APPS["CAT-SEC"]["check_name"],
        },
    }


def collect_app_reviews(repo: str, expected_sha: str) -> tuple[dict[str, dict[str, Any]], list[str]]:
    """Accept only allowlisted GitHub App check-runs bound to the exact SHA."""
    missing = empty_review_pair()
    risks: list[str] = []
    config = review_app_config()
    if config["BMAD"]["slug"] == config["CAT-SEC"]["slug"]:
        return missing, ["BMAD and CAT-SEC app slugs are not distinct"]
    if config["BMAD"]["id"] and config["CAT-SEC"]["id"] and config["BMAD"]["id"] == config["CAT-SEC"]["id"]:
        return missing, ["BMAD and CAT-SEC app IDs are not distinct"]
    for role, cfg in config.items():
        if cfg["slug"] in FORBIDDEN_REVIEW_APP_SLUGS or not cfg["slug"]:
            return missing, [f"{role} review app slug is forbidden or empty"]
        if cfg["slug"].endswith("[bot]") or cfg["slug"] == "cursor":
            return missing, [f"{role} review app slug is unsupported"]
    try:
        runs = paginate(
            f"/repos/{repo}/commits/{expected_sha}/check-runs?filter=all",
            "check_runs",
            "review check-runs",
        )
    except SystemExit:
        return missing, ["GitHub API failed closed while listing review check-runs"]
    found: dict[str, dict[str, Any]] = {}
    for role, cfg in config.items():
        key = "bmad" if role == "BMAD" else "cat_sec"
        matched: list[dict[str, Any]] = []
        for raw in runs:
            obj = prod.require_dict(raw, "review check-run")
            if obj.get("name") != cfg["check_name"]:
                continue
            app = obj.get("app") if isinstance(obj.get("app"), dict) else {}
            slug = str(app.get("slug") or "").strip().lower()
            app_id = str(app.get("id") or "").strip()
            if slug != cfg["slug"]:
                risks.append(f"{role} check name used by untrusted app {slug or 'missing'}")
                continue
            if slug in FORBIDDEN_REVIEW_APP_SLUGS:
                risks.append(f"{role} check was produced by a forbidden app")
                continue
            if cfg["id"] and app_id != cfg["id"]:
                risks.append(f"{role} GitHub App id does not match the owner-pinned id")
                continue
            if norm_sha(obj.get("head_sha")) != expected_sha:
                risks.append(f"{role} review check-run SHA is not the exact HEAD")
                continue
            matched.append(obj)
        if not matched:
            continue
        terminal = [obj for obj in matched if obj.get("status") == "completed"]
        pending = [obj for obj in matched if obj.get("status") in {"queued", "in_progress", "pending"}]
        if pending and not terminal:
            risks.append(f"{role} review check-run is pending")
            continue
        if not terminal:
            continue
        conclusions = {str(obj.get("conclusion") or "") for obj in terminal}
        if len(conclusions) > 1:
            found[key] = {"present": True, "authentic": False, "verdict": "AMBIGUOUS"}
            risks.append(f"ambiguous {role} review check-runs")
            continue
        newest = terminal[-1]
        output = newest.get("output") if isinstance(newest.get("output"), dict) else {}
        body = "\n".join(
            str(output.get(field) or "") for field in ("title", "summary", "text")
        )
        payload = parse_review_blob(body)
        if payload is None:
            risks.append(f"{role} review check-run is missing the signed review marker")
            continue
        if str(payload.get("role") or "").strip().upper() != role:
            risks.append(f"{role} review check-run payload role mismatch")
            continue
        if payload.get("independent") is not True:
            risks.append(f"{role} review check-run is not marked independent")
            continue
        if norm_sha(payload.get("head_sha")) != expected_sha:
            risks.append(f"{role} review check-run payload SHA is not the exact HEAD")
            continue
        try:
            blocker = int(payload.get("blocker"))
            major = int(payload.get("major"))
        except (TypeError, ValueError):
            risks.append(f"{role} review check-run counts are not integers")
            continue
        verdict = str(payload.get("verdict") or "").strip().upper()
        conclusion = str(newest.get("conclusion") or "")
        if verdict == "PASS" and (blocker > 0 or major > 0):
            risks.append(f"{role} PASS verdict with BLOCKER/MAJOR")
            continue
        if verdict == "PASS" and conclusion != "success":
            risks.append(f"{role} PASS verdict without success conclusion")
            continue
        if verdict not in {"PASS", "FAIL"}:
            risks.append(f"{role} review check-run verdict is unsupported")
            continue
        app = newest.get("app") if isinstance(newest.get("app"), dict) else {}
        slug = str(app.get("slug") or "").strip().lower()
        app_id = str(app.get("id") or "").strip()
        found[key] = {
            "present": True,
            "authentic": True,
            "role": role,
            "verdict": verdict,
            "blocker": blocker,
            "major": major,
            "minor": int(payload.get("minor") or 0),
            "nit": int(payload.get("nit") or 0),
            "identity": f"app:{slug}:{app_id or slug}",
            "source": "github_app_check_run",
            "check_id": newest.get("id"),
            "head_sha": expected_sha,
        }
    bmad_id = str((found.get("bmad") or {}).get("identity") or "")
    cat_id = str((found.get("cat_sec") or {}).get("identity") or "")
    if bmad_id and cat_id and bmad_id.lower() == cat_id.lower():
        risks.append("BMAD and CAT-SEC app identities are not distinct")
        found["bmad"] = {"present": True, "authentic": False, "verdict": "NOT_INDEPENDENT"}
        found["cat_sec"] = {"present": True, "authentic": False, "verdict": "NOT_INDEPENDENT"}
    reviews = {
        "bmad": found.get("bmad") or missing["bmad"],
        "cat_sec": found.get("cat_sec") or missing["cat_sec"],
    }
    return reviews, risks


def merge_review_sources(
    comments: dict[str, dict[str, Any]],
    apps: dict[str, dict[str, Any]],
) -> tuple[dict[str, dict[str, Any]], list[str]]:
    risks: list[str] = []
    merged: dict[str, dict[str, Any]] = {}
    for key in ("bmad", "cat_sec"):
        comment = comments.get(key) or {"present": False, "authentic": False, "verdict": "MISSING"}
        app = apps.get(key) or {"present": False, "authentic": False, "verdict": "MISSING"}
        if comment.get("verdict") == "SPOOFED_PR_BODY" and not app.get("authentic"):
            merged[key] = comment
            continue
        if app.get("authentic") and comment.get("authentic"):
            if app.get("verdict") != comment.get("verdict"):
                merged[key] = {"present": True, "authentic": False, "verdict": "AMBIGUOUS"}
                risks.append(f"ambiguous {key} comment vs GitHub App review")
            else:
                merged[key] = app
            continue
        if app.get("authentic"):
            merged[key] = app
            continue
        if comment.get("authentic"):
            merged[key] = comment
            continue
        if comment.get("verdict") not in {"MISSING", None, ""}:
            merged[key] = comment
        else:
            merged[key] = app
    bmad_id = str((merged.get("bmad") or {}).get("identity") or "")
    cat_id = str((merged.get("cat_sec") or {}).get("identity") or "")
    if bmad_id and cat_id and bmad_id.lower() == cat_id.lower():
        risks.append("BMAD and CAT-SEC must be distinct independent identities")
        merged["bmad"] = {"present": True, "authentic": False, "verdict": "NOT_INDEPENDENT"}
        merged["cat_sec"] = {"present": True, "authentic": False, "verdict": "NOT_INDEPENDENT"}
    return merged, risks


def reviews_pass(reviews: dict[str, dict[str, Any]]) -> bool:
    for key in ("bmad", "cat_sec"):
        row = reviews.get(key) or {}
        if not row.get("authentic"):
            return False
        if row.get("verdict") != "PASS":
            return False
        if int(row.get("blocker") or 0) > 0 or int(row.get("major") or 0) > 0:
            return False
    return True


def classify_job(name: str, jobs: list[dict[str, Any]], expected_sha: str) -> dict[str, Any]:
    matched = [job for job in jobs if job.get("name") == name]
    result = {
        "name": name,
        "result": "MISSING",
        "sha": "",
        "url": "",
        "id": None,
        "conclusion": "",
        "status": "",
    }
    if not matched:
        return result
    conclusions = {str(job.get("conclusion") or "") for job in matched}
    if len(conclusions) > 1:
        result["result"] = "AMBIGUOUS"
        return result
    job = matched[-1]
    job_sha = norm_sha(job.get("head_sha"))
    result.update(
        {
            "sha": job_sha,
            "url": str(job.get("html_url") or ""),
            "id": job.get("id"),
            "conclusion": str(job.get("conclusion") or ""),
            "status": str(job.get("status") or ""),
        }
    )
    if job_sha and expected_sha and job_sha != expected_sha:
        result["result"] = "SHA_MISMATCH"
        return result
    if result["status"] in {"queued", "in_progress", "pending", "waiting", "requested"}:
        result["result"] = "PENDING"
        return result
    if result["conclusion"] == "skipped":
        result["result"] = "SKIPPED"
        return result
    if result["conclusion"] == "success":
        result["result"] = "SUCCESS"
        return result
    result["result"] = result["conclusion"].upper() or "FAILED"
    return result


def newest_ci_run_for_sha(repo: str, sha: str, event: str | None = None) -> dict[str, Any] | None:
    runs = paginate(f"/repos/{repo}/actions/workflows/ci.yml/runs?head_sha={sha}", "workflow_runs", "ci runs")
    allowed: list[dict[str, Any]] = []
    for raw in runs:
        obj = prod.require_dict(raw, "ci run")
        if norm_sha(obj.get("head_sha")) != sha:
            continue
        if event and obj.get("event") != event:
            continue
        allowed.append(obj)
    if not allowed:
        return None
    return prod.newest_ci_run(allowed)


def jobs_for_run(repo: str, run_id: Any) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    run = prod.require_dict(fetch_json(f"/repos/{repo}/actions/runs/{run_id}"), "ci run")
    jobs = paginate(f"/repos/{repo}/actions/runs/{run_id}/jobs", "jobs", "ci jobs")
    hydrated: list[dict[str, Any]] = []
    for job in jobs:
        obj = prod.require_dict(job, "ci job")
        if not obj.get("head_sha"):
            obj["head_sha"] = run.get("head_sha")
        hydrated.append(obj)
    return run, hydrated


def native_gitguardian(repo: str, sha: str) -> dict[str, Any]:
    result = {"name": GG_CHECK_NAME, "result": "MISSING", "sha": sha, "url": "", "app": ""}
    try:
        runs = paginate(
            f"/repos/{repo}/commits/{sha}/check-runs?filter=all",
            "check_runs",
            "check-runs",
        )
    except SystemExit:
        result["result"] = "API_ERROR"
        return result
    matched: list[dict[str, Any]] = []
    for raw in runs:
        obj = prod.require_dict(raw, "check-run")
        if obj.get("name") != GG_CHECK_NAME:
            continue
        if norm_sha(obj.get("head_sha")) != sha:
            continue
        app = obj.get("app") if isinstance(obj.get("app"), dict) else {}
        slug = str(app.get("slug") or "").lower()
        if slug != "gitguardian":
            result["result"] = "APP_MISMATCH"
            return result
        matched.append(obj)
    if not matched:
        return result
    pending = [obj for obj in matched if obj.get("status") in {"queued", "in_progress", "pending"}]
    if pending and not [obj for obj in matched if obj.get("status") == "completed"]:
        result["result"] = "PENDING"
        return result
    terminal = [obj for obj in matched if obj.get("status") == "completed"]
    if not terminal:
        result["result"] = "PENDING"
        return result
    conclusions = {str(obj.get("conclusion") or "") for obj in terminal}
    if len(conclusions) > 1:
        result["result"] = "AMBIGUOUS"
        return result
    newest = terminal[-1]
    result["url"] = str(newest.get("html_url") or "")
    result["app"] = "gitguardian"
    conclusion = str(newest.get("conclusion") or "")
    result["result"] = "SUCCESS" if conclusion == "success" else (conclusion.upper() or "FAILED")
    return result


def collect_pr_comments(repo: str, number: int) -> list[dict[str, Any]]:
    comments: list[dict[str, Any]] = []
    for raw in paginate(f"/repos/{repo}/issues/{number}/comments", None, "issue comments"):
        if isinstance(raw, dict):
            comments.append(raw)
    for raw in paginate(f"/repos/{repo}/pulls/{number}/comments", None, "review comments"):
        if isinstance(raw, dict):
            comments.append(raw)
    for raw in paginate(f"/repos/{repo}/pulls/{number}/reviews", None, "reviews"):
        if isinstance(raw, dict):
            comments.append(raw)
    return comments


def owner_choices_for(state: str) -> list[str]:
    if state == "READY_FOR_OWNER_MERGE_DECISION":
        return [
            "HOLD — do not merge; keep DRAFT or request corrections.",
            "OWNER MERGE AUTHORIZATION — separately name the exact PR HEAD and base SHAs. This report is not that authorization.",
        ]
    if state == "READY_FOR_OWNER_UAT_COMMISSIONING_DECISION":
        return [
            "HOLD — keep UAT_DEPLOY_GATE_ACTIVE=false. This report is not commissioning.",
            "OWNER UAT COMMISSIONING AUTHORIZATION — later, separately set the gate and authorize Deploy UAT. This report is not that authorization.",
        ]
    return [
        "HOLD — no owner action is requested.",
        "Do not merge, dispatch Deploy UAT, SSH, restore, or change Production from this report.",
    ]


def evaluate_pr(repo: str, pr_number: int, requested_head: str = "", requested_base: str = "") -> dict[str, Any]:
    report = base_report(mode="pr", pr_number=pr_number, evidence_class="CI_CONTRACT")
    pr = prod.require_dict(fetch_json(f"/repos/{repo}/pulls/{pr_number}"), "hydrated PR")
    head = pr.get("head") if isinstance(pr.get("head"), dict) else {}
    base = pr.get("base") if isinstance(pr.get("base"), dict) else {}
    head_sha = norm_sha(head.get("sha"))
    base_sha = norm_sha(base.get("sha"))
    report["head_sha"] = head_sha
    report["base_sha"] = base_sha
    report["merge_commit_sha"] = norm_sha(pr.get("merge_commit_sha"))
    report["draft"] = bool(pr.get("draft"))
    report["mergeable"] = pr.get("mergeable")
    report["merge_state_status"] = str(pr.get("mergeable_state") or "")
    report["base_integrity"] = "main" if base.get("ref") == "main" else "invalid-base"
    files = [prod.require_dict(row, "pr file") for row in paginate(f"/repos/{repo}/pulls/{pr_number}/files", None, "pr files")]
    report["candidate"] = is_uat_candidate(pr, files)
    comments = collect_pr_comments(repo, pr_number)
    fingerprints = previous_notice_fingerprints(comments)
    if not report["candidate"]:
        report["state"] = "NOT_UAT_CANDIDATE"
        report["hold_reason"] = "PR is not a UAT candidate"
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    if base.get("ref") != "main":
        hold(report, "UAT candidate base is not protected main", material=True)
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    if requested_head and is_full_sha(requested_head) and norm_sha(requested_head) != head_sha:
        hold(report, "requested HEAD does not match current PR HEAD", stale=True)
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    if requested_base and is_full_sha(requested_base) and norm_sha(requested_base) != base_sha:
        hold(report, "requested base SHA does not match current PR base", stale=True)
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    if not is_full_sha(head_sha) or not is_full_sha(base_sha):
        hold(report, "PR SHAs are not immutable 40-character values", material=True)
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)

    author = ""
    user = pr.get("user") if isinstance(pr.get("user"), dict) else {}
    author = str(user.get("login") or "")
    comment_reviews, review_risks = collect_reviews(comments, head_sha, author, str(pr.get("body") or ""))
    app_reviews, app_risks = collect_app_reviews(repo, head_sha)
    reviews, merge_risks = merge_review_sources(comment_reviews, app_reviews)
    report["reviews"] = reviews
    report["risks"].extend(review_risks)
    report["risks"].extend(app_risks)
    report["risks"].extend(merge_risks)
    if reviews_pass(reviews):
        report["review_evidence"] = "AUTHENTIC"
    elif any("SPOOFED" in str((reviews[key] or {}).get("verdict")) for key in reviews):
        report["review_evidence"] = "SPOOFED"
        hold(report, "forged or PR-body review evidence is not authentic", material=True)
    elif any(str((reviews[key] or {}).get("verdict")) == "AMBIGUOUS" for key in reviews):
        report["review_evidence"] = "AMBIGUOUS"
        hold(report, "ambiguous BMAD/CAT-SEC evidence")
    else:
        report["review_evidence"] = "REVIEW_EVIDENCE_MISSING"

    ci_run = newest_ci_run_for_sha(repo, head_sha, event=None)
    jobs: list[dict[str, Any]] = []
    run_event = ""
    if ci_run:
        run, jobs = jobs_for_run(repo, ci_run.get("id"))
        run_event = str(run.get("event") or "")
        report["check_urls"].append(str(run.get("html_url") or ""))
    required = [classify_job(name, jobs, head_sha) for name in PR_REQUIRED_JOBS]
    gg = native_gitguardian(repo, head_sha)
    required.append(
        {
            "name": GG_CHECK_NAME,
            "result": gg.get("result"),
            "sha": head_sha,
            "url": gg.get("url") or "",
        }
    )
    gg_api = classify_job(GG_API_JOB, jobs, head_sha)
    if run_event == "push":
        required.append(gg_api)
        report["gitguardian"]["exact_sha_api"] = gg_api.get("result")
    else:
        if gg_api.get("result") == "SKIPPED":
            report["gitguardian"]["exact_sha_api"] = "SKIPPED_OK_ON_PR"
        elif gg_api.get("result") == "MISSING":
            report["gitguardian"]["exact_sha_api"] = "NOT_REQUIRED_ON_PR"
        else:
            report["gitguardian"]["exact_sha_api"] = gg_api.get("result")
            if gg_api.get("result") not in {"SUCCESS", "MISSING", "SKIPPED", "NOT_REQUIRED_ON_PR"}:
                hold(report, "GitGuardian exact-SHA API scan is not success on unexpected event", material=True)
    report["required_checks"] = required
    report["gitguardian"]["native"] = gg.get("result")

    pending = [row for row in required if row.get("result") == "PENDING"]
    missing = [row for row in required if row.get("result") in {"MISSING", "SHA_MISMATCH", "AMBIGUOUS"}]
    failed = [
        row
        for row in required
        if row.get("result")
        not in {"SUCCESS", "PENDING", "MISSING", "NOT_REQUIRED_ON_PR", "SKIPPED_OK_ON_PR"}
    ]
    if gg.get("result") not in {"SUCCESS", "PENDING", "MISSING"}:
        report["material_blocker"] = True
    if any(row.get("name") == GG_CHECK_NAME and row.get("result") not in {"SUCCESS", "PENDING", "MISSING"} for row in required):
        report["material_blocker"] = True

    if report["state"] == "HOLD" and report["review_evidence"] == "SPOOFED":
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)

    if pending:
        report["state"] = "REVIEW_IN_PROGRESS"
        report["hold_reason"] = "required checks are still pending"
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    if missing or failed or gg.get("result") != "SUCCESS":
        reason = "required exact-SHA CI/GitGuardian is missing, stale, or not SUCCESS"
        if gg.get("result") not in {"SUCCESS", "PENDING"}:
            report["material_blocker"] = True
        hold(report, reason, material=report["material_blocker"])
        if report["review_evidence"] == "REVIEW_EVIDENCE_MISSING":
            report["hold_reason"] = f"{reason}; REVIEW_EVIDENCE_MISSING"
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    if report["review_evidence"] != "AUTHENTIC":
        hold(report, "REVIEW_EVIDENCE_MISSING")
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    if report.get("mergeable") is not True or report.get("merge_state_status") not in CLEAN_MERGE_STATES:
        hold(report, "GitHub mergeability is missing, ambiguous, or not clean")
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)

    report["state"] = "READY_FOR_OWNER_MERGE_DECISION"
    report["hold_reason"] = "exact-SHA CI, GitGuardian, and independent reviews are green; owner merge authorization is still required"
    report["owner_choices"] = owner_choices_for(report["state"])
    return finish(report, fingerprints)


def live_disabled_gate_hold(repo: str, sha: str) -> dict[str, Any]:
    result = {"verified": False, "source_type": "MISSING", "run_id": None, "url": ""}
    try:
        runs = paginate(
            f"/repos/{repo}/actions/workflows/deploy.yml/runs?head_sha={sha}",
            "workflow_runs",
            "deploy runs",
        )
    except SystemExit:
        result["source_type"] = "API_ERROR"
        return result
    for raw in runs:
        obj = prod.require_dict(raw, "deploy run")
        if norm_sha(obj.get("head_sha")) != sha:
            continue
        if obj.get("status") != "completed":
            continue
        try:
            _run, jobs = jobs_for_run(repo, obj.get("id"))
        except SystemExit:
            continue
        pre = next((job for job in jobs if job.get("name") == PREDEPLOY_JOB), None)
        deploy = next((job for job in jobs if job.get("name") == DEPLOY_JOB), None)
        if not pre or str(pre.get("conclusion") or "") != "failure":
            continue
        deploy_conclusion = str((deploy or {}).get("conclusion") or "")
        if deploy_conclusion and deploy_conclusion != "skipped":
            continue
        result.update(
            {
                "verified": True,
                "source_type": "LIVE",
                "run_id": obj.get("id"),
                "url": str(obj.get("html_url") or ""),
            }
        )
        return result
    return result


def find_open_pr_for_sha(repo: str, sha: str) -> int | None:
    if not is_full_sha(sha):
        return None
    rows = paginate(f"/repos/{repo}/commits/{sha}/pulls", None, "commit pulls")
    found: list[int] = []
    for raw in rows:
        obj = prod.require_dict(raw, "associated PR")
        base = obj.get("base") if isinstance(obj.get("base"), dict) else {}
        if base.get("ref") != "main":
            continue
        if obj.get("merged") is True or str(obj.get("state") or "") == "closed":
            continue
        head = obj.get("head") if isinstance(obj.get("head"), dict) else {}
        if is_full_sha(head.get("sha")) and norm_sha(head.get("sha")) != sha:
            continue
        number = obj.get("number")
        if isinstance(number, int):
            found.append(number)
    unique = sorted(set(found))
    if len(unique) > 1:
        raise RuntimeError("ambiguous open PRs for SHA")
    if unique:
        return unique[0]
    return None


def live_acceptance(repo: str, sha: str) -> dict[str, Any]:
    _ = repo
    path = os.environ.get("UAT_READINESS_LIVE_ACCEPTANCE")
    if not path or not os.path.isfile(path):
        return {"accepted": False, "reason": "live acceptance evidence missing"}
    try:
        payload = json.loads(open(path, encoding="utf-8").read())
    except (OSError, json.JSONDecodeError):
        return {"accepted": False, "reason": "live acceptance evidence unreadable"}
    if not isinstance(payload, dict):
        return {"accepted": False, "reason": "live acceptance evidence invalid"}
    if payload.get("evidence_class") != "LIVE":
        return {"accepted": False, "reason": "CI_CONTRACT is not live acceptance"}
    if norm_sha(payload.get("accepted_sha")) != sha:
        return {"accepted": False, "reason": "live accepted SHA mismatch"}
    if payload.get("public_ready") is not True:
        return {"accepted": False, "reason": "public /ready is not proven"}
    if payload.get("required_playwright_pass") is not True:
        return {"accepted": False, "reason": "required Playwright coverage is not proven"}
    if payload.get("uat_deployed") is not True:
        return {"accepted": False, "reason": "live deploy is not proven"}
    return {"accepted": True, "reason": "live acceptance present"}


def evaluate_main(repo: str, sha: str) -> dict[str, Any]:
    report = base_report(mode="main", merge_commit_sha=sha, head_sha=sha, evidence_class="CI_CONTRACT")
    if not is_full_sha(sha):
        hold(report, "main SHA is not a 40-character hexadecimal value", material=True)
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report)
    sha = norm_sha(sha)
    report["head_sha"] = sha
    report["merge_commit_sha"] = sha
    try:
        associated = prod.associated_prs(repo, sha)
    except SystemExit:
        associated = []
    pr_number = None
    reviewed_sha = sha
    comments: list[dict[str, Any]] = []
    if len(associated) == 1:
        pr_number = associated[0].get("number")
        report["pr_number"] = pr_number
        head = associated[0].get("head") if isinstance(associated[0].get("head"), dict) else {}
        if is_full_sha(head.get("sha")):
            reviewed_sha = norm_sha(head.get("sha"))
        if isinstance(pr_number, int):
            try:
                pr = prod.require_dict(fetch_json(f"/repos/{repo}/pulls/{pr_number}"), "hydrated PR")
                head = pr.get("head") if isinstance(pr.get("head"), dict) else {}
                base = pr.get("base") if isinstance(pr.get("base"), dict) else {}
                report["base_sha"] = norm_sha(base.get("sha"))
                if is_full_sha(head.get("sha")):
                    reviewed_sha = norm_sha(head.get("sha"))
                comments = collect_pr_comments(repo, pr_number)
                author = ""
                user = pr.get("user") if isinstance(pr.get("user"), dict) else {}
                author = str(user.get("login") or "")
                comment_reviews, review_risks = collect_reviews(
                    comments, reviewed_sha, author, str(pr.get("body") or "")
                )
                app_reviews, app_risks = collect_app_reviews(repo, reviewed_sha)
                reviews, merge_risks = merge_review_sources(comment_reviews, app_reviews)
                report["reviews"] = reviews
                report["risks"].extend(review_risks)
                report["risks"].extend(app_risks)
                report["risks"].extend(merge_risks)
                if reviews_pass(reviews):
                    report["review_evidence"] = "AUTHENTIC"
            except SystemExit:
                report["api_error"] = "associated PR hydrate failed closed"

    fingerprints = previous_notice_fingerprints(comments)
    ci_run = newest_ci_run_for_sha(repo, sha, event="push")
    if ci_run is None:
        report["state"] = "MERGED_MAIN_CHECKS_PENDING"
        report["hold_reason"] = "push-main CI is not yet available on the merge SHA"
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    run, jobs = jobs_for_run(repo, ci_run.get("id"))
    if run.get("head_branch") != "main":
        hold(report, "push CI head_branch is not main", material=True)
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    required = [classify_job(name, jobs, sha) for name in MAIN_REQUIRED_JOBS]
    gg = native_gitguardian(repo, reviewed_sha if reviewed_sha != sha else sha)
    if reviewed_sha != sha:
        gg_merge = native_gitguardian(repo, sha)
        report["gitguardian"]["native_merge"] = gg_merge.get("result")
    required_gg_api = next((row for row in required if row["name"] == GG_API_JOB), None)
    report["required_checks"] = required
    report["gitguardian"]["native"] = gg.get("result")
    report["gitguardian"]["exact_sha_api"] = (required_gg_api or {}).get("result") or "MISSING"
    report["check_urls"].append(str(run.get("html_url") or ""))

    pending = [row for row in required if row.get("result") == "PENDING"]
    bad = [row for row in required if row.get("result") != "SUCCESS"]
    if pending:
        report["state"] = "MERGED_MAIN_CHECKS_PENDING"
        report["hold_reason"] = "push-main required checks are pending"
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    if bad or gg.get("result") != "SUCCESS":
        hold(
            report,
            "push-main exact-SHA CI/GitGuardian is missing, skipped, or not SUCCESS",
            material=True,
        )
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)
    if report["review_evidence"] != "AUTHENTIC":
        hold(report, "REVIEW_EVIDENCE_MISSING")
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report, fingerprints)

    report["state"] = "MERGED_MAIN_CHECKS_PASS"
    hold_evidence = live_disabled_gate_hold(repo, sha)
    if hold_evidence.get("verified"):
        report["state"] = "UAT_DISABLED_GATE_HOLD_VERIFIED"
        report["attestation_matrix"]["live_enabled_deployment"] = "DISABLED_GATE_HOLD_VERIFIED"
        report["check_urls"].append(hold_evidence.get("url") or "")
        report["state"] = "READY_FOR_OWNER_UAT_COMMISSIONING_DECISION"
        report["hold_reason"] = (
            "main checks passed and live disabled-gate HOLD is verified; "
            "owner commissioning authorization is still required"
        )
    else:
        report["state"] = "UAT_ACTIVATION_HOLD"
        report["hold_reason"] = (
            "main checks passed but live disabled-gate HOLD is not verified; "
            "CI_CONTRACT is not LIVE evidence"
        )
    acceptance = live_acceptance(repo, sha)
    if acceptance.get("accepted"):
        report["state"] = "UAT_ACCEPTED"
        report["evidence_class"] = "LIVE"
        report["source_type"] = "LIVE"
        report["hold_reason"] = "live deployment and required acceptance evidence are present"
        report["attestation_matrix"]["live_enabled_deployment"] = "VERIFIED"
        report["attestation_matrix"]["required_playwright_coverage"] = "VERIFIED"
        report["attestation_matrix"]["public_ready"] = "VERIFIED"
        report["attestation_matrix"]["host_accepted_sha"] = "VERIFIED"
        report["predeploy_ok"] = False
    else:
        report["predeploy_ok"] = report["state"] in {
            "MERGED_MAIN_CHECKS_PASS",
            "UAT_DISABLED_GATE_HOLD_VERIFIED",
            "UAT_ACTIVATION_HOLD",
            "READY_FOR_OWNER_UAT_COMMISSIONING_DECISION",
        }
    report["owner_choices"] = owner_choices_for(report["state"])
    return finish(report, fingerprints)


def evaluate_predeploy(repo: str, sha: str) -> dict[str, Any]:
    report = evaluate_main(repo, sha)
    report["mode"] = "predeploy"
    gate_active = os.environ.get("UAT_DEPLOY_GATE_ACTIVE") == "true"
    report["uat_deploy_gate_active"] = gate_active
    if not report.get("predeploy_ok"):
        if report.get("state") != "UAT_ACCEPTED":
            hold(
                report,
                report.get("hold_reason") or "readiness is not predeploy eligible",
                material=report.get("material_blocker") is True,
                stale=report.get("stale") is True,
            )
        report["predeploy_ok"] = False
    if report.get("stale"):
        report["predeploy_ok"] = False
    if contains_secret(report):
        raise RuntimeError("predeploy readiness report attempted to persist a secret-like value")
    return report


def evaluate_reconcile(repo: str) -> dict[str, Any]:
    pulls = paginate(f"/repos/{repo}/pulls?state=open&base=main", None, "open pulls")
    reports: list[dict[str, Any]] = []
    for raw in pulls:
        pr = prod.require_dict(raw, "open PR")
        number = pr.get("number")
        if not isinstance(number, int):
            continue
        try:
            files = [
                prod.require_dict(row, "pr file")
                for row in paginate(f"/repos/{repo}/pulls/{number}/files", None, "pr files")
            ]
        except SystemExit:
            failed = base_report(mode="pr", pr_number=number)
            hold(failed, "GitHub API failed closed while listing PR files", material=True)
            reports.append(finish(failed))
            continue
        if not is_uat_candidate(pr, files):
            continue
        reports.append(evaluate_pr(repo, number))
    summary = base_report(mode="reconcile", state="HOLD")
    summary["reports"] = reports
    notifier = next((row for row in reports if row.get("should_notify")), None)
    if notifier:
        summary["pr_number"] = notifier.get("pr_number")
        summary["head_sha"] = notifier.get("head_sha")
        summary["base_sha"] = notifier.get("base_sha")
        summary["state"] = notifier.get("state") or "HOLD"
        summary["material_blocker"] = bool(notifier.get("material_blocker"))
        summary["hold_reason"] = notifier.get("hold_reason") or ""
    elif any(row.get("state") == "READY_FOR_OWNER_MERGE_DECISION" for row in reports):
        summary["state"] = "READY_FOR_OWNER_MERGE_DECISION"
    elif reports:
        summary["state"] = reports[0].get("state") or "HOLD"
    else:
        summary["state"] = "NOT_UAT_CANDIDATE"
        summary["hold_reason"] = "no open UAT candidate PRs"
    summary["owner_choices"] = owner_choices_for(str(summary["state"]))
    return finish(summary)


def evaluate(mode: str, **kwargs: Any) -> dict[str, Any]:
    repo = os.environ.get("GITHUB_REPOSITORY") or "fad16papa/Cohestra"
    try:
        if mode == "pr":
            return evaluate_pr(repo, int(kwargs["pr_number"]), kwargs.get("head_sha") or "", kwargs.get("base_sha") or "")
        if mode in {"main", "predeploy"}:
            sha = str(kwargs.get("sha") or "")
            open_pr = find_open_pr_for_sha(repo, sha)
            if open_pr is not None:
                return evaluate_pr(repo, open_pr, sha, kwargs.get("base_sha") or "")
            if mode == "main":
                return evaluate_main(repo, sha)
            return evaluate_predeploy(repo, sha)
        if mode == "reconcile":
            return evaluate_reconcile(repo)
        report = base_report(mode=mode)
        return finish(hold(report, f"unsupported readiness mode {mode}", material=True))
    except SystemExit:
        report = base_report(mode=mode, pr_number=kwargs.get("pr_number"), head_sha=norm_sha(kwargs.get("head_sha") or kwargs.get("sha") or ""))
        report["api_error"] = "GitHub API failed closed"
        hold(report, "GitHub API failed closed", material=True)
        report["owner_choices"] = owner_choices_for(report["state"])
        return finish(report)
    except Exception as exc:  # noqa: BLE001 — fail closed to a sanitized HOLD report
        report = base_report(mode=mode, pr_number=kwargs.get("pr_number"), head_sha=norm_sha(kwargs.get("head_sha") or kwargs.get("sha") or ""))
        report["api_error"] = "evaluator failed closed"
        hold(report, "readiness evaluator failed closed", material=True)
        report["owner_choices"] = owner_choices_for(report["state"])
        report["risks"].append(sanitize_text(type(exc).__name__))
        return finish(report)


def write_outputs(report: dict[str, Any], directory: str) -> None:
    os.makedirs(directory, exist_ok=True)
    json_path = os.path.join(directory, "uat-readiness.json")
    md_path = os.path.join(directory, "uat-readiness.md")
    notice_path = os.path.join(directory, "uat-readiness-notice.json")
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
        fh.write("\n")
    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write(render_markdown(report))
    notice = {
        "should_notify": bool(report.get("should_notify")),
        "fingerprint": report.get("dedup_fingerprint"),
        "state": report.get("state"),
        "pr_number": report.get("pr_number"),
        "head_sha": report.get("head_sha"),
        "body": report.get("notice_body") or "",
        "owner_authorization_claimed": False,
    }
    if contains_secret(notice) or contains_secret(report):
        raise RuntimeError("refusing to write secret-like readiness output")
    with open(notice_path, "w", encoding="utf-8") as fh:
        json.dump(notice, fh, indent=2)
        fh.write("\n")


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    mode = os.environ.get("UAT_READINESS_MODE") or "pr"
    pr_number = os.environ.get("UAT_READINESS_PR") or os.environ.get("PR_NUMBER") or ""
    sha = os.environ.get("UAT_READINESS_SHA") or os.environ.get("CANDIDATE_SHA") or ""
    head_sha = os.environ.get("UAT_READINESS_HEAD_SHA") or os.environ.get("PR_HEAD_SHA") or sha
    base_sha = os.environ.get("UAT_READINESS_BASE_SHA") or os.environ.get("PR_BASE_SHA") or ""
    out_dir = os.environ.get("UAT_READINESS_OUT_DIR") or os.environ.get("UAT_GATE_EVIDENCE_DIR") or "artifacts"
    i = 0
    while i < len(args):
        if args[i] == "--mode" and i + 1 < len(args):
            mode = args[i + 1]
            i += 2
            continue
        if args[i] == "--pr" and i + 1 < len(args):
            pr_number = args[i + 1]
            i += 2
            continue
        if args[i] == "--sha" and i + 1 < len(args):
            sha = args[i + 1]
            i += 2
            continue
        if args[i] == "--head" and i + 1 < len(args):
            head_sha = args[i + 1]
            i += 2
            continue
        if args[i] == "--base" and i + 1 < len(args):
            base_sha = args[i + 1]
            i += 2
            continue
        if args[i] == "--out" and i + 1 < len(args):
            out_dir = args[i + 1]
            i += 2
            continue
        i += 1
    kwargs: dict[str, Any] = {"sha": sha, "head_sha": head_sha, "base_sha": base_sha}
    if pr_number:
        kwargs["pr_number"] = int(pr_number)
    report = evaluate(mode, **kwargs)
    write_outputs(report, out_dir)
    print(f"READINESS_STATE={report.get('state')}")
    print(f"READINESS_PREDEPLOY_OK={str(report.get('predeploy_ok')).lower()}")
    print(f"READINESS_SHOULD_NOTIFY={str(report.get('should_notify')).lower()}")
    print(f"READINESS_FINGERPRINT={report.get('dedup_fingerprint')}")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as fh:
            fh.write(f"state={report.get('state')}\n")
            fh.write(f"predeploy_ok={str(report.get('predeploy_ok')).lower()}\n")
            fh.write(f"should_notify={str(report.get('should_notify')).lower()}\n")
            fh.write(f"fingerprint={report.get('dedup_fingerprint')}\n")
            if report.get("pr_number") is not None:
                fh.write(f"pr_number={report.get('pr_number')}\n")
            fh.write(f"head_sha={report.get('head_sha')}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
