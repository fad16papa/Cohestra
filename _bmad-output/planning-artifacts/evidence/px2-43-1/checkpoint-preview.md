# Checkpoint preview — Story 43.1 Settings nested routes

HEAD: `04f94d11` plus follow-up evidence commit  
Human question: Does Settings now behave like a real collection of addressable application pages, or does it still feel like one giant page switching hidden panels?

**Observed: REAL ADDRESSABLE PAGES.**

Each area has its own URL, `h1`, and link in Settings nav. Browser history and legacy `?section=` were exercised in Playwright, not only screenshots.

## Viewports

| Viewport | Route | File | Notes |
| -------- | ----- | ---- | ----- |
| 1440 | `/settings/plan` | `settings-plan-1440.png` | Three-pane; Plan current; Team/Billing in the same rail |
| 1440 | `/settings/team` | `settings-team-1440.png` | Team h1; current Team invite UI unchanged |
| 1440 | `/settings/billing` | `settings-billing-1440.png` | Billing h1; Paddle panel unchanged |
| 1440 | `/settings/appearance` | `settings-appearance-1440.png` | Appearance after legacy `activeId` redirect |
| 1024 | `/settings/plan` | `settings-plan-1024.png` | Left rail present (not a nav hole) |
| 768 | `/settings/team` | `settings-team-768.png` | Chips + Context; Team content usable |
| 390 | `/settings/profile` | `settings-profile-390.png` | h1 Your account; chips; Context |
| 390 | `/settings/appearance` | `settings-appearance-390.png` | Chip navigation |

## Browser checks (Playwright, live stack)

- Footer Settings → `/settings` → Admin lands on `/settings/plan`
- `/settings?section=team` → `/settings/team` (query stripped)
- Profile → Team → Billing → Back = Team then Profile
- `/settings/teem` = Page not found
- Member personal pass; Team copy; Billing stay-and-deny; Plan redirects
- Basic Team UpgradePanel preserved

## Residual

390 account “Update password” sits near the mobile tab bar (pre-existing form + shell padding). Not a routing defect; do not redesign the password form in 43.1.

39.4 `client-profile 768 clipped` is unrelated to Settings nested routes.
