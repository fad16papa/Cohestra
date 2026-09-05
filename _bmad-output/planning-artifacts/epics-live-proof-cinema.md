---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-08-31/EXPERIENCE.md
  - _bmad-output/brainstorming/brainstorm-live-product-feeling-cinema-2026-09-01/brainstorm-intent.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/architecture/architecture-cohestra-enterprise-2026-07-15/ARCHITECTURE-SPINE.md
status: frozen
project_name: cohestra
slice: Live Proof Cinema (marketing /#crm)
tracker_epic: 33
updated: 2026-09-05
frozen_record: planning-artifacts/cinema-frozen.md
---

# cohestra - Epic Breakdown (Live Proof Cinema)

## Overview

This document provides the epic and story breakdown for **Live Proof Cinema** — the marketing home `/#crm` product stage — decomposing requirements from the finalized UX spines (`ux-cohestra-2026-09-01`), brand inherit (`ux-cohestra-2026-07-18`), superseded cinema a11y lineage (`ux-cohestra-2026-08-31`), brainstorm intent, and Architecture stack constraints.

**Note:** There is no dedicated Live Proof Cinema PRD. Functional requirements below are extracted from the UX EXPERIENCE contract and intent (product behavior the system must deliver on the apex marketing surface). Parent UJ-1…UJ-5 remain on `ux-cohestra-2026-07-18`.

**Tracker numbering:** This slice was drafted as a standalone “Epic 1.” Cohestra’s sprint tracker already has Platform **Epic 1** done, so this work is **Epic 33** (stories **33.1–33.5**).

## Requirements Inventory

### Functional Requirements

FR1: On apex marketing home `/#crm`, a visitor can browse six product **rooms** (Clients, Follow-up, Dashboard, Campaigns, Reports, Website) that prove the real Cohestra workspace via live presentational UI fed by static MarketingDemoClub seed — not decorative second-design-system mocks.

FR2: Desktop (`lg+`, motion-safe) presents a **pin cinema**: one sticky cinema chrome under the marketing header; native page scroll maps to six equal surface ranges; seek pills inside the sticky chrome Activate to jump rooms; Focus alone does not seek.

FR3: Mobile (`< lg`) and `prefers-reduced-motion` use **click-tabs** (CarouselChrome) with the same six rooms, same live bodies (reflow/crop), and no long pin / no scrub / no climax transform.

FR4: Feeling copy for each room follows Feeling → Scene → Proof with locked thesis “A week with your people”, no section eyebrow, ≤3 outcome lines, and post-cinema CTA “Start with your first activity” as the only conversion will.

FR5: ProductFrame is a **preview** (thin Cohestra window): `aria-hidden` + `inert` + `pointer-events: none`; no inner scroll; no fake browser-dot chrome; FeelingCopy is the accessible `tabpanel`.

FR6: MarketingDemoClub is a single static JSON cast (Elena, Jordan, Sunday clinic, board games night) driving all six rooms; apex never uses production tenant data, real PII, or session cookies.

FR7: Website room mounts live preview + seeded sections (Hero / Highlights / Activities / Testimonials) or **omits the pill** if mount is too heavy — never hollow rails / PRO chip theater.

FR8: Hash `/#crm` (header Clients + same-hash) always resets to Clients at rest with scroll-margin; does not steal focus from the header unless cinema chrome that held focus unmounted.

FR9: Follow-up is the emotional climax room; ClimaxMicroBeat fires only on scrub-entry Clients→Follow-up (not pill skip, not Website); Website is pride epilogue.

FR10: Chapter pedagogy is removed everywhere in this surface: no `chapterNumber`, “Chapter N of 6”, or “Scroll to continue”.

FR11: Live region announces `{navLabel}. {job sentence}.` (polite, atomic; debounce on scrub; never chapter index).

FR12: Dual-state seek pills: `aria-selected` ⇔ progress ⇔ ink; focus ⇔ ring only; Tab-in/blur resyncs roving tabindex to selected.

FR13: Thin 2px InkProgress under pills ships as `aria-hidden` presentational div (omit only if QA reads as chapter chrome).

FR14: On cinema/JS failure, fall back to CarouselChrome with live bodies when possible — never revive hollow mocks or chapter chrome.

### NonFunctional Requirements

NFR1: WCAG 2.2 AA on the marketing cinema section; cinema contrast tokens stone-cinema / gold-cinema on paper-warm (≥4.5:1 body; idle glyphs ≥3:1); DemoClub mounts use stone-cinema/ink for secondary text (never raw stone on paper-warm).

NFR2: Accessibility — APG tablist/tab/tabpanel both breakpoints; tablist `aria-label="Product surfaces"`; 2.4.11 one-sticky geometry; no focus trap; no tab stops in ProductFrame; hit targets dots ≥24×24, chevrons 40px.

NFR3: `prefers-reduced-motion: reduce` is a full product path (CarouselChrome), not a dimmed cinema; kill pin/scrub/climax/hover-lift/crossfade.

NFR4: Mobile access-parity — no CSS `transform: scale` of live roots; pills wrap below `sm` (or peek+chevrons); never swipe-only to Website.

NFR5: Performance — static DemoClub JSON on apex (no demo API / cloned DB); cinema must not block marketing home paint with heavy auth or network to production tenants.

NFR6: Security/privacy — curated fixtures only; no production PII; iframe last resort with inert + tabindex=-1 or omit pill; sandbox without allow-scripts when possible.

NFR7: Native scroll only while pinned — no document `preventDefault` on wheel/touch/PageDown except Activate on focused seek control.

NFR8: Visual identity — Midnight Atelier inherit; Plus Jakarta Sans instruments (no Sora); Apple grammar without Apple hardware theater; Tally clarity craft without becoming Tally.

### Additional Requirements

- **Stack (Architecture):** Next.js + Tailwind + shadcn/ui marketing client; .NET API is out of scope for this marketing-only slice unless a future `/demo/*` iframe route is chosen as last resort.
- **Scope boundary:** Marketing apex `/#crm` only — not tenant admin, not public stub, not website-builder editor as a product surface.
- **Implementation files (UX):** Evolve `web/components/marketing/marketing-product-cinema.tsx`, `use-marketing-product-cinema.ts`, `web/lib/marketing/product-slides.tsx`; keep CarouselChrome as mobile/PRM/rollback path.
- **Reuse from superseded cinema (`ux-cohestra-2026-08-31`):** pin math (70vh × 6, 3% hysteresis), APG tablist, live-region timing, PRM teardown, contrast tokens — do **not** reuse chapter chrome, mock cinema, Website-as-climax, four-bullet lock, dual-sticky anatomy, or inert-on-whole-stage.
- **Brand inherit:** `ux-cohestra-2026-07-18` DESIGN (Midnight Atelier) remains the visual parent.
- **No starter/greenfield template** — brownfield extend of existing marketing cinema.

### UX Design Requirements

UX-DR1: Implement SectionHeader with locked thesis “A week with your people”, omitted eyebrow, and lead “A week inside a club like yours…”.

UX-DR2: Implement SeekPills as APG tablist inside one sticky cinema chrome (C1); product-true navLabels; H4 dual-state; kill chapter numbers.

UX-DR3: Implement InkProgress (A7) as 2px `aria-hidden` presentational bar under pills.

UX-DR4: Implement FeelingCopy as stable tabpanel with Feeling → Scene → ≤3 outcomes per room; crossfade motion-safe only.

UX-DR5: Implement ProductFrame as thin Cohestra window (A1) hosting live presentational mounts; preview-only (H1/H2/C2).

UX-DR6: Introduce `MarketingDemoClub` static JSON + `MarketingDemoProvider` and extract/presentational mounts for Clients, Follow-up, Dashboard, Campaigns, Reports, Website (preview+sections).

UX-DR7: Apply DemoClub presentational contrast theme (H3) so secondary text meets AA inside the frame.

UX-DR8: Implement desktop pin cinema progress mapping, hysteresis, seek Activate, and ClimaxMicroBeat on scrub-entry to Follow-up only (A2/M).

UX-DR9: Implement CarouselChrome path for `< lg` and reduced-motion with wrap/peek pills (H6) and named dots/chevrons.

UX-DR10: Implement LiveRegion string `{navLabel}. {job sentence}.` with scrub debounce and explicit-seek rules (M).

UX-DR11: Implement hash `#crm` intercept + same-hash reset to Clients without focus steal (H5).

UX-DR12: Implement post-cinema PrimaryButton CTA “Start with your first activity” (will).

UX-DR13: Remove ShowcaseBrowserChrome authenticity theater, chapter chrome, “Scroll to continue”, and hollow Website mock; omit Website pill if mount too heavy (A5).

UX-DR14: Ensure 32/68 (copy/stage) desktop split (A4) and mobile stack (FeelingCopy above frame).

UX-DR15: Preserve Midnight Atelier tokens + stone-cinema/gold-cinema; Plus Jakarta Sans instruments; no Sora.

### FR Coverage Map

FR1: Epic 33 — Six live DemoClub rooms on `/#crm`
FR2: Epic 33 — Desktop one-sticky pin cinema
FR3: Epic 33 — Mobile / PRM click-tabs
FR4: Epic 33 — Feeling→Scene→Proof + thesis + CTA
FR5: Epic 33 — Preview ProductFrame + FeelingCopy tabpanel
FR6: Epic 33 — Static MarketingDemoClub JSON
FR7: Epic 33 — Website preview or omit pill
FR8: Epic 33 — Hash `#crm` reset to Clients
FR9: Epic 33 — Follow-up climax / Website epilogue
FR10: Epic 33 — Kill chapter pedagogy
FR11: Epic 33 — Live region `{navLabel}. {job}.`
FR12: Epic 33 — Dual-state seek pills
FR13: Epic 33 — InkProgress presentational
FR14: Epic 33 — Fallback CarouselChrome with live bodies

## Epic List

### Epic 33: Live Proof Cinema
Visitors on the marketing home can walk six inhabited product rooms — live Cohestra UI + MarketingDemoClub seed + feeling copy — with Apple-clean seek on desktop, click-tabs on mobile/reduced-motion, and no chapter/mock chrome — so they feel Cohestra is the tool they need, not SaaS noise.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14

## Epic 33: Live Proof Cinema

Visitors on the marketing home can walk six inhabited product rooms — live Cohestra UI + MarketingDemoClub seed + feeling copy — with Apple-clean seek on desktop, click-tabs on mobile/reduced-motion, and no chapter/mock chrome — so they feel Cohestra is the tool they need, not SaaS noise.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14

### Story 33.1: MarketingDemoClub seed + presentational mounts

As a marketing visitor,
I want to see real Cohestra product UI filled with a named club week,
So that I believe the product is real — not a decorative mock.

**Acceptance Criteria:**

**Given** the apex marketing home loads `/#crm`
**When** any product room visual renders
**Then** it is driven by a single static `MarketingDemoClub` JSON (Elena, Jordan, Sunday clinic, board games night) via `MarketingDemoProvider`
**And** no production tenant data, real PII, or session cookies are requested for these mounts

**Given** presentational bodies for Clients, Follow-up, Dashboard, Campaigns, Reports, and Website (preview + sections)
**When** those bodies render inside the cinema stage
**Then** they reuse Cohestra product UI (extracted presentational mounts), not a second mock design system
**And** Website uses preview + seeded sections only — not full editor chrome

**Given** DemoClub presentational theme (H3)
**When** secondary text appears in a live mount (e.g. Elena’s meta line)
**Then** it uses `stone-cinema` or `ink` on paper-warm (≥4.5:1)
**And** raw `stone` on paper-warm is not used in cinema mounts

**Given** a room cannot be mounted safely
**When** the cinema chooses a fallback
**Then** it prefers omit-pill (or inert iframe last resort) over inventing hollow decorative UI
**And** the stage never shows anonymous “Acme” / “Your account” seed

### Story 33.2: Feeling copy + kill chapter/mock chrome

As a marketing visitor,
I want feeling-led room copy without chapter pedagogy or fake browser chrome,
So that the section feels like Cohestra — calm proof, not a brochure or SaaS mock.

**Acceptance Criteria:**

**Given** the `/#crm` section header
**When** the section renders
**Then** the H2 thesis is “A week with your people”
**And** the lead reads “A week inside a club like yours — the same rooms your team will open on Monday.”
**And** there is no “Inside the workspace” (or other) section eyebrow

**Given** each product room
**When** FeelingCopy updates
**Then** copy follows Feeling → Scene → Proof with ≤3 outcome lines
**And** the feeling word appears before feature taxonomy

**Given** the prior chapter/mock cinema UI
**When** Live Proof Cinema ships
**Then** `chapterNumber`, “Chapter N of 6”, and “Scroll to continue” are gone
**And** `ShowcaseBrowserChrome` fake browser dots are not the authenticity frame
**And** hollow Website rails / PRO chip theater are not shown

**Given** Midnight Atelier brand inherit
**When** cinema typography renders
**Then** Fraunces displays + Plus Jakarta Sans instruments are used
**And** Sora is not introduced

### Story 33.3: Preview ProductFrame + desktop pin seek

As a marketing visitor on desktop,
I want a pinned stage that seeks rooms as I scroll (and when I activate pills),
So that the product holds still while the house reveals another room — Apple-clean, Cohestra-owned.

**Acceptance Criteria:**

**Given** viewport `≥ lg` and motion is allowed
**When** the visitor scrolls through the `/#crm` pin track
**Then** one sticky cinema chrome sits under the header (`top` = header-offset, z below header)
**And** SeekPills are `shrink-0` inside that sticky (not a second sticky at the same top)
**And** native page scroll maps to six equal surface ranges with ~3% hysteresis
**And** the document does not `preventDefault` wheel/touch/PageDown except Activate on a focused seek control

**Given** the desktop stage layout
**When** Clients (or any room) is shown
**Then** FeelingCopy is ~30–32% left and ProductFrame ~65–70% right (working midpoint ~68%)
**And** ProductFrame is a thin Cohestra window (no fake browser dots)

**Given** ProductFrame hosts a live mount
**When** the visitor interacts with the page
**Then** the frame is preview-only: `aria-hidden` + `inert` + `pointer-events: none`
**And** there is no inner scroll in the frame (page scroll owns the wheel)
**And** FeelingCopy remains the accessible `tabpanel` (not hidden)

**Given** thin InkProgress under pills
**When** the pin is active
**Then** a 2px presentational (`aria-hidden`) ink bar may show progress
**And** selected pill remains the teacher of current room

**Given** the visitor scrubs from Clients into Follow-up
**When** motion is allowed
**Then** ClimaxMicroBeat plays once (`scale(1.02)` + `translateY(-4px)` → settle)
**And** pill-skip to Follow-up or Website does not fire the beat
**And** Website remains pride epilogue (no climax beat)

### Story 33.4: Cinema a11y, hash, live region, dual-state pills

As a keyboard / AT / returning visitor,
I want predictable seek, announcements, and `#crm` restore without traps or focus theft,
So that the cinema stays WCAG-usable while still feeling premium.

**Acceptance Criteria:**

**Given** SeekPills on either breakpoint
**When** the visitor uses keyboard
**Then** controls follow APG tablist / tab / tabpanel with `aria-label="Product surfaces"`
**And** FeelingCopy is the stable tabpanel (`aria-labelledby` active tab; pills `aria-controls` that id)
**And** `aria-selected` ⇔ progress room ⇔ ink fill; focus shows ring only
**And** Tab-in / tablist blur resyncs roving `tabIndex` to the selected pill
**And** Left/Right/Home/End move focus with `preventScroll`; Enter/Space Activate seeks

**Given** room changes via scrub or Activate
**When** the live region updates
**Then** it announces `{navLabel}. {job sentence}.` (polite, atomic)
**And** scrub updates are debounced (~300ms / scrollend); never assertive; never a chapter index

**Given** header Clients or in-page `/#crm` (including same-hash click)
**When** the visitor activates it
**Then** the section scrolls into view with scroll-margin and always `resetToClients` at progress/index 0
**And** focus is not moved unless cinema chrome that held focus unmounted

**Given** ProductFrame preview mounts
**When** Tabbing through the page
**Then** there are zero tab stops inside the frame
**And** Tab from the last pill reaches the next page landmark (e.g. post-cinema CTA), never an in-frame WhatsApp/Publish control

**Given** cinema contrast tokens
**When** FeelingCopy and seek chrome render
**Then** `stone-cinema` / `gold-cinema` on paper-warm meet ≥4.5:1 for body text (idle glyphs ≥3:1)

### Story 33.5: Mobile / PRM click-tabs + Website omit + CTA

As a visitor on phone or with reduced motion,
I want the same six inhabited rooms via click-tabs — plus a clear next step after the walkthrough,
So that the story stays accessible and conversion doesn’t depend on pin cinema.

**Acceptance Criteria:**

**Given** viewport `< lg` or `prefers-reduced-motion: reduce`
**When** `/#crm` renders
**Then** CarouselChrome click-tabs are used (no long pin, no scrub, no climax transform, no hover-lift/crossfade)
**And** the same live DemoClub bodies render via reflow/crop (no CSS `transform: scale` of live roots)
**And** FeelingCopy remains the tabpanel stacked above the ProductFrame

**Given** viewport below `sm`
**When** SeekPills are shown
**Then** pills wrap or offer peek + named chevrons
**And** Website is reachable without a swipe-only horizontal path
**And** dots hit ≥24×24 with names `Go to {navLabel}`; chevrons are named Previous/Next

**Given** Website presentational mount is too heavy or fails
**When** the cinema decides room availability
**Then** the Website pill is omitted, the tablist is rebuilt, and `aria-controls` retargeted
**And** hollow Website rails / anti-pattern mock are never shown

**Given** cinema or JS failure on desktop
**When** the pin path cannot run
**Then** CarouselChrome with live bodies is the fallback
**And** chapter chrome / hollow mocks are not revived

**Given** the visitor finishes or leaves the cinema track
**When** the post-cinema CTA is shown
**Then** the primary button is “Start with your first activity”
**And** it is outside the inert ProductFrame (the conversion will)
