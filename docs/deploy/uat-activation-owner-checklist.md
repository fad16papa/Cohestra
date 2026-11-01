# Owner-only UAT activation readiness checklist

Presence and status only. **Do not paste secret values.**

`UAT_DEPLOY_GATE_ACTIVE` must remain `false` until a later, separate owner
activation approval. This checklist does not authorize activation.

## GitHub Environment `uat` (names present / absent)

- [ ] `DROPLET_HOST`
- [ ] `DROPLET_USER`
- [ ] Dedicated Actions-only `DROPLET_SSH_KEY` (not a personal laptop key)
- [ ] Optional `DROPLET_DEPLOY_PATH` (default `/home/deploy/cohestra`)
- [ ] `UAT_PUBLIC_BASE_URL` (https://, not the shared CRM host)
- [ ] `UAT_AUTO_BASIC_EMAIL` / `UAT_AUTO_BASIC_PASSWORD` / Basic slug
- [ ] `UAT_AUTO_PRO_EMAIL` / `UAT_AUTO_PRO_PASSWORD` / Pro slug
- [ ] OTP mailbox names only if OTP is in desired acceptance scope
- [ ] Repository `GITGUARDIAN_API_KEY` remains scan-only and off `pull_request`

## Actions SSH and droplet Git

- [ ] Least-privilege `deploy` user
- [ ] Actions public key authorized; laptop keys not required for CD
- [ ] GitHub-hosted runners can reach the droplet on port 22
- [ ] Droplet `git fetch origin main` uses a **read-only** Git credential
      independent from the Actions SSH key

## Docker / Compose / app env

- [ ] Docker and isolated `cohestra-uat` compose present
- [ ] Sequential builds have enough disk/memory
- [ ] `.env` present on the droplet (not in git)
- [ ] Real UAT reCAPTCHA keys; no bypass token
- [ ] Paddle sandbox
- [ ] SendGrid configured for UAT only
- [ ] Ports isolated; reverse proxy / DNS / TLS for `uat.cohestra.app`

## Database backup and monitoring

- [ ] Recent `pg_dump` exists and restore was owner-rehearsed on a copy
- [ ] Migration compatibility reviewed for a previous-SHA rollback
- [ ] Emergency stop known: unset `UAT_DEPLOY_GATE_ACTIVE` and/or disable
      **Deploy UAT**
- [ ] Owner can distinguish intentional HOLD (workflow failure + JSON `HELD`)
      from auth/check/deploy failure
- [ ] UAT-only alerting/monitoring named (presence, not credentials)

## Still forbidden here

- Setting `UAT_DEPLOY_GATE_ACTIVE=true`
- Dispatching Deploy UAT or UAT rollback
- Merging PR #505
- Any Production change
