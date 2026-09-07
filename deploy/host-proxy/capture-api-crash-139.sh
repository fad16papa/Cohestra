#!/usr/bin/env bash
# Capture Cohestra UAT API exit-139 evidence. Never prints .env or secret values.
#
# Usage (on the droplet as deploy, from /home/deploy/cohestra):
#   bash deploy/host-proxy/capture-api-crash-139.sh
#
# Stops only cohestra-uat-api after inspect/logs.
# Does not stop postgres, redis, web, nginx, or lead-generation-crm.
# Does not delete volumes.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

API="${COHESTRA_UAT_API_CONTAINER:-cohestra-uat-api}"
REDACT_PY="$ROOT_DIR/deploy/host-proxy/redact-crash-output.py"

redact() {
  python3 "$REDACT_PY"
}

echo "== identity =="
git rev-parse --short HEAD
git rev-parse HEAD
git status --short
echo "cwd=$PWD"

echo ""
echo "== existing app (read-only) =="
docker ps --filter name=lead-generation-crm --format 'name={{.Names}} status={{.Status}}' || true

echo ""
echo "== Cohestra containers =="
docker ps -a --filter name=cohestra-uat --format 'name={{.Names}} status={{.Status}}' || true

echo ""
echo "== API inspect (no Config.Env) =="
docker inspect "$API" --format \
  'ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Error={{.State.Error}} Restarting={{.State.Restarting}} Status={{.State.Status}} StartedAt={{.State.StartedAt}} FinishedAt={{.State.FinishedAt}} Pid={{.State.Pid}}' \
  || echo "inspect failed"

echo ""
echo "== API image =="
IMAGE=$(docker inspect "$API" --format '{{.Image}}' 2>/dev/null || true)
if [[ -n "$IMAGE" ]]; then
  docker image inspect "$IMAGE" --format 'Id={{.Id}} Architecture={{.Architecture}} Os={{.Os}} Created={{.Created}}' || true
  docker image inspect "$IMAGE" --format '{{range .RepoDigests}}Digest={{.}}{{println}}{{end}}' || true
else
  echo "API image not inspectable"
fi

echo ""
echo "== host arch =="
uname -m
uname -s
uname -r

echo ""
echo "== API logs (redacted, last 300) =="
docker logs --timestamps --tail 300 "$API" 2>&1 | redact || echo "no logs"

echo ""
echo "== stop crash loop (API only) =="
docker stop "$API" >/dev/null
echo "stopped $API"

echo ""
echo "== dotnet --info in API image =="
set +e
docker run --rm --entrypoint dotnet "$IMAGE" --info > /tmp/cohestra-dotnet-info.txt 2>&1
DOTNET_RC=$?
set -e
cat /tmp/cohestra-dotnet-info.txt | redact
echo "dotnet_info_exit=$DOTNET_RC"
rm -f /tmp/cohestra-dotnet-info.txt

echo ""
echo "== kernel lines (segfault/oom/dotnet) =="
if command -v sudo >/dev/null 2>&1; then
  sudo dmesg -T 2>/dev/null | grep -Ei 'segfault|coreclr|dotnet|oom|killed process|cohestra-uat-api' | tail -n 80 || echo "no matching dmesg lines"
else
  dmesg -T 2>/dev/null | grep -Ei 'segfault|coreclr|dotnet|oom|killed process|cohestra-uat-api' | tail -n 80 || echo "no matching dmesg lines"
fi

echo ""
echo "== foreground api once (redacted) =="
set +e
bash "$ROOT_DIR/deploy/uat-compose.sh" run --rm --no-deps api > /tmp/cohestra-api-fg.txt 2>&1
FG_RC=$?
set -e
python3 "$REDACT_PY" < /tmp/cohestra-api-fg.txt
echo "foreground_exit=$FG_RC"
rm -f /tmp/cohestra-api-fg.txt

echo ""
echo "== volumes preserved =="
docker volume ls --format '{{.Name}}' | grep '^cohestra_uat_' || true

echo ""
echo "CAPTURE COMPLETE"
echo "Paste this output. Do not attach .env."
