#!/usr/bin/env bash
set -euo pipefail

# One-time droplet setup before GitHub Actions CD can deploy.
# Run on the droplet over SSH:
#   REPO_URL=https://github.com/YOUR_ORG/cohestra.git bash deploy/droplet-init.sh
#
# For a private repo, configure git access first (deploy key or SSH remote).

DEPLOY_PATH="${DEPLOY_PATH:-$HOME/cohestra}"
REPO_URL="${REPO_URL:-}"

echo "== Cohestra — droplet init =="
echo "Deploy path: $DEPLOY_PATH"

if ! command -v git >/dev/null 2>&1; then
  echo "Installing git..."
  sudo apt-get update
  sudo apt-get install -y git curl
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
  echo ""
  echo "Docker installed. Log out and back in, then re-run this script."
  exit 0
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose plugin not found."
  exit 1
fi

if [[ -z "$REPO_URL" ]]; then
  echo "ERROR: Set REPO_URL to your GitHub repository clone URL."
  echo 'Example: REPO_URL=https://github.com/your-org/cohestra.git bash deploy/droplet-init.sh'
  exit 1
fi

if [[ ! -d "$DEPLOY_PATH/.git" ]]; then
  echo "Cloning repository..."
  git clone "$REPO_URL" "$DEPLOY_PATH"
fi

cd "$DEPLOY_PATH"

if [[ ! -f .env ]]; then
  cp .env.uat.example .env
  echo ""
  echo "Created .env from .env.uat.example"
  echo "IMPORTANT: Edit .env before the first deploy:"
  echo "  nano $DEPLOY_PATH/.env"
  echo ""
  echo "Required:"
  echo "  PUBLIC_BASE_URL=http://YOUR_DROPLET_IP"
  echo "  POSTGRES_PASSWORD, JWT_SIGNING_KEY, SendGrid__ApiKey"
  echo ""
  echo "Generate secrets:"
  echo "  openssl rand -base64 24   # postgres"
  echo "  openssl rand -base64 48   # JWT"
  exit 1
fi

echo "Repository and .env are ready."
echo ""
echo "First manual deploy (optional test before CI/CD):"
echo "  cd $DEPLOY_PATH && bash deploy/remote-deploy.sh"
echo ""
echo "Then configure GitHub Actions secrets — see docs/deploy/github-actions-cd.md"
