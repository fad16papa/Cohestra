#!/usr/bin/env bash
# Build or evaluate acceptance-summary.json. Never prints secret values.
#
#   bash deploy/uat-acceptance-summary.sh [OUT]
#   bash deploy/uat-acceptance-summary.sh --evaluate FILE.json
#
# Required summary sections:
#   story, sha, deployment, runtime, browser, security, provider, tests, result
# Missing required section => result=fail. Never a fake PASS.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVALUATE=""
OUT="${ROOT_DIR}/artifacts/acceptance-summary.json"

if [[ "${1:-}" == "--evaluate" ]]; then
  EVALUATE="${2:-}"
  if [[ -z "$EVALUATE" ]]; then
    echo "REFUSE: --evaluate requires a file path" >&2
    exit 2
  fi
else
  OUT="${1:-$OUT}"
fi

mkdir -p "$(dirname "${EVALUATE:-$OUT}")"

python3 - "$ROOT_DIR" "$OUT" "$EVALUATE" \
  "${TARGET_SHA:-}" \
  "${ACCEPTANCE_STORY:-epic-45}" \
  "${UAT_ACCEPTANCE_JSON:-}" \
  "${UAT_PUBLIC_SMOKE_JSON:-}" \
  "${UAT_DISPATCH_JSON:-}" \
  "${UAT_PLAYWRIGHT_JSON:-}" <<'PY'
import json, os, pathlib, re, sys
from datetime import datetime, timezone

(
    root,
    out_path,
    evaluate_path,
    target_sha,
    story,
    acceptance_override,
    smoke_override,
    dispatch_override,
    playwright_override,
) = sys.argv[1:10]

REQUIRED = (
    "story",
    "sha",
    "deployment",
    "runtime",
    "browser",
    "security",
    "provider",
    "tests",
    "result",
)

SECRET_MARKERS = (
    "BEGIN OPENSSH PRIVATE KEY",
    "BEGIN RSA PRIVATE KEY",
    "-----BEGIN",
    "PRIVATE KEY",
)

SECRET_VALUE_RE = re.compile(
    r"(?i)(pdl_live_|sk_live_|whsec_|SG\.[A-Za-z0-9_-]{10,}|-----BEGIN)"
)


def refuse(msg: str) -> None:
    print(f"REFUSE: {msg}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: pathlib.Path | None) -> dict | None:
    if path is None or not path.is_file():
        return None
    text = path.read_text(encoding="utf-8")
    for needle in SECRET_MARKERS:
        if needle in text:
            refuse(f"input {path.name} looks like key material")
    if SECRET_VALUE_RE.search(text):
        refuse(f"input {path.name} contains a secret-like value")
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        refuse(f"input {path.name} is not JSON")
    if not isinstance(payload, dict):
        refuse(f"input {path.name} is not a JSON object")
    return payload


def first_existing(candidates: list[pathlib.Path]) -> pathlib.Path | None:
    for path in candidates:
        if path.is_file():
            return path
    return None


def find_named(name: str, extra: list[pathlib.Path] | None = None) -> pathlib.Path | None:
    cwd = pathlib.Path.cwd()
    root_path = pathlib.Path(root)
    candidates = list(extra or [])
    candidates.extend(
        [
            root_path / "artifacts" / name,
            cwd / "artifacts" / name,
            root_path / "artifacts" / "artifacts" / name,
            cwd / "artifacts" / "artifacts" / name,
            root_path / name,
            cwd / name,
        ]
    )
    return first_existing(candidates)


def find_playwright(override: str) -> pathlib.Path | None:
    if override:
        path = pathlib.Path(override)
        return path if path.is_file() else None
    cwd = pathlib.Path.cwd()
    root_path = pathlib.Path(root)
    return first_existing(
        [
            root_path / "web" / "test-results" / "uat-playwright.json",
            cwd / "web" / "test-results" / "uat-playwright.json",
            root_path / "test-results" / "uat-playwright.json",
            cwd / "test-results" / "uat-playwright.json",
            root_path / "artifacts" / "uat-playwright.json",
            cwd / "artifacts" / "uat-playwright.json",
        ]
    )


def empty_section(reason: str) -> dict:
    return {"available": False, "result": "fail", "reason": reason}


def section_present(value) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, dict):
        return len(value) > 0
    return True


