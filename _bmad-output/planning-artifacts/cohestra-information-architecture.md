---
title: Cohestra Product Experience 2.0 — information architecture
phase: 0
status: baseline
created: 2026-09-22
head: bc5cc43f
---

# Cohestra information architecture

Phase 0 map of **what exists**, not a proposed IA rewrite. Journey steps are reconstructed from code, operator manual, and prior EXPERIENCE spines. They are **not** user-research transcripts.

Named protagonists below are inherited from existing spines (Priya operator, Elena registrant). They are planning devices, not interview subjects.

---

## 1. Surface families

| Family | Host | Primary user | Posture |
|--------|------|--------------|---------|
| Marketing + signup | apex (`localhost:3000`) | Prospect | Cinema + pricing + docs |
| Tenant public door | `{slug}.localhost` | Visitor | Stub / SitePage / maintenance |
| Public registration | `{slug}` `/register/{activity}` | Elena | Mobile-first; Epic 35 shells |
| Embed registration | `/embed/register/{slug}` | Elena in host site | Chrome-light |
| Tenant admin | `/dashboard…` | Priya (Admin) / Member | Desktop-first; phone tab bar |
| Platform | `/platform…` | PlatformAdmin | Sparse console |
| Auth | `/login`, `/signup`, `/register`, `/invite/accept` | mixed | AuthFlowShell |

Session is one tenant (`tenant_id` JWT). No tenant switcher.

---

## 2. Operator sitemap (shipped)

```
Dashboard                         /dashboard
  Website                         /dashboard/website
Activities                        /activities
  All activities                  /activities
  New activity                    /activities/new
  Activity                        /activities/{id}?tab=overview|design|form|registrations|share
  Communities                     /activities/communities
  Community                       /activities/communities/{id}
  Categories                      /activities/categories
Clients                           /clients?…
  Profile                         /clients/{id}
Campaigns                         /campaigns
  New                             /campaigns/new
  Campaign                        /campaigns/{id}
Reports                           /reports?preset=…
Settings                          /settings   (in-page sections)
  Team                            /settings/team
  Billing                         /settings/billing
Checkout                          /billing/checkout
```

**Not in sitemap (named in cinema or docs):** Follow-up, Opportunities, Analytics, Cohestra AI, Form Studio, Onboarding, Website Studio.

**Mobile primary:** Home · Activities · Clients · More. Website is not a tab (PX2-IA-004).

**Footer (TenantAdmin):** Settings · Team · Billing (Billing if Basic or billing owner). Member: Settings only.

---

## 3. Cinema vs console map

| Cinema pill | Console surface | Match? |
|-------------|-----------------|--------|
| Website | `/dashboard/website` | Path yes; name Studio vs Website vs Builder |
| Clients | `/clients` | Yes |
| Activities | `/activities` | Yes |
| Follow-up | Dashboard queue + `/clients?followUpDue=true` | **No peer room** |
| Analytics | `/reports` + dashboard Graphs | Name mismatch |
| Cohestra AI | Dashboard “Needs attention” | Name + placement mismatch |
| Opportunity (copy only) | — | **No surface** |

---

## 4. Journey maps (code-reconstructed)

Each journey: steps as the product is wired today. Climax beat named. Gaps called out.

### 4.1 Dashboard (Priya, Monday)

1. Sign in `/login` → `/dashboard`.
2. Chrome: plan badge, optional billing banner, command palette.
3. Intelligence brief **Needs attention** (loading pulse / error / insufficientData / insights).
4. View switcher Overview / Graphs / Tables (localStorage, not URL).
5. Overview: onboarding checklist (if not dismissed) → today strip → **Needs follow-up** queue (max 5) → quick actions → metric tiles → trend → activity performance → community pulse → recent campaigns.
6. Queue row → `/clients/{id}` or “View all” → `/clients`.
7. Empty (no activities): `DashboardEmptyState` + brief still shown.

**Climax:** Priya picks a due person from the queue and leaves the dashboard.  
**Gaps:** Follow-up is not a room; view mode is invisible to share/URL; Website not in mobile tabs.

### 4.2 Clients list

