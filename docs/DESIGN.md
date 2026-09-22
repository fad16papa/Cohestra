---
name: Cohestra Product Experience 2.0
description: Living product-design contract — Midnight Atelier as a calm relationship command center.
status: draft
phase: 1
created: 2026-09-22
updated: 2026-09-22
canonical: true
conflict_rule: This file wins over mocks, cinema copy, and BMAD planning artifacts. BMAD artifacts keep rationale and history. Epics 35–37 win over this file when a visual change would reopen their locked behavior.
inherits: Midnight Atelier (ux-cohestra-2026-07-18/DESIGN.md) + shipped brand-tokens.css
protected:
  - Epic 35 form layouts, flows, responsiveness, entitlements
  - Epic 36 composition schema, builder operations, renderer, submission
  - Epic 37 motion tokens 100 / 160 / 280 and CSS prefers-reduced-motion
theme:
  modes: [light, dark, system]
  default: light
  implementation: class-based (.dark on html) via next-themes
  marketing: light-locked
  platform: light, shared semantic tokens
  registration_preview: light-reset (.registration-preview-surface)
sources:
  - _bmad-output/planning-artifacts/cohestra-ux-audit.md
  - _bmad-output/planning-artifacts/cohestra-information-architecture.md
  - _bmad-output/planning-artifacts/cohestra-component-inventory.md
  - _bmad-output/planning-artifacts/cohestra-content-language.md
  - _bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
colors:
  ink: '#070d12'
  ink-soft: '#141c24'
  paper: '#fafbfc'
  paper-warm: '#f3f5f7'
  stone: '#8b939c'
  text-muted: '#5a636e'
  line: '#e6e9ed'
  line-strong: '#d0d5db'
  lagoon: '#0b6b63'
  lagoon-deep: '#08554f'
  lagoon-fg: '#f3fffc'
  gold: '#a68b5b'
  gold-soft: '#f4eee3'
  success: '#1f7a5c'
  warn: '#9a6700'
  danger: '#9b1c1c'
typography:
  display:
    fontFamily: Fraunces
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.08'
    letterSpacing: -0.03em
  display-sm:
    fontFamily: Fraunces
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.15'
    letterSpacing: -0.025em
  title:
    fontFamily: Fraunces
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.25'
    letterSpacing: -0.02em
  section:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.12em
  body:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.35'
    letterSpacing: 0.06em
rounded:
  sm: 4px
  md: 10px
  lg: 16px
  xl: 24px
spacing:
  scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
  page-gutter-mobile: 16px
  page-gutter-tablet: 24px
  page-gutter-desktop: 32px
  admin-sidebar-expanded: 240px
  admin-sidebar-compact: 64px
  admin-max-width: 80rem
density:
  desktop-control: 40px
  touch-control: 44px
  public-action: 48px
motion:
  press: 100ms
  local: 160ms
  route: 280ms
components:
  button-primary:
    background: '{colors.lagoon}'
    foreground: '{colors.lagoon-fg}'
    radius: '{rounded.md}'
    height-desktop: '{density.desktop-control}'
    height-touch: '{density.touch-control}'
    height-public: '{density.public-action}'
  button-secondary:
    background: transparent
    foreground: '{colors.ink}'
    border: '1px solid {colors.line-strong}'
    radius: '{rounded.md}'
  dialog:
    primitive: components/ui/dialog
    motion: '{motion.local}'
---

# Cohestra — Product Experience 2.0 design contract

> **Midnight Atelier, operational.** Cohestra is a calm relationship command center: intelligent, professional, human, trustworthy, and operationally efficient.
>
> This file is the living contract for how the product looks and how shared chrome behaves. Implementation stories in Epics 38–43 apply it. They do not invent a second visual language.

**Conflict rule**

1. `docs/DESIGN.md` is canonical for Product Experience 2.0.
2. `_bmad-output/planning-artifacts/*` preserve Phase 0/0.1 evidence, rationale, and history. They do not override this file.
3. Epics 35, 36, and 37 remain locked. If a restyle would change public registration shells, Form Studio composition/renderer/submit, or the 100/160/280 + CSS reduced-motion architecture, those epics win.
4. Spines win over mocks, cinema slides, and one-off component CSS.

