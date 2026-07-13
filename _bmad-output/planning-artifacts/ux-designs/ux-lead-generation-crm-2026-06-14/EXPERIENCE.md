---
name: Activity Lead Engine
status: final
created: 2026-06-14
updated: 2026-06-14
sources:
  - {planning_artifacts}/prds/prd-lead-generation-crm-2026-06-14/prd.md
  - {planning_artifacts}/prds/prd-lead-generation-crm-2026-06-14/addendum.md
  - {planning_artifacts}/briefs/brief-lead-generation-crm-2026-06-14/brief.md
  - {planning_artifacts}/ux-designs/ux-lead-generation-crm-2026-06-14/DESIGN.md
---

# Activity Lead Engine — Experience Spine

> Multi-surface responsive web. shadcn/ui on Next.js + Tailwind. Admin dashboard (desktop-first) + mobile-first public registration per Activity slug. Paired with `DESIGN.md`. Spines win on conflict with any future mock or import.

## Foundation

**Form factor:** Responsive web — two distinct experiences in one product.

| Surface | Primary user | Posture |
|---------|--------------|---------|
| Public registration | Elena (participant) | Mobile-first, unauthenticated, QR entry |
| Operator dashboard | Marco (admin) | Desktop-first, authenticated, activity-led |

**UI system:** shadcn/ui + Tailwind + **next-themes**. `DESIGN.md` is the visual identity reference; this spine owns behavior, IA, states, and flows.

**Theme & appearance:** Full **Light · Dark · System** support on **every surface** (admin and public). Default is **System** — UI follows OS `prefers-color-scheme` until the user chooses otherwise. Theme changes apply instantly with no full-page reload. See `DESIGN.md` Theme & Appearance for token contract.

| Surface | Control | Persistence |
|---------|---------|-------------|
| Admin | Top-bar **ThemeToggle** + Settings → Appearance | Account preference + localStorage |
| Public registration | Footer **ThemeToggle** | localStorage (per browser) |

**Tenancy:** Single business operator (Marco). No participant login. No RBAC UI in MVP.

**Refresh model:** Dashboard metrics poll every 60 seconds. Top bar shows `Updated {time}`. No WebSockets in MVP.

## Information Architecture

### Public (unauthenticated)

| Surface | Route | Reached from | Purpose |
|---------|-------|--------------|---------|
| Activity registration | `/register/{activitySlug}` | QR scan, shared link, social | Hero + dynamic Form + submit |
| Registration confirmation | Same route, post-submit state | Successful form submit | Success message, activity recap |
| Activity unavailable | `/register/{activitySlug}` (archived/unpublished) | Stale QR or link | Clear unavailable message, no form |

No tabs, no account creation, no app download prompts.

### Admin (authenticated)

| Surface | Route | Reached from | Purpose |
|---------|-------|--------------|---------|
| Login | `/login` | Unauthenticated access | Email/password sign-in |
| Dashboard home | `/dashboard` | Post-login default | Metric tiles, activity performance, recent registrations |
| Activities list | `/activities` | Sidebar → Activities | All Activities; create new |
| Communities list | `/activities/communities` | Sidebar → Activities (expand) | Community catalog CRUD; link to community leads |
| Community leads | `/activities/communities/{id}` | Communities list | Leads filtered by community |
| Categories list | `/activities/categories` | Sidebar → Activities (expand) | Category catalog CRUD |
| Activity create | `/activities/new` | Activities list CTA | New Activity wizard (metadata → form → publish) |
| Activity detail | `/activities/{id}` | List row, dashboard card | Tabs: Overview · Form · Registrations · QR & Link |
| Clients list | `/clients` | Sidebar | Master Client List (DataTable) |
| Client profile | `/clients/{id}` | List row, activity registrations | Profile, timeline, follow-up actions |
| Campaigns list | `/campaigns` | Sidebar | Sent campaigns history |
| Campaign compose | `/campaigns/new` | Client segment action, sidebar | Email compose + recipient selection |
| Reports | `/reports` | Sidebar | Weekly/monthly presets, filters, CSV export |
| Settings | `/settings` | Sidebar avatar menu | Account, **Appearance (theme)**, session |

