#!/usr/bin/env bash
# Certbot --manual-auth-hook for Cohestra UAT wildcard DNS-01.
# Uses DNS-over-HTTPS (no dig required inside certbot container).
set -euo pipefail

domain="${CERTBOT_DOMAIN:-}"
validation="${CERTBOT_VALIDATION:-}"
base="${domain#\*.}"
txt_name="_acme-challenge.${base}"

echo ""
echo "========================================"
echo "OWNER DNS ACTION REQUIRED (DNS-01)"
echo "Domain being validated: $domain"
echo "Record type: TXT"
echo "Record name: $txt_name"
echo "Record value: $validation"
echo "Keep ALL required TXT values until certbot finishes every domain."
echo "========================================"
echo ""

txt_visible() {
  local body
  body=$(curl -fsS --connect-timeout 10 "https://dns.google/resolve?name=${txt_name}&type=TXT" 2>/dev/null || true)
  echo "$body" | tr -d '"' | grep -Fq "$validation"
}

attempt=0
while [[ "$attempt" -lt 40 ]]; do
  attempt=$((attempt + 1))
  if txt_visible; then
    echo "dns_propagation=PASS attempt=$attempt domain=$domain"
    exit 0
  fi
  echo "waiting_for_dns attempt=$attempt domain=$domain"
  sleep 30
done

echo "dns_propagation=FAIL domain=$domain" >&2
exit 1
