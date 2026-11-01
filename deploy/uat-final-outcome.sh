#!/usr/bin/env bash
# Aggregate final UAT delivery outcome from trustworthy evidence files.
# Dispatch is attempt/intent only. Host SHA proof is required for uat_deployed=true.
# Confirmed deploy plus later test failure is DEPLOYED_REJECTED.
# Never prints tokens or secrets. Does not SSH.

set -euo pipefail

ROOT_DIR="${COHESTRA_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
EVIDENCE_DIR="${UAT_FINAL_OUTCOME_DIR:-${UAT_GATE_EVIDENCE_DIR:-$ROOT_DIR/artifacts}}"
mkdir -p "$EVIDENCE_DIR"
OUT_FILE="$EVIDENCE_DIR/uat-final-outcome.json"
TARGET_SHA="${TARGET_SHA:-${CANDIDATE_SHA:-}}"
TARGET_SHA="${TARGET_SHA,,}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-fad16papa/Cohestra}"
GITHUB_RUN_ID="${GITHUB_RUN_ID:-}"

python3 - "$EVIDENCE_DIR" "$OUT_FILE" "$TARGET_SHA" "$GITHUB_REPOSITORY" "$GITHUB_RUN_ID" <<'PY'
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

evidence_dir = Path(sys.argv[1])
out_path = Path(sys.argv[2])
target_sha = (sys.argv[3] or "").strip().lower()
repo = sys.argv[4]
run_id = sys.argv[5]

SECRET_MARKERS = (
    "BEGIN OPENSSH PRIVATE KEY",
    "BEGIN RSA PRIVATE KEY",
    "-----BEGIN",
    "PRIVATE KEY",
    "DROPLET_",
    "GITGUARDIAN_API_KEY=",
)


def refuse(code: str, diagnostics: str, payload: dict, exit_code: int = 1) -> None:
    payload["uat_deployment_outcome"] = code
    payload["diagnostics"] = diagnostics
    payload["result"] = "REFUSE" if code in {"INCONSISTENT", "MISSING_EVIDENCE"} else "HOLD"
    emit(payload, exit_code)


def emit(payload: dict, exit_code: int) -> None:
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    deployed = payload.get("uat_deployed")
    executed = payload.get("ssh_executed")
    print(f"RESULT={payload.get('result')}")
    print(f"UAT_DEPLOYMENT_OUTCOME={payload.get('uat_deployment_outcome')}")
    print(f"DIAGNOSTICS={payload.get('diagnostics')}")
    print("UAT_DEPLOYED=" + ("true" if deployed is True else "false" if deployed is False else "unknown"))
    print("SSH_EXECUTED=" + ("true" if executed is True else "false" if executed is False else "unknown"))
    print("SSH_ATTEMPTED=" + ("true" if payload.get("ssh_attempted") else "false"))
    raise SystemExit(exit_code)


def load(name: str, extra: list[Path] | None = None) -> dict | None:
    candidates = [evidence_dir / name]
    if extra:
        candidates.extend(extra)
    candidates.extend(
        [
            evidence_dir / "artifacts" / name,
            evidence_dir / "web" / "test-results" / name,
            Path.cwd() / "artifacts" / name,
        ]
    )
    seen: list[Path] = []
    objects: list[dict] = []
    for path in candidates:
        if not path.is_file():
            continue
        resolved = path.resolve()
        if resolved in seen:
            continue
        seen.append(resolved)
        text = path.read_text(encoding="utf-8")
        for needle in SECRET_MARKERS:
            if needle in text:
                refuse("REFUSED", f"secret-like material in {path.name}", base_payload())
        try:
            obj = json.loads(text)
        except json.JSONDecodeError:
            refuse("INCOMPLETE", f"{path.name} is not JSON", base_payload())
        if not isinstance(obj, dict):
            refuse("INCOMPLETE", f"{path.name} is not an object", base_payload())
        objects.append(obj)
    if not objects:
        return None
    if len({json.dumps(item, sort_keys=True) for item in objects}) > 1:
        refuse("INCONSISTENT", f"duplicate {name} artifacts disagree", base_payload())
    return objects[0]


def norm_sha(value: object) -> str:
    if not isinstance(value, str):
        return ""
    sha = value.strip().lower()
    return sha if re.fullmatch(r"[0-9a-f]{40}", sha) else ""