This Phase 1 document specifies the contract. It does **not** restyle production UI.

---

## 1. Product personality and experience principles

Cohestra should feel like a private operations atelier for people who remember names. The operator arrives on Monday, sees who needs care, and acts — without decorative chrome competing with the work.

**Personality**

| Trait | Means in the product |
|-------|----------------------|
| Intelligent | Surfaces the next useful action with evidence. Does not perform “AI.” |
| Professional | Editorial type, hairline rules, predictable rooms. Not a dashboard template. |
| Human | People, activities, and follow-up are first-class. Metrics serve those rooms. |
| Trustworthy | Contrast holds. Errors are honest. Locks name the plan. Status language does not collide. |
| Operationally efficient | Dense enough for desktop power use; large enough to hit on a phone. One primary action per region. |

**Experience principles**

1. **One product, one language.** Marketing cinema and the operator console use the same room names.
2. **Rooms over fragments.** Follow-up is a room. “Needs attention” is a dashboard section. Opportunity is a follow-up state, not a nav item.
3. **Lock, do not dead-end.** Discoverable paid modules stay visible with a plan lock. Structurally unavailable controls stay hidden.
4. **Almost flat.** Borders and one restrained shadow. No glow stacks, no nested rounded-card theaters.
5. **Motion has a job.** Press, local overlay, and route enter only. No animation without task value.
6. **Accessibility is structural.** One `h1`, one `main`, one skip link, 4.5:1 muted text, 44px touch.
7. **Studios are instruments.** Website Studio and Form Studio share chrome grammar; they do not become a third brand.
8. **Platform inherits tokens.** Sparse layout may remain. Raw `--plat-*` hex is not a second system.

**Reject (generic AI-SaaS)**

- Decorative gradients without semantic meaning
- Excessive rounded-card nesting
- Oversized vanity metrics that crowd the next action
- Weak low-contrast metadata
- Animations without task value
- Isolated redesigns that create different visual languages

---

## 2. Canonical terminology

Full glossary and error-message rules live in `_bmad-output/planning-artifacts/cohestra-content-language.md`. This section is the contract those words must satisfy.

| Use this | Do not use as a peer |
|----------|----------------------|
| Dashboard | Home (desktop nav). “Home” is the mobile label for Dashboard only. |
| Clients | Contacts, leads (as a room name) |
| Activities | Events (as a room name) |
| Follow-up | Needs follow-up (as a room). Queue widgets may say “Needs follow-up.” |
| Opportunity | A follow-up **state / category**, never a primary nav room |
| Analytics | Reports (as a room name). “Reports” is an Analytics capability / export. |
| Cohestra AI | Needs attention (as a room). “Needs attention” is a dashboard section. |
| Website | Website Builder, `/site` (as a label). Page title may be **Website Studio**. Path stays `/dashboard/website` unless a later story moves it. |
| Form Studio | The Activity `Form` tab. Not a primary nav room. |
| Campaigns | Broadcasts, blasts |
| Settings | Workspace / account configuration |
| Team | Seats, members |
| Billing | Subscription, plan checkout |
| Platform | Operator console for Cohestra staff — not a tenant room |

**Status language (must not collide)**

| Dial | User-facing |
|------|-------------|
| `TenantStatus.Suspended` | Workspace **paused** / **suspended**. Never “on hold.” |
| `BillingStatus.OnHold` | Billing **on hold**. Never “workspace paused.” |
| Plan lock | “Requires {Plan}” + priced next step. Never a blank dead end. |

---

## 3. Desktop and mobile navigation

Encoded decisions **D1–D4**. Not implemented in Phase 1.

### 3.1 Desktop primary rooms (≥768)

Order, labels, and intended hrefs:

