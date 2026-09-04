---
name: Cohestra Enterprise
status: final
created: 2026-07-18
updated: 2026-08-09
sources:
  - {planning_artifacts}/prds/prd-cohestra-enterprise-2026-07-15/prd.md
  - {planning_artifacts}/prds/prd-cohestra-enterprise-2026-07-15/addendum.md
  - {planning_artifacts}/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
  - docs/marketing/pricing-tiers.md
design: ./DESIGN.md
---

# Cohestra Enterprise — Experience Spine

> Multi-tenant SaaS UX. Visual identity → `DESIGN.md` (**Midnight Atelier** — premium community-ops craft). Platform 0 supplies inherited *ops module behaviors* only — not brand. Spines win on conflict with mocks.

→ Key screens (GTM-A stack-killer): `mockups/marketing-start-free.html` · `mockups/basic-stub-home.html` · `mockups/admin-dashboard-basic.html` · `mockups/share-kit.html` · `mockups/team-seat-gate.html` · `mockups/platform-admin-suspend.html` · `mockups/clients-lead-queue.html`

## Foundation

**Form factor:** Responsive web — multiple experiences on shared infrastructure.

| Surface family | Primary user | Posture |
|----------------|--------------|---------|
| Marketing + signup | Prospect (Priya) | Apex `cohestra.app` — freemium CTAs |
| Tenant admin | Tenant Admin / Member | Desktop-first on `{slug}.cohestra.app` |
| Public tenant home | Visitor | Plan-gated: stub / fixed SitePage / builder |
| Public registration | Participant (Elena) | Mobile-first `/register/{activity-slug}` |
| Platform Admin | Cohestra operator | Sparse console — lifecycle + audit |

**UI system:** shadcn/ui + Tailwind + next-themes. Brand/craft = **Midnight Atelier** in `DESIGN.md` — Fraunces + Plus Jakarta Sans, deep ink, lagoon action, quiet gold, photographic hospitality (not AI-mist / commodity SaaS).

**Tenancy:** Session bound to one tenant (`tenant_id` JWT). No tenant switcher in v1. Subdomain resolves public + admin context.

**Roles:** Tenant Admin · Tenant Member · Platform Admin — effective access = **role ∩ plan ∩ Status ∩ BillingStatus** (PRD FR-3, FR-5).

**Abuse / signup:** Google **reCAPTCHA** on all self-serve signups (widely used, secured); accessible challenge path required (FR-26).

**Refresh model:** Inherit Platform 0 dashboard polling. Billing banners refresh on navigation + webhook-driven soft refresh.

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
| Activities / Communities / Categories | `/activities…` | Admin, Member | **Activities list** — recovery at cap, URL filters, card quick actions (see §Activities module) |
| Clients | `/clients` | Admin, Member | **Lead queue** (FR-29) — all plans |
| Client profile | `/clients/{id}` | Admin, Member | Action-first layout (FR-30) |
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

| Plan upgrade | UpgradePanel / Pricing / Checkout |
| UJ-5 Monday outreach | Dashboard follow-up queue → `/clients?leadStatus=new` → profile outreach |

## Clients module (FR-29–32)

The **Clients** area is a **lead queue** for daily operator work — not a passive contact directory. Inherited Platform 0 master list + timeline rules apply; this section defines **presentation and interaction** only.

→ Visual reference: `mockups/clients-lead-queue.html` · Profile reference: `mockups/clients-profile-action-first.html`

### Mental model

| Concept | UX treatment |
|---------|----------------|
| **Client** | One row per deduped person — not one row per registration |
| **Lead status** | Flat pipeline: New → Contacted → Active → Inactive (no kanban in v1) |
| **Last registration** | Most recent activity signup — acquisition signal |
| **Last outreach** | Most recent messenger or campaign touch — operator action signal |
| **Follow-up due** | Optional `NextFollowUpAt` — surfaces overdue on Dashboard + Clients |

### Clients list — `/clients` (FR-29)

**Page header**

- Title: **Clients**
- Description (one line): *One row per contact — repeat sign-ups merge by phone or email.*
- No primary CTA in header — queue chips are the action surface.

**Queue summary strip** (below header, above filters)

