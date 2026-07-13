---
title: Activity Lead — Website Builder (Site Page Composer)
status: final
created: 2026-07-06
updated: 2026-07-06
resolved: 2026-07-06
parent_prd: prd-lead-generation-crm-2026-06-14
sources:
  - Party mode competitive tear-down (Jul 2026)
  - canvases/website-builder-competitive.canvas.tsx
  - Existing site landing (web/components/marketing/site-landing-page.tsx)
  - Client deploy thesocialcollectivesg.com
---

# PRD: Website Builder (Site Page Composer)

*Feature PRD scoped to Activity Lead CRM. FR IDs in this document (FR-1 … FR-N) apply to the Website Builder feature set and should be mapped to epics/stories downstream.*

## 0. Document Purpose

This PRD defines requirements for a **Website Builder** — an operator-facing capability to customize the public marketing homepage at `/` on a single deployment domain (e.g. `https://thesocialcollectivesg.com/`), with **draft and publish** workflow, live preview, and an **upcoming Activities** section fed automatically from the CRM.

It is written for product stakeholders, UX, architecture, and implementation workflows. It **extends** the core Lead Generation CRM PRD (`prd-lead-generation-crm-2026-06-14`) and does not replace Activity Engine, registration, or campaign requirements.

Technical mechanism choices (API shapes, JSON schema, caching) live in `addendum.md`. Competitive positioning and sprint backlog trace to the party-mode tear-down and competitive canvas.

---

## 1. Vision

Activity Lead operators today deploy on their own domain but customize the public homepage only by editing `.env` variables and rebuilding Docker — a developer workflow unsuitable for community operators who also run the dashboard and marketing themselves. Competitors such as **Peatix** (group page: logo, cover, description, auto event list) and **Luma** (calendar hub with auto upcoming events) set the expectation that the storefront updates without code changes.

The Website Builder gives the **same operator** who manages Activities and Clients a **Website** area in the admin app: edit hero copy, upload a site logo and hero image, reorder predefined sections, and **publish** when ready. The live homepage reads configuration at **runtime** from the database — not from build-time environment variables. Published Activities marked for homepage display appear automatically, linking into the existing consent-aware registration flow and **Master Client List**.

The product promise: **Peatix-simple homepage editing, Luma-style auto event feed, with Activity Lead’s CRM pipeline behind every registration link.**

---

## 2. Target User

### 2.1 Jobs To Be Done

**Community operator (single role — dashboard + marketing)**
- Update homepage headline and photos before promoting an event on Instagram or WhatsApp without calling a developer.
- See upcoming published Activities on the public homepage without maintaining a separate event list.
- Preview changes on phone and desktop before visitors see them.
- Publish confidently knowing a bad edit does not go live until they choose **Publish**.
- Keep operator sign-in and public registration URLs on the same domain.

### 2.2 Non-Users (v1)

- **Separate marketing staff role** — v1 assumes the same authenticated operator manages Website, Activities, and Clients; no RBAC split.
- **Multi-tenant SaaS self-serve** — v1 is one **Site Page** per deployment; not a Wix-style marketplace.
- **Public site editors** — participants and anonymous visitors cannot edit content.

### 2.3 Key User Journeys

- **UJ-1. Alex refreshes the homepage before a community picnic push.**
  - **Persona + context:** Alex runs The Social Collective — same person handles events, client follow-up, and public-facing copy.
  - **Entry state:** Authenticated operator; dashboard sidebar.
  - **Path:** Opens **Website** → edits hero headline and uploads a new hero image → toggles **Save draft** → opens **Preview** (mobile width) → confirms upcoming picnic Activity appears in **Upcoming Activities** → taps **Publish** → copies live URL from success state.
  - **Climax:** `https://thesocialcollectivesg.com/` shows new copy and image; `/register/{slug}` links still work; padlock valid.
  - **Resolution:** Alex shares homepage link in a WhatsApp community group; new registrations continue into **Master Client List**.
  - **Edge case:** Alex closes the browser with unsaved edits — system warns before navigation; draft on server unchanged.