def section_result(raw: dict | None, *keys: str) -> str:
    if raw is None:
        return "missing"
    cur: object = raw
    for key in keys:
        if not isinstance(cur, dict) or key not in cur:
            return "missing"
        cur = cur[key]
    if isinstance(cur, str) and cur.strip():
        return cur.strip().lower()
    if cur is True:
        return "pass"
    if cur is False:
        return "fail"
    return "unknown"


def playwright_result(raw: dict | None) -> str:
    if raw is None:
        return "missing"
    stats = raw.get("stats") if isinstance(raw.get("stats"), dict) else {}
    unexpected = int(stats.get("unexpected") or 0)
    expected = int(stats.get("expected") or 0)
    if expected > 0 and unexpected == 0:
        return "pass"
    if expected == 0 and unexpected == 0 and not stats:
        return "unknown"
    return "fail"


def base_payload() -> dict:
    run_links = {}
    if run_id.isdigit() and repo:
        run_links["actions_run"] = f"https://github.com/{repo}/actions/runs/{run_id}"
    return {
        "phase": "final",
        "candidate_sha": target_sha,
        "deployed_sha": "",
        "eligibility": "UNKNOWN",
        "deployment_phase": "UNKNOWN",
        "ssh_attempted": False,
        "ssh_step_conclusion": "missing",
        "ssh_executed": None,
        "host_acceptance": "missing",
        "smoke": "missing",
        "browser": "missing",
        "lifecycle": "missing",
        "uat_deployed": None,
        "uat_deployment_outcome": "MISSING_EVIDENCE",
        "diagnostics": "",
        "run_links": run_links,
        "agent_policy": (
            "Investigate and prepare fixes on a development branch only. "
            "Do not autonomously merge, change release controls, or retry indefinitely."
        ),
    }


def json_bool(value: object) -> bool | None:
    if value is True:
        return True
    if value is False:
        return False
    return None


pre = load("uat-predeploy-gate.json")
status = load("uat-delivery-status.json")
dispatch = load("uat-deploy-dispatch.json")
ssh_step = load("uat-ssh-execution.json")
acceptance = load("uat-acceptance.json")
smoke = load("uat-public-smoke.json")
browser = load(
    "uat-playwright.json",
    extra=[
        evidence_dir / "web" / "test-results" / "uat-playwright.json",
        evidence_dir / "test-results" / "uat-playwright.json",
        Path.cwd() / "web" / "test-results" / "uat-playwright.json",
        Path.cwd() / "test-results" / "uat-playwright.json",
        Path.cwd() / "artifacts" / "uat-playwright.json",
    ],
)
lifecycle = load("19-5-lifecycle.json")
summary = load("acceptance-summary.json")

payload = base_payload()
if not any((pre, status, dispatch, ssh_step, acceptance, smoke, browser, lifecycle, summary)):
    refuse("MISSING_EVIDENCE", "no trustworthy UAT evidence files were present", payload)

eligibility = str((pre or {}).get("result") or (status or {}).get("eligibility") or "UNKNOWN").upper()
if eligibility in {"HOLD", "REFUSE", "PASS"}:
    payload["eligibility"] = eligibility

shas = []
for value in (
    target_sha,
    (pre or {}).get("candidate_sha"),
    (status or {}).get("candidate_sha"),
    (dispatch or {}).get("sha"),
    (ssh_step or {}).get("sha"),
    (acceptance or {}).get("sha"),
    ((acceptance or {}).get("runtime") or {}).get("apiGitSha") if isinstance((acceptance or {}).get("runtime"), dict) else "",
):
    sha = norm_sha(value)
    if sha:
        shas.append(sha)
if shas and len(set(shas)) > 1:
    refuse("INCONSISTENT", "evidence SHAs do not match the candidate", payload)
if shas:
    payload["candidate_sha"] = shas[0]

dispatch_attempted = isinstance(dispatch, dict) and str(dispatch.get("result") or "").lower() == "dispatched"
if isinstance(summary, dict):
    dep = summary.get("deployment") if isinstance(summary.get("deployment"), dict) else {}
    if str(dep.get("dispatchResult") or "").lower() == "dispatched":
        dispatch_attempted = True

ssh_conclusion = str((ssh_step or {}).get("conclusion") or "missing").strip().lower()
payload["ssh_step_conclusion"] = ssh_conclusion if ssh_step else "missing"
# A skipped SSH step is not an attempt. Dispatch remains intent/attempt.
payload["ssh_attempted"] = bool(
    dispatch_attempted or ssh_conclusion in {"success", "failure", "cancelled"}
)