| Element | Behavior |
|---------|----------|
| **Status chips** | Count badges: New · Contacted · Active · Inactive — tap toggles filter; active chip uses `{colors.lagoon}` fill |
| **Quick chips** | New · Registered this week · Merge suspects · Follow-up due — map to existing query params |
| **Export** | Core+ only — exports **current filter set** to CSV; Basic sees upgrade hint or fixed-column export per FR-15 |

**Filter bar** (collapsible on mobile behind “Filters” toggle)

| Control | Query param | Notes |
|---------|-------------|-------|
| Search | `search` | Name, email, phone (normalized) |
| Nationality | `nationality` | Dropdown — filter-only (not a table column) |
| Registered within | `registeredWithinDays` | Presets via quick chip (7 days) |
| Activity | `activityId` (+ optional `activityName`) | Set from Activities card **Clients (N)** quick action — see §Activities module |

- **No Lead status dropdown** in the filter bar — status chips are the sole status control (keyboard-focusable buttons). Removes duplicate control clutter observed in UAT.
- Referral source deferred (not in v1 queue bar).

**Desktop table columns** (`≥ md`)

| Column | Width | Content | Sort |
|--------|-------|---------|------|
| ☐ | `2.25rem` fixed | Bulk select (Pro) | — |
| **Contact** | `minmax(12rem,1.4fr)` | Avatar + name + phone/email; optional follow-up due chip | Name |
| **Status** | `6.5rem` fixed | `LeadStatusBadge` only | Status |
| **Last registration** | `minmax(0,1.2fr)` | **Two lines:** activity name (truncate + `title` tooltip) · short date below | Last registration |
| **Last outreach** | `minmax(0,0.9fr)` | *WhatsApp · 6 Aug* / **Never** — truncate; never visually collide with last registration | — |
| **Actions** | `6.75rem` fixed | **New** rows: Mark contacted + WhatsApp + Viber (when phone). **Contacted / Active / Inactive:** WhatsApp + Viber only. No phone → reserved empty space | — |

**Layout invariants (UAT 2026-08-08)**

- Every text cell uses `minmax(0, …)` + `overflow-hidden` + `truncate` so long activity names never bleed into the next column.
- Actions column width is **reserved on every row** so New-row buttons do not reflow the table.
- Page container widens to `max-w-7xl` for the queue (was `max-w-6xl`).
- Remove **Nationality** as default column — filter-only.
- Row hover: `{colors.paper-warm}` background + `{colors.lagoon}` left accent (4px).
- **Mark contacted** on **New** rows only; **WhatsApp + Viber** on New and on Contacted / Active / Inactive when phone present — always visible at `≥ sm`, never hover-only on desktop.

**Mobile card layout** (`< md`)

Each client = card:

```
┌─────────────────────────────────────┐
│ [AV] Alexander Nguyen    [New]      │
│ +65 9200 0010                       │
│ Last reg: Monthly Gathering · 8 Aug │
│ Outreach: Never                     │
│ [Mark contacted] [Message] [Open →] │
└─────────────────────────────────────┘
```

- Cards stack; sticky filter chips horizontally scroll beneath page title.
- Bulk select hidden on mobile in v1 `[ASSUMPTION]` — Pro handoff desktop-first.

**Empty states**

| Condition | Copy |
|-----------|------|
| No clients ever | ProductEmptyState → create activity (existing) |
| Filters match zero | *No clients match your filters.* + Clear filters |
| Merge suspects only | Banner: *Showing merge-suspect clients only.* |

**Bulk select (Pro, FR-31)**

- Checkbox column left of Contact; select-all applies to **current page** only.
- Floating action bar when ≥1 selected: *N selected · Add to campaign · Clear*
- Consent-false clients: checkbox disabled + tooltip *No email consent*

### Client profile — `/clients/{id}` (FR-30)

**CRM layout (ratified 2026-08-08 — replaces single-column stack)**

**Identity header card** (full width, top)

- Avatar (lg) + name + `LeadStatusBadge` + follow-up-due chip
- Contact meta row: phone · email · next follow-up date (icons + muted text)
- Action cluster (right): **WhatsApp** (green) · **Viber** (purple) · **Mark contacted** (New only) · lead status `<select>` — the **single** status control
- No phone → messenger buttons disabled with `title` hint
- Messenger prerequisites live **only** in the open-confirm dialog — never as an always-visible notice block

