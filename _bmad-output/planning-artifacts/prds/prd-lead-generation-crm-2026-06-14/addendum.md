# PRD Addendum — Lead Generation CRM

Overflow and technical context that supports the PRD but does not belong in the main requirements narrative.

## Source documents

| Document | Path | Role |
|----------|------|------|
| Business Proposal | `/Users/francisdecena/Downloads/Lead_Generation_CRM_Business_Proposal.pdf` | Primary input — Creativorare client proposal |

## Existing activity engines (field reference)

Captured from proposal for implementation alignment. PRD uses **Activity** and **Registration** terms; these are the three launch templates.

### TGH Tennis Club (The Golden Hour Club)
- Name, contact number, Instagram, nationality, profession/industry, tennis level, clinic interest, referral source

### Ikigai Dink & Drive (Pickleball / Sunday 7AM Club)
- Name, profession, contact number, first-timer status, playing level, invited by, referral source

### Ikigai Board Game Night (Play & Laugh)
- Full name, phone, profession, residency status, community consent, Facebook or Instagram, registration source

## Mechanism decisions (deferred — not PRD scope)

| Topic | Options considered | Status |
|-------|-------------------|--------|
| Email delivery | Transactional provider (SendGrid, Resend, SES) vs. SMTP | Open — MVP needs send + log only |
| WhatsApp Phase 2 | WhatsApp Business API via BSP | Deferred to Phase 2 per proposal |
| QR generation | Server-side PNG/SVG per activity URL | Implementation detail |
| Public registration hosting | Same web app, unauthenticated route per activity slug | `[ASSUMPTION]` in PRD |
| Duplicate matching | Exact match on normalized phone and/or email | Shipped — client dedup; one registration per client per activity (409 on re-submit) |

## Registration number (shipped — UAT polish 2026-06-27)

| Rule | Detail |
|------|--------|
| Format | `REG` + UTC date (`YYYYMMDD`) + 6-digit sequence |
| Visibility | Public success screen; admin activity registrations; client history; report CSV |
| Duplicate | Second submit for same client + activity blocked (409); user-facing error omits ID |

## Demo seed v2 (development / UAT)

When `DemoDataSeed:Enabled` is true, API startup wipes business data and reseeds 6 communities, 60 activities, 100 clients, 6000 registrations. Operator login preserved. See `README.md` and `_bmad-output/implementation-artifacts/registration-numbers-and-demo-seed-v2.md`.

## Operator self-service auth (shipped — UAT polish 2026-06-30)

| Capability | Detail |
|------------|--------|
| Registration | `/register` — email, nickname, password; OTP email verification |
| Single operator | Second signup blocked after first verified operator |
| Password recovery | Forgot / reset password via OTP email |
| Session | JWT + refresh; change password in Settings |

## Deployment & HTTPS (shipped — UAT polish 2026-06-30)

| Capability | Detail |
|------------|--------|
| Docker nginx | Public entry `:80`/`:443`; routes `/` → web, `/api/` → API |
| GitHub Actions CD | `.github/workflows/deploy.yml` → SSH `remote-deploy.sh` on `main` |
| Temporary TLS | nip.io hostname + Let's Encrypt (`deploy/setup-temporary-https.sh`) |
| Client domain later | `deploy/switch-https-domain.sh` — no data wipe |
| `PUBLIC_BASE_URL` | Must match browser URL exactly (CORS, email links, hero assets) |

## Proposal delivery timeline (informational)

Creativorare proposed ~8 weeks: discovery → core build → QR/forms → reports/campaigns → QA/launch. PRD does not bind schedule; retained for planning context.

## Rejected alternatives (from proposal framing)

- **Continue with disconnected Google Forms** — rejected; no master list, no source linkage, manual reporting.
- **Full WhatsApp automation in MVP** — rejected; start with click-to-message and manual status tracking until business messaging is approved.
