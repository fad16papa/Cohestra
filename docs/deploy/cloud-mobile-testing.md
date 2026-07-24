# Cloud mobile testing (DigitalOcean + HTTPS nip.io)

Test Cohestra on your phone **without a custom domain**. Uses the same Docker stack as UAT; adds HTTPS and nip.io tenant subdomains so signup → verify → dashboard works on mobile.

## What you get

| URL | Purpose |
|-----|---------|
| `https://129-212-235-2.nip.io/` | Marketing home, pricing, legal |
| `https://129-212-235-2.nip.io/signup` | Self-serve Basic signup (Story 14.3) |
| `https://YOUR-SLUG.129-212-235-2.nip.io/dashboard` | Tenant workspace after email verify |

Replace `129-212-235-2` with **your droplet IP** (dots → hyphens).

## Prerequisites

- DigitalOcean droplet (Ubuntu 22.04+, 2 GB RAM minimum)
- Firewall: inbound **22**, **80**, **443** only
- Repo cloned on droplet (`~/cohestra`)
- SendGrid API key (required for OTP emails in Production mode)

## One-time setup (on droplet)

```bash
cd ~/cohestra
git pull origin cursor/cohestra-enterprise-prd-4da3   # or main after merge

cp .env.cloud-mobile.example .env
nano .env   # set POSTGRES_PASSWORD, JWT_SIGNING_KEY, SendGrid__ApiKey, LETSENCRYPT_EMAIL

bash deploy/setup-cloud-mobile.sh
```

The script:

1. Runs `deploy/setup-temporary-https.sh` (Let's Encrypt + nip.io)
2. Sets CAPTCHA bypass for mobile testing (safe default)
3. Rebuilds web + api with correct `PUBLIC_BASE_URL`
4. Runs smoke checks including `/signup` and legal API

## Test on your phone

1. Open `https://YOUR-IP-HYPHENS.nip.io/signup`
2. Create a workspace (org name, slug, email, password)
3. Check email for OTP (SendGrid) — or API logs in dev if mail fails
4. Complete verify → lands on `https://YOUR-SLUG.YOUR-IP-HYPHENS.nip.io/dashboard`

### Mobile checklist

- [ ] Marketing home loads (`/`, `/pricing`)
- [ ] Signup form + slug availability check
- [ ] OTP email received
- [ ] Dashboard loads on tenant subdomain
- [ ] Login works after verify

## Does this break local dev?

**No.** Changes are additive:

- Local `docker compose up` still uses `http://localhost` and `{slug}.localhost`
- UAT compose only changes when you deploy to the droplet
- nip.io host rules are ignored on localhost

## Updating after code changes

```bash
cd ~/cohestra
git pull
docker compose -f docker-compose.uat.yml up -d --build
bash deploy/uat-smoke.sh
```

Or trigger **GitHub Actions → Deploy** (after merge to `main`) if droplet secrets are configured.

## Enable reCAPTCHA (before public launch)

Edit `.env` on droplet:

```bash
SelfServeSignup__Recaptcha__Enabled=true
SelfServeSignup__Recaptcha__SecretKey=your-secret
NEXT_PUBLIC_RECAPTCHA_ENABLED=true
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
```

Rebuild web + api:

```bash
docker compose -f docker-compose.uat.yml up -d --build web api
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS / API errors on phone | `PUBLIC_BASE_URL` must exactly match browser URL (including `https://`) |
| Signup works but dashboard 404 | Use tenant URL `https://slug.IP-HYPHENS.nip.io/dashboard`, not bare IP |
| OTP never arrives | Check SendGrid key + `docker compose ... logs api` |
| CAPTCHA error | Keep bypass enabled for testing, or add real reCAPTCHA keys |
| Cert errors | Re-run `bash deploy/setup-temporary-https.sh` |

## Related

- [digitalocean-uat.md](./digitalocean-uat.md) — full droplet deploy
- [temporary-https-nipio.md](./temporary-https-nipio.md) — nip.io + Let's Encrypt details
- [github-actions-cd.md](./github-actions-cd.md) — CI/CD to droplet