**Two-column body** (`≥ lg`: `minmax(0,1fr) + 21rem` sidebar; stacks on mobile)

**Master profile card** (full width, directly under header / merge banner)

- Two-column field grid on `sm+`; Edit profile in card header
- Always first content block after identity — consolidated contact record before drill-down

| Main column (activity) | Sidebar (details & quick edits) |
|------------------------|---------------------------------|
| Registration history (expand/collapse; collapsed at 10+, search) | Next follow-up card — date input + Save date/Clear, Due chip |
| Relationship timeline (expand/collapse; collapsed at 5+ events) | Log outreach card — outreach status + note; **Save outreach log** (not “Save follow-up”) |

**Outreach log → follow-up date nudge**

| Trigger | Behavior |
|---------|----------|
| After **Save outreach log** succeeds | Toast: *Outreach log saved.* with action **Set follow-up date** when no date is set, or status is **Awaiting reply** and follow-up is due/overdue |
| Toast action | Scroll/focus **Next follow-up** card (12s timeout); pre-fill **+3 days** draft when Awaiting reply and no saved date — operator still clicks **Save date** |
| When date already set and status is Contacted | Success toast only — no nudge |
| When Awaiting reply with a future follow-up date | Success toast only — no repeat nudge until due |

**Log outreach vs Next follow-up** remain separate data: outreach log → timeline `whatsapp_follow_up_recorded`; date save → `next_follow_up_changed`.

**Registration answers — field layout**

| Rule | Treatment |
|------|-----------|
| Email fields | Full width (`sm:col-span-2`); `break-all` + monospace for long addresses — never share a row with another field |
| Consent fields | Full width on its own row — label/value must not collide with adjacent columns |
| Long text (`>48` chars) | Full width row |
| Default fields | Two-column grid on `sm+`; each cell `min-w-0` |
| Phone values | `ClientPhoneDisplay` component |

**Layout invariants**

- One lead status control (header select). No duplicate status blocks anywhere.
- No separate timeline preview — relationship timeline is the single activity feed.
- Expand/collapse cards animate height (`ClientProfileExpandableRegion`); staggered section enter on load.
- Sidebar cards: `p-4`, compact headings with leading icon; primary buttons full-width.
- Page container `max-w-7xl` matching the queue list.

**Merge suspect banner**

- Between identity header and master profile when `isMergeSuspect`

### Follow-up date (FR-32)

- Date picker on profile + optional column on list (hidden by default; toggle in column prefs `[ASSUMPTION]`)
- **Follow-up due** chip on list = `NextFollowUpAt` ≤ today (tenant timezone FR-27)
- Dashboard follow-up queue merges: (a) New without outreach, (b) overdue follow-up dates

### Plan gates (Clients)

| Feature | Basic | Core | Pro |
|---------|:-----:|:----:|:---:|
| Lead queue list + profile reorder | ✓ | ✓ | ✓ |
| Referral filter + export filtered CSV | Fixed export | ✓ | ✓ |
| Bulk → Campaign | UpgradePanel | UpgradePanel | ✓ |

## Activities module (operator at scale)

The **Activities** list is a **launch catalog** for operators managing many lead engines — find, triage capacity, recover published slots, and hand off to Clients. Inherited Platform 0 activity CRUD, publish/archive, and registration rules apply; this section defines **presentation and interaction** only.

→ Cross-reference: **Clients module** (activity-scoped filter via `activityId` query param) · Dashboard **LimitMeter** / at-cap banners (deep-link `?status=published`)

### Mental model

| Concept | UX treatment |
|---------|----------------|
| **Activity** | One card per activity — launch engine with status, registrations, and share link |
| **Published cap** | Tenant plan limit on live activities — blocks new publish until a slot is freed |
| **Registration cap** | Tenant monthly sign-ups — pauses new public registrations when blocked |
| **Recovery** | Operator frees a published slot via archive or unpublish on the activity detail — not billing-first |
| **URL filters** | Bookmarkable list state — shareable with teammates |
| **Sort** | Server-side ordering across the full filtered set — paginated card grid |

### Activities list — `/activities`

**Page header**

- Title: **Activities**
- Description (one line): *Launch and manage your lead engines.*
- Primary CTA: **New activity** → `/activities/new`
- When **published cap is blocked:** CTA becomes a secondary button (not a link) with title *Free a published slot first — use the Free a slot chip below*; `aria-describedby` points to the free-a-slot chip. Click focuses the chip — does not open the create wizard.