| Order | Label | Href (proposed) | Notes |
|-------|-------|-----------------|-------|
| 1 | Dashboard | `/dashboard` | Command center. Not a dump of every widget as a room. |
| 2 | Clients | `/clients` | Relationship list + profile. |
| 3 | Activities | `/activities` | List; children Communities / Categories remain secondary. |
| 4 | Follow-up | `/follow-up` | **New primary room.** Dashboard widgets link here. |
| 5 | Analytics | `/analytics` (alias `/reports`) | “Reports” is a capability inside Analytics. Existing `/reports` may redirect. |
| 6 | Cohestra AI | `/ai` | Room for the intelligence brief and next actions. Dashboard keeps a “Needs attention” section that links here. |
| 7 | Website | `/dashboard/website` | Page title **Website Studio**. |
| 8 | Campaigns | `/campaigns` | Discoverable; lock on Basic/Core. |

**Not primary rooms:** Settings, Team, Billing, Communities, Categories, Form Studio, Opportunity, Needs attention, Reports.

**Desktop footer (TenantAdmin):** Settings · Team · Billing (Billing if Basic or billing owner).  
**Desktop footer (TenantMember):** Settings only.

### 3.2 Mobile primary destinations (<768)

| Order | Label | Maps to |
|-------|-------|---------|
| 1 | Home | Dashboard `/dashboard` |
| 2 | Clients | `/clients` |
| 3 | Activities | `/activities` |
| 4 | Follow-up | `/follow-up` |
| 5 | More | Sheet: Analytics, Cohestra AI, **Website**, Campaigns, Settings, Team, Billing |

**D3:** Website belongs under **More**, not Home. Visiting `/dashboard/website` must not mark Home as the active tab.

More-sheet items follow D4: paid modules visible with lock + plan label; structurally unavailable items hidden.

### 3.3 Active-state rules

- Dashboard / Home is active only on `/dashboard` (not `/dashboard/website` or other `/dashboard/*` tools).
- Activities is active for `/activities`, `/activities/new`, and `/activities/{id}` including Form Studio. Communities and Categories are Activities children.
- Follow-up is active on `/follow-up` and may stay visually related when a profile was opened **from** Follow-up (back affordance), but `/clients/{id}` is a Clients route for landmarks and `h1`.

---

## 4. Page and shell anatomy

### 4.1 Landmarks (**D9**)

| Owner | Rule |
|-------|------|
| Shell | Exactly **one** `<main>` landmark. Settings, studios, and platform pages are regions inside it — never a second `<main>`. |
| Route | Exactly **one** page-level `h1`. Chrome must not introduce a competing route heading. The top bar title is a `p` / `span`, not `h1`. |
| Skip link | First focusable control in the authenticated shell: “Skip to main content” → `#main`. Visible on focus. |

Document title: `{Page h1} · {Tenant or Cohestra}`.

### 4.2 Admin shell regions

```
[ skip link ]
[ billing banner — when a billing/tenant dial requires it ]
[ desktop: sidebar ] [ top bar: search / plan / account ]
                       [ page header: h1 + primary action ]
                       [ main#main: page body ]
[ mobile: tab bar ]
[ calendar / utility — must not cover list rows or the tab bar ]
```

- Sidebar: expanded 240px ≥1024; compact 64px with visible text alternative (tooltip + `sr-only`) at 768–1023.
- Mobile tab bar: 5 destinations, ≥44px hit area, `md:hidden`.
- Page header: `h1` (`{typography.display-sm}` or `{typography.title}` by density) + optional description + **one** primary action + overflow menu for secondary actions.
- Content width: `max-w-7xl` for operational lists; studios may go full bleed inside `<main>`.
- Gutters: 16px <768 · 24px 768–1023 · 32px ≥1024.

### 4.3 Surface families

| Family | Shell | Notes |
|--------|-------|-------|
| Marketing | Apex cinema | May use photographic fields. Must not invent admin tokens. |
| Tenant public door | Stub / SitePage / maintenance | Hospitality, not admin chrome. |
| Public registration | Epic 35 shells | Locked. Tokens via experience enums. |
| Tenant admin | This shell | Relationship command center. |
| Platform | Sparse console | Shared semantic tokens (**D10**). Density may stay sparser. |
| Auth | AuthFlowShell | Same ink/paper/lagoon. No gradient CTA. |

