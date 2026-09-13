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

owner_msg() {
  echo ""
  echo "========================================"
  echo "OWNER DNS ACTION REQUIRED (DNS-01)"
  echo "Domain being validated: $domain"
  echo "Record type: TXT"
  echo "Record name: $txt_name"
  echo "Record value: $validation"
  echo "GoDaddy name field: _acme-challenge.uat"
  echo "Keep ALL required TXT values until certbot finishes every domain."
  echo "========================================"
  echo ""
}

owner_msg >&2
if [ -d /acme-out ] && [ -w /acme-out ]; then
  safe=$(echo "$domain" | tr '/ *' '___')
  owner_msg > "/acme-out/${safe}.txt"
  echo "instructions_file=/acme-out/${safe}.txt" >&2
fi

doh_google() {
  curl -fsS --connect-timeout 10 \
    "https://dns.google/resolve?name=${txt_name}&type=TXT" 2>/dev/null || true
}

doh_cloudflare() {
  curl -fsS --connect-timeout 10 \
    -H 'accept: application/dns-json' \
    "https://cloudflare-dns.com/dns-query?name=${txt_name}&type=TXT" 2>/dev/null || true
}

# Match only TXT answer payloads (avoid false positives elsewhere in JSON).
json_txt_contains_token() {
  body=$1
  [ -n "$body" ] || return 1
  echo "$body" | grep -o '"data":"[^"]*"' 2>/dev/null \
    | tr -d '\\"' \
    | grep -Fq "$validation"
}

# Let's Encrypt queries authoritative NS; GoDaddy must serve the TXT here.
authoritative_sees_token() {
  for ns in ns75.domaincontrol.com ns76.domaincontrol.com; do
    if ! nslookup -type=TXT "$txt_name" "$ns" 2>/dev/null | grep -Fq "$validation"; then
      echo "authoritative_miss ns=$ns domain=$domain" >&2
      return 1
    fi
  done
  return 0
}

resolver_sees_token() {
  json_txt_contains_token "$(doh_google)" \
    && json_txt_contains_token "$(doh_cloudflare)" \
    && authoritative_sees_token
}

attempt=0
stable=0
while [ "$attempt" -lt 60 ]; do
  attempt=$((attempt + 1))
  if resolver_sees_token; then
    stable=$((stable + 1))
    echo "dns_propagation=SEEN attempt=$attempt stable=$stable/3 resolvers=google+cloudflare domain=$domain" >&2
    if [ "$stable" -ge 3 ]; then
      echo "dns_propagation=STABILIZING sleep=120s domain=$domain" >&2
      sleep 120
      if resolver_sees_token; then
        echo "dns_propagation=PASS attempt=$attempt domain=$domain" >&2
        exit 0
      fi
      echo "dns_propagation=UNSTABLE after stabilize domain=$domain" >&2
      stable=0
    fi
  else
    stable=0
    echo "waiting_for_dns attempt=$attempt domain=$domain" >&2
  fi
  sleep 30
done

echo "dns_propagation=FAIL domain=$domain" >&2
exit 1