- **UJ-2. Visitor discovers an event from the homepage.**
  - **Persona + context:** Jordan, community member, referred via homepage link (not a direct QR).
  - **Entry state:** Unauthenticated; mobile browser at `/`.
  - **Path:** Lands on marketing homepage → scrolls to **Upcoming Activities** → taps **Register** on an Activity card → completes public **Form** on `/register/{slug}`.
  - **Climax:** Registration succeeds; Jordan sees confirmation with **Registration number**.
  - **Resolution:** **Client** record created or updated; operator sees registration on dashboard without duplicate data entry.

- **UJ-3. Alex hides a draft Activity from the homepage.**
  - **Persona + context:** Alex is preparing a future workshop still in **Draft** status.
  - **Entry state:** Authenticated; Activity detail Overview tab.
  - **Path:** Leaves Activity unpublished OR publishes but turns off **Show on homepage** → saves → publishes homepage draft if needed.
  - **Climax:** Workshop does not appear in homepage **Upcoming Activities** block; direct `/register/{slug}` remains unavailable until Activity is **Published** (existing gate).
  - **Resolution:** Homepage never advertises unpublished events.

---

## 3. Glossary

- **Site Page** — The single marketing homepage configuration for one deployment, stored as structured section data plus site-level branding fields. Has **Draft** and **Published** versions.

- **Draft** — The operator-editable version of the **Site Page**; visible only in the Website builder, preview mode, and authenticated preview URL. Not served to anonymous visitors at `/`.

- **Published** — The live version of the **Site Page** copied from **Draft** on successful **Publish** action; served to anonymous visitors at `/`.

- **Section** — A typed block within the **Site Page** (e.g. hero, highlights, upcoming Activities). Each Section has a type, order, enabled flag, and type-specific properties.

- **Homepage preset** — A seeded default layout and copy applied on first deploy or when operator resets to template (v1: **Community** and **Minimal** presets in Sprint 3 polish).

- **Show on homepage** — Boolean on a **Published** **Activity** controlling inclusion in the **Upcoming Activities** Section query. Default `true` when Activity is published. [ASSUMPTION: default true — confirm with client.]

- **Website builder** — The admin UI at `/dashboard/website` where the operator edits **Draft**, previews, and **Publishes** the **Site Page**.

- **Preview mode** — Authenticated view of `/` rendering **Draft** content, identified by a signed preview token or equivalent; displays a visible “Preview — not public” banner.

- **Site branding** — Site-level logo asset, accent color, and site name applied to `/` and optionally echoed in login chrome; distinct from per-Activity hero and accent on `/register/{slug}`.

Relationships: one **Site Page** per deployment; many **Activities** may appear in **Upcoming Activities**; **Publish** on **Site Page** is independent of **Publish** on an **Activity** but publish gate may warn on broken hero CTA targets.

---

## 4. Features

### 4.1 Site Page storage and public render

**Description:** Replace build-time `LANDING_*` environment variables as the primary source of homepage content with a **Site Page** persisted in the application database. Anonymous `GET /` renders **Published** sections via runtime fetch. Environment variables remain fallback only when no **Published** **Site Page** exists (migration safety). Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-1: Persist Site Page draft and published versions

The system stores exactly one **Site Page** record per deployment with separate **Draft** and **Published** JSON payloads, `draftUpdatedAt`, `publishedAt`, and `publishedByUserId`.

**Consequences (testable):**
- Updating draft does not change anonymous `/` response until **Publish**.
- **Published** payload is immutable except via subsequent **Publish** operations.

#### FR-2: Public homepage reads published Site Page

Anonymous requests to `/` render content from **Published** **Site Page** via API or server-side fetch, with platform-owned typography and spacing (per existing UX-DR26).

**Consequences (testable):**
- Changing `.env` `LANDING_*` alone does not change homepage after **Site Page** is **Published**.
- When **Published** **Site Page** is absent, system falls back to current env-based defaults without error.

#### FR-3: Cache published Site Page for performance

**Published** **Site Page** public API response is cacheable (Redis or equivalent) with invalidation on **Publish**.

**Consequences (testable):**
- After **Publish**, anonymous `/` reflects new content within cache invalidation SLA (target ≤ 30 seconds). [ASSUMPTION: 30s acceptable for v1.]

**Feature-specific NFRs:**
- Public site API must not require authentication.
- No `dangerouslySetInnerHTML` or arbitrary HTML in v1 section renderers.

---

### 4.2 Website builder (admin)

