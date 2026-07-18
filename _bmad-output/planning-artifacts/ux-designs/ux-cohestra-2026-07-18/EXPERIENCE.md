---
name: Cohestra Enterprise
status: draft
created: 2026-07-18
updated: 2026-07-18
sources:
  - {planning_artifacts}/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - {planning_artifacts}/prds/prd-cohestra-enterprise-2026-07-15/addendum.md
  - {planning_artifacts}/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - {planning_artifacts}/ux-designs/ux-lead-generation-crm-2026-06-14/EXPERIENCE.md
  - docs/marketing/pricing-tiers.md
design: ./DESIGN.md
---

# Cohestra Enterprise — Experience Spine

> Multi-tenant SaaS UX. Behavioral delta over Platform 0 (`ux-lead-generation-crm-2026-06-14`). Visual tokens → `{DESIGN.md}`. Spines win on conflict.

## Foundation

**Form factor:** Responsive web — multiple experiences on shared infrastructure.

| Surface family | Primary user | Posture |
|----------------|--------------|---------|
| Marketing + signup | Prospect (Priya) | Apex `cohestra.app` — freemium CTAs |
| Tenant admin | Tenant Admin / Member | Desktop-first on `{slug}.cohestra.app` |
| Public tenant home | Visitor | Plan-gated: stub / fixed SitePage / builder |
| Public registration | Participant (Elena) | Mobile-first `/register/{activity-slug}` |
| Platform Admin | Cohestra operator | Sparse console — lifecycle + audit |

**UI system:** shadcn/ui + Tailwind + next-themes. Brand layer in `DESIGN.md` (inherits Platform 0 Warm Utility).

**Tenancy:** Session bound to one tenant (`tenant_id` JWT). No tenant switcher in v1. Subdomain resolves public + admin context.

**Roles:** Tenant Admin · Tenant Member · Platform Admin — effective access = **role ∩ plan ∩ Status ∩ BillingStatus** (PRD FR-3, FR-5).

**Refresh model:** Inherit Platform 0 dashboard polling. Billing banners refresh on navigation + webhook-driven soft refresh `[ASSUMPTION]`.

## Information Architecture

### Marketing (apex)

| Surface | Route | Purpose |
|---------|-------|---------|
| Marketing home | `/` | Brand + Start free / Start trial CTAs |
| Pricing | `/pricing` | Basic / Core / Pro / Enterprise — `docs/marketing/pricing-tiers.md` |
| Signup Basic | `/signup` | Start free — CAPTCHA, ToS/Privacy, slug, OTP |
| Signup paid | `/signup?plan=core\|pro` | Checkout + 30-day trial (secondary path) |
| Legal | `/terms`, `/privacy` | ToS / Privacy (FR-26a) |

### Public (tenant subdomain)

| Surface | Route | Plan | Purpose |
|---------|-------|------|---------|
| Stub home | `/` | Basic | Org name + published activity links |
| Fixed SitePage | `/` | Core | Branded fixed home (no composer) |
| Built SitePage | `/` | Pro | Published builder page |
| Registration | `/register/{activity-slug}` | All | Platform 0 form flow |
| Maintenance | `/` + admin | Suspended | Public maintenance message |

### Tenant admin (authenticated)

| Surface | Route | Who | Plan notes |
|---------|-------|-----|------------|
| Login | `/login` | All roles | Tenant-scoped |
| Dashboard | `/dashboard` | Admin, Member | Plan limits banners |
| Activities / Communities / Categories | `/activities…` | Admin, Member | Cap warnings at 80% |
| Clients | `/clients…` | Admin, Member | — |
| Reports | `/reports` | Admin, Member | Basic = fixed + CSV; Core+ = queryable; Pro + campaigns |
| Campaigns | `/campaigns…` | Admin, Member | **Pro only** — else UpgradePanel |
| Website / Site | `/site` | Admin, Member | Basic → upgrade; Core fixed settings; Pro builder |
| Team | `/settings/team` | **Admin** | Basic soft-blocked (1 seat); Core 3 / Pro 10 |
| Billing | `/settings/billing` | **Admin** | Opens Stripe Customer Portal; Basic shows upgrade |
| Tenant settings | `/settings` | **Admin** | SendGrid sender, org display name |
| Account / Appearance | `/settings/account` | Admin, Member | Theme |

