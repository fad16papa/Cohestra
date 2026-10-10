# Screenshots for the operator manual

Canonical captures live in `web/public/docs-screenshots/` and are served on `/docs` as `/docs-screenshots/*.png`.

Do not invent UI with image generators. Capture from an isolated seeded tenant (default Pro demo is acceptable).

## Capture settings

- Browser width **1440×900** unless noted
- Light appearance
- Seeded synthetic data only
- PNG, no production PII

## Inventory (Documentation 2.0)

| File | Route | Viewport | Plan | Fixture | Chapter |
|------|-------|----------|------|---------|---------|
| `01-login.png` | `/login` | 1440×900 | — | unauthenticated default | Sign in |
| `02-dashboard.png` | `/dashboard` | 1440×900 | Pro trial | operator@cohestra.local | Dashboard |
| `03-activities-list.png` | `/activities` | 1440×900 | Pro trial | default demo | Activities |
| `04-activity-create.png` | `/activities/new` | 1440×900 | Pro trial | default demo | Create an activity |
| `05-form-studio-build.png` | `/activities/{id}?tab=form` | 1440×900 | Pro trial | Marina Pickleball | Form Studio chrome |
| `05b-form-studio-composition.png` | Form → Go to composition | 1440×900 | Pro trial | Marina Pickleball | Form composition |
| `06-activity-design.png` | `/activities/{id}?tab=design` | 1440×900 | Pro trial | Marina Pickleball | Design |
| `07-form-studio-preview.png` | Form → Preview | 1440×900 | Pro trial | Marina Pickleball | Preview |
| `08-share-kit.png` | `/activities/{id}?tab=share` | 1440×900 | Pro trial | Marina Pickleball | Share kit |
| `09-public-registration-desktop.png` | `/register/demo-marina-social-meetup` | 1440×900 | public | Marina Pickleball | Public registration |
| `10-public-registration-mobile.png` | same | 390×844 | public | Marina Pickleball | Public registration |
| `11-clients-list.png` | `/clients` | 1440×900 | Pro trial | default demo | Clients |
| `12-client-profile.png` | `/clients/{id}` | 1440×900 | Pro trial | Sophia R. | Client profile |
| `13-follow-up.png` | `/follow-up` | 1440×900 | Pro trial | default demo | Follow-up |
| `14-website-studio.png` | `/dashboard/website` Sections + Split | 1440×900 | Pro trial | default demo, tour skipped | Website Studio |
| `15-campaigns.png` | `/campaigns/new` | 1440×900 | Pro trial | Eastside Tennis consented segment | Campaigns |
| `16-analytics.png` | `/analytics` | 1440×900 | Pro trial | default demo | Analytics |
| `17-cohestra-ai.png` | `/ai` | 1440×900 | Pro trial | default demo | Cohestra AI |
| `18-settings.png` | `/settings` | 1440×900 | Pro trial | default demo | Settings |

Recapture:

```bash
cd web && node scripts/capture-docs-screenshots.mjs
```

The public `/docs` guide is the canonical operator manual. This Markdown file must not contradict it.