**Navigation:** Left sidebar primary. **Activities** expands on hover (stays open on active Activities routes) to All activities, Communities, and Categories. Breadcrumbs on detail pages. Activity detail uses horizontal tabs — not nested sidebar items.

**Surface closure check:**

| Stated need (PRD) | Surface |
|-------------------|---------|
| Launch activity + QR (UJ-2) | Activity create → Activity detail · QR tab |
| Register at event (UJ-1) | Public registration |
| Review + follow up (UJ-3) | Dashboard → Clients → Client profile |
| Monthly export (UJ-4) | Reports |

→ Composition reference: spine-only for MVP. Promote to `mockups/` when visual reference requested.

## Voice and Tone

Microcopy only. Brand aesthetic lives in `DESIGN.md`.

### Public (Elena)

| Do | Don't |
|----|-------|
| "You're registered!" + **Registration ID** (monospace, copyable) + activity recap | "Form submitted successfully ✓" |
| "Show this ID at check-in." | Expose registration ID on duplicate-submit error |
| "A few details so {host} knows you're coming." | "Please complete all required fields" |
| "See you there." | "Thank you for your submission!" |

### Admin (Marco)

| Do | Don't |
|----|-------|
| "3 new registrations since yesterday" | "Lead count increased by 3" |
| "Send follow-up email" | "Initiate campaign workflow" |
| "Activity archived — link no longer accepts sign-ups" | "Entity deactivated" |

Terminology: UI may say **lead** or **contact** in filters; requirements and profile headers use **Client** per PRD glossary.

## Component Patterns

Behavioral. Visual specs in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|-----------|-----|------------------|
| **RegistrationForm** | Public + admin preview | Fields from Activity JSON schema. Inline validation on blur. Submit disabled until required fields + consent (when present) valid. Single-page form for MVP — no multi-step wizard unless >12 fields. |
| **ActivityHero** | Public registration top | Shows activity name, schedule, location, community tag. Optional hero image. Hidden on confirmation state. |
| **StatusBadge** | Client list, profile, filters | Exactly one Lead Status per Client. Change via profile dropdown — confirms with Toast. |
| **ClientRow** | Clients DataTable | Click row → Client profile. Sort by name, status, last registration date. Server pagination 25 rows. |
| **ActivityCard** | Dashboard, Activities list (grid option) | Click → Activity detail. Activities list shows **total** registration count from API. Dashboard ranking uses period filter. |
| **TimelineEvent** | Client profile | Chronological: Registration submitted · Email campaign sent · Lead Status changed · WhatsApp status updated · Operator note added. Newest first. |
| **SegmentPicker** | Campaign compose | Presets: All clients · By Activity · By Lead Status · By Community · Manual multi-select. AND semantics across filters. |
| **ReportFilterBar** | Reports | Date preset (week/month/custom) + Activity + Community + Lead Status + Referral Source. Export respects active filters. |
| **QrPanel** | Activity detail · QR tab | Live preview, copy URL, download PNG. QR and URL always match. |
| **FormFieldEditor** | Activity detail · Form tab | Add/remove/reorder fields via structured list (grip drag or arrows — not canvas DnD). Template picker: TGH Tennis, Ikigai Pickleball, Board Game Night. |
| **ConsentBlock** | Board Game Night template | Required checkbox before submit. Plain-language consent copy. Cannot submit unchecked. |
| **WhatsAppButton** | Client profile | Opens `wa.me/{phone}` in new tab/app. Logs "WhatsApp initiated" on timeline when clicked `[ASSUMPTION]`. |
| **MetricTile** | Dashboard | Tap → filtered Clients list or Activity detail. Empty state when no Activities yet. |
| **ThemeToggle** | Admin top bar, public footer | Three-way control: Light · Dark · System. Popover or dropdown; active selection highlighted. Icon reflects current *resolved* appearance (sun/moon), not just stored preference — when System + OS dark, show moon. Changing theme re-renders all tokens immediately; form input values preserved. |

