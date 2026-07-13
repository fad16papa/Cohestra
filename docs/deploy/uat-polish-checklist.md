# UAT polish checklist (pre-client handoff)

Use before sharing the UAT URL. Focus: **deployment readiness**, **operator confidence**, **production safety**.

## Deployment

- [ ] Droplet provisioned (Ubuntu 22.04+, 2 GB+ RAM, backups enabled)
- [ ] DigitalOcean firewall: **22, 80, 443 only** (no 5432/6379/3000/8080)
- [ ] DNS A record points to droplet
- [ ] `.env` filled with strong secrets (not dev defaults)
- [ ] `docker compose -f docker-compose.uat.yml up -d --build` succeeds (includes nginx)
- [ ] `bash deploy/uat-smoke.sh` passes on server
- [ ] Docker nginx healthy — `curl ${PUBLIC_BASE_URL}/ready`
- [ ] HTTPS (recommended) — `bash deploy/setup-temporary-https.sh` or client domain — see [temporary-https-nipio.md](./temporary-https-nipio.md)
- [ ] `curl https://YOUR_DOMAIN/ready` healthy (postgres + redis)
- [ ] `DemoDataSeed__Enabled=false` and `OperatorSeed__Enabled=false`

## Operator onboarding (single account)

- [ ] Visit `/register` — create operator (email, nickname, password)
- [ ] OTP email received and verification succeeds
- [ ] Second signup attempt blocked (single operator enforced)
- [ ] Sign in at `/login`
- [ ] Session refresh works (tab open >15 min, perform action)
- [ ] Logout clears session
- [ ] Change password in Settings works

## Core operator flows

- [ ] Dashboard metrics load and poll
- [ ] Create activity → configure form → publish
- [ ] QR code and registration link work on mobile
- [ ] Public registration submits successfully
- [ ] Client dedup by phone works
- [ ] Client profile: lead status, timeline, WhatsApp actions
- [ ] Reports filters + CSV export
- [ ] Communities / categories CRUD
- [ ] Campaign compose: segment preview, send test to operator inbox
- [ ] Settings → Email delivery checklist visible

## SendGrid (required before deploy)

Complete **[SendGrid production setup](./sendgrid-production.md)** first.

- [ ] Domain authenticated (SPF/DKIM)
- [ ] From address verified
- [ ] Restricted Mail Send API key in `.env`
- [ ] API starts without SendGrid validation errors
- [ ] Settings → Email delivery all **Complete**
- [ ] Test campaign **Delivered** in SendGrid Activity Feed

## Data & URLs

- [ ] No demo seed data in production DB (fresh volume or verified empty)
- [ ] `PublicWeb__BaseUrl` / registration links use live HTTPS URL
- [ ] Campaign asset uploads persist (volume `campaign_assets_data`)

## Database tools (optional, for your team)

- [ ] SSH tunnel to Postgres documented — [database-tools.md](./database-tools.md)
- [ ] pgAdmin connects via `localhost:15432` tunnel
- [ ] RedisInsight connects via `localhost:16379` tunnel
- [ ] Tunnels not exposed publicly (firewall unchanged)

## UX polish

- [ ] Light / dark / system theme on admin pages
- [ ] Brand accent in Settings applies on admin routes
- [ ] Mobile layout acceptable on dashboard, clients, registration form
- [ ] Toast dismiss (X) works
- [ ] Error messages readable (no raw stack traces)

## Monitoring & rollback

- [ ] Know log command: `docker compose -f docker-compose.uat.yml logs -f api web`
- [ ] Postgres backup tested once
- [ ] Rollback plan: previous git tag + `docker compose ... up -d --build`

## Client handoff package

1. UAT URL (`https://...`)
2. Note: operator self-registers at `/register` (or you pre-create and share credentials securely)
3. SendGrid sender auth status (or joint DNS session)
4. Short UAT script: register lead → client appears → follow up → report → campaign
5. Support contact for UAT window

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Dev | | | Stack deployed, smoke tests pass |
| Operator (client) | | | Accepts UAT environment |
| PM | | | UAT window start/end agreed |