def evaluate(payload: dict) -> list[str]:
    failures: list[str] = []
    if not isinstance(payload, dict):
        return ["summary_not_object"]
    for key in REQUIRED:
        if key not in payload or not section_present(payload.get(key)):
            failures.append(f"missing_section:{key}")
    result = payload.get("result")
    if result not in {"pass", "fail", "owner_gate"}:
        failures.append("invalid_result")
    if result == "pass" and any(item.startswith("missing_section:") for item in failures):
        failures.append("fake_pass")
    return failures


def playwright_stats(raw: dict | None) -> dict:
    if not raw:
        return empty_section("missing_playwright_artifact")
    stats = raw.get("stats") if isinstance(raw.get("stats"), dict) else {}
    expected = int(stats.get("expected") or 0)
    skipped = int(stats.get("skipped") or 0)
    unexpected = int(stats.get("unexpected") or 0)
    flaky = int(stats.get("flaky") or 0)
    result = "pass" if unexpected == 0 and expected > 0 else "fail"
    return {
        "available": True,
        "result": result,
        "expected": expected,
        "skipped": skipped,
        "unexpected": unexpected,
        "flaky": flaky,
        "viewports": ["1440x900", "390x844"],
        "authenticatedSkipped": skipped > 0,
        "artifacts": ["web/test-results/uat-playwright.json"],
    }


