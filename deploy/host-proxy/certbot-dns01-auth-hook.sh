#!/bin/sh
# Certbot --manual-auth-hook for Cohestra UAT wildcard DNS-01.
# Runs inside certbot/certbot (Alpine — no bash). Uses DNS-over-HTTPS.
set -eu

domain="${CERTBOT_DOMAIN:-}"
validation="${CERTBOT_VALIDATION:-}"

case "$domain" in
  '*.'*) base="${domain#??}" ;;
  *) base="$domain" ;;
esac
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

fetch_txt_response() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --connect-timeout 10 "https://dns.google/resolve?name=${txt_name}&type=TXT" 2>/dev/null || true
    return 0
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -qO- --timeout=10 "https://dns.google/resolve?name=${txt_name}&type=TXT" 2>/dev/null || true
    return 0
  fi
  echo "dns_probe=NO_CURL_OR_WGET" >&2
  return 1
}

txt_visible() {
  body=$(fetch_txt_response) || return 1
  echo "$body" | tr -d '"' | grep -Fq "$validation"
}

attempt=0
while [ "$attempt" -lt 40 ]; do
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