---

## 5. Semantic colors and required contrast

Hex source of truth for raw brand remains `web/styles/brand-tokens.css`. This contract adds **semantic** tokens that implementation stories must introduce. Do not keep `--muted-foreground` aliased to `--stone`.

### 5.1 Brand raw (shipped — do not invent a third palette)

| Token | Hex | Role |
|-------|-----|------|
| `--ink` | `#070d12` | Primary text |
| `--paper` | `#fafbfc` | Canvas |
| `--paper-warm` | `#f3f5f7` | Card / muted surface |
| `--stone` | `#8b939c` | **Atmosphere only** — not body or helper text |
| `--lagoon` | `#0b6b63` | Primary action |
| `--gold` | `#a68b5b` | Whisper accent — **not** helper text (3.13:1 on paper) |
| `--success` / `--warn` / `--danger` | shipped | Status |

### 5.2 Required semantic text tokens (**D5**)

| Token | Contract | Notes |
|-------|----------|-------|
| `--text` | `--ink` · ≥4.5:1 on `--paper` and `--paper-warm` | Body |
| `--text-muted` | **≥4.5:1** on `--paper` **and** `--paper-warm` for normal text | New semantic token. Recommended seed `#5a636e` (5.88:1 on paper). **Do not** globally reuse `--stone-cinema` by name. |
| `--text-on-lagoon` | `--lagoon-fg` · ≥4.5:1 on `--lagoon` | Primary buttons |
| `--text-on-danger` | light on `--danger` · ≥4.5:1 | Destructive buttons |

`--stone` and `--gold` remain decorative / eyebrow / chart. They are **not** default metadata color.

Dark mode must invert canvases and re-verify `--text-muted` ≥4.5:1 against the dark paper.

### 5.3 Status, messenger, charts

- Success / warn / danger come from semantic tokens, including **toasts** (no raw `red-*` / `emerald-*`).
- Lead status hues stay `--status-new|contacted|active|inactive` and must meet 3:1 for large UI / 4.5:1 if used as text.
- WhatsApp / Viber brand chips are allowed as small glyphs; accompanying text uses `--text` / `--text-muted`.
- Tenant brand accent overlays `--primary` / `--accent` / `--ring` on admin only. Accent never replaces `--text-muted` and never drops button contrast below 4.5:1.

### 5.4 Platform

`--plat-*` raw duplicates migrate to the shared semantic set (**D10**). Platform may keep a sparser layout; it may not keep a second inaccessible stone.

---

## 6. Typography hierarchy

Fonts: **Fraunces** (voice) + **Plus Jakarta Sans** (instruments). Geist remains implementation fallback, not a third brand face.

| Role | Token | Typical use |
|------|-------|-------------|
| Page `h1` | `{typography.display-sm}` desktop · `{typography.title}` dense/mobile | One per route |
| Section eyebrow | `{typography.section}` | Uppercase tracking — not the page `h1` |
| Section `h2` | `{typography.title}` | Regions inside a room |
| Body | `{typography.body}` | 16 / 1.6 |
| Secondary / tables | `{typography.body-sm}` | 14 — still `--text` or `--text-muted` at 4.5:1 |
| Label | `{typography.label}` | Field labels, chip text |

Chrome product name may stay Fraunces. Chrome **page title in the top bar is not an `h1`**.

Do not use marketing-display sizes inside the admin shell.

---

## 7. Spacing, grid, density, and breakpoints

### 7.1 Spacing scale

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Prefer these over one-off `p-[13px]`.

Stack rhythm: 16 between related controls, 24 between page sections, 32 above a new room region.

### 7.2 Grid

- Admin operational pages: 12-column mental grid inside `max-w-7xl`.
- Prefer 5/7 or 4/8 over equal vanity split for hero-like admin headers.
- Lists: one column `<768`; cards through `md`; tables may appear ≥1024 if they do not force horizontal scroll `<md`.

