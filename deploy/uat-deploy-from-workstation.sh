#!/usr/bin/env bash
# Deploy latest main to the shared UAT droplet (Epic 19.1).
#
# Run on the OWNER WORKSTATION (not a Cloud Agent VM):
#   eval "$(ssh-agent -s)"
#   ssh-add ~/.ssh/cohestra_uat
#   bash deploy/uat-deploy-from-workstation.sh
#
# Optional:
#   UAT_SSH_HOST=129.212.235.2
#   UAT_SSH_USER=deploy
#   UAT_DEPLOY_PATH=/home/deploy/cohestra

set -euo pipefail

HOST="${UAT_SSH_HOST:-129.212.235.2}"
USER_NAME="${UAT_SSH_USER:-deploy}"
DEPLOY_PATH="${UAT_DEPLOY_PATH:-/home/deploy/cohestra}"
KEY="${UAT_SSH_KEY:-$HOME/.ssh/cohestra_uat}"

echo "== Cohestra UAT deploy (main) =="
echo "Host:  $HOST"
echo "User:  $USER_NAME"
echo "Path:  $DEPLOY_PATH"
echo "Local main: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo ""

if [[ ! -f "$KEY" ]]; then
  echo "ERROR: SSH key not found at $KEY" >&2
  echo "Load owner key: ssh-add ~/.ssh/cohestra_uat" >&2
  exit 1
fi

echo "== SSH acceptance (quick) =="
ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=15 "${USER_NAME}@${HOST}" \
  'echo "connected as $(whoami) on $(hostname)"'

echo ""
echo "== Remote deploy (git reset main + compose build + smoke) =="
ssh -i "$KEY" -o BatchMode=yes "${USER_NAME}@${HOST}" \
  "cd ${DEPLOY_PATH} && DEPLOY_BRANCH=main bash deploy/remote-deploy.sh"

echo ""
echo "== Public health check =="
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://uat.cohestra.app}"
curl -fsS "${PUBLIC_BASE_URL}/ready" | head -c 200
echo ""
echo ""
echo "Deploy complete. Verify Website Builder: ${PUBLIC_BASE_URL}/dashboard/website (operator login)"
