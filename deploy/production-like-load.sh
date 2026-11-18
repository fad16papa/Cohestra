#!/usr/bin/env bash
# Story 46.12 — bounded loopback load against a production-like API base URL.
# Does not deploy. Does not print secrets. Refuses customer DNS and non-loopback hosts.

set -euo pipefail

BASE_URL="${BASE_URL:-}"
REQUEST_COUNT="${REQUEST_COUNT:-80}"
CONCURRENCY="${CONCURRENCY:-4}"
REPORT_PATH="${REPORT_PATH:-}"

refuse() {
  echo "RESULT=REFUSE"
  echo "REFUSE_REASON=$1"
  exit 1
}

# Validate BASE_URL; print REFUSE_REASON to stdout and return 1 on failure (no exit).
_try_validate_base_url() {
  local url="$1"
  if [[ -z "$url" ]]; then
    echo "BASE_URL is required for load execution"
    return 1
  fi
  if [[ "$url" != http://* ]]; then
    echo "only http:// loopback URLs are allowed"
    return 1
  fi
  if [[ "$url" == *cohestra.app* ]]; then
    echo "customer or public Cohestra DNS is forbidden"
    return 1
  fi
  if [[ "$url" == *159.223.55.242* || "$url" == *129.212.235.2* ]]; then
    echo "inventory droplet IPv4 is forbidden"
    return 1
  fi
  local hostport="${url#http://}"
  hostport="${hostport%%/*}"
  local host="${hostport%%:*}"
  if [[ "$host" != "localhost" && "$host" != "127.0.0.1" ]]; then
    echo "host must be localhost or 127.0.0.1"
    return 1
  fi
  return 0
}

validate_base_url() {
  local reason
  if ! reason="$(_try_validate_base_url "$BASE_URL")"; then
    refuse "$reason"
  fi
}

run_self_check() {
  echo "RESULT=SELF_CHECK"
  local url
  for url in \
    "https://localhost:8080" \
    "http://cohestra.app/health" \
    "http://uat.cohestra.app/health" \
    "http://159.223.55.242/health" \
    "http://129.212.235.2/health" \
    "http://example.com/health"; do
    if _try_validate_base_url "$url" >/dev/null 2>&1; then
      echo "SELF_CHECK_FAIL=expected refuse for ${url}"
      exit 1
    fi
  done
  if ! _try_validate_base_url "http://localhost:8080/health" >/dev/null; then
    echo "SELF_CHECK_FAIL=localhost must be accepted"
    exit 1
  fi
  if ! _try_validate_base_url "http://127.0.0.1:8080/health" >/dev/null; then
    echo "SELF_CHECK_FAIL=127.0.0.1 must be accepted"
    exit 1
  fi
  echo "SELF_CHECK=pass"
  echo "GUARD=pass"
}

run_loopback_load_json() {
  validate_base_url
  local target="${BASE_URL%/}/health"
  export TARGET_URL="$target" REQUEST_COUNT CONCURRENCY
  python3 - <<'PY'
import json
import os
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

target = os.environ["TARGET_URL"]
count = int(os.environ["REQUEST_COUNT"])
concurrency = max(1, min(int(os.environ["CONCURRENCY"]), 16))
latencies_ms: list[float] = []
errors = 0


def one_request(_: int) -> float | None:
    start = time.perf_counter()
    req = urllib.request.Request(target, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read(64)
            if resp.status >= 400:
                return None
    except Exception:
        return None
    return (time.perf_counter() - start) * 1000.0


with ThreadPoolExecutor(max_workers=concurrency) as pool:
    futures = [pool.submit(one_request, i) for i in range(count)]
    for fut in as_completed(futures):
        ms = fut.result()
        if ms is None:
            errors += 1
        else:
            latencies_ms.append(ms)

latencies_ms.sort()
if not latencies_ms:
    raise SystemExit("no successful responses")


def percentile(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


p95 = percentile(latencies_ms, 95)
p99 = percentile(latencies_ms, 99)
error_rate = errors / count if count else 0.0

mem_kib = 0
load1 = 0.0
disk_pct = 0
try:
    with open("/proc/meminfo", encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("MemAvailable:"):
                mem_kib = int(line.split()[1])
                break
    with open("/proc/loadavg", encoding="utf-8") as fh:
        load1 = float(fh.read().split()[0])
    import subprocess

    disk_pct = int(
        subprocess.check_output(
            ["bash", "-c", "df -P / | awk 'NR==2 {gsub(/%/,\"\",$5); print $5}'"],
            text=True,
        ).strip()
        or "0"
    )
except OSError:
    pass

payload = {
    "recordedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "baseUrl": target.rsplit("/health", 1)[0],
    "path": "/health",
    "requestCount": count,
    "concurrency": concurrency,
    "successful": len(latencies_ms),
    "errors": errors,
    "errorRate": round(error_rate, 6),
    "latencyMs": {
        "p50": round(percentile(latencies_ms, 50), 3),
        "p95": round(p95, 3),
        "p99": round(p99, 3),
        "max": round(max(latencies_ms), 3),
    },
    "host": {
        "memAvailableKib": mem_kib,
        "load1": load1,
        "diskRootUsedPct": disk_pct,
    },
    "story": "46.12",
    "loadTestSeedEnabled": False,
    "customerDnsUsed": False,
    "productionDropletContacted": False,
    "future46_7LatencyWarningMs": round(p95 * 2, 3),
}
print(json.dumps(payload, indent=2))
PY
}

main() {
  if [[ "${1:-}" == "--self-check" ]]; then
    run_self_check
    exit 0
  fi

  if [[ -z "$BASE_URL" ]]; then
    run_self_check
    exit 0
  fi

  local json
  json="$(run_loopback_load_json)"
  if [[ -n "$REPORT_PATH" ]]; then
    mkdir -p "$(dirname "$REPORT_PATH")"
    printf '%s\n' "$json" >"$REPORT_PATH"
  fi
  echo "$json"
  echo "RESULT=PASS"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi