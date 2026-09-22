# Product Experience 2.0 — Phase 0.1 evidence

Repository-relative screenshots and JSON for PR #339. These replace ephemeral `blob:vscode-file` / `/tmp` references.

**Not production measurements.** Captured 2026-09-22 on this Cloud VM (`localhost:3000` + `localhost:8080`, Chromium headless).

| File | What it is |
|------|------------|
| `phase01-report.json` | Network, coverage, a11y, performance dump |
| `phase01-recapture.json` | Corrected profile / Form Studio / registration / contrast |
| `*.png` | Viewport screenshots named `{surface}_{WxH}.png` |

Local-only fixtures (database `cohestra` only; never production):

- Tenants `px2-basic`, `px2-suspended`, `px2-onhold`
- Users `px2-*-admin@cohestra.local`, `px2-member@cohestra.local` (password hash cloned from the local operator)
- Platform admin password aligned to the known local operator hash

Disposable public registration: `REG20260922000101` on `demo-marina-social-meetup`.