**Nav rules:** Hide or lock Campaigns for Basic/Core. Site nav always visible with UpgradePanel when locked. Team/Billing only for Tenant Admin.

### Platform Admin

| Surface | Purpose |
|---------|---------|
| Tenant directory | Search, Plan, Status, BillingStatus |
| Tenant detail | Suspend / reactivate / archive; complimentary flag (P12); audit |
| Health | Platform readiness |

No impersonation in v1 (PRD A-5).

**Surface closure**

| Need | Surface |
|------|---------|
| UJ-1 Start free → stub + register | Signup → Dashboard → Activity → Stub `/` |
| UJ-2 invite (Core+) | Team → invite → Member login |
| UJ-3 participant register | `/register/{slug}` |
| UJ-4 break-glass Suspend | Platform Admin tenant detail |
| Billing self-serve | Settings → Billing → Customer Portal |
| Plan upgrade | UpgradePanel / Pricing / Checkout |

## Voice and Tone

Microcopy only. Aesthetic in `DESIGN.md`.

### Signup / marketing

| Do | Don't |
|----|-------|
| "Start free" | "Start your journey 🚀" |
| "No card required on Basic" | "Freemium forever!!!" |
| "You will not be charged while your trial is active" | Hide trial end date |

### Tenant admin

| Do | Don't |
|----|-------|
| "Upgrade to Core for a second seat" | "Seat limit exceeded (403)" as only UI |
| "Settle your bill" + Portal link | "Account delinquent — contact support" as first step |
| "Community" | "Club" as product label |
| Member locked feature: "This feature needs Pro" | Member-facing "Upgrade billing" CTA |

### Public stub

| Do | Don't |
|----|-------|
| "{Org name}" + list of activities | Hero collage, promo badges, stats strip |
| Plain activity → register links | Card grids mimicking a marketing site |

### Platform Admin

| Do | Don't |
|----|-------|
| "Suspend — abuse / ToS / support freeze" | "Suspend for non-payment" as primary label |
| Reason + audit required | Silent status flip |

## Component Patterns

Behavioral. Visuals in `DESIGN.md`.

| Component | Behavioral rules |
|-----------|------------------|
| **PlanBadge** | Always visible to Tenant Admin in top bar; Members may see plan name read-only `[ASSUMPTION]` |
| **BillingBanner** | PastDue: daily settle CTA. OnHold: read-only mode + Portal. Trial last 7 days: daily reminder + trial end date. Suspended: login blocked (not a banner inside app). |
| **UpgradePanel** | Replaces locked module body. Admin → Checkout/upgrade. Member → feature-locked, no billing. |
| **SeatGate** | Soft-block invite when `active + pending ≥ seat cap`. Basic: disable + upgrade Core. |
| **StubHome** | No SitePage entity; list published activities only; empty state: "No published activities yet." |
| **LimitMeter** | Communities / published / regs — warn ≥80%, block at 100% with clear which dial |
| **ToSCheckbox** | Signup blocked until checked; versions logged (FR-26a) |
| **CaptchaGate** | Always on self-serve signup (FR-26) |

Platform 0 patterns (RegistrationForm, ClientRow, QrPanel, etc.) inherit unless gated above.

## State Patterns

| State | Treatment |
|-------|-----------|
| Basic empty tenant | Dashboard empty + CTA create Community/Activity; stub empty list |
| At seat cap | SeatGate on Team |
| At published/regs cap | LimitMeter block; cannot publish / public register rejects with friendly message |
| Trialing | PlanBadge + trial end in BillingBanner (last 7 days) |
| PastDue | Warn banner; full access until day 7 |
| OnHold | Danger banner; admin read-only; public registration blocked |
| ReadOnly_OverLimit | After downgrade; banner lists what to archive |
| Suspended | Login blocked; public maintenance |
| Archived | Public 404; admin blocked |
| Plan-locked module | UpgradePanel (not empty table) |
| Complimentary (P12) | No delinquency banners; PlanBadge may show plan without Stripe `[ASSUMPTION: "Sponsored" label optional]` |

