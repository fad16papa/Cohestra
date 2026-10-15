#!/usr/bin/env bash
# Dedicated UAT OTP mailbox reader. Never prints credentials or unrelated bodies.
#
#   bash deploy/uat-otp-mailbox.sh --check-secrets
#   bash deploy/uat-otp-mailbox.sh --extract-from-file FILE --to EMAIL [--subject TOKEN]
#   bash deploy/uat-otp-mailbox.sh --poll --to EMAIL [--subject TOKEN]
#
# Required Environment `uat` names: UAT_OTP_MAILBOX_HOST, UAT_OTP_MAILBOX_USER, UAT_OTP_MAILBOX_SECRET
# Optional: UAT_OTP_MAILBOX_PORT (993), UAT_OTP_MAILBOX_PROTOCOL (imap)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE=""
EXTRACT_FILE=""
TO_ADDR=""
SUBJECT_TOKEN=""
OUT="${ROOT_DIR}/artifacts/uat-otp-mailbox.json"
POLL_SECONDS="${UAT_OTP_MAILBOX_TIMEOUT_SECONDS:-60}"
POLL_INTERVAL="${UAT_OTP_MAILBOX_POLL_INTERVAL_SECONDS:-3}"

FORBIDDEN_PERSONAL='@(gmail|googlemail|outlook|hotmail|live|yahoo|icloud)\.'

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check-secrets) MODE="check"; shift ;;
    --extract-from-file) MODE="extract"; EXTRACT_FILE="$2"; shift 2 ;;
    --poll) MODE="poll"; shift ;;
    --to) TO_ADDR="$2"; shift 2 ;;
    --subject) SUBJECT_TOKEN="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$MODE" ]]; then
  echo "usage: uat-otp-mailbox.sh --check-secrets | --extract-from-file FILE | --poll" >&2
  exit 2
fi

missing=()
for name in UAT_OTP_MAILBOX_HOST UAT_OTP_MAILBOX_USER UAT_OTP_MAILBOX_SECRET; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
done

report_missing() {
  echo "OWNER_GATE=missing_protected_secret"
  local name
  for name in "${missing[@]}"; do
    echo "MISSING_SECRET=${name}"
  done
}

