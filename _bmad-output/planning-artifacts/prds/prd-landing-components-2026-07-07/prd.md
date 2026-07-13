---
title: Activity Lead — Landing Page Component Library
status: draft
created: 2026-07-07
updated: 2026-07-07
parent_prd: prd-website-builder-2026-07-06/prd.md
depends_on: Epic 9 (Website Builder) complete
sources:
  - Epic 9 retrospective (2026-07-07)
  - Party mode — landing component library discussion (2026-07-07)
---

# PRD: Landing Page Component Library (Epic 10)

Extends the Website Builder from a **fixed five-section configurator** to a **composable landing page** with professional marketing blocks — all editable in `/dashboard/website` without code changes.

**Parent:** Website Builder PRD (Epic 9). **Prerequisite:** Story 9.9 (Phase A visitor polish) ships first.

---

## 1. Vision

Epic 9 let operators edit hero copy, branding, and publish safely. Visitors still see a rigid layout and operator-facing CTAs leaked into the marketing funnel. Epic 10 makes the public homepage feel **Peatix/Luma-grade**: hero banner imagery, social proof, FAQs, and optional carousels — while every visible field remains operator-editable in the Website builder.

**Promise:** Add marketing sections from a palette, edit all copy and images, reorder and remove sections, publish with the same draft/publish trust model as Epic 9.

---

## 2. Target user

**Community operator** (same as Epic 9) — edits homepage in-dashboard before promoting events on WhatsApp/Instagram.

**Public visitor** — sees a visitor-first landing page (no operator sign-in CTAs in hero/header); discovers events via upcoming activities and registration links.

---

## 3. User journeys

### UJ-1 — Add social proof before a campaign push

**Maria** runs a community collective. Before Instagram Stories she opens **Website**, clicks **Add section → Testimonials**, pastes three member quotes, uploads avatar images, moves the block above **Upcoming activities**, previews on phone, and publishes. Link unfurl shows hero image + updated OG tags (Epic 9).

### UJ-2 — Carousel for multi-event season

**Marco** has three flagship events this month. He adds a **Carousel** section, uploads one slide per event with headline + **Register** CTA targeting each activity slug, disables autoplay, publishes. Visitors swipe through on mobile.

### UJ-3 — FAQ reduces support DMs

**Maria** adds **FAQ** with five accordion items (“Do I need an account?”, “Where is the venue?”). She disables **How it works** (redundant), saves draft, publishes.

---

## 4. Scope

### In scope (Epic 10)

- Section **registry** pattern (builder editor + public renderer per type)
- **Add section**, **remove section**, **reorder** (existing up/down; drag deferred)
- New section types (prioritized):
  - **P1:** `carousel`, `testimonials`, `faq`
  - **P2:** `stats`, `ctaBand`
- **Section shell variant** (optional P2): `default` | `accent` | `muted` background on any section
- All section **props editable** in builder (text, images via campaign assets, CTAs, list items)
- Publish gate rules per section type
- Preset updates (Community/Minimal) — new types **disabled by default** in presets
- Limits: max **12 sections** per page; max **6 items** per list inside a section (slides, FAQ rows, quotes)

### Out of scope (Epic 10)

- Custom HTML/CSS blocks
- Embedded video iframes (use external CTA link)
- Multi-page sites / navigation
- A/B testing or multiple homepages
- Drag-and-drop reorder (keyboard/up-down sufficient for v1)
- Autoplay carousel by default (off; respect `prefers-reduced-motion`)

### Prerequisite — Phase A (Story 9.9, before Epic 10)

Shipped separately: remove operator CTAs from public `/`, render hero banner image, confirm upcoming activities filter (published only).

---

## 5. Functional requirements

### Section platform (FR-10-1 … FR-10-5)

**FR-10-1 — Section registry**  
Given Website builder and public renderer  
When a section type is registered  
Then builder shows type-specific fields and renderer shows type-specific UI from shared props schema

**FR-10-2 — Add section**  
Given Website builder  
When operator chooses a type from the section palette  
Then a new section is appended to draft with default props and unique id

**FR-10-3 — Remove section**  
Given Website builder  
When operator confirms remove  
Then section is deleted from draft (hero and footer may be protected — see addendum)

