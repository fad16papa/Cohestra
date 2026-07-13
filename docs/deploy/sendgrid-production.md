# SendGrid production setup

This deployment uses **live SendGrid delivery** — not sandbox. The API **refuses to start** in `Production` without a valid `SendGrid:ApiKey`, `SendGrid:FromEmail`, and `SendGrid:UseSandbox=false`.

Complete this **before** `docker compose -f docker-compose.uat.yml up` on the droplet.

## Target configuration

| Setting | Value |
|---------|-------|
| From email | `noreply@creativorare.com` (campaigns, OTP, registration) |
| From name | `Creativorare` |
| Sandbox | **Off** (enforced in `docker-compose.uat.yml`) |
| API key scope | **Mail Send** only (restricted key recommended) |

## 1. Authenticate your domain (recommended)

Domain authentication improves deliverability (SPF + DKIM).

1. Log in to [SendGrid](https://app.sendgrid.com/)
2. **Settings → Sender Authentication → Authenticate Your Domain**
3. Choose your DNS host and enter **`creativorare.com`**
4. SendGrid provides **CNAME records** — add them at your DNS provider:
   - Typically 3 CNAMEs for DKIM + optional link branding
   - May include an SPF-related record depending on setup wizard
5. Wait for SendGrid to show **Verified** (can take up to 48h; often minutes)

Confirm in SendGrid that the domain shows **Valid** / authenticated.

## 2. Verify the From address

If you use `noreply@creativorare.com`:

- With **domain authentication** complete, any `@creativorare.com` address can send once the domain is valid.
- Alternatively use **Verify a Single Sender** if not using domain auth (not recommended for production volume).

**Settings → Sender Authentication → Verify a Single Sender** (if needed):

1. Add `noreply@creativorare.com`
2. Complete the verification email SendGrid sends to that inbox

The in-app checklist (**Settings → Email delivery**) confirms verification via the SendGrid API after deploy.

## 3. Create a restricted API key

1. **Settings → API Keys → Create API Key**
2. Name: e.g. `Cohestra Production`
3. Permissions: **Restricted Access** with:
   - **Mail Send → Full Access** (required to send campaigns)
   - **Sender Authentication → Read Access** (required for in-app delivery checklist)
   - Or use **Full Access** for simplicity on a single-operator deploy
4. Copy the key (`SG....`) — shown once only

Store in server `.env`:

```bash
SendGrid__ApiKey=SG.your-live-key-here
SendGrid__FromEmail=noreply@creativorare.com
SendGrid__FromName=Creativorare
```

Never commit the key. Never expose it in the browser or client handoff docs.

## 4. Deploy with live SendGrid

On the Ubuntu droplet:

```bash
cp .env.uat.example .env
nano .env   # paste API key + confirm FromEmail
docker compose -f docker-compose.uat.yml up -d --build
```

If SendGrid is missing or sandbox is enabled, the **API container will exit** on startup with a clear error in logs:

```bash
docker compose -f docker-compose.uat.yml logs api
```

## 5. Verify delivery

### In-app checklist

1. Sign in → **Settings → Email delivery**
2. All items should show **Complete** (domain auth may show **Info** only for freemail domains — not applicable for `@creativorare.com`)

### Test campaign

1. Create a test client with **your own email** and **consent given**
2. **Campaigns → Compose** → segment to that client only
3. Send a short test subject/body
4. Confirm delivery in your inbox (check spam once if needed)
5. Review **Campaigns** list — delivered count should be 1, failed 0

### SendGrid activity feed

**Activity → Activity Feed** in SendGrid should show **Delivered** (not merely Processed in sandbox).

## 6. Production safeguards already in the app

| Guard | Behavior |
|-------|----------|
| Startup validation | Production requires API key + From email; sandbox blocked |
| Compose | Send disabled when no consented emailable recipients |
| Per-recipient send | Individual messages — recipient lists not exposed in headers |
| Error surfacing | SendGrid rejection messages parsed for operators |
| Duplicate follow-up | Server-side 409 within 15 minutes (WhatsApp timeline) |

## Troubleshooting

| Error / symptom | Fix |
|-----------------|-----|
| API won't start: `SendGrid:ApiKey is required` | Set `SendGrid__ApiKey` in `.env` |
| API won't start: `UseSandbox must be false` | Remove sandbox override; compose file locks `false` |
| `The from address does not match a verified Sender Identity` | Complete sender or domain verification in SendGrid |
| Campaign sent count 0 / all failed | Check Activity Feed; verify DNS; confirm From email matches verified identity |
| Checklist: domain not authenticated | Add SendGrid CNAME records at DNS; wait for propagation |
| Mail in spam | Ensure domain auth complete; avoid spam trigger words in first tests |

## DNS record checklist (hand to client IT)

Provide SendGrid's exact CNAME host/value pairs from the domain authentication wizard. Typical pattern:

- [ ] DKIM CNAME 1 added at DNS provider
- [ ] DKIM CNAME 2 added at DNS provider
- [ ] Link branding CNAME (if enabled)
- [ ] SendGrid domain status = **Verified**
- [ ] Test send to Gmail + Outlook inboxes

## Related

- [DigitalOcean deployment](./digitalocean-uat.md)
- [UAT polish checklist](./uat-polish-checklist.md)