1. `/clients` lead-queue header: status chips + Follow-up due + Registered this week + Merge suspects.
2. URL filters + search + sort + page.
3. `<sm` cards; `≥sm` CSS grid `min-w-[42rem]` (may scroll).
4. Empty / no-match `ProductEmptyState`.
5. Export: Core+ filtered CSV; Basic full-list or hint.
6. Bulk: campaign handoff **Pro** → `/campaigns/new?clientIds=`.
7. Messenger confirm dialog before WhatsApp/Viber.

**Climax:** Priya opens the right person without a spreadsheet.  
**Gaps:** EXPERIENCE said no status dropdown (chips only) — verify LIVE; unused `ClientFollowUpPanel`.

### 4.3 Client profile

1. `/clients/{id}` — `ProfileSkeleton` / `ProductErrorState` / merge-suspect banner.
2. Action-first: lead status, follow-up date (`ClientFollowUpDateField`), outreach log, registrations, identity.
3. Expand regions use 200ms local motion (not Epic 37 route token).

**Climax:** Priya logs outreach and sets next follow-up.  
**Gaps:** No dedicated Follow-up room; panel component orphaned.

### 4.4 Activities

1. `/activities` filters (`status`, search, category, community). Cap banner if published limit hit.
2. Card quick actions: open, clients (N) → `/clients?activityId=`, share.
3. Create `/activities/new` with plan warnings.
4. Detail tabs: Overview → Design (Epic 35 controls) → **Form (Form Studio)** → Registrations → Share.
5. Publish confirm; archive dialog.

**Climax:** Publish a live registration URL.  
**Protected:** Design/Form entitlement and shell behavior (Epics 35–36).

### 4.5 Registration (Elena)

1. Opens `/register/{slug}` or embed.
2. Door: not-found / unavailable / full / plan-limit / close-at / open.
3. Shell = experience layout (Centered / Split / Poster / Conversational / …).
4. Composition renderer (Epic 36) inside form body; `fields[]` submit.
5. Validation; conversational Next/Back if Pro flow.
6. Success: `RegistrationSuccessScreen`.

**Climax:** “You're registered!”  
**Protected:** layouts, flows, responsiveness, entitlements, submission semantics.  
**Live this run:** BLOCKED until demo slug.

### 4.6 Follow-up (as shipped)

1. Dashboard overview widget (due + new without outreach).
2. Clients chip `followUpDue=true`.
3. Profile date field + outreach log.
4. Optional reports follow-up chart.
5. Onboarding step `first-follow-up`.

**Climax:** cinema promises a control room; product delivers a widget + filter.  
**Decision needed:** PX2-IA-002.

### 4.7 Opportunities

**No operator journey.** Cinema-only triage label. Do not inventory a screen.

### 4.8 Analytics / Reports

1. `/reports?preset=weekly` allowed on Basic.
2. Monthly/custom/activity/community/lead/referral → Core UpgradePanel if Basic.
3. Loading / stale “Updating…” / error / empty period / export disabled.
4. Dashboard Graphs is a second analytics surface (not named Analytics).

**Climax:** Priya answers “what worked this week?”  
**Gap:** cinema name Analytics; marketing “saved views” **unimplemented**.

### 4.9 Cohestra AI

1. Admin: dashboard brief only. Modes `deterministic` / `synthesized` (`Intelligence:SynthesisEnabled` default false).
2. Insights link to safe admin hrefs.
3. Cinema: DemoClub intelligence mount.

**Climax:** “what we should do next” — as a panel, not a product area.  
**Gap:** no `/ai`; synthesis off by default.

### 4.10 Website Studio

1. `/dashboard/website`. Basic → UpgradePanel Core.
2. Wide ≥1024: builder chrome; `<lg` Edit/Preview tabs; split ≥1280.
3. Tabs design / sections / templates. Studio sections Pro.
4. Dirty / publish success / revert. Tour + setup checklist.
5. Live preview unmounts while editing (Epic 37 AD-8).

**Climax:** Publish the public home.  
**Protected:** plan section gates; do not keep hidden preview trees.

### 4.11 Form Studio

