# Epic 45 — one-time owner bootstrap matrix

Do not paste values into git, chat, or screenshots. Configure names only as listed.

After these are populated, routine UAT deploy/acceptance must not require owner SSH.

| SECRET NAME | PURPOSE | WHERE OWNER CONFIGURES IT | REQUIRED |
| --- | --- | --- | --- |
| `DROPLET_HOST` | UAT droplet hostname or IP for Actions SSH | GitHub → Settings → Environments → `uat` → Environment secrets | Yes — 45.1 |
| `DROPLET_USER` | SSH user for the dedicated deploy account | Environment `uat` | Yes — 45.1 |
| `DROPLET_SSH_KEY` | Private key of a **dedicated** GitHub Actions deploy key (not the owner workstation key, not a Cursor key) | Environment `uat` | Yes — 45.1 |
| `DROPLET_DEPLOY_PATH` | Absolute checkout path on the droplet | Environment `uat` | No — defaults to `$HOME/cohestra` |
| `UAT_PUBLIC_BASE_URL` | Public UAT origin for smoke/Playwright | Environment `uat` | Yes — 45.3/45.4 (may default to `https://uat.cohestra.app` in code until set) |
| `UAT_AUTO_BASIC_EMAIL` | Alias for an **existing** Basic UAT TenantAdmin (candidate tenant `default`) | Environment `uat` | Yes — 45.4 / 19.5 authenticated Basic flows |
| `UAT_AUTO_BASIC_PASSWORD` | Password for that existing Basic operator | Environment `uat` | Yes — 45.4 / 19.5 |
| `UAT_AUTO_PRO_EMAIL` | Alias for an **existing** Pro UAT TenantAdmin (candidate tenant `creativorare`) | Environment `uat` | Yes — 19.5 Pro flows |
| `UAT_AUTO_PRO_PASSWORD` | Password for that existing Pro operator | Environment `uat` | Yes — 19.5 |
| `UAT_OTP_MAILBOX_HOST` | Dedicated UAT IMAP host (TLS 993) | Environment `uat` | Yes — 45.5 live OTP only. **Not required for Story 19.5.** |
| `UAT_OTP_MAILBOX_USER` | Dedicated mailbox username | Environment `uat` | Yes — 45.5 live OTP only. **Not required for Story 19.5.** |
| `UAT_OTP_MAILBOX_SECRET` | Dedicated mailbox IMAP secret | Environment `uat` | Yes — 45.5 live OTP only. **Not required for Story 19.5.** |
| `UAT_OTP_MAILBOX_ADDRESS` | Dedicated recipient address if it differs from the IMAP user | Environment `uat` | No — defaults to `UAT_OTP_MAILBOX_USER`. Not required for 19.5. |

**45.5 provider pick (minimal secure option):** a **dedicated IMAP mailbox** using the names above. No new vendor. No Mailosaur. No personal Gmail/Outlook. If these names are unset, Deploy UAT skips the OTP test and prints `MISSING_SECRET=<NAME>` only from `--check-secrets`. Values stay out of chat.

## Not in this matrix

- Real Google reCAPTCHA site/secret for `uat.cohestra.app` stay on the **droplet `.env`**, never in git or chat. Layer A only checks presence/booleans.
- Official Google v2 **test** keys used in Layer B belong only to the isolated CI/automation stack, never to live UAT Environment secrets as a substitute for real keys.
- Production/live Paddle, production DNS, and production deploy credentials are forbidden here.

## First Actions run after 45.1

If secrets are missing, the job must fail with `MISSING_SECRET=<NAME>` lines only. That is the owner gate. Do not SSH. Do not send values in chat.