**Description:** New **Website** entry in admin navigation (same app as Activities and Clients). Split layout: section list + editable fields on one side, live preview (phone/desktop toggle) on the other. Primary actions: **Save draft**, **Preview**, **Publish**. Unsaved-change guard on navigation. Realizes UJ-1.

**Functional Requirements:**

#### FR-4: Website admin route

Authenticated operator can open **Website builder** from dashboard navigation without a separate login or role.

**Consequences (testable):**
- Unauthenticated users receive existing auth redirect, not builder UI.
- Route label communicates purpose (e.g. “Website”).

#### FR-5: Save draft

Operator can save edits to **Draft** explicitly; UI shows last saved timestamp and unsaved-changes state.

**Consequences (testable):**
- **Save draft** persists all section and site branding fields in one transaction.
- Failed save surfaces error; prior **Draft** unchanged.

#### FR-6: Preview draft

Operator can open **Preview mode** showing **Draft** **Site Page** at `/` with banner indicating non-public preview.

**Consequences (testable):**
- Anonymous users cannot access **Draft** via preview URL without valid preview token.
- Preview uses same section components as **Published** render.

#### FR-7: Publish Site Page

Operator can **Publish** to copy **Draft** → **Published** after validation gate.

**Consequences (testable):**
- **Publish** is disabled when **Draft** equals **Published** (idempotent messaging: “Already live”).
- Successful **Publish** updates `publishedAt` and busts public cache.
- **Publish** confirmation dialog summarizes impact (“Visitors will see your changes at {domain}”).

#### FR-8: Publish gate validation

System validates **Draft** before **Publish** with block vs warn rules.

**Consequences (testable):**
- **Block:** no enabled sections; empty hero headline.
- **Warn (allow publish anyway):** missing hero image; no Activities in upcoming block; low contrast on accent [ASSUMPTION: contrast check is warn-only in v1].
- **Block:** primary hero CTA targets an Activity slug that is not **Published**.

**Notes:** Revert to previous **Published** version is **out of scope for MVP**; tracked as fast-follow (Sprint 3 polish).

---

### 4.3 Section composer (v1 section types)

**Description:** Operators edit predefined **Sections** — not a free-form drag-anywhere pixel editor. Sections can be reordered and toggled enabled/disabled. Unknown section types in stored JSON are skipped at render time for forward compatibility. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-9: Hero section

Operator can configure hero eyebrow, headline, description, hero image (via existing campaign asset upload), primary CTA (preset targets: scroll to upcoming, operator sign-in, specific **Published** Activity), and optional secondary CTA.

**Consequences (testable):**
- Primary CTA “specific Activity” dropdown lists only **Published** Activities.
- Hero image URLs resolve correctly on public domain (reuse existing public asset URL resolver).

#### FR-10: Highlights section

Operator can edit one to three highlight cards (preset icon enum, title, description) with platform layout.

**Consequences (testable):**
- Disabling section removes it from public render without deleting stored data.

#### FR-11: Upcoming Activities section

Operator can set section title, display limit (3–12), and empty-state message. System populates cards from query: **Published** Activities with **Show on homepage** true, ordered by schedule, capped by limit.

**Consequences (testable):**
- Unpublished Activities never appear in block.
- Each card links to `/register/{slug}`.
- Activity with **Show on homepage** false excluded even if **Published**.

#### FR-12: How it works section

Operator can edit section title and three steps (title + body) with seeded defaults.

#### FR-13: Footer section

Operator can configure operator sign-in link label, optional social URLs, and whether “Powered by CreativoRare” displays.

#### FR-14: Reorder and toggle sections

Operator can reorder **Sections** and toggle `enabled` without deleting content.

**Consequences (testable):**
- Render order matches saved order for enabled sections only.

---

### 4.4 Site branding

**Description:** Site-level logo, accent color, and site name on `/`, distinct from per-Activity branding on registration pages. Realizes UJ-1.

**Functional Requirements:**

#### FR-15: Site logo and accent

Operator can upload site logo and set site accent color in **Website builder**; values apply to homepage and may echo in login header site name display.

**Consequences (testable):**
- Logo upload uses existing campaign asset pipeline (no second blob store).
- Accent applies to buttons/links on `/` only; does not override Activity accent on `/register/{slug}` unless explicitly designed in UX spec [ASSUMPTION: homepage-only accent scope].

---

### 4.5 Activity homepage visibility