1. Activity `?tab=form` → Build | Preview (local state).
2. Palette + composition list + inspector (`xl` three-pane).
3. Add/reorder/section/columns/content/domain (plan-gated).
4. Preview Desktop/Tablet/Mobile; simulated submit.
5. Save/reload; publish uses same renderer.

**Climax:** Mobile preview matches expectation.  
**Protected:** Epic 36 operations + Epic 35 shells. Draft must survive admin route motion (pathname-only key).

### 4.12 Onboarding

1. Dashboard checklist: create activity → publish → first registration → first follow-up. Dismiss key `cohestra.dashboard.onboarding-dismissed`.
2. Website builder tour (Pro steps filtered) + setup checklist.
3. `/register` first-time operator bootstrap (stale one-operator copy).
4. `/signup` self-serve (reCAPTCHA/TOS).

**No `/onboarding` route.**

### 4.13 Settings

1. `/settings` in-page sections (not URL). Member: account / support / appearance. Admin: + plan, brand, org, notifications, embed, domain.
2. Mobile: section tabs + Context sheet.
3. Nested `<main>` (PX2-A11Y-003).

### 4.14 Billing

1. Footer Billing (Admin + Basic or owner).
2. `/settings/billing` in-app panel; owner-managed copy if not owner.
3. `/billing/checkout?plan=&interval=&start=1` from UpgradePanel.
4. Paddle return `/billing/paddle-return`; admin toast `billing=success`.
5. Banners: trialing / past_due / on_hold / over-limit / registration cap.

**Member:** no checkout CTA (“Ask a tenant admin”).

### 4.15 Administration (platform)

1. `/platform/login` → `/platform` directory.
2. Create tenant (Basic/Core/Pro).
3. Tenant detail: suspend / reactivate / archive; complimentary.
4. Support inbox / issue / volume report.

**Non-goals inherited:** no impersonation.

---

## 5. IA conflicts to resolve in Phase 1 (not now)

1. Cinema names vs console names (PX2-IA-001).
2. Follow-up as room vs widget (PX2-IA-002).
3. Website naming and mobile placement (PX2-IA-003/004).
4. Hide vs lock vs panel for plan/role (PX2-IA-005, PX2-ENT-001).
5. Settings URL vs in-page sections (shareable deep links).
6. Dashboard view mode URL vs localStorage.
7. Platform visual system: keep sparse vs inherit Atelier (PX2-SYS-001).
8. `/site` spine vs `/dashboard/website` code.

Do **not** change nav IA in implementation until the product owner picks these. Epic 37 explicitly forbids changing navigation IA as a motion story.

---

## 6. Outline — `docs/DESIGN.md` (not written this phase)

Propose this outline only. Do **not** author final visual identity here.

```
docs/DESIGN.md
  frontmatter: status draft · inherits Midnight Atelier · locks Epics 35–37
  1. Purpose and conflict rule
     - How it looks (this file) vs how it works (future EXPERIENCE.md)
     - Spines win over mocks
  2. Brand & Style
     - Midnight Atelier as shipped (ink, lagoon, gold, Fraunces + Jakarta)
     - What cinema may do that admin must not
  3. Colors
     - Table of CSS variables from brand-tokens.css (source of hex)
     - AA muted-text decision (stone vs stone-cinema) — PO
     - Status, messenger, charts
     - Dark inversion + registration-preview-surface
     - Tenant accent overlay rules
     - Platform --plat-* keep-or-merge
  4. Typography
     - Utilities that exist vs DESIGN 2026-07-18 leftovers
     - Chrome h1 = text-section (current) vs display (spine)
  5. Layout & Spacing
     - Document shipped gutters (16/24) vs spine 32
     - Admin max-w-7xl; public 720
     - Breakpoint contract (md rail vs lg spine)
  6. Elevation & Depth
     - Almost-flat rule; list actual shadow usages
  7. Shapes
     - radius-sm/md/lg/xl
  8. Motion
     - Press 100 · Local 160 · Route 280
     - Builder 120/140/150/180
     - Overlay decision
     - prefers-reduced-motion CSS architecture
  9. Components
     - Button density decision
     - Input / field (admin vs Epic 35 public)
     - Empty / error / upgrade / denied
     - Header / table / dialog (one of each)
     - Do not restyle Epic 35 shells here — reference their EXPERIENCE
  10. Do's and Don'ts
     - Do not reopen Epic 35/36
     - Do not add animation libraries
     - Do not invent a third palette
```

