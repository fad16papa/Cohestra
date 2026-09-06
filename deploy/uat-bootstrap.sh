#!/usr/bin/env bash
set -euo pipefail

# One-time bootstrap for Ubuntu 22.04/24.04 droplet (DigitalOcean).
# Run as a user with sudo: bash deploy/uat-bootstrap.sh

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
  echo "Log out and back in so docker group membership applies, then re-run this script."
  exit 0
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin not found. Install Docker Engine 24+ from get.docker.com."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.uat.example .env
  echo "Created .env from .env.uat.example — edit secrets and PUBLIC_BASE_URL before continuing."
  exit 1
fi

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/cohestra-uat-guards.sh"
refuse_legacy_compose_project || exit 1

echo "Isolation reminder: Cohestra project is cohestra-uat (not the live public stack)."
echo "Host binds are 127.0.0.1:3100 / 5100 / 8180 only. Run deploy/uat-port-audit.sh first."
echo "Building and starting isolated UAT stack (nginx + web + api + postgres + redis)..."
bash deploy/uat-compose.sh up -d --build

echo ""
echo "Stack started. Next steps:"
echo "  1. Edit .env — PUBLIC_BASE_URL must be the Cohestra UAT hostname (not the existing app)"
echo "  2. Rebuild if PUBLIC_BASE_URL changed: bash deploy/uat-compose.sh up -d --build web"
echo "  3. Firewall stays 22, 80, 443 on the HOST public proxy only"
echo "  4. Create operator at \${PUBLIC_BASE_URL}/register (single account + OTP)"
echo "  5. Host proxy vhost → 127.0.0.1:8180 — see deploy/host-proxy/"
echo ""
echo "Smoke checks:"
echo "  bash deploy/uat-smoke.sh"
echo "  curl -s \${PUBLIC_BASE_URL:-http://127.0.0.1}/ready"
echo ""
echo "Postgres/Redis have no host ports. See docs/deploy/database-tools.md"
echo ""
echo "See docs/deploy/digitalocean-uat.md for the full UAT runbook."