**At-cap banner** (`ActivitiesAtCapBanner`)

**Single compound alert** — never two stacked plan-limit banners on this page.

| Variant | When | Styling |
|---------|------|---------|
| **blocked** | Any relevant dial at hard cap (100%) | Destructive red |
| **warn** | Any dial ≥80% | Amber/gold; **Dismiss** per browser session (`sessionStorage`, tenant-scoped key) |

| Condition | Primary line | Secondary line | Actions |
|-----------|--------------|----------------|---------|
| Published blocked | Published at capacity (used/limit). Archive or unpublish one to publish another. | — | **Review published** |
| Registrations blocked | — | Monthly sign-ups paused (used/limit). | **View billing & upgrade** (tenant admin only); **Tenant Members** see copy only — no billing CTA |
| Both blocked | Published line first (actionable on this page) | Registrations line second | Review published + billing (admin) or Review published only (Member) |
| Published warn only | Softer published-capacity copy | — | **Review published**; **Dismiss** |
| Registrations warn only | — | Softer monthly registration copy | **View billing & upgrade** (tenant admin only); **Dismiss**; **Tenant Members** see copy + Dismiss only |
| Both warn | Published line first | Registrations line second | Review published + billing (admin) + Dismiss; Member sees Review published + Dismiss |

- Banner uses `role="alert"`.
- **Review published** applies `status=published` in the URL and scrolls to the activity grid — does **not** enable the recovery mode strip (only **Free a slot** does).
- Limit copy is sourced from the same shell **usage** dials as admin **LimitMeter** — do not duplicate limit math in UI copy.

**Recovery chip row** (`ActivitiesRecoveryChips`)

Horizontal chip row **below banner, above filter bar**. Reuse Clients **FilterChip** visual language (rounded-full, `aria-pressed`, optional count badge).

| Chip | Visible when | Behavior |
|------|--------------|----------|
| **Published only** | Published dial blocked or warn, **or** registration dial blocked | Toggles `status=published` in URL; count badge shows published usage from shell |
| **Free a slot** | Published dial blocked only | Applies published filter, enables **recovery mode** helper strip, scrolls to grid |

**Chip row visibility:** The row renders only when at least one chip is visible. When **only** the registration dial is at warn (not blocked) and the published dial is below warn, the at-cap banner may show but **neither chip appears** — operators use banner actions (billing for admin, Dismiss) instead.

**Recovery mode strip** (inline, `role="status"` — not a modal):

> You're at your published limit. Open an activity below and **archive** or **unpublish** it to free a slot.

**Invariant:** **Free a slot** never navigates to billing. Upgrade remains a separate explicit action on the banner for registration-cap scenarios.

**Filter bar** (URL-synced)

All filter values are derived from URL `searchParams`. **Page number stays local state** (not in URL). Any filter or sort change resets page to 1.

| Control | Query param | Notes |
|---------|-------------|-------|
| Search | `search` | Debounced 400ms commit → `router.replace`; server-side across name, community, category, location |
| Status | `status` | `draft` · `published` · `archived` |
| Community | `community` | Community label (matches API filter) |
| Category | `category` | Category name |
| Sort by | `sortBy` + `sortDirection` | Omitted from URL when default (`updatedAt` desc) |

**Sort presets** (single `<select>`, implicit direction per field):

| Preset value | Label |
|--------------|-------|
| `updatedAt:desc` | Last updated *(default)* |
| `createdAt:desc` | Created |
| `name:asc` | Name |
| `registrationCount:desc` | Registrations |

- **Clear filters** navigates to `/activities` with no query string (also clears recovery mode strip state).
- **URL hygiene — sort:** Unknown `sortBy` / `sortDirection` tokens are removed via `router.replace` on load. Valid tokens that are **not** one of the four presets (e.g. `name:desc`) are **not** stripped — the server honors them, but the sort `<select>` falls back to the nearest preset for that field (or default). Prefer preset URLs when sharing links.
- Layout on `≥ xl`: six-column CSS grid — search spans two columns; status, community, category, and sort each occupy one column (five controls total).

**Activity card grid**

Responsive card grid (`< sm`: 1 column · `sm`: 2 columns · `xl`: 3 columns). Each card (DOM order):

