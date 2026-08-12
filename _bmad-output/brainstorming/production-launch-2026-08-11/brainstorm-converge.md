# Production launch brainstorm — converge (2026-08-11)

**Mode:** Ideate for me (headless)  
**Goal:** All necessary changes before production ship

## Must ship (code/CI — done in PR)

1. **Catalog backfill** — activities with labels not in per-tenant catalog would fail edit after P2 validation
2. **CSP enforce docs** — checklist still said report-only; code already enforces
3. **Preflight + header scripts** — repeatable gates for droplet deploy
4. **CI Docker smoke** — API + Playwright on compose stack

## Must ship (ops — owner action)

1. reCAPTCHA keys + web rebuild (19.3)
2. Strong secrets + `ASPNETCORE_ENVIRONMENT=Production` on UAT compose (19.1)
3. HTTPS + HSTS verify on live URL (19.2)
4. Stripe test webhook on droplet (19.4)
5. Operator §7 sign-off (19.5)
6. GitHub branch protection for SM-1

## Should (post-launch or parallel)

- Regenerate operator manual DOCX/PDF
- Close stale draft brainstorm PRs
- Sender settings UI (product gate)

## Decision

**Path:** Controlled UAT (Epic 19) → self-serve with reCAPTCHA. Not full public SaaS until operator sign-off.