def build() -> dict:
    acceptance_path = pathlib.Path(acceptance_override) if acceptance_override else find_named("uat-acceptance.json")
    smoke_path = pathlib.Path(smoke_override) if smoke_override else find_named("uat-public-smoke.json")
    dispatch_path = pathlib.Path(dispatch_override) if dispatch_override else find_named("uat-deploy-dispatch.json")
    playwright_path = find_playwright(playwright_override)

    acceptance = load_json(acceptance_path)
    smoke = load_json(smoke_path)
    dispatch = load_json(dispatch_path)
    playwright = load_json(playwright_path)

    failures: list[str] = []
    sha = str((acceptance or {}).get("sha") or (dispatch or {}).get("sha") or target_sha or "").strip().lower()
    if sha and not re.fullmatch(r"[0-9a-f]{40}", sha):
        sha = ""
        failures.append("sha_invalid")
    if not sha:
        failures.append("sha_missing")

    bound = target_sha.strip().lower()
    if bound and sha and bound != sha:
        failures.append("sha_mismatch")
    dispatch_sha = str((dispatch or {}).get("sha") or "").strip().lower()
    if bound and dispatch_sha and dispatch_sha != bound:
        failures.append("dispatch_sha_mismatch")

    if acceptance is None:
        failures.append("missing_artifact:uat-acceptance.json")
        deployment = empty_section("missing_acceptance_artifact")
        runtime = empty_section("missing_acceptance_artifact")
        security = empty_section("missing_acceptance_artifact")
        provider = empty_section("missing_acceptance_artifact")
    else:
        acc_result = acceptance.get("result")
        if acc_result != "pass":
            failures.append(f"host_acceptance:{acc_result}")
        deployment = {
            "available": True,
            "targetSha": bound or sha,
            "dispatchSha": (dispatch or {}).get("sha"),
            "acceptanceSha": acceptance.get("sha"),
            "apiGitSha": ((acceptance.get("runtime") or {}).get("apiGitSha")),
            "shaMatch": ((acceptance.get("deployment") or {}).get("shaMatch")),
            "dispatchResult": (dispatch or {}).get("result"),
            "artifacts": [
                "artifacts/uat-deploy-dispatch.json",
                "artifacts/uat-acceptance.json",
            ],
        }
        runtime = {
            "available": True,
            "compose": ((acceptance.get("runtime") or {}).get("compose")),
            "ready": ((acceptance.get("runtime") or {}).get("ready")),
            "https": ((acceptance.get("runtime") or {}).get("https")),
            "sharedCrm": ((acceptance.get("runtime") or {}).get("sharedCrm")),
            "publicSmoke": (smoke or {}).get("result"),
            "artifacts": [
                "artifacts/uat-acceptance.json",
                "artifacts/uat-public-smoke.json",
            ],
        }
        security = acceptance.get("security") or empty_section("missing_security_section")
        provider = acceptance.get("provider") or empty_section("missing_provider_section")
        if not section_present(security):
            failures.append("missing_section:security")
        if not section_present(provider):
            failures.append("missing_section:provider")

    if dispatch is None:
        failures.append("missing_artifact:uat-deploy-dispatch.json")
    elif dispatch.get("result") not in {"dispatched", "pass"}:
        failures.append(f"dispatch:{dispatch.get('result')}")

    if smoke is None:
        failures.append("missing_artifact:uat-public-smoke.json")
        smoke_result = "fail"
    else:
        smoke_result = smoke.get("result")
        if smoke_result != "pass":
            failures.append(f"public_smoke:{smoke_result}")

    browser = playwright_stats(playwright)
    if browser.get("result") != "pass":
        failures.append(f"browser:{browser.get('reason') or browser.get('result')}")

    tests = {
        "hostAcceptance": (acceptance or {}).get("result") or "missing",
        "publicSmoke": smoke_result,
        "browser": browser.get("result"),
        "anonymousExpected": browser.get("expected"),
        "authenticatedSkipped": browser.get("skipped"),
        "artifacts": [
            "artifacts/uat-acceptance.json",
            "artifacts/uat-public-smoke.json",
            "web/test-results/uat-playwright.json",
        ],
    }

    payload = {
        "story": story,
        "sha": sha or None,
        "recordedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "result": "fail" if failures else "pass",
        "failures": failures,
        "deployment": deployment,
        "runtime": runtime,
        "browser": browser,
        "security": security,
        "provider": provider,
        "tests": tests,
    }

    eval_failures = evaluate(payload)
    for item in eval_failures:
        if item not in payload["failures"]:
            payload["failures"].append(item)
    if payload["failures"]:
        payload["result"] = "fail"
        if "fake_pass" in payload["failures"]:
            refuse("summary claimed pass while required sections are missing")

    return payload


if evaluate_path:
    path = pathlib.Path(evaluate_path)
    if not path.is_file():
        refuse("evaluate file is missing")
    payload = load_json(path)
    if payload is None:
        refuse("evaluate file is not a JSON object")
    eval_failures = evaluate(payload)
    if eval_failures:
        print("UAT_ACCEPTANCE_SUMMARY_RESULT=fail")
        print("UAT_ACCEPTANCE_SUMMARY_FAILURES=" + ",".join(eval_failures))
        if payload.get("result") == "pass" and any(
            item.startswith("missing_section:") or item == "fake_pass" for item in eval_failures
        ):
            refuse("summary claimed pass while required sections are missing")
        raise SystemExit(1)
    print(f"evaluated {path}")
    print(f"UAT_ACCEPTANCE_SUMMARY_RESULT={payload.get('result')}")
    if payload.get("result") != "pass":
        raise SystemExit(1)
    raise SystemExit(0)

payload = build()
text = json.dumps(payload, indent=2) + "\n"
for needle in SECRET_MARKERS:
    if needle in text:
        refuse("summary would include key material")
if SECRET_VALUE_RE.search(text):
    refuse("summary would include a secret-like value")

pathlib.Path(out_path).write_text(text, encoding="utf-8")
print(f"wrote {out_path}")
print(f"UAT_ACCEPTANCE_SUMMARY_RESULT={payload['result']}")
if payload["failures"]:
    print("UAT_ACCEPTANCE_SUMMARY_FAILURES=" + ",".join(payload["failures"]))
if payload["result"] != "pass":
    raise SystemExit(1)
PY