| Region | Content |
|--------|---------|
| **Header** | Activity name (link to detail) · status badge · **Sign-ups paused** badge (when reg dial blocked) · community pill · category |
| **Body** | Schedule · location · registration count line (includes per-activity `maxRegistrants` when published and configured) · created timestamp |
| **Footer** | Quick actions row (see below) |
| **Below footer** | Plan reg meter (published + reg dial warn/blocked) · schedule conflict alert (amber border on card + inline alert when detected) |

**Card signals**

| Signal | When shown | Region |
|--------|------------|--------|
| **Sign-ups paused** badge | Activity is published **and** tenant monthly registration dial is **blocked** (not warn-only) | Header (beside status badge) |
| **Plan reg meter** | Activity is published **and** tenant registration dial is warn or blocked | Below quick actions |
| **Schedule conflict** | Calendar conflict detected for this activity | Below quick actions (card also gets amber border); omitted while conflict check is loading or unavailable |

**Card quick actions** (footer — clicks do not navigate the card)

| Action | Behavior |
|--------|----------|
| **Copy link** | Published only — fetches and copies public registration URL; toast on success. Draft/archived: disabled with hint *Publish to get a registration link* |
| **Registrations (N)** | → `/activities/{id}?tab=registrations` |
| **Clients (N)** | → `/clients?activityId={id}&activityName={name}` — see **Clients module** filter bar |

**Empty states**

| Condition | Copy / action |
|-----------|----------------|
| No activities ever | ProductEmptyState — create first activity + link to manage communities |
| Filters match zero | *No activities match your current filters.* + **Clear filters** |
| Catalog load error | Inline alert when communities/categories catalog fails to load |

**Pagination**

- Local page state, 20 items per page.
- Prev / Next controls below the grid.

### Cross-module flows

```
Dashboard at-cap banner → Review published → /activities?status=published
Free a slot chip → published filter + recovery strip → open card → archive/unpublish on detail
Copy link → share public registration URL
Clients (N) on card → Clients list filtered by activityId
Sort registrationCount asc → identify lowest-traffic published activities to archive
```

Example bookmark URL:

```
/activities?status=published&sortBy=registrationCount&sortDirection=asc
```

### Plan gates (Activities)

| Feature | Basic | Core | Pro |
|---------|:-----:|:----:|:---:|
| Activity list + URL filters + sort | ✓ | ✓ | ✓ |
| At-cap banner + recovery chips | ✓ | ✓ | ✓ |
| Card quick actions | ✓ | ✓ | ✓ |
| Publish / new activity | Subject to plan published-activity limit | Same | Same |

Limits are enforced from shell **usage** dials — same source as **LimitMeter** on the dashboard and admin shell.

### Responsive notes

| Breakpoint | Behavior |
|------------|----------|
| `< sm` | Single-column card grid; filter controls stack to one column; recovery chips wrap |
| `sm` – `lg` | Two-column card grid; filter grid stacks to two columns |
| `≥ xl` | Six-column filter row (search spans 2) + three-column card grid |

### Accessibility invariants

- Recovery chips: `aria-pressed`, keyboard focusable, chip ids for described-by wiring
- At-cap banner: `role="alert"`
- Recovery mode strip: `role="status"`
- Blocked **New activity** button: `aria-describedby` → `#free-a-slot-chip`

## Voice and Tone

Microcopy only. Aesthetic in `DESIGN.md`.

### Signup / marketing

| Do | Don't |
|----|-------|
| Lead with **Cohestra** + “One client list from every QR and signup” | Generic “all-in-one CRM” |
| “Replace Forms + spreadsheets + link-in-bio” | Compete as Peatix/Luma discovery |
| "Start free" · "No card required on Basic" | "Start your journey 🚀" |
| "You will not be charged while your trial is active" | Hide trial end date |

### Tenant admin

| Do | Don't |
|----|-------|
| "Upgrade to Core for a second seat" | "Seat limit exceeded (403)" as only UI |
| "Settle your bill" + Portal link | "Account delinquent — contact support" as first step |
| "Community" | "Club" as product label |
| Member locked feature: "This feature needs Pro" | Member-facing "Upgrade billing" CTA |

### Clients / lead queue