**FR-10-4 — Reorder sections**  
Given Website builder  
When operator moves section up/down  
Then order updates and preview reflects new layout

**FR-10-5 — Section limits**  
Given draft with 12 sections  
When operator attempts add  
Then action is blocked with clear message

### Carousel (FR-10-10 … FR-10-12)

**FR-10-10 — Carousel section**  
Given carousel section enabled  
When visitor views homepage  
Then slides render with image, optional headline/description, optional CTA

**FR-10-11 — Carousel editor**  
Given carousel selected in builder  
When operator edits  
Then they can add/remove/reorder slides (max 6), upload image per slide, set CTA target (scroll-upcoming, published activity, external URL pattern)

**FR-10-12 — Carousel publish gate**  
Given carousel enabled with zero slides containing image or headline  
When operator publishes  
Then publish is blocked

### Testimonials (FR-10-20 … FR-10-21)

**FR-10-20 — Testimonials render**  
Given testimonials section with items  
When visitor views page  
Then quotes, names, optional roles and avatar images display

**FR-10-21 — Testimonials editor**  
Given builder  
When editing testimonials  
Then operator manages list items (quote, name, role, avatar upload) with add/remove/reorder (max 6)

### FAQ (FR-10-30 … FR-10-31)

**FR-10-30 — FAQ accordion**  
Given FAQ section  
When visitor interacts  
Then questions expand/collapse; keyboard accessible

**FR-10-31 — FAQ editor**  
Given builder  
When editing FAQ  
Then operator manages question/answer pairs (max 6)

### Stats & CTA band (FR-10-40 … FR-10-43) — P2

**FR-10-40 — Stats strip**  
Display value + label pairs (e.g. “400+” / “Registrations”)

**FR-10-41 — Stats editor**  
Editable list of stat items (max 6)

**FR-10-42 — CTA band**  
Full-width headline, description, primary CTA

**FR-10-43 — CTA band editor**  
All fields editable; CTA targets same enum as hero

### Cross-cutting (FR-10-50 … FR-10-52)

**FR-10-50 — Visitor-safe CTAs**  
Public renderer does not show CTAs targeting `/login` or `/register`; builder does not offer those targets in pickers

**FR-10-51 — Unknown section types**  
Published page skips unknown types without error (forward compatible)

**FR-10-52 — Presets**  
Community/Minimal presets remain valid; new section types not auto-inserted unless preset version bumps

---

## 6. Non-functional requirements

**NFR-10-1 — Accessibility**  
Carousel and FAQ meet keyboard navigation; carousel respects `prefers-reduced-motion` (static first slide).

**NFR-10-2 — Performance**  
Homepage remains single public API round-trip; no N+1 per section type.

**NFR-10-3 — Mobile**  
All new sections readable at 375px width; carousel horizontally scrollable on touch.

**NFR-10-4 — Consistency**  
Typography and spacing use existing platform tokens (UX-DR26 from Epic 9).

---

## 7. Success metrics

- Operator can add carousel + testimonials without developer help
- Zero operator login CTAs on public `/` after Phase A
- Hero banner image visible when uploaded (Phase A)
- Upcoming activities show **Published + ShowOnHomepage** only (verified by test)
- Publish gate prevents empty carousel/testimonial sections from going live

---

## 8. Epic breakdown (proposed stories)

| Story | Title |
|-------|--------|
| 9.9 | Public landing visitor polish (Phase A — prerequisite) |
| 10.1 | Section registry + add/remove section |
| 10.2 | Shared list-item editor component |
| 10.3 | Carousel section |
| 10.4 | Testimonials + FAQ sections |
| 10.5 | Stats + CTA band sections |
| 10.6 | Section shell variants + preset refresh |
| 10.7 | Integration tests + builder E2E smoke |

---

## 9. Open decisions

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Protect hero/footer from delete? | Yes — require at least one hero; footer optional disable |
| 2 | External URL CTAs | Allow `https://` targets in carousel/CTA band (validated) |
| 3 | Schema version bump | Stay on v1 with additive types unless breaking change needed |

Mechanism details: see `addendum.md`.