**Description:** Operator controls which **Published** Activities surface on homepage from Activity admin, without editing homepage JSON manually. Realizes UJ-3.

**Functional Requirements:**

#### FR-16: Show on homepage toggle

On Activity Overview (or equivalent), operator can set **Show on homepage** for each Activity.

**Consequences (testable):**
- Toggle visible only for **Published** Activities (hidden or disabled for **Draft** and **Archived**).
- Default `true` on first **Publish** of Activity. [ASSUMPTION]
- Changing toggle updates upcoming block on next homepage render without **Site Page** **Publish**.

---

### 4.6 Migration and first-run seed

**Description:** Existing deployments (e.g. The Social Collective) migrate from env-based landing to **Site Page** without blank homepage. Realizes UJ-1.

**Functional Requirements:**

#### FR-17: Seed Site Page from current landing

On migration or first run, system seeds **Draft** and **Published** **Site Page** from current `site-landing-page.tsx` defaults and `.env` `LANDING_*` values where set.

**Consequences (testable):**
- After seed + deploy, `/` visually matches pre-migration landing within template tolerance.
- Seed runs once; does not overwrite operator **Draft** on subsequent deploys.

#### FR-18: Homepage SEO and social preview metadata

**Published** **Site Page** drives document `<title>`, meta description, and Open Graph tags (`og:title`, `og:description`, `og:image`) from site name, hero headline/description, and hero image — no separate meta editor in v1.

**Consequences (testable):**
- Sharing `https://{domain}/` on WhatsApp or Telegram unfurls title, description, and hero image when hero image is set.
- Meta tags update after **Site Page** **Publish** without Docker rebuild.

---

### 4.7 Login and footer branding

**Description:** Public operator sign-in reflects client **Site branding**; platform credit remains visible but secondary. Realizes UJ-1.

**Functional Requirements:**

#### FR-19: Client branding on login page

Login page (`/login`) displays **Site branding** logo and site name from **Published** **Site Page** when available, with CreativoRare / Activity Lead credit as secondary line (not primary lockup).

**Consequences (testable):**
- After operator publishes site logo, `/login` shows client logo without separate login-specific upload.
- Fallback to current CreativoRare lockup when no **Published** **Site Page** exists.

#### FR-20: Powered-by footer default

Footer **Section** includes “Powered by CreativoRare” by default (`showPoweredBy: true` in seed). Operators cannot disable via Website builder in v1; deployment may override via environment flag for CreativoRare staff only.

**Consequences (testable):**
- Default seeded homepage shows powered-by line.
- No toggle in Website builder UI for `showPoweredBy` in v1.

---

## 5. Non-Goals (Explicit)

- **Full drag-and-drop page builder** with arbitrary layout or custom HTML blocks in v1.
- **Multiple marketing pages** (`/about`, `/contact`) — single `/` homepage only for MVP.
- **Scheduled publish** (“go live Monday 9am”).
- **Partiful-style theme/effects/animations** on homepage or registration pages in Website Builder v1.
- **Luma Discover, map view, newsletter, external event curation** on homepage.
- **Separate marketing user role or approval workflow**.
- **Multi-tenant Site Pages** on one deployment (one row per deployment only).
- **Docker rebuild required to change homepage copy** after this feature ships.

---

## 6. MVP Scope

### 6.1 In Scope

- **Site Page** entity with **Draft** / **Published** JSON and publish metadata
- Public `/` runtime render + public API + cache invalidation on publish
- `/dashboard/website` builder: Save draft, Preview, Publish (Option B — no instant live save)
- Section types: hero, highlights, upcoming Activities, how it works, footer
- Site logo, accent, site name
- **Show on homepage** Activity toggle
- Phone/desktop preview in builder
- Publish gate (block/warn rules per FR-8)
- Seed from existing landing + env fallback
- Two homepage presets (Community, Minimal) — polish sprint acceptable end of MVP

### 6.2 Out of Scope for MVP

| Item | Reason |
|------|--------|
| Revert to last published | Fast-follow; store snapshot on publish for v1.1 |
| Auto-save draft every 30s | v1.1; explicit Save draft trains publish model |
| Site-wide theme presets on registration pages | Event page v2 (see addendum) |
| Partiful-lite effects on `/register/{slug}` | Wrong ROI for v1; separate PRD slice |
| Tag/filter on upcoming events | Luma parity deferred |
| SEO meta editor per section | Basic page title from site name only [ASSUMPTION] |