| Do | Don't |
|----|-------|
| "Mark contacted" · "Open WhatsApp" | "Update lead status to contacted" |
| "Last registration" vs "Last outreach" | One ambiguous "Last activity" |
| "Never" for no outreach (muted) | "N/A" or empty without label |
| "Follow-up due" · "Needs outreach" (New only) | "Hot lead" · emoji hype |
| "3 excluded — no consent" on bulk campaign | Silent drop |

### Activities / launch catalog

| Do | Don't |
|----|-------|
| "Review published" · "Free a slot" | "Upgrade now" as the only recovery path on the list |
| "Archive or unpublish one to publish another" | Two separate red plan-limit banners stacked |
| "Sign-ups paused" on the card when reg cap hit | Plan usage / upgrade language on **public** registration surfaces |
| "No activities match your current filters." + Clear filters | Empty grid with no recovery action when filters active |
| Bookmarkable filter URLs for teammates | Filters trapped in React state only |

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
| **PlanBadge** | Visible to **Tenant Admin and Tenant Member** in top bar; Member view is **read-only** (no billing affordance) |
| **SponsoredBadge** | When `IsComplimentary=true`, show **Sponsored** beside PlanBadge (Admin + Member) |
| **BillingBanner** | PastDue: daily settle CTA. OnHold: read-only mode + Portal. Trial last 7 days: daily reminder + trial end date. Suspended: login blocked (not a banner inside app). Admin-only Portal CTA. |
| **UpgradePanel** | Replaces locked module body. Admin → Checkout/upgrade. Member → feature-locked, no billing. |
| **SeatGate** | Soft-block invite when `active + pending ≥ seat cap`. Basic: disable + upgrade Core. |
| **StubHome** | No SitePage entity; list published activities only; empty state: "No published activities yet." |
| **LimitMeter** | Communities / published / regs — warn ≥80%, block at 100% with clear which dial |
| **ToSCheckbox** | Signup blocked until checked; versions logged (FR-26a) |
| **CaptchaGate** | Google reCAPTCHA always on self-serve signup (FR-26); must expose accessible challenge path |
| **LeadQueueHeader** | Status + quick filter chips on one row (inline labels, divider); horizontal scroll on narrow viewports |
| **ClientQueueRow** | Desktop: balanced grid; **New** = mark contacted + messengers; **Contacted/Active/Inactive** = messenger icons when phone; mobile card mirrors same rules |
| **LeadStatusBadge** | New=`{colors.lagoon}` tint · Contacted=`{colors.gold}` · Active=`{colors.success}` · Inactive=`{colors.stone}` |
| **ClientProfileHeader** | Identity + WhatsApp · Viber · Mark contacted · lead status select — single status control |
| **ClientOutreachLogCard** | Outreach status + note; **Save outreach log**; post-save nudge via parent toast when `shouldNudgeFollowUpDateAfterOutreach` |
| **FollowUpDateField** | Optional date (FR-27); **Save date** / Clear; tenant-local display; imperative focus + suggest; highlight ring on nudge |
| **ClientRegistrationHistory** | Master/detail list + selected answers; expand/collapse; search at 5+ entries; email/consent full-width in answer grid |
| **ClientRelationshipTimeline** | Single expandable feed; scroll capped when expanded; no preview duplicate |
| **BulkSelectBar** | Pro only; floating bottom bar when selection &gt; 0 |
| **ActivitiesAtCapBanner** | Single compound alert at cap/warn; Review published CTA; admin-only billing link for reg cap; warn dismiss per session |
| **ActivitiesRecoveryChips** | Published only + Free a slot chips; recovery mode strip; never routes Free a slot to billing |
| **ActivityCardQuickActions** | Copy link (published) · Registrations tab · Clients filter handoff; stopPropagation on card |

Platform 0 patterns (RegistrationForm, QrPanel, etc.) inherit unless gated above. **ClientRow** superseded by **ClientQueueRow** on list (FR-29).

## State Patterns

