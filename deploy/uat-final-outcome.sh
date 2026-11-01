#!/usr/bin/env bash
# Aggregate final UAT delivery outcome from trustworthy evidence files.
# Post-deploy failure is DEPLOYED_REJECTED, never "no deployment occurred".
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
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"RESULT={payload['result']}")
    print(f"UAT_DEPLOYMENT_OUTCOME={code}")
    print(f"DIAGNOSTICS={diagnostics}")
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
    for path in candidates:
        if not path.is_file():
            continue
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
        return obj
    return None


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
        "ssh_executed": False,
        "host_acceptance": "missing",
        "smoke": "missing",
        "browser": "missing",
        "lifecycle": "missing",
        "uat_deployed": False,
        "uat_deployment_outcome": "MISSING_EVIDENCE",
        "diagnostics": "",
        "run_links": run_links,
        "agent_policy": (
            "Investigate and prepare fixes on a development branch only. "
            "Do not autonomously merge, change release controls, or retry indefinitely."
        ),
    }


pre = load("uat-predeploy-gate.json")
status = load("uat-delivery-status.json")
dispatch = load("uat-deploy-dispatch.json")
acceptance = load("uat-acceptance.json")
smoke = load("uat-public-smoke.json")
browser = load(
    "uat-playwright.json",
    extra=[
        evidence_dir / "web" / "test-results" / "uat-playwright.json",
        evidence_dir / "test-results" / "uat-playwright.json",
    ],
)
lifecycle = load("19-5-lifecycle.json")
summary = load("acceptance-summary.json")

payload = base_payload()
if not any((pre, status, dispatch, acceptance, smoke, browser, lifecycle, summary)):
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

ssh = False
if isinstance(dispatch, dict) and str(dispatch.get("result") or "").lower() == "dispatched":
    ssh = True
if isinstance(acceptance, dict):
    dep = acceptance.get("deployment") if isinstance(acceptance.get("deployment"), dict) else {}
    if dep.get("shaMatch") is True:
        ssh = True
if isinstance(summary, dict):
    dep = summary.get("deployment") if isinstance(summary.get("deployment"), dict) else {}
    if str(dep.get("dispatchResult") or "").lower() == "dispatched":
        ssh = True

payload["ssh_executed"] = ssh
payload["host_acceptance"] = section_result(acceptance, "result")
payload["smoke"] = section_result(smoke, "result")
payload["browser"] = playwright_result(browser)
payload["lifecycle"] = section_result(lifecycle, "result")
if ssh:
    payload["deployed_sha"] = payload["candidate_sha"]
    payload["uat_deployed"] = True
    payload["deployment_phase"] = "EXECUTED"
else:
    payload["uat_deployed"] = False
    payload["deployment_phase"] = "NOT_STARTED"

if not ssh and eligibility in {"HOLD", "REFUSE"}:
    payload["uat_deployment_outcome"] = "HELD" if eligibility == "HOLD" else "REFUSED"
    payload["diagnostics"] = str((pre or {}).get("reason") or (status or {}).get("diagnostics") or "predeploy gate held")
    payload["result"] = "HOLD"
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("RESULT=HOLD")
    print(f"UAT_DEPLOYMENT_OUTCOME={payload['uat_deployment_outcome']}")
    print("UAT_DEPLOYED=false")
    print("SSH_EXECUTED=false")
    raise SystemExit(0)

if not ssh:
    refuse("INCOMPLETE", "final outcome has no SSH/dispatch evidence", payload)

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
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("RESULT=HOLD")
    print("UAT_DEPLOYMENT_OUTCOME=INCOMPLETE")
    print("UAT_DEPLOYED=true")
    print("SSH_EXECUTED=true")
    raise SystemExit(1)

if failures:
    payload["uat_deployment_outcome"] = "DEPLOYED_REJECTED"
    payload["diagnostics"] = ";".join(failures)
    payload["result"] = "HOLD"
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("RESULT=HOLD")
    print("UAT_DEPLOYMENT_OUTCOME=DEPLOYED_REJECTED")
    print("UAT_DEPLOYED=true")
    print("SSH_EXECUTED=true")
    raise SystemExit(1)

payload["uat_deployment_outcome"] = "DEPLOYED_ACCEPTED"
payload["diagnostics"] = "SSH executed; host, smoke, browser, and lifecycle evidence passed"
payload["result"] = "PASS"
out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print("RESULT=PASS")
print("UAT_DEPLOYMENT_OUTCOME=DEPLOYED_ACCEPTED")
print("UAT_DEPLOYED=true")
print("SSH_EXECUTED=true")
PY
