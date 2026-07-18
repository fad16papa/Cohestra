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

echo "Building and starting UAT stack (nginx + web + api + postgres + redis)..."
docker compose -f docker-compose.uat.yml up -d --build

echo ""
echo "Stack started. Next steps:"
echo "  1. Edit .env — PUBLIC_BASE_URL (http://DROPLET_IP or https://your-domain), secrets, SendGrid"
echo "  2. Rebuild if PUBLIC_BASE_URL changed: docker compose -f docker-compose.uat.yml up -d --build web"
echo "  3. Open firewall: 22, 80, 443 (nginx container handles HTTP)"
echo "  4. Create operator at \${PUBLIC_BASE_URL}/register (single account + OTP)"
echo "  5. Optional HTTPS: mount certs — see deploy/nginx/README.md"
echo ""
echo "Smoke checks:"
echo "  bash deploy/uat-smoke.sh"
echo "  curl -s \${PUBLIC_BASE_URL:-http://127.0.0.1}/ready"
echo ""
echo "pgAdmin / RedisInsight (SSH tunnel from laptop):"
echo "  ssh -N -L 15432:127.0.0.1:5432 -L 16379:127.0.0.1:6379 user@this-host"
echo "  See docs/deploy/database-tools.md"
echo ""
echo "See docs/deploy/digitalocean-uat.md for the full UAT runbook."
