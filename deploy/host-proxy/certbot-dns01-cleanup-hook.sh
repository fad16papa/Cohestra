#!/bin/sh
# Certbot --manual-cleanup-hook (no-op; owner removes TXT after full issuance).
echo "cleanup domain=${CERTBOT_DOMAIN:-unknown}"