Companion later (not this phase): `docs/EXPERIENCE.md` or `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-22/`.

---

## 7. Ranked Phase 1 decisions for the product owner

Stop here until these are answered. Implementation backlog is **not** opened in Phase 0.

| # | Decision | Why it blocks | Options (not a recommendation ritual — pick) | If deferred |
|---|----------|---------------|----------------------------------------------|-------------|
| D1 | Naming glossary: cinema vs console | Restyle will paint the wrong labels | A) Rename console to cinema (Follow-up, Analytics, Cohestra AI, Website Studio). B) Keep console names; cinema stays metaphor. C) Hybrid glossary | Any visual/nav story will rework copy twice |
| D2 | Is Follow-up a first-class room? | Journey 4.6 vs cinema | A) Add `/follow-up` (or nav alias). B) Keep widget+clients; change cinema. C) Expand dashboard queue only | PX2-IA-002 stays open |
| D3 | Website mobile IA | Phone operators lose the studio | A) Website tab. B) Website under More. C) Keep under Home (document as intentional) | PX2-IA-004 |
| D4 | Nav entitlement pattern | Basic/Member see Pro map | A) Hide. B) Lock badge. C) Keep destination UpgradePanel | PX2-ENT-001 |
| D5 | AA muted token | 3.00:1 body text | A) Promote `--stone-cinema` to admin muted. B) New AA stone. C) Accept fail (not AA) | Contrast work blocked |
| D6 | Button / touch floor | 32 vs 44 vs public 48 | A) 44 on touch, 32 desktop. B) Leave chrome 32; 44 only studios/public. C) 48 primary per 2026-07 DESIGN | Touch stories will fight |
| D7 | Form Studio 1024 vs 1280 three-pane | Spec vs code | A) Implement 1024 three-pane. B) Amend EXPERIENCE to 1280 + drawer | PX2-RESP-001; do not touch composition |
| D8 | Overlay primitive + duration | A11Y + Epic 37 | A) All overlays through `ui/dialog`; duration = local 160. B) Document 200ms overlay token. C) Campaign dialogs only | Keyboard/PRM debt remains |
| D9 | Heading / landmark contract | AT + Settings | A) Chrome title not h1; page owns h1. B) Chrome is sole h1; pages start h2. C) Status quo | Header restyle unsafe |
| D10 | Platform console craft | Parallel `--plat-*` | A) Keep sparse. B) Inherit Atelier | Accidental restyle risk |
| D11 | State kit at router | 404/error voice | A) Add `error.tsx`/`not-found.tsx` using ProductErrorState. B) Defer | Unknown URLs stay Next-default |
| D12 | Member + Basic + status fixtures | Cannot accept ENT/status | A) Seed Member, Basic, Suspended, OnHold in Development. B) Manual fixtures only | Phase 1 visual QA stays BLOCKED for those states |
| D13 | `docs/DESIGN.md` vs `_bmad-output` spine | Two homes already exist | A) `docs/DESIGN.md` is the engineer-facing extract. B) Only `_bmad-output/planning-artifacts/ux-designs/`. C) Both, with inherit | Writers will fork again |

**Non-decisions (locked):** Epic 35 shells/flows/entitlements; Epic 36 composition/renderer/submit; Epic 37 100/160/280 and CSS reduced-motion; server-side plan gates; no new animation libraries.

---

## 8. Sources (paths only)

- `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-form-studio-2-0-2026-09-20/EXPERIENCE.md`
- `_bmad-output/planning-artifacts/epics-form-experience-system-35.md`
- `_bmad-output/planning-artifacts/epics-form-studio-2-0-36.md`
- `_bmad-output/planning-artifacts/epics-operator-shell-motion-37.md`
- `web/lib/admin-nav.ts`
- `web/lib/marketing/product-slides.tsx`
- `docs/user-manual/cohestra-operator-manual.md`
