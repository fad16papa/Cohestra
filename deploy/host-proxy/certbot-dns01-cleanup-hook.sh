#!/usr/bin/env bash
# Certbot --manual-cleanup-hook (no-op; owner removes TXT after full issuance).
echo "cleanup domain=${CERTBOT_DOMAIN:-unknown}"