host_sha = ""
sha_match = False
if isinstance(acceptance, dict):
    dep = acceptance.get("deployment") if isinstance(acceptance.get("deployment"), dict) else {}
    sha_match = dep.get("shaMatch") is True
    host_sha = norm_sha(acceptance.get("sha")) or norm_sha(
        ((acceptance.get("runtime") or {}).get("apiGitSha")) if isinstance(acceptance.get("runtime"), dict) else ""
    )
if isinstance(summary, dict) and not sha_match:
    dep = summary.get("deployment") if isinstance(summary.get("deployment"), dict) else {}
    sha_match = json_bool(dep.get("shaMatch")) is True
    host_sha = host_sha or norm_sha(summary.get("sha")) or norm_sha(dep.get("apiGitSha") or dep.get("acceptanceSha"))

host_proven = bool(sha_match and host_sha and (not payload["candidate_sha"] or host_sha == payload["candidate_sha"]))

# Dispatch is intent only. Do not invent ssh_executed or uat_deployed from it.
if host_proven:
    ssh_executed: bool | None = True
    uat_deployed: bool | None = True
    deployed_sha = host_sha
    phase = "EXECUTED"
elif ssh_conclusion == "success":
    ssh_executed = True
    uat_deployed = None
    deployed_sha = ""
    phase = "ATTEMPTED"
elif payload["ssh_attempted"]:
    ssh_executed = None
    uat_deployed = None
    deployed_sha = ""
    phase = "ATTEMPTED"
else:
    ssh_executed = False
    uat_deployed = False
    deployed_sha = ""
    phase = "NOT_STARTED"

payload["ssh_executed"] = ssh_executed
payload["uat_deployed"] = uat_deployed
payload["deployed_sha"] = deployed_sha
payload["deployment_phase"] = phase
payload["host_acceptance"] = section_result(acceptance, "result")
payload["smoke"] = section_result(smoke, "result")
payload["browser"] = playwright_result(browser)
payload["lifecycle"] = section_result(lifecycle, "result")

if not payload["ssh_attempted"] and eligibility in {"HOLD", "REFUSE"}:
    payload["uat_deployment_outcome"] = "HELD" if eligibility == "HOLD" else "REFUSED"
    payload["diagnostics"] = str((pre or {}).get("reason") or (status or {}).get("diagnostics") or "predeploy gate held")
    payload["result"] = "HOLD"
    emit(payload, 0)

if not host_proven:
    if ssh_conclusion == "success":
        payload["uat_deployment_outcome"] = "INCOMPLETE"
        payload["diagnostics"] = "SSH step succeeded; host accepted SHA is missing"
        payload["result"] = "HOLD"
        emit(payload, 1)
    if payload["ssh_attempted"]:
        payload["uat_deployment_outcome"] = "ATTEMPTED"
        payload["diagnostics"] = (
            "deploy dispatch or SSH step recorded without proven host SHA; "
            "host mutation is unknown"
        )
        payload["result"] = "HOLD"
        emit(payload, 1)
    refuse("INCOMPLETE", "final outcome has no proven SSH or host evidence", payload)

failures = []
for label, value in (
    ("host_acceptance", payload["host_acceptance"]),
    ("smoke", payload["smoke"]),
    ("browser", payload["browser"]),
    ("lifecycle", payload["lifecycle"]),
):
    if value == "missing":
        failures.append(f"missing:{label}")
    elif value not in {"pass", "ok", "success"}:
        failures.append(f"failed:{label}={value}")

if any(item.startswith("missing:") for item in failures):
    payload["uat_deployment_outcome"] = "INCOMPLETE"
    payload["diagnostics"] = ";".join(failures)
    payload["result"] = "HOLD"
    emit(payload, 1)

if failures:
    payload["uat_deployment_outcome"] = "DEPLOYED_REJECTED"
    payload["diagnostics"] = ";".join(failures)
    payload["result"] = "HOLD"
    emit(payload, 1)

payload["uat_deployment_outcome"] = "DEPLOYED_ACCEPTED"
payload["diagnostics"] = "Host accepted SHA; smoke, browser, and lifecycle evidence passed"
payload["result"] = "PASS"
emit(payload, 0)
PY
