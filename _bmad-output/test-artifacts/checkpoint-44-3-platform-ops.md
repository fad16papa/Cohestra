# Checkpoint preview — Story 44.3 Platform UI

Date: 2026-10-09
Question: Do these screens make clear exactly what Cohestra knows and what it does NOT know?
Expected: YES.

| View | What Cohestra knows | What it does not know |
| ---- | ------------------- | --------------------- |
| Operations 1440 Healthy | Overall + postgres/redis/default-tenant status, duration, observed time | Outbox, Paddle, email, hosted jobs (`not_in_probe` / Missing instrumentation) |
| Operations 390 Healthy | Same, wrapping copy, nav hamburger | Same |
| Operations degraded | Actual Degraded/Unhealthy labels, which checks failed | Unchecked deps still not measured — never shown as Unhealthy just because they are missing |
| Overview actual | Stack health KPI freshness=actual, overall status | Copy states this does not prove outbox/Paddle/email |
| Overview unavailable | Tenant KPIs still actual; health freshness=unavailable | Does not display previous Healthy or 0 |
| Directory degraded banner | Lists real failing checks; `/ready` does not cover outbox/Paddle/email | Banner hidden when only instrumentation is missing and measured checks are Healthy |

Evidence: Operations page Health section + not-in-probe list; Overview `stackHealthSummary`; directory banner copy.

Screenshots: `_bmad-output/planning-artifacts/evidence/px2-44-3/viewports/`

- ops-healthy-1440.png / ops-healthy-390.png
- ops-degraded-1440.png
- overview-actual-1440.png / overview-unavailable-1440.png
- directory-degraded-banner-1440.png / directory-degraded-banner-390.png

Live Playwright `platform-ops-44-3.spec.ts` passed locally (1/1) with API :8080 and web :3000.