### 7.3 Density (**D6**)

| Context | Control height | Where |
|---------|----------------|-------|
| Dense desktop | **~40px** | Admin buttons, inputs, row actions ≥768 |
| Touch / mobile | **≥44px** | Tab bar, chips, icon buttons, Form Studio handles `<768` |
| Prominent public actions | **48px** | Registration Join / Continue (Epic 35 public CTAs — do not shrink) |

WCAG 2.2 2.5.8 (24px) is necessary but **not sufficient**. Cohestra’s floor is the table above.

### 7.4 Breakpoints

| Width | Shell | Form Studio (**D7**) | Website Studio |
|-------|-------|----------------------|----------------|
| <768 | Tab bar + stacked page | Single column; inspector in a sheet | Edit / Preview tabs |
| 768–1023 | Compact rail + page | Single column or sheet inspector | Edit / Preview; no three-pane |
| 1024–1279 | Expanded rail | **Two-pane + collapsible inspector** | Builder chrome; no forced split |
| ≥1280 | Expanded rail | **Three panes** (palette · canvas · inspector) | Split build/preview allowed |

Do not treat Tailwind `xl` (1280) as “tablet.” Tablet landscape is 1024–1279 and needs a deliberate composition, not an unguided stack.

---

## 8. Surfaces, borders, radii, elevation, and icons

| Element | Rule |
|---------|------|
| Canvas | `--paper` |
| Card / panel | `--paper-warm`, **one** radius, 1px `--line` |
| Nested cards | At most **one** nesting level. No card-in-card-in-card. |
| Radius | Controls `{rounded.md}` (10). Panels `{rounded.lg}` (16). Marketing frames `{rounded.xl}` (24). Avoid full pills on primary buttons. |
| Elevation | Almost flat. Default: border only. Raised overlay: one shadow `0 16px 40px rgba(7,13,18,0.10)`. Product-frame marketing shadow may stay deeper. |
| Icons | Lucide, 16–20px optical, 44px hit box on touch. No mixed icon families in admin chrome. |
| Hairline | 1px `--line`. Gold hairline is rare emphasis, not a card outline. |

---

## 9. Buttons and touch-target rules

| Variant | Use |
|---------|-----|
| Primary | One per region. Lagoon. No gradient. |
| Secondary | Outline, `--line-strong`. |
| Ghost | Tertiary in toolbars. Still meets density floors. |
| Destructive | `--danger`. Always confirm for irreversible work. |
| Link | Inline text action. Not a substitute for a 40/44 control in chrome. |

Rules:

- Default admin `Button` target becomes ~40px (desktop), not 32px (`h-8`).
- Icon-only buttons inherit the same floors. `icon-xs` (24px) is allowed only when a 44px hit box still surrounds the glyph **or** a keyboard-equivalent exists **and** the control is desktop-dense chrome — never the sole mobile reorder handle.
- Disabled controls stay in the tab order only when the disabled reason is explained adjacent (plan lock, publish gate).
- Press feedback uses `.motion-press` **100ms**. No scale circus.

---

## 10. Forms, tables, cards, tabs, menus, drawers, and dialogs

### 10.1 Forms

- Label above field. Helper and error below. Error uses `--danger` text at ≥4.5:1.
- Admin fields ~40px desktop / ≥44px touch.
- Public registration fields remain Epic 35 tokens (`min-h-11` / comfortable 52–56). Do not “unify” them downward.
- Required indicator is text or `aria-required`, not color alone.
- Auth underline inputs should migrate to the shared field, not a third style.

### 10.2 Tables

- One data-table primitive for operational lists (Clients ≥1024, Analytics, Platform).
- `<sm`: stacked cards. 768–1023: cards or a non-scrolling summary; **no** `min-w-[42rem]` trap.
- Header cells use `--text-muted` (AA), not `--stone`.
- Row action menus must be keyboard reachable.

### 10.3 Cards