## Theme & Appearance

### ThemeToggle behavior

1. **Options:** Light, Dark, System — always all three visible; never a binary toggle alone.
2. **System mode:** Listens to `prefers-color-scheme` media query; updates UI live when OS theme changes (no refresh).
3. **Admin persistence:** Save choice to operator profile on change; load from profile on login, fallback localStorage before auth hydrates.
4. **Public persistence:** Save to `localStorage` key scoped to app origin; persists across return visits on same device.
5. **First visit:** Default **System** — no stored preference.
6. **No flash:** Theme resolved before first paint via inline head script (see `DESIGN.md`).

### Settings → Appearance

Segmented control matching ThemeToggle options. Helper text:

- Light — "Always use light appearance."
- Dark — "Always use dark appearance."
- System — "Match your device settings."

Changing here syncs top-bar ThemeToggle state instantly.

### Per-surface requirements

Every admin screen and every public registration state (hero, form, confirmation, unavailable) must pass visual QA in **both** resolved light and dark appearances. Checklist per screen:

- Text contrast ≥ WCAG AA on all backgrounds
- Borders visible but not harsh in dark mode
- StatusBadge colors readable on table rows in both modes
- Focus rings visible on inputs in both modes
- Hero images: optional dim overlay in dark mode if photo is bright `[ASSUMPTION]`

### QR code exception

Downloaded QR PNG always white background + black modules — independent of UI theme.

## State Patterns

| State | Surface | Treatment |
|-------|---------|-----------|
| First-time operator (no Activities) | Dashboard | Hero empty: "Create your first activity to start capturing registrations." Single primary CTA → `/activities/new`. |
| Activity unpublished | Activity detail | Banner: "Not live — publish to generate QR and link." |
| Activity archived | Public URL | "This activity is no longer accepting registrations." No form. |
| Duplicate Client on register | Public submit | Success still shown to Elena. Backend dedupes silently `[ASSUMPTION: no merge UI in MVP]`. |
| Merge suspect flag | Client profile | Subtle banner: "Possible duplicate — review suggested." Link to filtered list `[ASSUMPTION: flag only]`. |
| Dashboard loading | Dashboard | Page-level spinner on first load; subsequent polls update tiles without full-page flash. |
| Table loading | Clients, Registrations | Spinner in table body only. |
| Campaign send partial failure | Campaign compose result | Summary: "{n} sent, {m} failed" with expandable failure reasons. |
| Report empty | Reports | "No registrations in this period." Adjust filters hint. |
| Offline public submit | RegistrationForm | Native browser offline message; retry on reconnect. No custom offline shell in MVP. |
| Session expired | Admin | Redirect to `/login` with Toast: "Session expired — sign in again." |
| Theme preference loading | Admin | Render resolved theme from inline script; no unstyled flash. Spinner not required for theme alone. |
| OS theme changes (System mode) | All surfaces | UI updates within one frame; no Toast, no reload. |
| Theme change mid-form | Public + admin forms | Preserve all field values and scroll position. |

## Interaction Primitives

**Public (mobile-first)**

- One primary action per viewport (Join → Submit → Done)
- Native browser Back between hero and form `[ASSUMPTION: single-page scroll preferred over multi-route]`
- Phone input with country code default `[ASSUMPTION: PH +63 default for Creativorare client]`
- Select fields as native-style pickers on mobile (shadcn Select)
- Tap targets ≥ 48px
- **ThemeToggle** reachable in footer without scrolling past submit on typical forms `[ASSUMPTION: sticky footer on tall forms]`

**Admin (desktop-first)**