if [[ "$MODE" == "check" ]]; then
  if ((${#missing[@]} > 0)); then
    report_missing
    exit 1
  fi
  echo "UAT_OTP_MAILBOX_SECRETS=present"
  echo "UAT_OTP_MAILBOX_PROTOCOL=${UAT_OTP_MAILBOX_PROTOCOL:-imap}"
  exit 0
fi

if [[ -z "$TO_ADDR" ]]; then
  echo "REFUSE: --to is required so the reader matches a unique correlation address" >&2
  exit 2
fi

if [[ "$TO_ADDR" =~ $FORBIDDEN_PERSONAL ]]; then
  echo "REFUSE: personal mailbox credentials are forbidden" >&2
  exit 1
fi

if [[ "$MODE" == "poll" && ${#missing[@]} -gt 0 ]]; then
  report_missing
  exit 1
fi

python3 - "$MODE" "$EXTRACT_FILE" "$TO_ADDR" "$SUBJECT_TOKEN" "$OUT" "$POLL_SECONDS" "$POLL_INTERVAL" \
  "${UAT_OTP_MAILBOX_HOST:-}" \
  "${UAT_OTP_MAILBOX_USER:-}" \
  "${UAT_OTP_MAILBOX_SECRET:-}" \
  "${UAT_OTP_MAILBOX_PORT:-993}" \
  "${UAT_OTP_MAILBOX_PROTOCOL:-imap}" <<'PY'
import imaplib, json, os, pathlib, re, sys
from datetime import datetime, timezone
from email import message_from_bytes
from email.header import decode_header, make_header

(
    mode,
    extract_file,
    to_addr,
    subject_token,
    out_path,
    poll_seconds_s,
    poll_interval_s,
    host,
    user,
    secret,
    port_s,
    protocol,
) = sys.argv[1:13]

OTP_RE = re.compile(r"\b(\d{6})\b")
SECRET_MARKERS = ("BEGIN OPENSSH", "BEGIN RSA PRIVATE KEY", "-----BEGIN", "UAT_OTP_MAILBOX_SECRET")


def refuse(msg: str) -> None:
    print(f"REFUSE: {msg}", file=sys.stderr)
    raise SystemExit(1)


def decode_hdr(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value


def text_from_message(msg) -> str:
    chunks: list[str] = []
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype in {"text/plain", "text/html"}:
                payload = part.get_payload(decode=True) or b""
                chunks.append(payload.decode(part.get_content_charset() or "utf-8", "replace"))
    else:
        payload = msg.get_payload(decode=True) or b""
        chunks.append(payload.decode(msg.get_content_charset() or "utf-8", "replace"))
    return "\n".join(chunks)


def matches(msg, raw_text: str) -> bool:
    tos = decode_hdr(msg.get("To"))
    subject = decode_hdr(msg.get("Subject"))
    to_ok = to_addr.lower() in tos.lower() or to_addr.lower() in raw_text.lower()
    if not to_ok:
        return False
    if subject_token:
        return subject_token.lower() in subject.lower() or subject_token.lower() in raw_text.lower()
    return True


def extract_otp(text: str) -> str | None:
    match = OTP_RE.search(text)
    return match.group(1) if match else None


def write_evidence(payload: dict) -> None:
    text = json.dumps(payload, indent=2) + "\n"
    for needle in SECRET_MARKERS:
        if needle in text:
            refuse("mailbox evidence would include secret material")
    if secret and secret in text:
        refuse("mailbox evidence would include the mailbox secret")
    pathlib.Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(out_path).write_text(text, encoding="utf-8")
    print(f"wrote {out_path}")


def extract_from_source(raw: bytes) -> str:
    msg = message_from_bytes(raw)
    body = text_from_message(msg)
    if not matches(msg, body):
        refuse("message does not match the unique correlation address")
    otp = extract_otp(body)
    if not otp:
        refuse("matched message has no 6-digit OTP")
    write_evidence({
        "result": "pass",
        "matched": True,
        "otpDigits": 6,
        "toPresent": True,
        "subjectMatched": bool(subject_token),
        "recordedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
    print(f"OTP_CODE={otp}")
    return otp


if mode == "extract":
    path = pathlib.Path(extract_file)
    if not path.is_file():
        refuse("extract file is missing")
    extract_from_source(path.read_bytes())
    raise SystemExit(0)

if protocol != "imap":
    refuse("only imap protocol is implemented")
if not host or not user or not secret:
    refuse("mailbox secrets are missing")

import time
deadline = time.monotonic() + max(1, int(poll_seconds_s))
interval = max(1, int(poll_interval_s))
polls = 0
last_error = "no_matching_message"

while time.monotonic() < deadline:
    polls += 1
    client = None
    try:
        client = imaplib.IMAP4_SSL(host, int(port_s), timeout=20)
        client.login(user, secret)
        client.select("INBOX")
        typ, data = client.search(None, "ALL")
        if typ != "OK":
            last_error = "imap_search_failed"
        else:
            ids = data[0].split() if data and data[0] else []
            for msg_id in reversed(ids[-20:]):
                typ, fetched = client.fetch(msg_id, "(RFC822)")
                if typ != "OK" or not fetched:
                    continue
                raw = fetched[0][1]
                if not isinstance(raw, (bytes, bytearray)):
                    continue
                msg = message_from_bytes(raw)
                body = text_from_message(msg)
                if not matches(msg, body):
                    continue
                otp = extract_otp(body)
                if not otp:
                    last_error = "matched_message_has_no_otp"
                    continue
                write_evidence({
                    "result": "pass",
                    "matched": True,
                    "otpDigits": 6,
                    "polls": polls,
                    "toPresent": True,
                    "subjectMatched": bool(subject_token),
                    "recordedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                })
                print(f"OTP_CODE={otp}")
                raise SystemExit(0)
    except SystemExit:
        raise
    except Exception as exc:
        last_error = "imap_error"
        print(f"UAT_OTP_MAILBOX_POLL={polls}", file=sys.stderr)
        print(f"UAT_OTP_MAILBOX_ERROR={type(exc).__name__}", file=sys.stderr)
    finally:
        if client is not None:
            try:
                client.logout()
            except Exception:
                pass
    time.sleep(interval)

write_evidence({
    "result": "fail",
    "matched": False,
    "polls": polls,
    "reason": last_error,
    "recordedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
})
print("UAT_OTP_MAILBOX_RESULT=fail", file=sys.stderr)
raise SystemExit(1)
PY
