# BMAD review — Epic 19 additive TLS ACME recovery

**HEAD:** `2442b42`
**Scope:** `apply-additive-tls.sh`, `diagnose-edge-tls.sh`, `prove-edge-tls.sh`, isolation contract, host-proxy README
**Decision:** PASS (no BLOCKER / MAJOR on this HEAD)

## Blind / edge / acceptance

| Sev | Finding | Disposition |
|-----|---------|-------------|
| MINOR | Re-running apply after a TLS PASS briefly replaces `listen 443` with HTTP+ACME, so HSTS browsers can see the existing default_server cert until Phase 3 reloads. First apply (current droplet) has no UAT 443 yet. | Accept. Do not re-run after `EDGE TLS PROOF: PASS`. |
| MINOR | ACME contact is reused from the existing edge account (`mailto:` / `pref_email`). Correct for this shared certbot volume; value is never printed. | Accept. |
| NOTE | Certbot stdout may mention account state. Owner should paste `EDGE TLS PROOF` / `ADDITIVE TLS` lines, not a full certbot dump. | Ops hygiene. |

## Contract

- Isolation: 44/44 PASS (`validate-uat-isolation.sh`).
- Still refuses root, apex, `cohestra_uat_certbot_*`, `active-ssl.conf`, `compose up`, `force-recreate`.
- HTTP-01 preflight must return `preflight-ok` before Let's Encrypt is called.
- `--cert-name` is `uat.cohestra.app`; existing live cert path is checked present/untouched, not overwritten by name.

## Live proof (not this HEAD)

HTTPS is **not** proven until the owner runs apply as `deploy` from `/home/deploy/cohestra` and pastes `EDGE TLS PROOF: PASS`. Browser `NET::ERR_CERT_COMMON_NAME_INVALID` remains the existing default_server cert.
