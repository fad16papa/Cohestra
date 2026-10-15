#!/usr/bin/env bash
# Sanitized UAT acceptance probe. Never prints secret values.
#
#   bash deploy/uat-acceptance.sh                 # runtime + classify (droplet)
#   bash deploy/uat-acceptance.sh --classify-only # env/SHA classification only
#   bash deploy/uat-acceptance.sh --out FILE.json
#
# Writes JSON to --out (default artifacts/uat-acceptance.json).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CLASSIFY_ONLY=false
OUT="${UAT_ACCEPTANCE_OUT:-$ROOT_DIR/artifacts/uat-acceptance.json}"
ENV_FILE="${UAT_ACCEPTANCE_ENV:-}"
if [[ -z "$ENV_FILE" && -f "$ROOT_DIR/.env" ]]; then
  ENV_FILE="$ROOT_DIR/.env"
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --classify-only) CLASSIFY_ONLY=true; shift ;;
    --out) OUT="$2"; shift 2 ;;
    --env) ENV_FILE="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

mkdir -p "$(dirname "$OUT")"

python3 - "$ROOT_DIR" "$OUT" "$ENV_FILE" "$CLASSIFY_ONLY" "${DEPLOY_SHA:-}" <<'PY'
import json, os, pathlib, re, subprocess, sys, urllib.error, urllib.request
from datetime import datetime, timezone

root, out_path, env_file, classify_only_s, deploy_sha = sys.argv[1:6]
classify_only = classify_only_s == "true"
root_path = pathlib.Path(root)

SECRET_KEY_FRAGMENTS = (
    "PASSWORD", "SECRET", "APIKEY", "API_KEY", "TOKEN", "PRIVATE", "SIGNING",
    "WEBHOOK", "CONNECTIONSTRING",
)


def parse_env(path: str) -> dict[str, str]:
    if not path or not pathlib.Path(path).is_file():
        return {}
    text = pathlib.Path(path).read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
    env: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip("'").strip('"')
    return env


def present(env: dict[str, str], key: str) -> bool:
    return bool(env.get(key, "").strip())


def flag(env: dict[str, str], key: str, default: str = "false") -> bool:
    return env.get(key, default).strip().lower() in {"1", "true", "yes", "on"}


def git_sha() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=root, text=True
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def classify_paddle(env: dict[str, str]) -> dict:
    api = env.get("Paddle__ApiKey", "").strip()
    client = env.get("Paddle__ClientToken", "").strip()
    if not api:
        api_class = "missing"
    elif "sdbx" in api:
        api_class = "sandbox"
    elif "live" in api:
        api_class = "live"
    else:
        api_class = "unknown"
    if not client:
        client_class = "missing"
    elif client.startswith("test_"):
        client_class = "sandbox"
    elif client.startswith("live_"):
        client_class = "live"
    else:
        client_class = "unknown"
    return {
        "apiKey": api_class,
        "clientToken": client_class,
        "webhookSecret": "present" if present(env, "Paddle__WebhookSecret") else "missing",
        "environment": env.get("Paddle__Environment", "").strip() or "missing",
        "refusedForUat": api_class == "live" or client_class == "live",
    }


def http_json(url: str, timeout: float = 5.0) -> tuple[int, str]:
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")[:800]
    except urllib.error.HTTPError as exc:
        return exc.code, ""
    except Exception:
        return 0, ""