| State | Treatment |
|-------|-----------|
| Basic empty tenant | Dashboard empty + CTA create Community/Activity; stub empty list |
| At seat cap | SeatGate on Team |
| At published/regs cap | LimitMeter block on dashboard; **Activities** list shows compound banner + recovery chips; cannot publish / public register rejects with registrant-safe message |
| Trialing | PlanBadge + trial end in BillingBanner (last 7 days) |
| PastDue | Warn banner; full access until day 7 |
| OnHold | Danger banner; admin read-only; public registration blocked |
| ReadOnly_OverLimit | After downgrade; banner lists what to archive |
| Suspended | Login blocked; public maintenance |
| Archived | Public 404; admin blocked |
| Plan-locked module | UpgradePanel (not empty table) |
| Complimentary (P12) | No delinquency banners; **SponsoredBadge** + PlanBadge (plan without Stripe) |
| Clients list loading | Skeleton rows matching **ClientQueueRow** column layout |
| Profile 50+ registrations | Registration history collapsed; search prominent |
| No phone on client | Messenger buttons disabled; phone field highlighted in edit |
| Activities list loading | Card grid skeleton (6 cards) |
| Activities filters active, zero results | Dashed empty state + Clear filters |
| Activities published cap blocked | New activity CTA softened; Free a slot chip + recovery strip |

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
- Google reCAPTCHA must offer an accessible challenge path (not invisible-only).

## Responsive & Platform

| Breakpoint | Behavior |
|------------|----------|
| Admin `≥ lg` | Sidebar + PlanBadge in top bar |
| Admin `sm` | Sidebar Sheet; BillingBanner stacks CTA under text |
| Activities list `< sm` | Single-column cards; filter controls stack one column; chips wrap |
| Activities list `sm` – `lg` | Two-column card grid; filter grid two columns; chips wrap |
| Activities list `≥ xl` | Six-column filter row (search spans 2) + three-column card grid |
| Clients list `< md` | Card stack; horizontal scroll filter chips; no table horizontal scroll |
| Clients list `≥ lg` | Full table; optional compact density toggle `[ASSUMPTION]` |
| Client profile mobile | Header actions wrap; master profile first; registration + timeline stack; sidebar cards below |
| Stub / SitePage | Mobile-first; stub is single column |
| Registration | Platform 0 mobile-first unchanged |
| Marketing | Desktop hero + stacked CTAs on `sm` — Start free primary |

## Key Flows

### Flow A — UJ-1 Priya starts free (Basic)

1. Priya opens `cohestra.app` → **Start free**.
2. Completes CAPTCHA, ToS/Privacy, org name, slug `harbourline`, email, password.
3. Verifies email OTP → lands on empty Basic dashboard (PlanBadge **Basic**, no Stripe).
4. Creates Community "Weekend Clinics" → Activity "Sunday clinic" → publishes (within 3).
5. Opens public stub `harbourline.cohestra.app` — org name + activity link.
6. **Climax:** Copies QR / register link; first real registration path works without a card.
7. Resolution: Uses fixed report + CSV; sees upgrade CTAs for Site Page and Team.

### Flow B — UJ-2 Priya invites Marco (Core+)

1. Priya upgrades to Core (Checkout + trial) or already on Core/Pro with free seat.
2. Settings → Team → invite `marco@…` as Tenant Member.
3. Marco accepts, sets password, logs in on `harbourline.cohestra.app`.
4. **Climax:** Marco sees Harbourline clients/dashboard only; Team and Billing hidden.
5. Edge: On Basic, invite control disabled — "Upgrade to Core for a second seat."

### Flow C — UJ-3 Elena registers

1. Elena scans QR → `/register/sunday-clinic` on Harbourline subdomain.
2. Completes form → registration number.
3. **Climax:** Client stored under Harbourline only; Priya sees Elena on dashboard.
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

### Flow F — UJ-5 Marco runs Monday outreach (Core+ / Pro)

1. Marco opens Dashboard — **14 new leads** + follow-up coverage dial below target.
2. Taps **View new leads** → `/clients?leadStatus=new` — queue header shows **14 New**.
3. Scans list: phone visible on row; last registration = *Monthly Gathering · 8 Aug*; last outreach = **Never**.
4. Taps **Open WhatsApp** on row → confirms prerequisites dialog → WhatsApp opens with E.164 number.
5. Returns to Cohestra → opens profile → **Mark contacted** → status chip → Contacted; timeline adds event.
6. Sets **Next follow-up** to Thursday for lukewarm leads.
7. **Climax:** Selects 6 remaining New leads (Pro) → **Add to campaign** → draft email campaign with segment prefilled; consent-false excluded with count.
8. Resolution: Dashboard follow-up coverage increases; no spreadsheet export needed.

