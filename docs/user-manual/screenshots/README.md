# Screenshots for the operator manual

Place PNG files in this folder. The manual references them as `./screenshots/NN-name.png`.

## Capture settings

- **Browser:** Chrome or Edge, window width **1440px** (or full laptop screen)
- **Theme:** Use **Light** theme for print-friendly docs (or capture both if you ship two editions)
- **Data:** Use realistic demo data (activities, clients, campaigns) — not empty states unless documenting empty state
- **Privacy:** Blur or replace real emails/phones if sharing outside your org
- **Format:** PNG, cropped to the relevant UI (include sidebar for admin pages)

## Recommended file list

| File | Screen | How to reach it |
|------|--------|-----------------|
| `01-login.png` | Sign-in page | Log out → open login |
| `02-register.png` | Operator registration | First-time `/register` (or staging) |
| `03-dashboard.png` | Dashboard with data | **Dashboard** |
| `04-nav-sidebar.png` | Sidebar + top bar | Any admin page (annotate menu) |
| `05-activities-list.png` | Activity list with filters | **Activities → All activities** |
| `06-activity-create.png` | Create activity form | **Create activity** |
| `07-activity-overview.png` | Overview tab, published | Open a published activity |
| `08-activity-form.png` | Form tab + field editor | **Form** tab |
| `09-activity-form-preview.png` | Form preview panel | Form tab, scroll to preview |
| `10-activity-registrations.png` | Registrations tab | Activity with sign-ups |
| `11-activity-qr-link.png` | QR & Link tab | Published activity |
| `12-activity-branding.png` | Public branding panel | **Overview → Public branding** |
| `13-communities.png` | Communities catalog | **Activities → Communities** |
| `14-categories.png` | Categories catalog | **Activities → Categories** |
| `15-public-registration.png` | Public registration form | Open `/register/{slug}` in incognito |
| `16-public-success.png` | Registration success + ID | Submit a test registration |
| `17-clients-list.png` | Clients list + filters | **Clients** |
| `18-client-profile.png` | Client profile + timeline | Open a client |
| `19-client-follow-up.png` | Follow-up panel + WhatsApp | Client with status **New** |
| `20-campaigns-list.png` | Campaign history | **Campaigns** |
| `21-campaign-compose-recipients.png` | Compose — recipients | **New campaign** |
| `22-campaign-compose-message.png` | Compose — message + preview | Same flow |
| `23-reports.png` | Reports with filters | **Reports** |
| `24-settings.png` | Settings page | **Settings** |
| `25-command-palette.png` | Command palette (Ctrl+K) | Press **Ctrl+K** |

## After adding images

```bash
cd docs/user-manual
python build-manual.py
```

Missing images are skipped with a warning — the manual still builds.

## Optional: numbered callouts

For step-by-step sections, duplicate a screenshot and add **1, 2, 3** arrows in PowerPoint or Snagit, save as `07-activity-overview-steps.png`.