## Interaction Primitives

- Inherit Platform 0 admin keyboard/table patterns where present.
- Billing / Portal: leave app to Stripe-hosted UI; return URL restores Settings → Billing.
- Upgrade Checkout: Stripe-hosted; success → dashboard with new Plan.
- Invite accept: email magic link → set password → Member dashboard.
- Banned: Member opening Customer Portal; Basic sending invites; stacking upgrade modals.

## Accessibility Floor

- WCAG 2.2 AA on marketing, admin, stub, registration, platform admin.
- BillingBanner is not color-only — text + icon + link.
- PlanBadge has text label, not color alone.
- Focus order: banner → main; Esc closes dialogs.
- CAPTCHA must offer accessible alternative path per provider `[ASSUMPTION: provider choice in implementation]`.

## Responsive & Platform

| Breakpoint | Behavior |
|------------|----------|
| Admin `≥ lg` | Sidebar + PlanBadge in top bar |
| Admin `sm` | Sidebar Sheet; BillingBanner stacks CTA under text |
| Stub / SitePage | Mobile-first; stub is single column |
| Registration | Platform 0 mobile-first unchanged |
| Marketing | Desktop hero + stacked CTAs on `sm` — Start free primary |

## Key Flows

### Flow A — UJ-1 Priya starts free (Basic)

1. Priya opens `cohestra.app` → **Start free**.
2. Completes CAPTCHA, ToS/Privacy, org name, slug `ikigai`, email, password.
3. Verifies email OTP → lands on empty Basic dashboard (PlanBadge **Basic**, no Stripe).
4. Creates Community "Weekend Clinics" → Activity "Sunday clinic" → publishes (within 3).
5. Opens public stub `ikigai.cohestra.app` — org name + activity link.
6. **Climax:** Copies QR / register link; first real registration path works without a card.
7. Resolution: Uses fixed report + CSV; sees upgrade CTAs for Site Page and Team.

### Flow B — UJ-2 Priya invites Marco (Core+)

1. Priya upgrades to Core (Checkout + trial) or already on Core/Pro with free seat.
2. Settings → Team → invite `marco@…` as Tenant Member.
3. Marco accepts, sets password, logs in on `ikigai.cohestra.app`.
4. **Climax:** Marco sees Ikigai clients/dashboard only; Team and Billing hidden.
5. Edge: On Basic, invite control disabled — "Upgrade to Core for a second seat."

### Flow C — UJ-3 Elena registers

1. Elena scans QR → `/register/sunday-clinic` on Ikigai subdomain.
2. Completes form → registration number.
3. **Climax:** Client stored under Ikigai only; Priya sees Elena on dashboard.
4. Edge: Same phone at another tenant = separate Client.

### Flow D — UJ-4 Platform Admin Suspend (break-glass)

1. Operator opens Platform Admin → finds tenant.
2. Sets **Suspended** with reason (abuse / ToS / freeze) — not ordinary unpaid (FR-23).
3. **Climax:** Public maintenance; tenant login blocked; other tenants unaffected; audit written.
4. Reactivate restores access; BillingStatus unchanged unless adjusted separately.

### Flow E — Billing Portal (Tenant Admin)

1. PastDue or trial-ending banner → **Manage billing**.
2. Stripe Customer Portal: payment method, cancel/downgrade at period end, interval.
3. **Climax:** Returns to app; BillingStatus/Plan reflect webhooks.
4. Member never sees this entry point.

## Inspiration & Anti-patterns

**Borrow posture from:** calm ops tools (Linear density discipline without purple glow); Stripe-hosted money UI rather than reinventing invoices.

**Anti-patterns:** Dashboard-first marketing hero; Basic stub with stats/promos; Member upgrade Checkout; Suspend-as-collections; card walls for activity lists on stub.

## Open questions (for stakeholder)

1. Confirm keep Platform 0 forest-green brand for Enterprise vs new Cohestra marketing identity.
2. Should Members see PlanBadge read-only?
3. Complimentary tenants: show "Sponsored" badge?
4. CAPTCHA provider (hCaptcha / Turnstile / other) for accessible path.
5. Key-screen HTML mocks needed before epics? (spine-only default)
