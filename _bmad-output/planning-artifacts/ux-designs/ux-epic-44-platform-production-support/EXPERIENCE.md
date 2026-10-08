---
status: final
updated: 2026-10-08
altitude: epic
inherits:
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-spec-43-4-platform-administration.md
design: ./DESIGN.md
---

# EXPERIENCE.md — Epic 44 Platform Production Support

## Foundation

Form factor: staff console in the existing `(platform)` shell. Desktop 1440×900, mobile 390×844. UI system: current shadcn + platform tokens. Visual identity: `{./DESIGN.md}`.

## Information Architecture

Nav order (desktop + mobile menu):

1. Overview → `/platform/overview`
2. Tenants → `/platform` (**home**; tenant detail `/platform/tenants/[id]` counts as Tenants)
3. Support → `/platform/support` (detail + report remain Support)
4. Operations → `/platform/ops` (in-page sections: Health, Billing, Outbox)
5. Audits → `/platform/audits`
6. Sign out

Do not split Operations into three top-level links. Do not move directory off `/platform`.

## Voice and Tone

Sparse ops voice. Errors: what happened, what it means, what to do. Copy lock: Suspended = “Workspace paused.” Billing OnHold = “Billing is on hold.” Never “mark paid.” Health copy must not say `/ready` proves Paddle/outbox/email.

## Component Patterns

- Provenance KPI: show value + freshness label (`actual` / `missing instrumentation` / `unavailable` / `stale`) + source + observed time.
- Operations sections: in-page headings, not nested tenant Settings chrome.
- Degraded banner on directory: actual failed check names; dismissible optional; not a chart.

## State Patterns

Every new view: `loading`, `empty`, `stale`, `degraded`, `error`, `unauthorized`, `success`. Empty outbox ≠ “email healthy.” Empty disposition table after 44.5 go-live ≠ “Paddle down” (may be `missing_instrumentation` until events arrive).

## Interaction Primitives

Restrained `transition-colors`. `prefers-reduced-motion` inherited. Recovery remains AlertDialog (43.4). No new destructive actions in this epic.

## Accessibility Floor

Skip-link → `#main-content`. One `main`, one `h1` per route. `aria-current="page"`. Focus-visible on ink. Mobile menu and primary actions ≥44px. Tables may scoped-scroll; **page** must not overflow at 390. WCAG 2.2 AA.

## Key Flows

1. **Pulse** — PlatformAdmin signs in at `/platform/login` → Overview KPIs with provenance → if health degraded, banner also on Tenants.
2. **Stuck mail** — Operations → Outbox → filter Failed → open tenant timeline (no payload).
3. **Billing ticket** — Operations → Billing → deliveries for tenant → tenant detail timeline; no replay.
4. **Who archived** — Audits search → bounded CSV.

## Responsive & Platform

Playwright 1440×900 and 390×844 for Overview, Operations, Audits, timeline, plus 43.4 directory/support regression.