def compose_health() -> dict:
    script = root_path / "deploy" / "uat-compose.sh"
    if not script.is_file():
        return {"available": False}
    try:
        raw = subprocess.check_output(
            ["bash", str(script), "ps", "--format", "json"],
            cwd=root,
            text=True,
            timeout=30,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return {"available": False}
    names = []
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        names.append({
            "service": row.get("Service") or row.get("Name") or "unknown",
            "state": row.get("State") or row.get("Status") or "unknown",
        })
    wanted = ("postgres", "redis", "web", "api", "nginx")
    return {
        "available": True,
        "services": names,
        "requiredPresent": {
            name: any(name in (row["service"] or "").lower() for row in names)
            for name in wanted
        },
    }


env = parse_env(env_file)
sha = git_sha()
public_base = env.get("PUBLIC_BASE_URL", "").strip() or os.environ.get("PUBLIC_BASE_URL", "")
crm_url = env.get("EXISTING_APP_PUBLIC_URL", "").strip()

recaptcha = {
    "serverEnabled": flag(env, "SelfServeSignup__Recaptcha__Enabled"),
    "webEnabled": flag(env, "NEXT_PUBLIC_RECAPTCHA_ENABLED"),
    "secretConfigured": present(env, "SelfServeSignup__Recaptcha__SecretKey"),
    "siteKeyConfigured": present(env, "NEXT_PUBLIC_RECAPTCHA_SITE_KEY"),
    "bypassTokenAbsent": not present(env, "SelfServeSignup__Recaptcha__TestBypassToken"),
    "webTestTokenAbsent": not present(env, "NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN"),
}

seeds = {
    "operatorSeed": flag(env, "OperatorSeed__Enabled"),
    "demoDataSeed": flag(env, "DemoDataSeed__Enabled"),
    "loadTestSeed": flag(env, "LoadTestSeed__Enabled"),
    "platformAdminSeed": flag(env, "PlatformAdminSeed__Enabled"),
    "devTenantSlugSet": present(env, "DEV_TENANT_SLUG"),
}

ports = {
    "nginxHostPort": env.get("NGINX_HOST_PORT", "8180") or "8180",
    "webHostPort": env.get("WEB_HOST_PORT", "3100") or "3100",
    "apiHostPort": env.get("API_HOST_PORT", "5100") or "5100",
}
forbidden_ports = {"80", "443"}
port_isolation = {
    "nginxNotPublicEdge": ports["nginxHostPort"] not in forbidden_ports,
    "webNotPublicEdge": ports["webHostPort"] not in forbidden_ports,
    "apiNotPublicEdge": ports["apiHostPort"] not in forbidden_ports,
}

def api_git_sha() -> str | None:
    script = root_path / "deploy" / "uat-compose.sh"
    if not script.is_file():
        return None
    try:
        raw = subprocess.check_output(
            ["bash", str(script), "exec", "-T", "api", "printenv", "GIT_SHA"],
            cwd=root,
            text=True,
            timeout=15,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return None
    if re.fullmatch(r"[0-9a-fA-F]{40}", raw):
        return raw.lower()
    return None


runtime = {
    "mode": "classify_only" if classify_only else "runtime",
    "compose": {"available": False} if classify_only else compose_health(),
    "ready": None,
    "https": None,
    "sharedCrm": None,
    "apiGitSha": None,
}

if not classify_only:
    loopback = f"http://127.0.0.1:{ports['nginxHostPort']}/ready"
    api_loopback = f"http://127.0.0.1:{ports['apiHostPort']}/ready"
    nginx_code, nginx_body = http_json(loopback)
    api_code, api_body = http_json(api_loopback)
    runtime["ready"] = {
        "nginxLoopbackHealthy": nginx_code == 200 and '"status":"Healthy"' in nginx_body.replace(" ", ""),
        "apiLoopbackHealthy": api_code == 200 and '"status":"Healthy"' in api_body.replace(" ", ""),
        "nginxHttp": nginx_code,
        "apiHttp": api_code,
    }
    if public_base.startswith("https://"):
        pub_code, pub_body = http_json(public_base.rstrip("/") + "/ready")
        runtime["https"] = {
            "publicReadyHealthy": pub_code == 200 and '"status":"Healthy"' in pub_body.replace(" ", ""),
            "http": pub_code,
        }
    else:
        runtime["https"] = {"publicReadyHealthy": False, "http": 0, "reason": "public_base_not_https"}
    if crm_url:
        crm_code, crm_body = http_json(crm_url.rstrip("/") + "/ready")
        runtime["sharedCrm"] = {
            "healthy": crm_code == 200 and '"status":"Healthy"' in crm_body.replace(" ", ""),
            "http": crm_code,
        }
    else:
        runtime["sharedCrm"] = {"healthy": None, "http": 0, "reason": "EXISTING_APP_PUBLIC_URL missing"}
    runtime["apiGitSha"] = api_git_sha()

failures: list[str] = []
if recaptcha["bypassTokenAbsent"] is False:
    failures.append("recaptcha_bypass_token_present")
if recaptcha["webTestTokenAbsent"] is False:
    failures.append("recaptcha_web_test_token_present")
if seeds["demoDataSeed"] or seeds["loadTestSeed"] or seeds["devTenantSlugSet"]:
    failures.append("forbidden_seed_or_dev_slug")
if not port_isolation["nginxNotPublicEdge"] or not port_isolation["webNotPublicEdge"] or not port_isolation["apiNotPublicEdge"]:
    failures.append("public_edge_port_bind")
paddle = classify_paddle(env)
if paddle["refusedForUat"]:
    failures.append("live_paddle")

tenant_provider = {
    "publicBaseHttps": public_base.startswith("https://"),
    "publicBaseLooksLikeUat": "uat." in public_base.lower(),
    "paddleEnvironment": paddle["environment"],
    "aligned": public_base.startswith("https://") and "uat." in public_base.lower() and not paddle["refusedForUat"],
}
if public_base and not tenant_provider["aligned"]:
    failures.append("tenant_provider_misaligned")

ops = {
    "outbox": "not_in_anonymous_probe",
    "migrations": "not_in_anonymous_probe",
}

if not classify_only:
    compose = runtime["compose"]
    if compose.get("available") and not all(compose.get("requiredPresent", {}).values()):
        failures.append("compose_unhealthy")
    ready = runtime.get("ready") or {}
    if not ready.get("nginxLoopbackHealthy"):
        failures.append("nginx_loopback_unhealthy")
    if not ready.get("apiLoopbackHealthy"):
        failures.append("api_loopback_unhealthy")
if deploy_sha and sha and sha.lower() != deploy_sha.lower():
    failures.append("sha_mismatch")

result = "classify_only" if classify_only and not failures else ("fail" if failures else "pass")

payload = {
    "story": "45.2",
    "sha": sha,
    "recordedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "result": result,
    "failures": failures,
    "deployment": {
        "repoSha": sha,
        "deployShaRequested": deploy_sha or None,
        "shaMatch": (sha == deploy_sha) if deploy_sha and sha else None,
    },
    "runtime": runtime,
    "security": {
        "recaptcha": recaptcha,
        "seeds": seeds,
        "bypassTokensAbsent": recaptcha["bypassTokenAbsent"] and recaptcha["webTestTokenAbsent"],
        "portIsolation": port_isolation,
    },
    "provider": {"paddle": paddle, "tenantAlignment": tenant_provider},
    "ops": ops,
}

text = json.dumps(payload, indent=2) + "\n"
for key, value in env.items():
    if not value or len(value) < 8:
        continue
    if any(frag in key.upper() for frag in SECRET_KEY_FRAGMENTS) and value in text:
        print("REFUSE: probe output would include a secret value", file=sys.stderr)
        sys.exit(1)

pathlib.Path(out_path).write_text(text, encoding="utf-8")
print(f"wrote {out_path}")
print(f"UAT_ACCEPTANCE_RESULT={result}")
if failures:
    print("UAT_ACCEPTANCE_FAILURES=" + ",".join(failures))
if result == "fail":
    sys.exit(1)
PY