## Inspiration & Anti-patterns

**Borrow posture from:** editorial luxury restraint; calm ops density without purple glow; Stripe-hosted money UI rather than reinventing invoices; photography with meaning over flat white.

**Anti-patterns:** Dashboard-first marketing hero; Basic stub with stats/promos; Member upgrade Checkout; Suspend-as-collections; card walls for activity lists on stub; Platform 0 forest green as Cohestra brand; **Nationality as primary list column**; **hover-only row actions on desktop**; **registration history above outreach on profile**; HubSpot-style deal pipeline columns; **stacked duplicate plan-limit banners on Activities**; **billing-first recovery** when published cap is blocked.

## Ratified UX decisions (2026-07-18)

| # | Decision |
|---|----------|
| Brand / craft | **Midnight Atelier** — Fraunces + Plus Jakarta Sans, ink/lagoon/gold, photographic hospitality (DESIGN.md) |
| PlanBadge | Members see it **read-only** |
| Complimentary | **Sponsored** badge yes |
| CAPTCHA | **Google reCAPTCHA** (standard, widely used, secured) + accessible path |
| Key screens | **Original HTML mocks** in `mockups/` (this workspace) |

## Ratified UX decisions (2026-08-08)

| # | Decision |
|---|----------|
| Clients list | **Lead queue** — contact + last reg + last outreach columns (FR-29) |
| Default column drop | Nationality removed from default table; filter-only |
| Profile order | ~~Outreach bar + timeline preview above registration history~~ **Superseded** — see CRM profile redesign (master profile top, expandable timeline) |
| Row actions | New: Mark contacted + messengers. Contacted / Active / Inactive: WhatsApp + Viber when phone — visible without hover |
| Mobile clients | Card layout, not horizontal-scroll table |
| Bulk campaign | Pro-only floating bar; consent-false excluded with count (FR-31) |
| Follow-up date | Optional; **Follow-up due** chip + Dashboard queue (FR-32) |
| Mockups | `clients-lead-queue.html` · `clients-profile-action-first.html` |

## Ratified UX decisions (2026-08-08 — queue layout polish)

| # | Decision |
|---|----------|
| Column collision | Last registration / last outreach must never overlap — `minmax(0,*)` + truncate + reserved actions width |
| Last registration | Two-line cell: truncated activity name + short date; full string in `title` |
| Actions column | Fixed width reserved on all rows; **icon buttons** (check = mark contacted, send = messenger) with `aria-label` + `title` — never wrap |
| Filter redundancy | Drop Lead status `<select>` — status chips only |
| Page width | Clients queue uses `max-w-7xl` |

## Ratified UX decisions (2026-08-08 — CRM profile redesign)

| # | Decision |
|---|----------|
| Profile shape | Identity header card + two-column body (activity main / details sidebar) — real CRM detail page |
| Header actions | WhatsApp · Viber · Mark contacted · status select in one cluster; single status control |
| Prerequisites copy | Only in messenger confirm dialog; always-visible notice removed |
| Sidebar cards | Next follow-up · Log outreach — `21rem` at `lg+` |
| Master profile | Full-width card at top (under header); two-column fields on `sm+` |
| Timeline | Single expandable relationship timeline; no redundant preview block |
| Registration answers | Email + consent full-width rows; long values never overlap adjacent columns |
| Removed | Sticky outreach bar card, lone Lead-status card, giant full-width messenger buttons |

## Ratified UX decisions (2026-08-09 — Activities list operator at scale)

| # | Decision |
|---|----------|
| Activities list posture | **Launch catalog** — recovery at cap, URL-sync filters, server-side sort, card quick actions |
| At-cap presentation | **Single compound banner** — never two stacked plan-limit alerts on `/activities` |
| Recovery chips | **Published only** + **Free a slot**; Free a slot never navigates to billing |
| URL contract | All list filters + sort in query params; page local only; clear → `/activities` |
| Sort control | Single select with four presets; default `updatedAt` desc omitted from URL |
| Card handoff | Quick actions: Copy link · Registrations tab · Clients list via `activityId` filter |
| Reg cap on card | **Sign-ups paused** badge when reg dial blocked; plan reg meter when reg dial warn or blocked |
| Public registration | Registrant-safe copy when limits hit — no plan upgrade language (separate from admin list) |