---

## 7. Success Metrics

**Primary**

- **SM-1:** Operator can change homepage hero copy and publish without developer deploy — validated by FR-5, FR-7, FR-2. Target: 100% of homepage content changes in UAT complete via builder alone.
- **SM-2:** Homepage upcoming Activities match CRM **Published** set — validated by FR-11, FR-16. Target: zero incidents of unpublished Activity shown on homepage in UAT.

**Secondary**

- **SM-3:** Time to first homepage customization after feature deploy — operator completes UJ-1 in ≤ 10 minutes without support. Validates FR-4, FR-9.

**Counter-metrics (do not optimize)**

- **SM-C1:** Homepage builder session count — high session count with no **Publish** may indicate confusing UX; do not treat as engagement success.
- **SM-C2:** Section count — do not encourage operators to enable all sections if content is thin; quality over completeness.

---

## 8. Resolved Decisions (2026-07-06)

Party-mode confirmation — previously open questions:

| # | Decision |
|---|----------|
| 1 | **Show on homepage** defaults to **`true`** when an Activity is **Published**; operator may uncheck “Feature on your public site” on Activity Overview. |
| 2 | **`/login`** displays client logo and site name from **Published** **Site branding** (FR-19); platform credit secondary. |
| 3 | **Open Graph / meta** auto-derived from hero + site name in MVP (FR-18); no dedicated SEO editor. |
| 4 | **Powered by CreativoRare** on by default; not operator-editable in v1; env-only override for white-label deployments (FR-20). |

---

## 9. Assumptions Index

- **[ASSUMPTION]** Single operator role for dashboard and marketing — no RBAC split (§2.2, party mode confirmation).
- **[RESOLVED]** **Show on homepage** defaults to `true` when Activity is **Published** (§8).
- **[RESOLVED]** Login uses **Site branding** from **Published** **Site Page** (FR-19).
- **[RESOLVED]** OG/meta from hero in MVP (FR-18); no dedicated meta editor.
- **[RESOLVED]** Powered-by on by default; env-only off (FR-20).
- **[ASSUMPTION]** Cache invalidation within 30 seconds after **Publish** is acceptable (FR-3).
- **[ASSUMPTION]** Site accent applies to homepage surfaces only, not registration pages (FR-15).
- **[ASSUMPTION]** One deployment = one **Site Page** row; multi-tenant deferred (§5).

---

## 10. Platform and Information Architecture

**Platform:** Web — Next.js public `/` and admin `/dashboard/website`; ASP.NET Core API; PostgreSQL; Redis cache. Same stack as existing Activity Lead UAT deployment.

**Navigation (admin):**

| Surface | Path | Purpose |
|---------|------|---------|
| Public homepage | `/` | **Published** **Site Page** |
| Operator sign-in | `/login` | Unchanged |
| Website builder | `/dashboard/website` | Edit **Draft**, preview, **Publish** |
| Activity admin | `/dashboard/activities/...` | **Show on homepage** toggle |
| Public registration | `/register/{slug}` | Unchanged; per-Activity branding |

**Aesthetic and tone:** Peatix-simple editing affordances; warm community tone consistent with The Social Collective landing. Platform typography/spacing fixed; operator controls copy, images, accent, section visibility — not font pickers or animation effects in v1.

---

## 11. Cross-Cutting NFRs

- **Security:** Admin write APIs require JWT; public read only **Published** payload; preview token short-lived and non-guessable.
- **Accessibility:** Homepage sections meet existing app a11y baseline; publish gate warns on low contrast (warn-only v1).
- **Reliability:** If public site API fails, `/` falls back to env defaults rather than 500 blank page.
- **Privacy:** Homepage must not expose private operator or client data; upcoming block shows only public Activity fields already on registration pages.

---

## 12. Integration and Dependencies

- **Depends on:** Existing Activity publish model, campaign asset upload API, `PUBLIC_BASE_URL` for absolute links, nginx HTTPS deployment.
- **Replaces as primary:** `LANDING_*` / `NEXT_PUBLIC_LANDING_*` for homepage content (fallback only post-migration).
- **Does not change:** Activity Engine, registration forms, campaigns, Postgres client data model (except new Site Page table and Activity.showOnHomepage column).