- Sidebar keyboard: `[ASSUMPTION: no vim-style shortcuts in MVP]`
- DataTable: column sort click, row click to drill down
- Dialogs for destructive actions (archive Activity, send Campaign confirm)
- Tabs persist within Activity detail and Client profile sections
- Filter chips clear individually; "Clear all" resets ReportFilterBar
- **ThemeToggle** in top bar: keyboard accessible (`Tab` → `Enter` opens popover; arrow keys select mode)

**Banned in MVP:** drag-and-drop dashboards, inline table cell edit, push notifications, participant self-service portal, **light-only screens**.

## Accessibility Floor

Behavioral. Visual contrast from `DESIGN.md` tokens.

- All form fields: visible `<Label>` + `aria-describedby` for errors
- StatusBadge: text label always present (not color-only)
- Focus order follows visual order on public forms (top to bottom)
- Dialog focus trap; Esc closes
- DataTable: sort buttons labeled ("Sort by name")
- Public confirmation: `role="status"` live region announces success; registration ID visible and copyable
- Reduce Motion: disable hover card lift; instant Toast
- Target size: 44×44px minimum on public CTAs
- **ThemeToggle:** `aria-label` includes current mode ("Appearance: System, currently dark"); popover options use `aria-checked` on selected segment
- Verify contrast for all Lead Status badge pairs in both light and dark resolved themes

## Inspiration & Anti-patterns

**Lifted from**

- **Typeform / Google Forms mobile flow:** one column, generous spacing, minimal chrome — adapted for branded activity hero
- **Linear / Notion admin calm:** neutral workspace, sidebar nav, scannable lists — includes respected dark mode

**Rejected**

- **Enterprise CRM pipeline boards (HubSpot deals):** wrong mental model; Marco thinks Activities, not deal stages
- **Drag-and-drop form builders (Typeform admin):** MVP uses template + structured field editor
- **Streak/gamification on follow-up coverage:** coverage metric is operational, not competitive leaderboard
- **Participant accounts:** explicitly out of scope PRD §5

## Responsive & Platform

| Breakpoint | Public | Admin |
|------------|--------|-------|
| `< 768px` | Default; full-width form | Sidebar → Sheet; tables horizontal scroll |
| `768px–1279px` | Centered column max 480px | Sidebar + content |
| `≥ 1280px` | Same | Full dashboard layout |

Public pages target **FCP < 2s on 4G** — SSR form schema, hero image ≤ 50kb `[ASSUMPTION]`.

Admin optimized for laptop; phone admin usable but not primary design target.

## Key Flows

### Flow 1 — Elena registers at the Sunday pickleball clinic (UJ-1)

**Protagonist:** Elena, first-time player, scans QR at venue. Mobile browser.

1. QR opens `/register/ikigai-pickleball-sunday`.
2. **ActivityHero** shows clinic name, time, location, Ikigai community tag.
3. Elena scrolls **RegistrationForm** — name, profession, phone, first-timer, level, invited-by, referral source.
4. Inline validation on blur; submit enabled when valid.
5. Tap **Join activity**.
6. **Climax:** Confirmation replaces form — "You're registered for Ikigai Dink & Drive. See you Sunday."
7. **Resolution:** Elena closes browser. Marco's dashboard count increments within 60s.

**Edge:** Elena registered for Board Game Night last month with same phone → success shown; existing Client updated; new Registration created.

**Failure:** Network error on submit → inline error + retry button; no data loss of filled fields.

### Flow 2 — Marco launches a tennis clinic (UJ-2)

**Protagonist:** Marco, Monday planning, desktop.

1. Signs in → Dashboard (empty or existing Activities).
2. Sidebar **Activities** → **New activity**.
3. Step A: name, community (TGH), category, schedule, location, status draft.
4. Step B: **Form** tab — select **TGH Tennis template**; adjust fields if needed.
5. Step C: **Publish** → Activity live.
6. **QrPanel** tab — download QR, copy Instagram link.
7. **Climax:** Marco pastes link to Stories; first registration appears in **Registrations** tab without leaving platform.
8. **Resolution:** Activity is a live lead engine.

