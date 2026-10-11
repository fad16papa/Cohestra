# Host-managed HTTP-01 renew for thesocialcollectivesg.com — 2026-10-11

**Mutation:** none this run. Do not install a timer until the owner authorizes it.  
**Out of scope:** Cohestra UAT wildcard (`uat.cohestra.app` / `*.uat.cohestra.app`) — DNS-01, MANUAL-ACCEPTED.

## Why a host timer

The existing leaf expired 2026-10-01 and was re-issued 2026-10-11 04:45 GMT (public notAfter **2027-01-09**). UAT wildcard issued 2026-09-14 was **not** replaced. That is separate lineages on `lead-generation-crm_certbot_certs`.

`deploy/renew-letsencrypt.sh` targets the **Cohestra** compose certbot profile and is **forbidden** on this shared host.

## Install unit (authorized later, as `deploy`)

Write these two files. Do not enable until `certbot certificates` shows a distinct `thesocialcollectivesg.com` lineage.

`/home/deploy/bin/renew-existing-site-http01.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
# Existing site only. Refuse UAT names.
if docker ps -q --filter ancestor=certbot/certbot | grep -q .; then
  echo "REFUSE: certbot already running" >&2
  exit 1
fi
docker pull certbot/certbot:latest
docker run --rm \
  -v lead-generation-crm_certbot_certs:/etc/letsencrypt \
  -v lead-generation-crm_certbot_www:/var/www/certbot \
  certbot/certbot:latest \
  renew --cert-name thesocialcollectivesg.com --quiet \
  --deploy-hook 'docker exec lead-generation-crm-nginx-1 nginx -t && docker exec lead-generation-crm-nginx-1 nginx -s reload'
```

systemd user timer (or root cron `0 3 * * 1` calling the same script):

```
# ~/.config/systemd/user/existing-site-http01-renew.service
[Service]
Type=oneshot
ExecStart=/home/deploy/bin/renew-existing-site-http01.sh

# ~/.config/systemd/user/existing-site-http01-renew.timer
[Timer]
OnCalendar=Mon *-*-* 03:00:00
Persistent=true
[Install]
WantedBy=timers.target
```

`renew --cert-name thesocialcollectivesg.com` must never list `uat.cohestra.app`. If certbot would expand names, **stop**.

## Validation after a renew (or after `--dry-run`)

```bash
docker run --rm \
  -v lead-generation-crm_certbot_certs:/etc/letsencrypt \
  -v lead-generation-crm_certbot_www:/var/www/certbot \
  certbot/certbot:latest \
  renew --cert-name thesocialcollectivesg.com --dry-run
# Then prove:
curl -fsS https://thesocialcollectivesg.com/ready
curl -fsS https://uat.cohestra.app/ready
echo | openssl s_client -servername thesocialcollectivesg.com -connect thesocialcollectivesg.com:443 2>/dev/null \
  | openssl x509 -noout -subject -dates
echo | openssl s_client -servername uat.cohestra.app -connect uat.cohestra.app:443 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
```

PASS: existing leaf trusted and unexpired; UAT SAN still `uat` + `*.uat`; both `/ready` Healthy; no nginx recreate.

## Monitoring / alerting

Weekly (same user, mail on non-zero if cron `MAILTO` is set):

```bash
#!/usr/bin/env bash
set -euo pipefail
needles() {
  local host="$1"
  echo | openssl s_client -servername "$host" -connect "${host}:443" 2>/dev/null \
    | openssl x509 -noout -enddate
}
python3 - <<'PY'
import datetime, os, subprocess, sys
def days(host):
    out = subprocess.check_output(
        ["bash","-lc", f"echo | openssl s_client -servername {host} -connect {host}:443 2>/dev/null | openssl x509 -noout -enddate"],
        text=True).strip()
    # notAfter=Jan  9 04:45:23 2027 GMT
    raw = out.split("=",1)[1]
    dt = datetime.datetime.strptime(raw, "%b %d %H:%M:%S %Y %Z")
    return (dt - datetime.datetime.utcnow()).days
for host, floor in [("thesocialcollectivesg.com", 21), ("uat.cohestra.app", 21)]:
    d = days(host)
    print(f"{host} days_remaining={d}")
    if d < floor:
        print(f"FAIL: {host} expires in {d} days", file=sys.stderr)
        sys.exit(1)
PY
```

Alert = non-zero exit + cron mail. Do not add Slack/PagerDuty in this story. UAT wildcard remaining days is **watch only** — do not auto-renew it here.

## Rollback

- Failed `nginx -t` in the deploy-hook: certbot leaves the new lineage in `archive/`; nginx keeps the previous live symlink until a successful reload. Re-run `nginx -t` and do **not** recreate.
- Wrong cert-name: stop. Restore `live/thesocialcollectivesg.com` from `archive` if needed. Never delete `live/uat.cohestra.app`.
