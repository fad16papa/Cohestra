# Story 38.1 — billing-sync evidence

Repository-relative screenshots for PR #341. These replace ephemeral `blob:vscode-file` / `/tmp` recording links.

**Not production measurements.** Captured 2026-09-22 on this Cloud VM (`default.localhost:3000` + `localhost:8080`, Chromium) with Paddle unconfigured.

| File | What it is |
|------|------------|
| `dashboard.webp` | Fresh TenantAdmin dashboard after login — no billing 503 toast |
| `clients.webp` | Clients after ordinary navigation — no billing-sync POST |
| `billing-unavailable.webp` | Settings → Billing named unavailable copy |

A walkthrough recording was used during review and is not committed (too large). Live Playwright `web/e2e/billing-sync-38-1.spec.ts` is the automated network proof.