- Used for dashboard regions, activity tiles, empty states.
- Metric cards: Fraunces number + muted label. Numbers serve a job; they are not vanity murals.
- Clickable cards are links or buttons with a visible focus ring — not `div` + click.

### 10.4 Tabs

- In-page views (Dashboard Overview/Graphs/Tables; Activity Design/Form/…). Prefer URL or shareable query where the view is a job, not only `localStorage`.
- Selected tab: lagoon underline or hairline, 3:1 against unselected.
- Activity Form tab **is** Form Studio. Do not add a second Form Studio nav item.

### 10.5 Menus, drawers, dialogs (**D8**)

- Every modal overlay uses `components/ui/dialog` (or `alert-dialog` / `sheet`) so Esc, focus trap, restore, and `data-slot` reduced-motion CSS apply.
- Local motion **160ms**. Press remains 100ms.
- Sheets for mobile inspectors and the More menu.
- Command palette must use the same accessible overlay contract.
- Cookie consent on marketing is a **non-modal banner**. It must not cover the primary hire CTA (PX2-LIVE-001).

Campaign email preview and insert-QR are not exempt.

---

## 11. Required product states

Every operational route must be able to render these with shared primitives — not a new dashed sentence per module.

| State | Primitive / behavior |
|-------|----------------------|
| Loading | Shared skeletons (`ListSkeleton`, `ProfileSkeleton`, studio placeholders). No layout jump of the `h1`. |
| Empty | `ProductEmptyState` — what is missing, why it matters, **one** next action. |
| Success | Toast (semantic tokens) or inline confirmation. Registration success remains Epic 35. |
| Warning | Banner or inline; `--warn` + text. Billing banners stay in chrome. |
| Error | `ProductErrorState` for page/section fetch failure. Inline field errors for forms. |
| Permission | Shared denied pattern: title, what is blocked, who can help. Members do not see a checkout CTA. Redirect is allowed when the destination is structurally unavailable (e.g. Member → Team). |
| Offline | Named “You’re offline” with retry. Do not impersonate a server 500. |
| Destructive | Alert dialog (shared primitive): consequence, undo-if-any, confirm verb that names the object. |
| Entitlement | Priced `UpgradePanel` or inline lock — see §13. |
| Not found / crash | App Router `not-found.tsx` and `error.tsx` (**D11**) in product voice. No raw Next default. |

Platform lists may stay sparse but must use the same empty/error grammar.

---

## 12. Accessibility requirements

Floor: **WCAG 2.2 AA**. Product floors that exceed AA (40/44/48, skip link, one `h1`) are still required.

| Requirement | Contract |
|-------------|----------|
| Contrast | Body and helper text ≥4.5:1 via `--text` / `--text-muted`. UI chrome ≥3:1. |
| Keyboard | All jobs completable without a pointer. Visible `focus-visible` ring (`--ring` / lagoon, 3px) on every interactive control, including pulse links, queue rows, studio tabs, toast actions. |
| Skip link | §4.1 |
| Headings / landmarks | One `h1`, one `main`, labeled nav / complementary where present. |
| Names | Icon-only controls have accessible names. Intelligence count links include the person or activity name, not a bare number. |
| Dialogs | Esc, focus trap, restore to invoker, `aria-modal`. |
| Zoom | 200% reflow without loss of primary action (admin + public). |
| Reduced motion | CSS `@media (prefers-reduced-motion: reduce)` zeros Epic 37 tokens and slotted overlays. **No JS gate** on route enter. |
| Touch | §7.3 / §9 |
| Forms | Labels, errors, and `aria-invalid` / `aria-describedby`. |
| Live regions | Toasts and billing banners are polite; destructive failures may be assertive. |

No claim of VoiceOver/NVDA sign-off exists from Phase 0.1. Implementation stories must not treat the manual Chromium baseline as AT acceptance.

---

## 13. Motion rules (Epic 37 — protected)