### Flow 3 — Marco weekly follow-up (UJ-3)

**Protagonist:** Marco, Friday afternoon, desktop.

1. Dashboard → **MetricTile** "New this week: 12" → filtered Clients list.
2. Opens **Client profile** for Priya — sees **TimelineEvent** entries: Pickleball registration 3 days ago, status **New**.
3. Reads activity-specific answers in profile sidebar.
4. Taps **Send follow-up email** → `/campaigns/new` with Priya pre-selected OR bulk-selects 8 Clients with status New.
5. Composes subject/body, picks template, sends.
6. Alternative path: **WhatsAppButton** → WhatsApp opens; Marco sends personal message; returns, sets status **Contacted** + optional note.
7. **Climax:** Timeline shows campaign sent or WhatsApp status updated — Marco knows he won't double-message.
8. **Resolution:** Dashboard follow-up coverage metric improves.

### Flow 4 — Marco monthly stakeholder report (UJ-4)

**Protagonist:** Marco, first Monday of month, desktop + projector.

1. **Reports** → preset **Monthly**.
2. **ReportFilterBar** — all communities, date range auto-set.
3. Reviews summary blocks: registrations by Activity, new Clients, community ranking, repeat participants, inactive Clients, campaign results.
4. Applies filter: Ikigai Pickleball only — summary updates.
5. **Export CSV**.
6. **Climax:** File downloads — no manual spreadsheet consolidation.
7. **Resolution:** Stakeholders decide which activity to scale.

`[ASSUMPTION]` PDF layout deferred; CSV opened in Sheets for presentation until Open Question 4 resolved.

### Flow 5 — Elena switches to dark mode at an evening event `[ASSUMPTION]`

**Protagonist:** Elena, Board Game Night registration, venue lighting is dim, phone already in dark mode.

1. Opens `/register/board-game-night` — page renders in **dark** automatically (System mode default matches OS).
2. Form fields, consent block, and CTA remain readable; borders visible on `{colors.border-warm-dark}`.
3. Elena completes registration; confirmation screen stays in dark.
4. **Climax:** No squinting at a blinding white form — theme matched her device without a setting hunt.
5. **Resolution:** If Elena prefers light, footer **ThemeToggle** → Light persists for future visits on this device.

## Product-Specific Sections

### Per-activity public branding

Each Activity may set:

- Display name and subtitle
- Optional hero image URL
- Optional accent color override (buttons/links on public page only)

Platform `{colors.primary}` used when no override. Typography and spacing never per-activity in MVP.

### Launch form templates (from addendum)

| Template | Notable UX |
|----------|------------|
| TGH Tennis | Tennis level select, clinic interest, referral source |
| Ikigai Pickleball | First-timer toggle, playing level, invited-by |
| Ikigai Board Game Night | **ConsentBlock** required, residency select, social handle |

### Lead Status workflow `[ASSUMPTION]`

Canonical MVP statuses: **New → Contacted → Active → Inactive**. Operator may change from profile dropdown anytime; each change appends timeline event. Dashboard filters and Reports use same labels.

### Consent & communication preferences

Board Game template **ConsentBlock** gates submit. **Campaign** recipient selection excludes Clients without consent when sending cross-community promotions `[ASSUMPTION]` — surface warning in SegmentPicker if segment includes non-consented records.

## Open Questions (UX impact)

1. PDF export → adds print-styled Report preview pane
2. Auto welcome email → adds post-registration operator notification vs silent confirm only
3. Manual duplicate merge → adds merge dialog on Client profile
4. Fixed vs custom Community labels → affects Community filter options and Activity create select

---

**Next recommended workflows:** `bmad-create-architecture` → `bmad-create-epics-and-stories` → `bmad-check-implementation-readiness`
