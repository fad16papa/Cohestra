#!/usr/bin/env bash
# Read-only public expiry watch. Does not renew, reload, or recreate.
# Existing site: FAIL if notAfter < 21 days.
# UAT wildcard: FAIL if notAfter < 21 days (watch only — do not auto-renew).
#
# Usage:
#   bash deploy/host-proxy/watch-edge-cert-expiry.sh
#   bash deploy/host-proxy/watch-edge-cert-expiry.sh --min-days 21

set -euo pipefail

MIN_DAYS="${2:-21}"
if [[ "${1:-}" == "--min-days" ]]; then
  MIN_DAYS="${2:?min days}"
fi

existing_days_remaining() {
  local host="$1"
  local raw
  raw=$(echo | openssl s_client -servername "$host" -connect "${host}:443" 2>/dev/null \
    | openssl x509 -noout -enddate | cut -d= -f2)
  python3 -c 'import datetime,sys
raw=sys.argv[1]
dt=datetime.datetime.strptime(raw, "%b %d %H:%M:%S %Y %Z")
print((dt - datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)).days)
' "$raw"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  fail=0
  for host in thesocialcollectivesg.com uat.cohestra.app; do
    days=$(existing_days_remaining "$host")
    echo "${host} days_remaining=${days}"
    if [[ "$days" -lt "$MIN_DAYS" ]]; then
      echo "FAIL: ${host} expires in ${days} days (floor ${MIN_DAYS})" >&2
      fail=1
    fi
  done
  if [[ "$fail" -ne 0 ]]; then
    echo "RESULT=EXPIRY_ALERT"
    exit 1
  fi
  echo "RESULT=EXPIRY_OK"
fi