| Token | Duration | Use |
|-------|----------|-----|
| Press | **100ms** ease-out | Hover/active color, bg, border, shadow, opacity, transform |
| Local | **160ms** ease-out | Overlays, tabs, expand/collapse. **No transform on dialogs** unless already in the slotted primitive and still 160ms |
| Route enter | **280ms** | Admin `<main>` pathname-only key |
| Builder context / tab / presence / selection | 180 / 120 / 140 / 150 | Website + Form studios only |

**Do not**

- Change 100 / 160 / 280
- Add animation libraries
- Key route enter on query or hash (Form Studio draft must survive)
- Keep hidden preview trees mounted while editing (Epic 37 AD-8)
- Animate customer website content merely because it sits in Preview
- Leave custom overlays outside `data-slot` PRM CSS

Legacy 200ms profile expand and 150/200 dialog timings migrate to **160ms local**.

---

## 14. Website Studio and Form Studio composition

Studios share: BuilderSurface, 40/44 controls, one `h1`, one `main`, slotted dialogs, Epic 37 builder motion.

They do **not** share a forced single editor-state abstraction (Epic 37 non-goal).

### 14.1 Website Studio

- Path `/dashboard/website`. Title **Website Studio**.
- Basic: visible nav + priced Core lock. API must speak `403` / `plan_locked`, not `500`.
- ≥1280: optional split build/preview. 1024–1279: builder chrome without cramped three columns. `<lg`: Edit / Preview tabs.
- Live preview unmounts while editing.
- Mobile: reachable from **More**, not Home.

Do not change published SitePage section entitlements.

### 14.2 Form Studio (**D7**)

- Lives on Activity `?tab=form`. Build | Preview.
- **≥1280:** three panes — palette · composition · inspector.
- **1024–1279:** two-pane canvas + **collapsible inspector** (not a long unguided stack).
- **<1024:** stacked canvas; inspector as sheet; handles **≥44px** and participate in pointer/touch (`touch-none` without a 44px box is non-compliant). Keyboard reorder remains required.
- Preview Desktop / Tablet / Mobile must continue to match public (Epic 36 preview parity, `.registration-preview-surface`).

**Do not change** composition schema, renderer, `fields[]` submit truth, or Epic 35 shells.

---

## 15. Entitlement presentation (**D4**)

| Situation | Presentation |
|-----------|--------------|
| Discoverable paid module (Website, Campaigns, advanced Analytics, Team invites) | Nav item **visible** with lock glyph + plan label. Destination is a priced `UpgradePanel` or equivalent, never a blank page or a raw 500. |
| Structurally unavailable (Basic tenant-URL control, Member Team management, Platform-only items) | **Hidden**. Deep links redirect or use the shared denied state. |
| In-canvas plan gates (Form recipes, Conversational, studio sections) | Control visible-disabled or locked-in-place with `title` + accessible description naming the plan. |
| Member vs Admin | Members see the relationship rooms. They do not see Admin-only footer items. Checkout CTAs become “Ask a tenant admin.” |
| Server | API remains source of truth (`403` / `plan_locked`). UI never unlocks a gated write. |

---

## 16. AI output, evidence, uncertainty, and next action

Cohestra AI is a **room** and a dashboard **section**, not a chat novelty.

| Pattern | Rule |
|---------|------|
| Output | Short, operator-facing prose. No “As an AI…”. |
| Evidence | Every insight that implies a person, activity, or metric links to the **safe** admin href and shows the supporting count or date. |
| Uncertainty | Modes `deterministic` vs `synthesized` stay honest. If synthesis is off or data is insufficient, say so (`insufficientData`) and offer a manual next step. |
| Next action | One recommended action per insight (open Follow-up, open client, open activity). No bulk hallucinated outreach. |
| Needs attention | Dashboard section only. It summarizes; it does not replace `/ai`. |
| Failure | Shared error primitive. Do not empty-state a failed brief as “You’re all caught up.” |

Do not restyle cinema DemoClub mounts as if they were production AI.

---

## 17. Content style and error-message rules

See the content-language guide for examples. Contract:

- Voice: calm host, specific, second person (“Follow up with James”), not corporate (“Utilize CRM workflows”).
- Errors name **what failed**, **what the operator can do**, and **whether data was saved**.
- Do not blame the operator for environment limits (“Paddle is not configured”) without a named product state.
- Validation errors stay on the field. Page-level 4xx/5xx use `ProductErrorState` or App Router error.
- Success is quiet. Do not confetti the admin shell.

---

## 18. Platform-administration inheritance (**D10**)

| Shared | May remain platform-specific |
|--------|------------------------------|
| Semantic color tokens, `--text-muted`, focus ring, dialog primitive, 160ms overlays | Directory density, native-feeling tables, no admin route-enter motion |
| AA contrast, skip link, one `h1`, one `main` | Light-only until a later story |
| Empty / error / destructive grammar | Impersonation remains out of product |

Migrate `--plat-*` hex to shared tokens incrementally. Do not restyle Platform as cinema.

---

## 19. Component governance and exception process

### 19.1 Canonical primitives

| Concern | Canonical |
|---------|-----------|
| Button / input / dialog / sheet / alert-dialog / popover | `web/components/ui/*` (Base UI) |
| Page header | Shared page header (one `h1`) |
| Empty / error | `ProductEmptyState` / `ProductErrorState` |
| Upgrade / plan | `UpgradePanel`, `PlanLimitAlert`, `PlanBadge` |
| Table | New shared data-table (Epic 39–40 adopt incrementally) |
| Toast | Token-mapped variants |
| Overlay | Slotted dialog/sheet only |

Missing shadcn files (table, textarea, select, checkbox, tabs, skeleton, badge) are created **once** under `ui/` or `shared/`, not per feature.

### 19.2 Exception process

A story may ship a one-off visual **only if** all are true:

1. The exception is named in the story’s non-goals / risks.
2. It does not violate D5–D9, D11, or Epic 35–37 locks.
3. A follow-up story in Epic 43 (or sooner) retires it.
4. Code review records the exception.

Unreviewed one-offs (custom `role="dialog"`, raw Tailwind red, second `<main>`) are defects.

### 19.3 Token change process

- Raw brand hex changes require a DESIGN.md update and contrast table.
- Semantic aliases (`--text-muted`) may be remapped if 4.5:1 still holds on paper and paper-warm, light and dark.
- Cinema-only tokens stay under `[data-demo-theme]`.

---

## 20. Encoded product-owner decisions (D1–D13)

| # | Contract in this file |
|---|------------------------|
| D1 | §3.1 rooms. Needs attention = dashboard section. Reports = Analytics capability. Website page title may be Website Studio. |
| D2 | Follow-up is a primary room. Opportunity is a follow-up state/category. |
| D3 | Mobile: Home, Clients, Activities, Follow-up, More. Website under More. |
| D4 | §15 lock vs hide. |
| D5 | §5.2 `--text-muted` ≥4.5:1. Do not globally reuse `--stone-cinema`. |
| D6 | §7.3 40 / 44 / 48. |
| D7 | §14.2 three panes ≥1280; two-pane + collapsible inspector 1024–1279. |
| D8 | §10.5 shared dialog + 160ms. Press 100ms. |
| D9 | §4.1 one `h1`, one `main`. |
| D10 | §18 platform inherits semantic tokens. |
| D11 | §11 App Router error and not-found are required. |
| D12 | Fixtures for Member / Basic / Suspended / OnHold are **dev/test only**. Never production data. |
| D13 | This file is the living contract. BMAD artifacts keep history. |

---

## 21. Do’s and don’ts

**Do**

- Treat the console as a relationship command center.
- Reuse primitives. Speak the glossary.
- Preserve Epic 35 shells, Epic 36 composition, Epic 37 motion.
- Measure muted text against paper and paper-warm.

**Don’t**

- Restyle production UI from this Phase 1 PR.
- Open a second palette or a second dialog primitive.
- Hide Follow-up inside Clients filters as the only destination.
- Cover primary CTAs with a modal cookie sheet.
- Swallow billing 503 as “fine” without a named state.
- Mark a story done without the mandatory code-review loop once implementation begins.
