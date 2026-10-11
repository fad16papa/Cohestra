# Host-managed HTTP-01 renew for thesocialcollectivesg.com — corrected 2026-10-11

**Mutation:** none. Scripts exist in git. Do **not** `systemctl enable` or run a live renew without owner authorization.  
**Finding (PR #438):** a certbot `--deploy-hook` that calls `docker exec` runs **inside** the certbot container, which has no Docker socket. That hook cannot reload nginx. **Fixed:** host script compares live fullchain fingerprints, then `docker exec … nginx -t` / `nginx -s reload` on the host.

**Out of scope:** Cohestra UAT wildcard DNS-01 (`uat.cohestra.app` / `*.uat.cohestra.app`). Never pass those names to this path. Never use `deploy/renew-letsencrypt.sh`.

## Runtime (authorized later)

```bash
# as deploy, after prove lineages are separate
COHESTRA_AUTHORIZE_EXISTING_RENEW=1 bash deploy/host-proxy/renew-existing-site-http01.sh --dry-run
COHESTRA_AUTHORIZE_EXISTING_RENEW=1 bash deploy/host-proxy/renew-existing-site-http01.sh
```

Behavior:

1. Refuse unless cert-name is `thesocialcollectivesg.com`.
2. Refuse unless `COHESTRA_AUTHORIZE_EXISTING_RENEW=1`.
3. SHA-256 `fullchain.pem` via `docker exec` on `lead-generation-crm-nginx-1` (certs already mounted there).
4. Throwaway `certbot/certbot` `renew --cert-name thesocialcollectivesg.com` — **no deploy-hook**.
5. Re-read fingerprint.
   - Same → `RESULT=NOOP`, no reload.
   - Different → host `nginx -t`; only then `nginx -s reload` → `RESULT=RENEWED`.
   - `nginx -t` fail → `RESULT=NGINX_TEST_FAIL`, **no reload** (process keeps the previous in-memory cert).
6. No container recreate.

Tests (CI via isolation contract): `deploy/host-proxy/renew-existing-site-http01.test.sh` — renew, no-op, certbot fail, nginx -t fail, UAT name refuse, missing auth env.

## Timer that survives logout and reboot

Use **system** units (not `~/.config/systemd/user`). User timers die on logout unless linger is enabled; system timers do not.

Install **only** after owner authorization and a successful dry-run:

```bash
sudo install -m 644 deploy/host-proxy/systemd/cohestra-existing-site-http01-renew.service /etc/systemd/system/
sudo install -m 644 deploy/host-proxy/systemd/cohestra-existing-site-http01-renew.timer /etc/systemd/system/
sudo install -m 644 deploy/host-proxy/systemd/cohestra-existing-site-http01-renew-alert.service /etc/systemd/system/
sudo install -m 644 deploy/host-proxy/systemd/cohestra-edge-cert-expiry-watch.service /etc/systemd/system/
sudo install -m 644 deploy/host-proxy/systemd/cohestra-edge-cert-expiry-watch.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cohestra-existing-site-http01-renew.timer
sudo systemctl enable --now cohestra-edge-cert-expiry-watch.timer
```

Units run as `User=deploy` `Group=docker`. `OnFailure=` starts the alert oneshot (`logger` + optional `mail` if `COHESTRA_OPS_MAIL` is set).

An uninstalled timer is **not** operational. 19.2 must not treat this as PASS.

## Monitoring / alerts

| Signal | How |
|--------|-----|
| Renew fail | systemd `OnFailure` + `journalctl -u cohestra-existing-site-http01-renew.service` |
| `nginx -t` fail after disk change | `RESULT=NGINX_TEST_FAIL`; no reload |
| Expiry &lt; 21 days | `watch-edge-cert-expiry.sh` twice weekly (existing + UAT watch-only) |
| Mail | optional `COHESTRA_OPS_MAIL`; journal is the default sink |

UAT wildcard remaining days is **watch only**.

## Authorization (before any install)

1. Owner names this install in writing (separate from 19.1/19.2 close).
2. Lineages still separate: existing leaf SAN `thesocialcollectivesg.com` only; UAT SAN `uat` + `*.uat`.
3. Dry-run as `deploy` (talks to Let's Encrypt; does **not** reload):

```bash
COHESTRA_AUTHORIZE_EXISTING_RENEW=1 bash deploy/host-proxy/renew-existing-site-http01.sh --dry-run
# expect RESULT=DRY_RUN_OK and no --deploy-hook
```

4. Certbot container is throwaway `certbot/certbot:latest` with **only** cert + www volumes. No Docker socket. Reload is host `docker exec` after fingerprint change.

## Alert validation (authorized, no renew)

```bash
sudo systemctl start cohestra-existing-site-http01-renew-alert.service
journalctl -u cohestra-existing-site-http01-renew-alert.service -n 20
# expect RESULT=RENEW_ALERT in journal. Optional mail only if COHESTRA_OPS_MAIL is set.
sudo systemctl start cohestra-edge-cert-expiry-watch.service
# expect RESULT=EXPIRY_OK while both leaves have >21 days
```

Do not `systemctl start` the renew **service** (non-dry-run) unless the owner also authorized a live HTTP-01 attempt.

## Rollback (installed timer)

```bash
sudo systemctl disable --now cohestra-existing-site-http01-renew.timer
sudo systemctl disable --now cohestra-edge-cert-expiry-watch.timer
# units may stay on disk; removing them is optional
# never delete live/thesocialcollectivesg.com or live/uat.cohestra.app
```

- Certbot fail: no fingerprint change, no reload.
- `nginx -t` fail: do not reload; fix config; do not recreate nginx.
- Wrong lineage: refuse. Never delete `live/uat.cohestra.app`.
- Uninstall does not revert a successful Let's Encrypt renew already on disk.

## UAT wildcard (separate)

DNS-01 for `uat.cohestra.app` / `*.uat.cohestra.app` stays **MANUAL-ACCEPTED**. The HTTP-01 timer must never receive those names (`refuse_wrong_lineage`). Expiry watch reports UAT days remaining only.
